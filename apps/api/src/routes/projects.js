import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireWorkspaceRole } from '../middleware/internalAuth.js';

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  blitz_enabled: z.boolean().optional(),
});

const updateProjectSchema = createProjectSchema.partial();
const collaboratorSchema = z.object({
  core_user_id: z.string().uuid(),
});

function mapProject(row) {
  if (!row) return row;
  return {
    ...row,
    blitz_enabled: Boolean(Number(row.blitz_enabled || 0)),
  };
}

async function loadProject(projectId, workspaceId) {
  const [rows] = await pool.query(
    'SELECT * FROM assignments_projects WHERE id = ? AND workspace_id = ? LIMIT 1',
    [projectId, workspaceId],
  );
  return mapProject(rows[0] || null);
}

async function loadMembership(workspaceId, coreUserId) {
  const [rows] = await pool.query(
    `
      SELECT *
      FROM workspace_memberships
      WHERE workspace_id = ? AND core_user_id = ? AND status = 'active'
      LIMIT 1
    `,
    [workspaceId, coreUserId],
  );
  return rows[0] || null;
}

async function isProjectCollaborator(workspaceId, projectId, coreUserId) {
  const [rows] = await pool.query(
    `
      SELECT 1
      FROM assignments_project_collaborators
      WHERE workspace_id = ? AND project_id = ? AND core_user_id = ?
      LIMIT 1
    `,
    [workspaceId, projectId, coreUserId],
  );
  return Boolean(rows[0]);
}

async function userHasAssignedTaskInProject(workspaceId, projectId, coreUserId) {
  const [rows] = await pool.query(
    `
      SELECT 1
      FROM assignments_tasks
      WHERE workspace_id = ?
        AND project_id = ?
        AND status <> 'archived'
        AND assigned_to = ?
      LIMIT 1
    `,
    [workspaceId, projectId, coreUserId],
  );
  return Boolean(rows[0]);
}

async function canAccessProject(project, auth) {
  if (!project) return false;
  if (auth.role === 'admin') return true;
  if (await isProjectCollaborator(auth.workspaceId, project.id, auth.coreUserId)) return true;
  return userHasAssignedTaskInProject(auth.workspaceId, project.id, auth.coreUserId);
}

async function canManageProject(project, auth) {
  if (!project) return false;
  if (auth.role === 'admin') return true;
  return isProjectCollaborator(auth.workspaceId, project.id, auth.coreUserId);
}

export function projectsRouter() {
  const router = express.Router();

  router.get('/projects', async (req, res, next) => {
    try {
      const params = [req.auth.workspaceId];
      let visibilityFilter = '';

      if (req.auth.role !== 'admin') {
        visibilityFilter = `
          AND (
            EXISTS (
              SELECT 1
              FROM assignments_project_collaborators c
              WHERE c.workspace_id = p.workspace_id
                AND c.project_id = p.id
                AND c.core_user_id = ?
            )
            OR EXISTS (
              SELECT 1
              FROM assignments_tasks t
              WHERE t.workspace_id = p.workspace_id
                AND t.project_id = p.id
                AND t.status <> 'archived'
                AND t.assigned_to = ?
            )
          )
        `;
        params.push(req.auth.coreUserId, req.auth.coreUserId);
      }

      const [rows] = await pool.query(
        `
          SELECT id, name, project_type, color_hex, blitz_enabled, created_by, created_at, updated_at
          FROM assignments_projects p
          WHERE workspace_id = ?
          ${visibilityFilter}
          ORDER BY name ASC
        `,
        params,
      );
      res.json({ data: rows.map(mapProject) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/projects', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });

      const id = randomUUID();
      await pool.query(
        `
          INSERT INTO assignments_projects (id, workspace_id, name, color_hex, blitz_enabled, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          req.auth.workspaceId,
          parsed.data.name,
          parsed.data.color_hex || null,
          parsed.data.blitz_enabled ? 1 : 0,
          req.auth.coreUserId,
        ],
      );
      await pool.query(
        `
          INSERT INTO assignments_project_collaborators (workspace_id, project_id, core_user_id)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE core_user_id = VALUES(core_user_id)
        `,
        [req.auth.workspaceId, id, req.auth.coreUserId],
      );

      res.status(201).json({ data: await loadProject(id, req.auth.workspaceId) });
    } catch (error) {
      next(error);
    }
  });

  router.put('/projects/:projectId', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const parsed = updateProjectSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });
      const existing = await loadProject(req.params.projectId, req.auth.workspaceId);
      if (!existing) return res.status(404).json({ error: 'Project not found' });
      if (!(await canManageProject(existing, req.auth))) {
        return res.status(403).json({ error: 'Cannot update this project' });
      }

      const updates = [];
      const values = [];
      if (parsed.data.name !== undefined) {
        updates.push('name = ?');
        values.push(parsed.data.name);
      }
      if (parsed.data.color_hex !== undefined) {
        updates.push('color_hex = ?');
        values.push(parsed.data.color_hex || null);
      }
      if (parsed.data.blitz_enabled !== undefined) {
        updates.push('blitz_enabled = ?');
        values.push(parsed.data.blitz_enabled ? 1 : 0);
      }
      if (!updates.length) return res.json({ data: existing });

      values.push(req.params.projectId, req.auth.workspaceId);
      await pool.query(
        `
          UPDATE assignments_projects
          SET ${updates.join(', ')}
          WHERE id = ? AND workspace_id = ?
        `,
        values,
      );

      res.json({ data: await loadProject(req.params.projectId, req.auth.workspaceId) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/projects/:projectId/collaborators', async (req, res, next) => {
    try {
      const project = await loadProject(req.params.projectId, req.auth.workspaceId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      if (!(await canAccessProject(project, req.auth))) {
        return res.status(403).json({ error: 'Cannot access this project' });
      }

      const [rows] = await pool.query(
        `
          SELECT
            c.core_user_id AS id,
            COALESCE(m.display_name, m.email, c.core_user_id) AS display_name,
            m.email,
            m.role
          FROM assignments_project_collaborators c
          LEFT JOIN workspace_memberships m
            ON m.workspace_id = c.workspace_id AND m.core_user_id = c.core_user_id
          WHERE c.workspace_id = ? AND c.project_id = ?
          ORDER BY COALESCE(m.display_name, m.email, c.core_user_id) ASC
        `,
        [req.auth.workspaceId, req.params.projectId],
      );

      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.post('/projects/:projectId/collaborators', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const project = await loadProject(req.params.projectId, req.auth.workspaceId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      if (!(await canManageProject(project, req.auth))) {
        return res.status(403).json({ error: 'Cannot manage collaborators for this project' });
      }

      const parsed = collaboratorSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });

      const membership = await loadMembership(req.auth.workspaceId, parsed.data.core_user_id);
      if (!membership) {
        return res.status(400).json({ error: 'Collaborator must be an active workspace member' });
      }

      await pool.query(
        `
          INSERT INTO assignments_project_collaborators (workspace_id, project_id, core_user_id)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE core_user_id = VALUES(core_user_id)
        `,
        [req.auth.workspaceId, req.params.projectId, parsed.data.core_user_id],
      );

      const [rows] = await pool.query(
        `
          SELECT
            m.core_user_id AS id,
            COALESCE(m.display_name, m.email, m.core_user_id) AS display_name,
            m.email,
            m.role
          FROM workspace_memberships m
          WHERE m.workspace_id = ? AND m.core_user_id = ?
          LIMIT 1
        `,
        [req.auth.workspaceId, parsed.data.core_user_id],
      );

      res.status(201).json({ data: rows[0] || null });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/projects/:projectId/collaborators/:coreUserId', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const project = await loadProject(req.params.projectId, req.auth.workspaceId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      if (!(await canManageProject(project, req.auth))) {
        return res.status(403).json({ error: 'Cannot manage collaborators for this project' });
      }

      await pool.query(
        `
          DELETE FROM assignments_project_collaborators
          WHERE workspace_id = ? AND project_id = ? AND core_user_id = ?
        `,
        [req.auth.workspaceId, req.params.projectId, req.params.coreUserId],
      );
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/projects/:projectId', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const project = await loadProject(req.params.projectId, req.auth.workspaceId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      if (!(await canManageProject(project, req.auth))) {
        return res.status(403).json({ error: 'Cannot delete this project' });
      }

      await pool.query(
        'DELETE FROM assignments_projects WHERE id = ? AND workspace_id = ?',
        [req.params.projectId, req.auth.workspaceId],
      );
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
