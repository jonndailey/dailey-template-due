function normalizeRoles(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .flatMap((value) => String(value || '').split(','))
      .map((role) => role.trim())
      .filter(Boolean);
  }
  return String(input)
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);
}

export function mapCoreRolesToWorkspaceRole(coreRoles) {
  const roles = normalizeRoles(coreRoles);
  if (roles.some((role) => ['core.admin', 'tenant.admin', 'owner', 'admin'].includes(role))) {
    return 'admin';
  }
  if (roles.some((role) => ['viewer', 'read_only', 'read-only'].includes(role))) {
    return 'viewer';
  }
  return 'member';
}

export async function upsertWorkspaceFromCoreTenant(conn, tenant) {
  const tenantId = tenant?.tenant_id || tenant?.id;
  const slug = tenant?.slug || tenant?.tenant_slug;
  const name = tenant?.name || slug || tenantId;
  if (!tenantId || !slug) return null;

  await conn.query(
    `
      INSERT INTO workspaces (core_tenant_id, slug, name)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        slug = VALUES(slug),
        name = VALUES(name)
    `,
    [String(tenantId), String(slug), String(name)],
  );

  const [rows] = await conn.query(
    'SELECT * FROM workspaces WHERE core_tenant_id = ? LIMIT 1',
    [String(tenantId)],
  );
  return rows[0] || null;
}

// Seeds a starter project with a few demo tasks the first time a user joins
// an empty workspace, so the first load is never blank. Runs only when the
// membership is newly created and the workspace has no projects yet, which
// keeps it idempotent across logins.
async function seedDemoData(conn, { workspaceId, coreUserId, userName }) {
  const [existing] = await conn.query(
    'SELECT id FROM assignments_projects WHERE workspace_id = ? LIMIT 1',
    [workspaceId],
  );
  if (existing.length) return;

  const { randomUUID } = await import('node:crypto');
  const projectId = randomUUID();
  await conn.query(
    `
      INSERT INTO assignments_projects (id, workspace_id, name, color_hex, created_by)
      VALUES (?, ?, 'Getting Started', '#4f7cff', ?)
    `,
    [projectId, workspaceId, String(coreUserId)],
  );

  const demoTasks = [
    ['Welcome to Due, your new task app', 'You are signed in with your Dailey account. This workspace is yours: everything here is stored in your project database.', 'high', 'active'],
    ['Create your first task', 'Press c or use the New Task button. Tasks support priorities, due dates, subtasks, and notes.', 'medium', 'active'],
    ['Attach a file to a task', 'Open any task and add an attachment. Files are stored in your Dailey Storage bucket.', 'medium', 'active'],
    ['Deploy this app to Dailey OS', 'This one is already done. Nice work.', 'low', 'completed'],
  ];

  let sortOrder = 0;
  for (const [title, description, priority, status] of demoTasks) {
    await conn.query(
      `
        INSERT INTO assignments_tasks (
          id, workspace_id, project_id, title, description,
          assigned_to, assigned_to_name, created_by, status, priority, sort_order, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        workspaceId,
        projectId,
        title,
        description,
        String(coreUserId),
        userName || null,
        String(coreUserId),
        status,
        priority,
        sortOrder++,
        status === 'completed' ? new Date() : null,
      ],
    );
  }
}

export async function upsertMembershipFromCore(conn, { workspaceId, coreUserId, userEmail, userName, coreRoles }) {
  if (!workspaceId || !coreUserId) return null;
  const role = mapCoreRolesToWorkspaceRole(coreRoles);

  const [insertResult] = await conn.query(
    `
      INSERT INTO workspace_memberships (workspace_id, core_user_id, email, display_name, role, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      ON DUPLICATE KEY UPDATE
        email = VALUES(email),
        display_name = COALESCE(VALUES(display_name), display_name),
        role = VALUES(role),
        status = 'active'
    `,
    [workspaceId, String(coreUserId), userEmail || null, userName || null, role],
  );

  // affectedRows === 1 means a brand-new membership (2 means updated).
  if (insertResult?.affectedRows === 1) {
    try {
      await seedDemoData(conn, { workspaceId, coreUserId, userName });
    } catch (error) {
      console.warn(`demo seed skipped: ${error?.message || error}`);
    }
  }

  const [rows] = await conn.query(
    `
      SELECT *
      FROM workspace_memberships
      WHERE workspace_id = ? AND core_user_id = ?
      LIMIT 1
    `,
    [workspaceId, String(coreUserId)],
  );

  return rows[0] || null;
}

export async function syncWorkspacesFromCoreTenants(conn, { coreUserId, userEmail, userName, tenants }) {
  const items = [];
  for (const tenant of tenants || []) {
    const workspace = await upsertWorkspaceFromCoreTenant(conn, tenant);
    if (!workspace) continue;
    const membership = await upsertMembershipFromCore(conn, {
      workspaceId: workspace.id,
      coreUserId,
      userEmail,
      userName,
      coreRoles: tenant?.roles || [],
    });
    items.push({
      workspace_id: workspace.id,
      core_tenant_id: workspace.core_tenant_id,
      slug: workspace.slug,
      name: workspace.name,
      role: membership?.role || mapCoreRolesToWorkspaceRole(tenant?.roles || []),
      core_roles: normalizeRoles(tenant?.roles || []),
    });
  }
  return items;
}
