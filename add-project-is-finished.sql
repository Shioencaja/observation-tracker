-- Add is_finished column to projects table
-- This allows project creators to mark projects as finished
-- When finished, users cannot create new observations and only the creator can access history

-- Add the column with default false
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS is_finished BOOLEAN DEFAULT FALSE;

-- Update existing projects to not be finished by default
UPDATE projects
SET is_finished = FALSE
WHERE is_finished IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.is_finished IS 'Indicates if the project has been finished by the creator. When true, users cannot register new observations and only the creator can access history.';

