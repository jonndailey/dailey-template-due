import { randomUUID } from 'node:crypto';
import rrulePkg from 'rrule';

const { RRule } = rrulePkg;
import { pool, withTx } from '../db/pool.js';
import { logTaskActivity } from '../services/activityService.js';

export async function generateRecurringTasks() {
  const [templates] = await pool.query(
    `
      SELECT *
      FROM assignments_recurring
      WHERE is_active = 1
    `,
  );

  const windowStart = new Date();
  const windowEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let createdCount = 0;

  for (const template of templates) {
    let occurrences = [];
    try {
      occurrences = RRule.fromString(template.recurrence_rule).between(windowStart, windowEnd, true);
    } catch {
      continue;
    }

    for (const occurrence of occurrences) {
      const [rows] = await pool.query(
        `
          SELECT id
          FROM assignments_tasks
          WHERE recurring_template_id = ?
            AND DATE(due_date) = DATE(?)
          LIMIT 1
        `,
        [template.id, occurrence],
      );
      if (rows.length) continue;

      const taskId = randomUUID();
      await withTx(async (conn) => {
        await conn.query(
          `
            INSERT INTO assignments_tasks (
              id,
              workspace_id,
              project_id,
              title,
              assigned_to,
              assigned_to_name,
              created_by,
              status,
              priority,
              due_date,
              recurring_template_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'low', ?, ?)
          `,
          [
            taskId,
            template.workspace_id,
            template.project_id,
            template.title,
            template.assigned_to,
            template.assigned_to_name || null,
            template.created_by,
            occurrence,
            template.id,
          ],
        );
        await logTaskActivity(conn, {
          taskId,
          workspaceId: template.workspace_id,
          userId: template.created_by,
          userName: template.assigned_to_name || 'Recurring Generator',
          action: 'created',
          fieldName: 'recurring_template_id',
          newValue: template.id,
        });
      });
      createdCount += 1;
    }
  }

  if (createdCount > 0) {
    console.log(`generated ${createdCount} recurring tasks`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateRecurringTasks()
    .then(() => pool.end())
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
