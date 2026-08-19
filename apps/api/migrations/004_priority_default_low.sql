ALTER TABLE assignments_tasks
  MODIFY COLUMN priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'low';
