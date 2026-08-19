import { env } from '../config/env.js';
import { pool, withTx } from '../db/pool.js';
import {
  coreFetch,
  extractCoreTenantId,
  extractCoreUserId,
} from '../services/coreClient.js';
import {
  mapCoreRolesToWorkspaceRole,
  syncWorkspacesFromCoreTenants,
  upsertMembershipFromCore,
  upsertWorkspaceFromCoreTenant,
} from '../services/workspaceBootstrapService.js';

async function resolveWorkspace(conn, {
  workspaceId,
  coreTenantId,
  coreTenantSlug,
  coreUserId,
  coreEmail,
  coreUserName,
  coreRoles,
}) {
  let workspace = null;
  if (workspaceId) {
    const [rows] = await conn.query('SELECT * FROM workspaces WHERE id = ? LIMIT 1', [workspaceId]);
    workspace = rows[0] || null;
  }

  if (!workspace && coreTenantId) {
    const [rows] = await conn.query('SELECT * FROM workspaces WHERE core_tenant_id = ? LIMIT 1', [String(coreTenantId)]);
    workspace = rows[0] || null;
  }

  if (!workspace && coreTenantId && coreTenantSlug) {
    workspace = await upsertWorkspaceFromCoreTenant(conn, {
      id: coreTenantId,
      slug: coreTenantSlug,
      name: coreTenantSlug,
      roles: coreRoles,
    });
  }

  if (!workspace) {
    return null;
  }

  const [membershipRows] = await conn.query(
    `
      SELECT *
      FROM workspace_memberships
      WHERE workspace_id = ? AND core_user_id = ? AND status = 'active'
      LIMIT 1
    `,
    [workspace.id, String(coreUserId)],
  );

  let membership = membershipRows[0] || null;
  if (!membership) {
    membership = await upsertMembershipFromCore(conn, {
      workspaceId: workspace.id,
      coreUserId,
      userEmail: coreEmail,
      userName: coreUserName,
      coreRoles,
    });
  }

  return membership ? { workspace, membership } : null;
}

export async function internalAuth(req, res, next) {
  try {
    if (env.devBypassAuth) {
      req.auth = {
        coreUserId: env.devCoreUserId,
        workspaceId: Number(req.get('x-workspace-id') || 0) || null,
        role: 'admin',
        user: { id: env.devCoreUserId, email: 'dev@dailey.local', name: 'Dev User' },
        tokenInfo: { tenant: null },
      };
      return next();
    }

    const authHeader = req.get('authorization') || '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }

    const token = authHeader.slice(7);
    const coreMe = await coreFetch('/auth/me', { token });
    const coreUserId = extractCoreUserId(coreMe);
    const coreTenantId = extractCoreTenantId(coreMe);
    const coreUser = coreMe?.user || null;
    const coreRoles = Array.isArray(coreMe?.user?.roles)
      ? coreMe.user.roles
      : (Array.isArray(coreMe?.token_info?.roles) ? coreMe.token_info.roles : []);
    const requestedWorkspaceId = req.get('x-workspace-id') ? Number(req.get('x-workspace-id')) : null;

    if (!coreUserId) return res.status(401).json({ error: 'Core auth missing user id' });
    if (env.core.expectedAppId) {
      const tokenAppId = coreMe?.token_info?.app_id || null;
      if (!tokenAppId || String(tokenAppId) !== String(env.core.expectedAppId)) {
        return res.status(401).json({ error: 'Core token audience mismatch' });
      }
    }

    if (Array.isArray(coreMe?.tenants) && coreMe.tenants.length > 0) {
      await withTx(async (conn) => {
        await syncWorkspacesFromCoreTenants(conn, {
          coreUserId,
          userEmail: coreUser?.email || null,
          userName: coreUser?.name || null,
          tenants: coreMe.tenants,
        });
      });
    }

    const resolved = await withTx((conn) =>
      resolveWorkspace(conn, {
        workspaceId: requestedWorkspaceId,
        coreTenantId,
        coreTenantSlug: coreMe?.token_info?.tenant_slug || null,
        coreUserId,
        coreEmail: coreUser?.email || null,
        coreUserName: coreUser?.name || null,
        coreRoles,
      }),
    );

    if (!resolved) {
      return res.status(403).json({ error: 'Workspace is not available for this user' });
    }

    if (coreTenantId && String(resolved.workspace.core_tenant_id) !== String(coreTenantId)) {
      return res.status(403).json({ error: 'Workspace does not match current Core tenant' });
    }

    req.auth = {
      token,
      coreUserId,
      workspaceId: resolved.workspace.id,
      workspace: resolved.workspace,
      membership: resolved.membership,
      role: resolved.membership.role || mapCoreRolesToWorkspaceRole(coreRoles),
      user: coreUser,
      tokenInfo: coreMe?.token_info || {},
      coreRoles,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireWorkspaceRole(allowedRoles) {
  return (req, res, next) => {
    const role = req?.auth?.role;
    if (!role) return res.status(401).json({ error: 'Not authenticated' });
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}
