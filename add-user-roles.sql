-- Add role column to project_users table
-- Roles: creator, admin, editor, viewer

-- First, create the role enum type
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('creator', 'admin', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to project_users table
ALTER TABLE project_users
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'viewer';

-- Update existing records to have default role
UPDATE project_users
SET role = 'viewer'
WHERE role IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN project_users.role IS 'User role in the project: creator (project owner), admin (full access except delete), editor (can edit and view), viewer (read-only)';

-- Note: The project creator is tracked in projects.created_by
-- When adding users via project_users, their role determines their permissions:
-- - creator: Only one per project (the projects.created_by user), full control including delete
-- - admin: Can manage users, edit project, manage questions, view all sessions
-- - editor: Can create sessions, edit observations, view all sessions
-- - viewer: Can only view sessions and observations (read-only)

