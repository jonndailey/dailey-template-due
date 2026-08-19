import { randomUUID } from 'node:crypto';

export async function logTaskActivity(conn, {
  taskId,
  workspaceId,
  userId,
  userName,
  action,
  fieldName = null,
  oldValue = null,
  newValue = null,
}) {
  await conn.query(
    `
      INSERT INTO assignments_activity_log (
        id,
        task_id,
        workspace_id,
        user_id,
        user_name,
        action,
        field_name,
        old_value,
        new_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      randomUUID(),
      taskId,
      workspaceId,
      userId,
      userName || null,
      action,
      fieldName,
      oldValue,
      newValue,
    ],
  );
}
