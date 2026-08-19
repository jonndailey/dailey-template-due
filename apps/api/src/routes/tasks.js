import express from 'express';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { z } from 'zod';
import { pool, withTx } from '../db/pool.js';
import { requireWorkspaceRole } from '../middleware/internalAuth.js';
import { logTaskActivity } from '../services/activityService.js';
import { buildAttachmentObjectKey, deleteObject, getObject, uploadBuffer } from '../storage/index.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const taskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional().nullable(),
  project_id: z.string().uuid(),
  assigned_to: z.string().uuid(),
  assigned_to_name: z.string().max(255).optional().nullable(),
  status: z.enum(['active', 'waiting', 'paused', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  due_date: z.string().datetime().optional().nullable(),
  parent_task_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().optional(),
  is_pinned: z.boolean().optional(),
});

const taskUpdateSchema = taskSchema.partial();
const noteSchema = z.object({ content: z.string().min(1) });
const waitingSchema = z.object({
  waiting_on_user_id: z.string().uuid(),
  waiting_on_user_name: z.string().max(255).optional().nullable(),
  expected_response_date: z.string().datetime().optional().nullable(),
  reminder_frequency: z.enum(['daily', 'every-2-days', 'weekly']).optional(),
});

function mapTaskRow(row) {
  if (!row) return row;
  return {
    ...row,
    is_pinned: Boolean(Number(row.is_pinned || 0)),
  };
}

function buildTaskTree(rows) {
  const mapped = rows.map((row) => ({ ...mapTaskRow(row), children: [] }));
  const map = new Map(mapped.map((row) => [row.id, row]));
  const roots = [];

  for (const row of mapped) {
    if (row.parent_task_id && map.has(row.parent_task_id)) {
      map.get(row.parent_task_id).children.push(row);
    } else {
      roots.push(row);
    }
  }

  return roots;
}

function findTaskAndDescendants(rows, taskId) {
  const childrenByParent = new Map();
  for (const row of rows) {
    const key = row.parent_task_id || '__root__';
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(row);
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  const visited = new Set();
  const output = [];
  const stack = [taskId];

  while (stack.length) {
    const current = stack.pop();
    if (visited.has(current)) continue;
    visited.add(current);

    const currentRow = byId.get(current);
    if (currentRow) output.push(currentRow);

    for (const child of childrenByParent.get(current) || []) {
      stack.push(child.id);
    }
  }

  return buildTaskTree(output)[0] || null;
}

async function loadTaskForWrite(taskId, workspaceId) {
  const [rows] = await pool.query(
    'SELECT * FROM assignments_tasks WHERE id = ? AND workspace_id = ? LIMIT 1',
    [taskId, workspaceId],
  );
  return rows[0] || null;
}

async function loadProject(projectId, workspaceId) {
  const [rows] = await pool.query(
    'SELECT * FROM assignments_projects WHERE id = ? AND workspace_id = ? LIMIT 1',
    [projectId, workspaceId],
  );
  return rows[0] || null;
}

async function loadWorkspaceMembership(workspaceId, coreUserId) {
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

async function canAccessProject(projectId, auth) {
  const project = await loadProject(projectId, auth.workspaceId);
  if (!project) return false;
  if (auth.role === 'admin') return true;
  if (await isProjectCollaborator(auth.workspaceId, projectId, auth.coreUserId)) return true;
  return userHasAssignedTaskInProject(auth.workspaceId, projectId, auth.coreUserId);
}

function relationError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildTaskVisibilityClause(alias, auth) {
  if (auth.role === 'admin') {
    return { sql: '1 = 1', params: [] };
  }

  return {
    sql: `
      (
        ${alias}.assigned_to = ?
        OR EXISTS (
          SELECT 1
          FROM assignments_project_collaborators c
          WHERE c.workspace_id = ${alias}.workspace_id
            AND c.project_id = ${alias}.project_id
            AND c.core_user_id = ?
        )
      )
    `,
    params: [auth.coreUserId, auth.coreUserId],
  };
}

async function canViewTask(task, auth) {
  if (!task) return false;
  if (auth.role === 'admin') return true;
  if (String(task.assigned_to) === String(auth.coreUserId)) return true;
  return isProjectCollaborator(auth.workspaceId, task.project_id, auth.coreUserId);
}

async function canMutateTask(task, auth) {
  if (!task) return false;
  if (auth.role === 'admin') return true;
  if (String(task.assigned_to) === String(auth.coreUserId)) return true;
  return isProjectCollaborator(auth.workspaceId, task.project_id, auth.coreUserId);
}

async function loadAuthorizedTask(taskId, auth, { mutate = false } = {}) {
  const task = await loadTaskForWrite(taskId, auth.workspaceId);
  if (!task) {
    return { statusCode: 404, error: 'Task not found', task: null };
  }

  const allowed = mutate
    ? await canMutateTask(task, auth)
    : await canViewTask(task, auth);

  if (!allowed) {
    return {
      statusCode: 403,
      error: mutate ? 'Cannot change this task' : 'Cannot access this task',
      task: null,
    };
  }

  return { task };
}

async function resolveMemberDisplay(workspaceId, coreUserId, fallbackName = null) {
  const membership = await loadWorkspaceMembership(workspaceId, coreUserId);
  if (!membership) {
    throw relationError(400, 'User must be an active member of the current workspace');
  }

  return {
    id: membership.core_user_id,
    name: membership.display_name || membership.email || fallbackName || membership.core_user_id,
  };
}

async function ensureTaskRelations({ workspaceId, taskId = null, payload, auth }) {
  let parentTask = null;

  if (payload.project_id !== undefined) {
    const project = await loadProject(payload.project_id, workspaceId);
    if (!project) {
      throw relationError(400, 'Project must belong to the current workspace');
    }
    if (!(await canAccessProject(payload.project_id, auth))) {
      throw relationError(403, 'Project is not available to the current user');
    }
  }

  if (payload.parent_task_id) {
    if (taskId && String(payload.parent_task_id) === String(taskId)) {
      throw relationError(400, 'Task cannot be its own parent');
    }

    parentTask = await loadTaskForWrite(payload.parent_task_id, workspaceId);
    if (!parentTask) {
      throw relationError(400, 'Parent task must belong to the current workspace');
    }

    if (payload.project_id && String(parentTask.project_id) !== String(payload.project_id)) {
      throw relationError(400, 'Subtask must stay in the same project as its parent task');
    }

    if (taskId) {
      const [rows] = await pool.query(
        'SELECT id, parent_task_id FROM assignments_tasks WHERE workspace_id = ?',
        [workspaceId],
      );
      const parentById = new Map(rows.map((row) => [String(row.id), row.parent_task_id ? String(row.parent_task_id) : null]));
      let current = String(payload.parent_task_id);
      const target = String(taskId);
      while (current) {
        if (current === target) {
          throw relationError(400, 'Task parent would create a cycle');
        }
        current = parentById.get(current) || null;
      }
    }
  }

  let assignee = null;
  if (payload.assigned_to !== undefined) {
    assignee = await resolveMemberDisplay(workspaceId, payload.assigned_to, payload.assigned_to_name || null);
  }

  return {
    assignee,
    parentTask,
  };
}

async function countIncompleteChildren(taskId, workspaceId) {
  const [rows] = await pool.query(
    `
      SELECT COUNT(*) AS count
      FROM assignments_tasks
      WHERE parent_task_id = ? AND workspace_id = ? AND status NOT IN ('completed', 'archived')
    `,
    [taskId, workspaceId],
  );
  return Number(rows[0]?.count || 0);
}

async function ensureTaskCanComplete(taskId, workspaceId) {
  const incompleteChildren = await countIncompleteChildren(taskId, workspaceId);
  if (incompleteChildren > 0) {
    throw relationError(409, 'Cannot complete task with uncompleted subtasks');
  }
}

async function createTaskRecord({ auth, payload }) {
  const { assignee } = await ensureTaskRelations({ workspaceId: auth.workspaceId, payload, auth });
  const id = randomUUID();

  await withTx(async (conn) => {
    await conn.query(
      `
        INSERT INTO assignments_tasks (
          id,
          workspace_id,
          parent_task_id,
          project_id,
          title,
          description,
          assigned_to,
          assigned_to_name,
          created_by,
          status,
          priority,
          is_pinned,
          due_date,
          sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        auth.workspaceId,
        payload.parent_task_id || null,
        payload.project_id,
        payload.title,
        payload.description || null,
        assignee?.id || payload.assigned_to,
        assignee?.name || payload.assigned_to_name || null,
        auth.coreUserId,
        payload.status || 'active',
        payload.priority || 'low',
        payload.is_pinned ? 1 : 0,
        payload.due_date ? new Date(payload.due_date) : null,
        payload.sort_order || 0,
      ],
    );
    await logTaskActivity(conn, {
      taskId: id,
      workspaceId: auth.workspaceId,
      userId: auth.coreUserId,
      userName: auth.user?.name || auth.user?.email,
      action: 'created',
      newValue: payload.title,
    });
  });

  return mapTaskRow(await loadTaskForWrite(id, auth.workspaceId));
}

async function getVisibleWorkspaceTasks(auth, options = {}) {
  const visibility = buildTaskVisibilityClause('t', auth);
  const filters = ['t.workspace_id = ?', visibility.sql];
  const params = [auth.workspaceId, ...visibility.params];

  if (options.projectId) {
    filters.push('t.project_id = ?');
    params.push(options.projectId);
  }

  if (options.status) {
    filters.push('t.status = ?');
    params.push(options.status);
  } else {
    filters.push("t.status <> 'archived'");
  }

  const [rows] = await pool.query(
    `
      SELECT
        t.*,
        p.name AS project_name
      FROM assignments_tasks t
      JOIN assignments_projects p ON p.id = t.project_id AND p.workspace_id = t.workspace_id
      WHERE ${filters.join(' AND ')}
      ORDER BY
        t.is_pinned DESC,
        CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        t.due_date IS NULL,
        t.due_date ASC,
        t.sort_order ASC,
        t.created_at DESC
    `,
    params,
  );

  return rows.map(mapTaskRow);
}

export function tasksRouter() {
  const router = express.Router();

  router.get('/tasks', async (req, res, next) => {
    try {
      const assignedTo = req.query.assigned_to ? String(req.query.assigned_to) : '';
      const projectId = req.query.project_id ? String(req.query.project_id) : '';
      const status = req.query.status ? String(req.query.status) : '';

      const rows = await getVisibleWorkspaceTasks(req.auth, {
        projectId: projectId || null,
        status: status || null,
      });

      const filtered = assignedTo
        ? rows.filter((task) => String(task.assigned_to) === assignedTo)
        : rows;

      res.json({ data: buildTaskTree(filtered) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/tasks', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const parsed = taskSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });
      const task = await createTaskRecord({ auth: req.auth, payload: parsed.data });
      res.status(201).json({ data: task });
    } catch (error) {
      next(error);
    }
  });

  router.post('/tasks/:taskId/subtasks', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const parentResult = await loadAuthorizedTask(req.params.taskId, req.auth, { mutate: true });
      if (!parentResult.task) {
        return res.status(parentResult.statusCode).json({ error: parentResult.error });
      }

      const parsed = taskSchema.safeParse({
        ...req.body,
        parent_task_id: req.params.taskId,
        project_id: req.body?.project_id || parentResult.task.project_id,
      });
      if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });

      const task = await createTaskRecord({ auth: req.auth, payload: parsed.data });
      res.status(201).json({ data: task });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tasks/:taskId', async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth);
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      const allTasks = await getVisibleWorkspaceTasks(req.auth);
      const detailTree = findTaskAndDescendants(allTasks, req.params.taskId);

      const [notes] = await pool.query(
        `
          SELECT *
          FROM assignments_notes
          WHERE task_id = ? AND workspace_id = ?
          ORDER BY created_at DESC
        `,
        [req.params.taskId, req.auth.workspaceId],
      );
      const [attachments] = await pool.query(
        `
          SELECT *
          FROM assignments_attachments
          WHERE task_id = ? AND workspace_id = ?
          ORDER BY uploaded_at DESC
        `,
        [req.params.taskId, req.auth.workspaceId],
      );
      const [activity] = await pool.query(
        `
          SELECT *
          FROM assignments_activity_log
          WHERE task_id = ? AND workspace_id = ?
          ORDER BY created_at DESC
        `,
        [req.params.taskId, req.auth.workspaceId],
      );
      const [waiting] = await pool.query(
        `
          SELECT *
          FROM assignments_waiting_on
          WHERE task_id = ? AND workspace_id = ?
          ORDER BY created_at DESC
        `,
        [req.params.taskId, req.auth.workspaceId],
      );

      res.json({
        data: {
          ...detailTree,
          notes,
          attachments,
          activity,
          waiting_on: waiting,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/tasks/:taskId', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const parsed = taskUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });

      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth, { mutate: true });
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      await ensureTaskRelations({
        workspaceId: req.auth.workspaceId,
        taskId: req.params.taskId,
        payload: parsed.data,
        auth: req.auth,
      });

      if (parsed.data.status === 'completed') {
        await ensureTaskCanComplete(req.params.taskId, req.auth.workspaceId);
      }

      const updates = [];
      const values = [];

      if (parsed.data.title !== undefined) {
        updates.push('title = ?');
        values.push(parsed.data.title);
      }
      if (parsed.data.description !== undefined) {
        updates.push('description = ?');
        values.push(parsed.data.description || null);
      }
      if (parsed.data.project_id !== undefined) {
        updates.push('project_id = ?');
        values.push(parsed.data.project_id);
      }
      if (parsed.data.assigned_to !== undefined) {
        const assignee = await resolveMemberDisplay(
          req.auth.workspaceId,
          parsed.data.assigned_to,
          parsed.data.assigned_to_name || null,
        );
        updates.push('assigned_to = ?');
        values.push(assignee.id);
        updates.push('assigned_to_name = ?');
        values.push(assignee.name);
      }
      if (parsed.data.status !== undefined) {
        updates.push('status = ?');
        values.push(parsed.data.status);
        updates.push('completed_at = ?');
        values.push(parsed.data.status === 'completed' ? new Date() : null);
      }
      if (parsed.data.priority !== undefined) {
        updates.push('priority = ?');
        values.push(parsed.data.priority);
      }
      if (parsed.data.is_pinned !== undefined) {
        updates.push('is_pinned = ?');
        values.push(parsed.data.is_pinned ? 1 : 0);
      }
      if (parsed.data.due_date !== undefined) {
        updates.push('due_date = ?');
        values.push(parsed.data.due_date ? new Date(parsed.data.due_date) : null);
      }
      if (parsed.data.parent_task_id !== undefined) {
        updates.push('parent_task_id = ?');
        values.push(parsed.data.parent_task_id || null);
      }
      if (parsed.data.sort_order !== undefined) {
        updates.push('sort_order = ?');
        values.push(parsed.data.sort_order);
      }

      if (!updates.length) {
        return res.json({ data: mapTaskRow(taskResult.task) });
      }

      values.push(req.params.taskId, req.auth.workspaceId);
      await withTx(async (conn) => {
        await conn.query(
          `
            UPDATE assignments_tasks
            SET ${updates.join(', ')}
            WHERE id = ? AND workspace_id = ?
          `,
          values,
        );
        await logTaskActivity(conn, {
          taskId: req.params.taskId,
          workspaceId: req.auth.workspaceId,
          userId: req.auth.coreUserId,
          userName: req.auth.user?.name || req.auth.user?.email,
          action: 'updated',
          fieldName: Object.keys(parsed.data).join(','),
        });
      });

      res.json({ data: mapTaskRow(await loadTaskForWrite(req.params.taskId, req.auth.workspaceId)) });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/tasks/:taskId', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth, { mutate: true });
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      await withTx(async (conn) => {
        await conn.query(
          `
            UPDATE assignments_tasks
            SET status = 'archived'
            WHERE id = ? AND workspace_id = ?
          `,
          [req.params.taskId, req.auth.workspaceId],
        );
        await logTaskActivity(conn, {
          taskId: req.params.taskId,
          workspaceId: req.auth.workspaceId,
          userId: req.auth.coreUserId,
          userName: req.auth.user?.name || req.auth.user?.email,
          action: 'archived',
        });
      });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/tasks/:taskId/status', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const status = String(req.body?.status || '');
      if (!['active', 'waiting', 'paused', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth, { mutate: true });
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }
      if (status === 'completed') {
        await ensureTaskCanComplete(req.params.taskId, req.auth.workspaceId);
      }

      await withTx(async (conn) => {
        await conn.query(
          `
            UPDATE assignments_tasks
            SET status = ?, completed_at = IF(? = 'completed', NOW(), NULL)
            WHERE id = ? AND workspace_id = ?
          `,
          [status, status, req.params.taskId, req.auth.workspaceId],
        );
        await logTaskActivity(conn, {
          taskId: req.params.taskId,
          workspaceId: req.auth.workspaceId,
          userId: req.auth.coreUserId,
          userName: req.auth.user?.name || req.auth.user?.email,
          action: 'status_changed',
          fieldName: 'status',
          newValue: status,
        });
      });

      res.json({ data: mapTaskRow(await loadTaskForWrite(req.params.taskId, req.auth.workspaceId)) });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/tasks/:taskId/complete', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth, { mutate: true });
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }
      await ensureTaskCanComplete(req.params.taskId, req.auth.workspaceId);

      await withTx(async (conn) => {
        await conn.query(
          `
            UPDATE assignments_tasks
            SET status = 'completed', completed_at = NOW()
            WHERE id = ? AND workspace_id = ?
          `,
          [req.params.taskId, req.auth.workspaceId],
        );
        await logTaskActivity(conn, {
          taskId: req.params.taskId,
          workspaceId: req.auth.workspaceId,
          userId: req.auth.coreUserId,
          userName: req.auth.user?.name || req.auth.user?.email,
          action: 'completed',
        });
      });

      res.json({ data: mapTaskRow(await loadTaskForWrite(req.params.taskId, req.auth.workspaceId)) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tasks/:taskId/activity', async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth);
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      const [rows] = await pool.query(
        `
          SELECT *
          FROM assignments_activity_log
          WHERE task_id = ? AND workspace_id = ?
          ORDER BY created_at DESC
        `,
        [req.params.taskId, req.auth.workspaceId],
      );
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tasks/:taskId/notes', async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth);
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      const [rows] = await pool.query(
        `
          SELECT *
          FROM assignments_notes
          WHERE task_id = ? AND workspace_id = ?
          ORDER BY created_at DESC
        `,
        [req.params.taskId, req.auth.workspaceId],
      );
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.post('/tasks/:taskId/notes', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth, { mutate: true });
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      const parsed = noteSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });

      const id = randomUUID();
      await withTx(async (conn) => {
        await conn.query(
          `
            INSERT INTO assignments_notes (
              id, task_id, workspace_id, content, created_by, created_by_name
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            id,
            req.params.taskId,
            req.auth.workspaceId,
            parsed.data.content,
            req.auth.coreUserId,
            req.auth.user?.name || req.auth.user?.email || null,
          ],
        );
        await logTaskActivity(conn, {
          taskId: req.params.taskId,
          workspaceId: req.auth.workspaceId,
          userId: req.auth.coreUserId,
          userName: req.auth.user?.name || req.auth.user?.email,
          action: 'commented',
          newValue: parsed.data.content,
        });
      });

      const [rows] = await pool.query(
        'SELECT * FROM assignments_notes WHERE id = ? AND workspace_id = ? LIMIT 1',
        [id, req.auth.workspaceId],
      );
      res.status(201).json({ data: rows[0] || null });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tasks/:taskId/waiting-on', async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth);
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      const [rows] = await pool.query(
        `
          SELECT *
          FROM assignments_waiting_on
          WHERE task_id = ? AND workspace_id = ?
          ORDER BY created_at DESC
        `,
        [req.params.taskId, req.auth.workspaceId],
      );
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.post('/tasks/:taskId/waiting-on', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth, { mutate: true });
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      const parsed = waitingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });

      const waitingUser = await resolveMemberDisplay(
        req.auth.workspaceId,
        parsed.data.waiting_on_user_id,
        parsed.data.waiting_on_user_name || null,
      );

      const id = randomUUID();
      await withTx(async (conn) => {
        await conn.query(
          `
            INSERT INTO assignments_waiting_on (
              id,
              task_id,
              workspace_id,
              waiting_on_user_id,
              waiting_on_user_name,
              expected_response_date,
              reminder_frequency
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            id,
            req.params.taskId,
            req.auth.workspaceId,
            waitingUser.id,
            waitingUser.name,
            parsed.data.expected_response_date ? new Date(parsed.data.expected_response_date) : null,
            parsed.data.reminder_frequency || 'daily',
          ],
        );
        await logTaskActivity(conn, {
          taskId: req.params.taskId,
          workspaceId: req.auth.workspaceId,
          userId: req.auth.coreUserId,
          userName: req.auth.user?.name || req.auth.user?.email,
          action: 'follow_up_added',
          newValue: waitingUser.name,
        });
      });
      const [rows] = await pool.query(
        'SELECT * FROM assignments_waiting_on WHERE id = ? AND workspace_id = ? LIMIT 1',
        [id, req.auth.workspaceId],
      );
      res.status(201).json({ data: rows[0] || null });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/tasks/:taskId/waiting-on/:id', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth, { mutate: true });
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      await withTx(async (conn) => {
        await conn.query(
          'DELETE FROM assignments_waiting_on WHERE id = ? AND task_id = ? AND workspace_id = ?',
          [req.params.id, req.params.taskId, req.auth.workspaceId],
        );
        await logTaskActivity(conn, {
          taskId: req.params.taskId,
          workspaceId: req.auth.workspaceId,
          userId: req.auth.coreUserId,
          userName: req.auth.user?.name || req.auth.user?.email,
          action: 'follow_up_cleared',
        });
      });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/tasks/:taskId/waiting-on/:id/dismiss', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth, { mutate: true });
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      await pool.query(
        'UPDATE assignments_waiting_on SET is_dismissed = 1 WHERE id = ? AND task_id = ? AND workspace_id = ?',
        [req.params.id, req.params.taskId, req.auth.workspaceId],
      );
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tasks/:taskId/attachments', async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth);
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      const [rows] = await pool.query(
        `
          SELECT *
          FROM assignments_attachments
          WHERE task_id = ? AND workspace_id = ?
          ORDER BY uploaded_at DESC
        `,
        [req.params.taskId, req.auth.workspaceId],
      );
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  });

  router.post('/tasks/:taskId/attachments', requireWorkspaceRole(['admin', 'member']), upload.single('file'), async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth, { mutate: true });
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      if (!req.file) return res.status(400).json({ error: 'Missing file' });
      const fileId = randomUUID();
      const objectKey = buildAttachmentObjectKey({
        workspaceSlug: req.auth.workspace.slug,
        taskId: req.params.taskId,
        fileId,
        filename: req.file.originalname,
      });

      await uploadBuffer({
        objectKey,
        body: req.file.buffer,
        contentType: req.file.mimetype,
      });

      await withTx(async (conn) => {
        await conn.query(
          `
            INSERT INTO assignments_attachments (
              id,
              task_id,
              workspace_id,
              file_name,
              object_key,
              file_size,
              mime_type,
              uploaded_by,
              uploaded_by_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            fileId,
            req.params.taskId,
            req.auth.workspaceId,
            req.file.originalname,
            objectKey,
            req.file.size,
            req.file.mimetype,
            req.auth.coreUserId,
            req.auth.user?.name || req.auth.user?.email || null,
          ],
        );
        await logTaskActivity(conn, {
          taskId: req.params.taskId,
          workspaceId: req.auth.workspaceId,
          userId: req.auth.coreUserId,
          userName: req.auth.user?.name || req.auth.user?.email,
          action: 'attachment_uploaded',
          newValue: req.file.originalname,
        });
      });

      res.status(201).json({
        data: {
          id: fileId,
          file_name: req.file.originalname,
          object_key: objectKey,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tasks/:taskId/attachments/:attachmentId/download', async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth);
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      const [rows] = await pool.query(
        `
          SELECT *
          FROM assignments_attachments
          WHERE id = ? AND task_id = ? AND workspace_id = ?
          LIMIT 1
        `,
        [req.params.attachmentId, req.params.taskId, req.auth.workspaceId],
      );
      const attachment = rows[0];
      if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

      const object = await getObject(attachment.object_key);
      res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${attachment.file_name}"`);
      object.Body.pipe(res);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/tasks/:taskId/attachments/:attachmentId', requireWorkspaceRole(['admin', 'member']), async (req, res, next) => {
    try {
      const taskResult = await loadAuthorizedTask(req.params.taskId, req.auth, { mutate: true });
      if (!taskResult.task) {
        return res.status(taskResult.statusCode).json({ error: taskResult.error });
      }

      const [rows] = await pool.query(
        `
          SELECT *
          FROM assignments_attachments
          WHERE id = ? AND task_id = ? AND workspace_id = ?
          LIMIT 1
        `,
        [req.params.attachmentId, req.params.taskId, req.auth.workspaceId],
      );
      const attachment = rows[0];
      if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

      await deleteObject(attachment.object_key);
      await withTx(async (conn) => {
        await conn.query(
          'DELETE FROM assignments_attachments WHERE id = ? AND workspace_id = ?',
          [req.params.attachmentId, req.auth.workspaceId],
        );
        await logTaskActivity(conn, {
          taskId: req.params.taskId,
          workspaceId: req.auth.workspaceId,
          userId: req.auth.coreUserId,
          userName: req.auth.user?.name || req.auth.user?.email,
          action: 'attachment_deleted',
          oldValue: attachment.file_name,
        });
      });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
