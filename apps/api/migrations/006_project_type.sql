-- Project classification: 'personal' (default, all existing projects) vs
-- 'agent' (Company OS agent-fed department landing projects).
ALTER TABLE assignments_projects
  ADD COLUMN project_type VARCHAR(24) NOT NULL DEFAULT 'personal' AFTER name;
