-- NOTE: `ADD COLUMN IF NOT EXISTS` is MariaDB-only syntax and is a parse error
-- on MySQL 8 (which is what Dailey OS provisions). Plain `ADD COLUMN` is used
-- instead; the migration runner treats "already exists" errors as no-ops so
-- re-running a partially applied migration still converges.
ALTER TABLE workspace_memberships
  ADD COLUMN display_name VARCHAR(255) NULL AFTER email;

UPDATE workspace_memberships
SET display_name = COALESCE(display_name, email, core_user_id)
WHERE display_name IS NULL;

ALTER TABLE assignments_projects
  ADD COLUMN blitz_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER color_hex;

ALTER TABLE assignments_tasks
  ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER priority;

CREATE INDEX idx_task_pinned ON assignments_tasks (is_pinned);

CREATE TABLE IF NOT EXISTS assignments_project_collaborators (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id BIGINT UNSIGNED NOT NULL,
  project_id CHAR(36) NOT NULL,
  core_user_id CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_project_collaborator (project_id, core_user_id),
  KEY idx_project_collaborator_workspace_user (workspace_id, core_user_id),
  CONSTRAINT fk_project_collaborator_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_collaborator_project FOREIGN KEY (project_id) REFERENCES assignments_projects(id) ON DELETE CASCADE
);
