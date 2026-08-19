import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../db/pool.js';

const sessionSchema = z.object({
  source: z.string().min(1).max(50).optional(),
});

const blitzStartSchema = z.object({
  task_pool_size: z.number().int().min(0).max(12).optional(),
});

const blitzFinishSchema = z.object({
  selected_task_id: z.string().uuid().optional().nullable(),
  completed_count: z.number().int().min(0).max(50).optional(),
  moved_to_holding_count: z.number().int().min(0).max(50).optional(),
  status: z.enum(['completed', 'abandoned']).optional(),
});

function daysBetween(left, right) {
  return Math.abs(right.getTime() - left.getTime()) / (1000 * 60 * 60 * 24);
}

function startOfDay(value = new Date()) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(value = new Date()) {
  const next = startOfDay(value);
  const offset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - offset);
  return next;
}

function startOfMonth(value = new Date()) {
  const next = startOfDay(value);
  next.setDate(1);
  return next;
}

function startOfYear(value = new Date()) {
  const next = startOfDay(value);
  next.setMonth(0, 1);
  return next;
}

function isAfterOrEqual(left, right) {
  return left.getTime() >= right.getTime();
}

function minutesBetween(start, end) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
}

function sumSessionMinutes(rows, since, now) {
  return rows.reduce((total, row) => {
    const startedAt = new Date(row.started_at);
    const endedAt = new Date(row.ended_at || row.last_seen_at || now);
    const rangeStart = startedAt > since ? startedAt : since;
    const rangeEnd = endedAt < now ? endedAt : now;
    if (rangeEnd <= rangeStart) return total;
    return total + minutesBetween(rangeStart, rangeEnd);
  }, 0);
}

function countActivity(rows, since, predicate) {
  return rows.filter((row) => isAfterOrEqual(new Date(row.created_at), since) && predicate(row)).length;
}

function countDistinctTasks(rows, since) {
  return new Set(
    rows
      .filter((row) => isAfterOrEqual(new Date(row.created_at), since))
      .map((row) => row.task_id),
  ).size;
}

function buildPeriodSummary({ activityRows, sessionRows, blitzRows, attachmentRows, taskRows, since, now, currentUserId }) {
  const created = countActivity(activityRows, since, (row) => row.action === 'created');
  const completed = countActivity(activityRows, since, (row) => row.action === 'completed');
  const updated = countActivity(activityRows, since, (row) => ['updated', 'status_changed'].includes(row.action));
  const commented = countActivity(activityRows, since, (row) => row.action === 'commented');
  const assigned = countActivity(activityRows, since, (row) => String(row.field_name || '').includes('assigned_to'));
  const followUps = countActivity(activityRows, since, (row) => row.action === 'follow_up_added');
  const uploads = attachmentRows.filter((row) => isAfterOrEqual(new Date(row.uploaded_at), since)).length;
  const delegated = taskRows.filter((row) => (
    isAfterOrEqual(new Date(row.created_at), since)
    && String(row.created_by) === String(currentUserId)
    && String(row.assigned_to) !== String(currentUserId)
  )).length;
  const activeMinutes = sumSessionMinutes(sessionRows, since, now);
  const blitzInRange = blitzRows.filter((row) => isAfterOrEqual(new Date(row.started_at), since));
  const blitzes = blitzInRange.length;
  const blitzCompletedCount = blitzInRange.reduce((total, row) => total + Number(row.completed_count || 0), 0);
  const blitzHoldingCount = blitzInRange.reduce((total, row) => total + Number(row.moved_to_holding_count || 0), 0);
  const blitzMinutes = blitzInRange.reduce((total, row) => {
    const startedAt = new Date(row.started_at);
    const endedAt = new Date(row.ended_at || now);
    return total + minutesBetween(startedAt > since ? startedAt : since, endedAt < now ? endedAt : now);
  }, 0);
  const estimatedTaskMinutes = (
    created * 6
    + completed * 14
    + updated * 4
    + commented * 3
    + assigned * 2
    + followUps * 2
    + uploads * 2
  );

  return {
    created,
    completed,
    updated,
    commented,
    assigned,
    delegated,
    follow_ups: followUps,
    uploads,
    tasks_touched: countDistinctTasks(activityRows, since),
    active_minutes: activeMinutes,
    estimated_task_minutes: estimatedTaskMinutes,
    blitzes,
    blitz_completed_count: blitzCompletedCount,
    blitz_holding_count: blitzHoldingCount,
    blitz_minutes: blitzMinutes,
  };
}

function buildPattern(rows, formatter, size) {
  const counts = new Map();
  for (let index = 0; index < size; index += 1) {
    counts.set(index, 0);
  }
  for (const row of rows) {
    const date = new Date(row.created_at);
    const key = formatter.key(date);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].map(([key, total]) => ({
    key,
    label: formatter.label(key),
    total,
  }));
}

function maxByTotal(rows) {
  return rows.reduce((best, row) => (row.total > (best?.total || -1) ? row : best), null);
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function normalizeTaskTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/\b(mon(day)?|tue(s(day)?)?|wed(nesday)?|thu(rs(day)?)?|fri(day)?|sat(urday)?|sun(day)?)\b/g, ' ')
    .replace(/\b(daily|weekly|monthly|today|tomorrow|next week)\b/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cadenceFromGap(days) {
  if (days <= 2) return 'Daily';
  if (days <= 10) return 'Weekly';
  if (days <= 45) return 'Monthly';
  return 'Quarterly';
}

function nextWindowFromCadence(cadence) {
  if (cadence === 'Daily') return 'Today';
  if (cadence === 'Weekly') return 'This week';
  if (cadence === 'Monthly') return 'This month';
  return 'This quarter';
}

function buildRecommendations(taskRows) {
  const groups = new Map();

  for (const row of taskRows) {
    const normalized = normalizeTaskTitle(row.title);
    if (normalized.length < 4) continue;
    if (!groups.has(normalized)) groups.set(normalized, []);
    groups.get(normalized).push(row);
  }

  return [...groups.values()]
    .filter((rows) => rows.length >= 2)
    .map((rows) => {
      const sorted = [...rows].sort((left, right) => new Date(left.created_at) - new Date(right.created_at));
      const gaps = [];
      for (let index = 1; index < sorted.length; index += 1) {
        gaps.push(daysBetween(new Date(sorted[index - 1].created_at), new Date(sorted[index].created_at)));
      }
      const medianGap = median(gaps);
      const cadence = cadenceFromGap(medianGap);
      const latest = sorted[sorted.length - 1];

      return {
        key: normalizeTaskTitle(latest.title),
        title: latest.title,
        project_name: latest.project_name,
        cadence,
        next_window: nextWindowFromCadence(cadence),
        occurrences: sorted.length,
        last_seen_at: latest.created_at,
        median_gap_days: Math.round(medianGap * 10) / 10,
      };
    })
    .sort((left, right) => {
      if (right.occurrences !== left.occurrences) return right.occurrences - left.occurrences;
      return new Date(right.last_seen_at) - new Date(left.last_seen_at);
    })
    .slice(0, 5);
}

async function loadWorkSummary(auth) {
  const now = new Date();
  const yearStart = startOfYear(now);
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [activityRows] = await pool.query(
    `
      SELECT task_id, action, field_name, created_at
      FROM assignments_activity_log
      WHERE workspace_id = ?
        AND user_id = ?
        AND created_at >= ?
      ORDER BY created_at DESC
    `,
    [auth.workspaceId, auth.coreUserId, yearStart],
  );

  const [sessionRows] = await pool.query(
    `
      SELECT started_at, last_seen_at, ended_at
      FROM assignments_work_sessions
      WHERE workspace_id = ?
        AND core_user_id = ?
        AND last_seen_at >= ?
      ORDER BY started_at DESC
    `,
    [auth.workspaceId, auth.coreUserId, yearStart],
  );

  const [blitzRows] = await pool.query(
    `
      SELECT started_at, ended_at, status, completed_count, moved_to_holding_count
      FROM assignments_blitz_runs
      WHERE workspace_id = ?
        AND core_user_id = ?
        AND started_at >= ?
      ORDER BY started_at DESC
    `,
    [auth.workspaceId, auth.coreUserId, yearStart],
  );

  const [attachmentRows] = await pool.query(
    `
      SELECT uploaded_at
      FROM assignments_attachments
      WHERE workspace_id = ?
        AND uploaded_by = ?
        AND uploaded_at >= ?
      ORDER BY uploaded_at DESC
    `,
    [auth.workspaceId, auth.coreUserId, yearStart],
  );

  const [taskRows] = await pool.query(
    `
      SELECT
        t.id,
        t.title,
        t.project_id,
        t.assigned_to,
        t.created_by,
        t.created_at,
        t.completed_at,
        p.name AS project_name,
        p.color_hex
      FROM assignments_tasks t
      JOIN assignments_projects p
        ON p.id = t.project_id AND p.workspace_id = t.workspace_id
      WHERE t.workspace_id = ?
        AND t.status <> 'archived'
        AND (t.created_by = ? OR t.assigned_to = ?)
        AND t.created_at >= ?
      ORDER BY t.created_at DESC
    `,
    [auth.workspaceId, auth.coreUserId, auth.coreUserId, yearStart],
  );

  const [topProjects] = await pool.query(
    `
      SELECT
        p.id,
        p.name,
        p.color_hex,
        COUNT(*) AS total_activity,
        SUM(CASE WHEN a.action = 'created' THEN 1 ELSE 0 END) AS created_count,
        SUM(CASE WHEN a.action = 'completed' THEN 1 ELSE 0 END) AS completed_count
      FROM assignments_activity_log a
      JOIN assignments_tasks t
        ON t.id = a.task_id AND t.workspace_id = a.workspace_id
      JOIN assignments_projects p
        ON p.id = t.project_id AND p.workspace_id = t.workspace_id
      WHERE a.workspace_id = ?
        AND a.user_id = ?
        AND a.created_at >= ?
      GROUP BY p.id, p.name, p.color_hex
      ORDER BY total_activity DESC, completed_count DESC, created_count DESC
      LIMIT 6
    `,
    [auth.workspaceId, auth.coreUserId, ninetyDaysAgo],
  );

  const trendRows = activityRows.filter((row) => isAfterOrEqual(new Date(row.created_at), ninetyDaysAgo));
  const weeklyPattern = buildPattern(
    trendRows,
    {
      key: (date) => (date.getDay() + 6) % 7,
      label: (index) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
    },
    7,
  );
  const hourlyPattern = buildPattern(
    trendRows,
    {
      key: (date) => date.getHours(),
      label: (index) => {
        const suffix = index >= 12 ? 'PM' : 'AM';
        const hour = index % 12 || 12;
        return `${hour} ${suffix}`;
      },
    },
    24,
  );

  return {
    generated_at: now.toISOString(),
    periods: {
      day: buildPeriodSummary({ activityRows, sessionRows, blitzRows, attachmentRows, taskRows, since: dayStart, now, currentUserId: auth.coreUserId }),
      week: buildPeriodSummary({ activityRows, sessionRows, blitzRows, attachmentRows, taskRows, since: weekStart, now, currentUserId: auth.coreUserId }),
      month: buildPeriodSummary({ activityRows, sessionRows, blitzRows, attachmentRows, taskRows, since: monthStart, now, currentUserId: auth.coreUserId }),
      year: buildPeriodSummary({ activityRows, sessionRows, blitzRows, attachmentRows, taskRows, since: yearStart, now, currentUserId: auth.coreUserId }),
    },
    trends: {
      busiest_day: maxByTotal(weeklyPattern),
      busiest_hour: maxByTotal(hourlyPattern),
      weekly_pattern: weeklyPattern,
      hourly_pattern: hourlyPattern,
      top_projects: topProjects.map((row) => ({
        ...row,
        total_activity: Number(row.total_activity || 0),
        created_count: Number(row.created_count || 0),
        completed_count: Number(row.completed_count || 0),
      })),
    },
    recommendations: buildRecommendations(taskRows),
  };
}

export function workRouter() {
  const router = express.Router();

  router.get('/work/summary', async (req, res, next) => {
    try {
      res.json({ data: await loadWorkSummary(req.auth) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/work/sessions', async (req, res, next) => {
    try {
      const parsed = sessionSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });
      }

      const id = randomUUID();
      await pool.query(
        `
          INSERT INTO assignments_work_sessions (
            id,
            workspace_id,
            core_user_id,
            source,
            started_at,
            last_seen_at
          ) VALUES (?, ?, ?, ?, NOW(), NOW())
        `,
        [id, req.auth.workspaceId, req.auth.coreUserId, parsed.data.source || 'web'],
      );

      res.status(201).json({ data: { id } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/work/sessions/:sessionId/heartbeat', async (req, res, next) => {
    try {
      const [result] = await pool.query(
        `
          UPDATE assignments_work_sessions
          SET last_seen_at = NOW()
          WHERE id = ?
            AND workspace_id = ?
            AND core_user_id = ?
            AND ended_at IS NULL
        `,
        [req.params.sessionId, req.auth.workspaceId, req.auth.coreUserId],
      );

      if (!result.affectedRows) return res.status(404).json({ error: 'Session not found' });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post('/work/sessions/:sessionId/finish', async (req, res, next) => {
    try {
      const [result] = await pool.query(
        `
          UPDATE assignments_work_sessions
          SET last_seen_at = NOW(), ended_at = NOW()
          WHERE id = ?
            AND workspace_id = ?
            AND core_user_id = ?
            AND ended_at IS NULL
        `,
        [req.params.sessionId, req.auth.workspaceId, req.auth.coreUserId],
      );

      if (!result.affectedRows) return res.status(404).json({ error: 'Session not found' });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post('/work/blitz', async (req, res, next) => {
    try {
      const parsed = blitzStartSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });
      }

      const id = randomUUID();
      await pool.query(
        `
          INSERT INTO assignments_blitz_runs (
            id,
            workspace_id,
            core_user_id,
            task_pool_size,
            started_at
          ) VALUES (?, ?, ?, ?, NOW())
        `,
        [id, req.auth.workspaceId, req.auth.coreUserId, parsed.data.task_pool_size || 0],
      );

      res.status(201).json({ data: { id } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/work/blitz/:blitzId/finish', async (req, res, next) => {
    try {
      const parsed = blitzFinishSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid body', issues: parsed.error.issues });
      }

      const [result] = await pool.query(
        `
          UPDATE assignments_blitz_runs
          SET
            selected_task_id = ?,
            completed_count = ?,
            moved_to_holding_count = ?,
            status = ?,
            ended_at = NOW()
          WHERE id = ?
            AND workspace_id = ?
            AND core_user_id = ?
            AND ended_at IS NULL
        `,
        [
          parsed.data.selected_task_id || null,
          parsed.data.completed_count || 0,
          parsed.data.moved_to_holding_count || 0,
          parsed.data.status || 'completed',
          req.params.blitzId,
          req.auth.workspaceId,
          req.auth.coreUserId,
        ],
      );

      if (!result.affectedRows) return res.status(404).json({ error: 'Blitz run not found' });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
