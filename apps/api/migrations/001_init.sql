CREATE TABLE IF NOT EXISTS workspaces (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  core_tenant_id CHAR(36) NOT NULL UNIQUE,
  slug VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_memberships (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id BIGINT UNSIGNED NOT NULL,
  core_user_id CHAR(36) NOT NULL,
  email VARCHAR(320) NULL,
  role ENUM('admin', 'member', 'viewer') NOT NULL DEFAULT 'member',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_workspace_member (workspace_id, core_user_id),
  CONSTRAINT fk_membership_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments_projects (
  id CHAR(36) PRIMARY KEY,
  workspace_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  color_hex VARCHAR(7) NULL,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_project_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments_tasks (
  id CHAR(36) PRIMARY KEY,
  workspace_id BIGINT UNSIGNED NOT NULL,
  parent_task_id CHAR(36) NULL,
  project_id CHAR(36) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NULL,
  assigned_to CHAR(36) NOT NULL,
  assigned_to_name VARCHAR(255) NULL,
  created_by CHAR(36) NOT NULL,
  status ENUM('active', 'waiting', 'paused', 'completed', 'archived') NOT NULL DEFAULT 'active',
  priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  due_date DATETIME NULL,
  sort_order INT NOT NULL DEFAULT 0,
  recurring_template_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CONSTRAINT fk_task_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_parent FOREIGN KEY (parent_task_id) REFERENCES assignments_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_project FOREIGN KEY (project_id) REFERENCES assignments_projects(id) ON DELETE CASCADE,
  KEY idx_task_workspace_parent (workspace_id, parent_task_id),
  KEY idx_task_assigned_to (assigned_to),
  KEY idx_task_status (status),
  KEY idx_task_due_date (due_date)
);

CREATE TABLE IF NOT EXISTS assignments_notes (
  id CHAR(36) PRIMARY KEY,
  task_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_by_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_note_task FOREIGN KEY (task_id) REFERENCES assignments_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_note_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments_attachments (
  id CHAR(36) PRIMARY KEY,
  task_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  object_key VARCHAR(1024) NOT NULL,
  file_size BIGINT UNSIGNED NULL,
  mime_type VARCHAR(128) NULL,
  uploaded_by CHAR(36) NOT NULL,
  uploaded_by_name VARCHAR(255) NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attachment_task FOREIGN KEY (task_id) REFERENCES assignments_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_attachment_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments_waiting_on (
  id CHAR(36) PRIMARY KEY,
  task_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  waiting_on_user_id CHAR(36) NOT NULL,
  waiting_on_user_name VARCHAR(255) NULL,
  expected_response_date DATETIME NULL,
  reminder_frequency ENUM('daily', 'every-2-days', 'weekly') NOT NULL DEFAULT 'daily',
  last_reminder_sent DATETIME NULL,
  is_dismissed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_waiting_task FOREIGN KEY (task_id) REFERENCES assignments_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_waiting_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments_activity_log (
  id CHAR(36) PRIMARY KEY,
  task_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  user_id CHAR(36) NOT NULL,
  user_name VARCHAR(255) NULL,
  action VARCHAR(50) NOT NULL,
  field_name VARCHAR(100) NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_task FOREIGN KEY (task_id) REFERENCES assignments_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  KEY idx_activity_task_created (task_id, created_at)
);

CREATE TABLE IF NOT EXISTS assignments_meetings (
  id CHAR(36) PRIMARY KEY,
  workspace_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  scheduled_for DATETIME NULL,
  location VARCHAR(255) NULL,
  notes TEXT NULL,
  expected_outcome TEXT NULL,
  follow_up_date DATETIME NULL,
  created_by CHAR(36) NOT NULL,
  created_by_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_meeting_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments_meeting_tasks (
  id CHAR(36) PRIMARY KEY,
  meeting_id CHAR(36) NOT NULL,
  task_id CHAR(36) NOT NULL,
  CONSTRAINT fk_meeting_task_meeting FOREIGN KEY (meeting_id) REFERENCES assignments_meetings(id) ON DELETE CASCADE,
  CONSTRAINT fk_meeting_task_task FOREIGN KEY (task_id) REFERENCES assignments_tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments_meeting_attendees (
  id CHAR(36) PRIMARY KEY,
  meeting_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  user_name VARCHAR(255) NULL,
  CONSTRAINT fk_meeting_attendee_meeting FOREIGN KEY (meeting_id) REFERENCES assignments_meetings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments_recurring (
  id CHAR(36) PRIMARY KEY,
  workspace_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(500) NOT NULL,
  project_id CHAR(36) NOT NULL,
  assigned_to CHAR(36) NOT NULL,
  assigned_to_name VARCHAR(255) NULL,
  created_by CHAR(36) NOT NULL,
  recurrence_rule TEXT NOT NULL,
  frequency ENUM('daily', 'weekly', 'biweekly', 'monthly') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recurring_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_recurring_project FOREIGN KEY (project_id) REFERENCES assignments_projects(id) ON DELETE CASCADE
);
