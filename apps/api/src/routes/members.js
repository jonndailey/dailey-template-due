import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireWorkspaceRole } from '../middleware/internalAuth.js';

const createMemberSchema = z.object({
  display_name: z.string().min(1).max(255),
  email: z.string().email().max(320).optional().nullable(),
  role: z.enum(['admin', 'member', 'viewer']).optional(),
});

async function loadMember(workspaceId, coreUserId) {
  const [rows] = await pool.query(
    `
      SELECT
        core_user_id AS id,
        display_name,
        email,
        role,
        status
      FROM workspace_memberships
      WHERE workspace_id = ? AND core_user_id = ?
      LIMIT 1
    `,
    [workspaceId, coreUserId],
  );
  return rows[0] || null;
}

export function membersRouter() {
  const router = express.Router();

  router.get('/members', async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `
          SELECT
            core_user_id AS id,
            COALESCE(display_name, email, core_user_id) AS display_name,
            email,
            role,
            status
          FROM workspace_memberships
          WHERE workspace_id = ? AND status = 'active'
          ORDER BY COALESCE(display_name, email, core_user_id) ASC
        `,
        [req.auth.workspaceId],
      );
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.post('/members', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const parsed = createMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });
      }

      const coreUserId = randomUUID();
      await pool.query(
        `
          INSERT INTO workspace_memberships (
            workspace_id,
            core_user_id,
            email,
            display_name,
            role,
            status
          ) VALUES (?, ?, ?, ?, ?, 'active')
        `,
        [
          req.auth.workspaceId,
          coreUserId,
          parsed.data.email || null,
          parsed.data.display_name,
          parsed.data.role || 'member',
        ],
      );

      res.status(201).json({ data: await loadMember(req.auth.workspaceId, coreUserId) });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/members/:memberId', requireWorkspaceRole(['admin']), async (req, res, next) => {
    try {
      if (String(req.params.memberId) === String(req.auth.coreUserId)) {
        return res.status(400).json({ error: 'Cannot remove your own workspace access' });
      }

      const existing = await loadMember(req.auth.workspaceId, req.params.memberId);
      if (!existing || existing.status !== 'active') {
        return res.status(404).json({ error: 'Member not found' });
      }

      const [taskRows] = await pool.query(
        `
          SELECT COUNT(*) AS count
          FROM assignments_tasks
          WHERE workspace_id = ?
            AND assigned_to = ?
            AND status NOT IN ('completed', 'archived')
        `,
        [req.auth.workspaceId, req.params.memberId],
      );
      if (Number(taskRows[0]?.count || 0) > 0) {
        return res.status(409).json({ error: 'Reassign or complete active tasks before removing this employee' });
      }

      await pool.query(
        `
          UPDATE workspace_memberships
          SET status = 'inactive'
          WHERE workspace_id = ? AND core_user_id = ?
        `,
        [req.auth.workspaceId, req.params.memberId],
      );

      await pool.query(
        `
          DELETE FROM assignments_project_collaborators
          WHERE workspace_id = ? AND core_user_id = ?
        `,
        [req.auth.workspaceId, req.params.memberId],
      );

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
