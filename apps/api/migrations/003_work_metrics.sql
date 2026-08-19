CREATE INDEX idx_activity_workspace_user_created
  ON assignments_activity_log (workspace_id, user_id, created_at);

CREATE INDEX idx_attachment_workspace_uploader_created
  ON assignments_attachments (workspace_id, uploaded_by, uploaded_at);

CREATE TABLE IF NOT EXISTS assignments_work_sessions (
  id CHAR(36) PRIMARY KEY,
  workspace_id BIGINT UNSIGNED NOT NULL,
  core_user_id CHAR(36) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'web',
  started_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_work_sessions_user_started (workspace_id, core_user_id, started_at),
  CONSTRAINT fk_work_session_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments_blitz_runs (
  id CHAR(36) PRIMARY KEY,
  workspace_id BIGINT UNSIGNED NOT NULL,
  core_user_id CHAR(36) NOT NULL,
  task_pool_size INT NOT NULL DEFAULT 0,
  selected_task_id CHAR(36) NULL,
  completed_count INT NOT NULL DEFAULT 0,
  moved_to_holding_count INT NOT NULL DEFAULT 0,
  status ENUM('active', 'completed', 'abandoned') NOT NULL DEFAULT 'active',
  started_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_blitz_runs_user_started (workspace_id, core_user_id, started_at),
  CONSTRAINT fk_blitz_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_blitz_selected_task FOREIGN KEY (selected_task_id) REFERENCES assignments_tasks(id) ON DELETE SET NULL
);
