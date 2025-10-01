-- Migrate conditional logic from index-based to ID-based
-- Run this in your Supabase SQL editor

-- Add the new column for question ID references
ALTER TABLE project_observation_options 
ADD COLUMN IF NOT EXISTS depends_on_question_id UUID REFERENCES project_observation_options(id);

-- Add comment
COMMENT ON COLUMN project_observation_options.depends_on_question_id IS 'ID of the question this option depends on (for conditional logic)';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_project_observation_options_depends_on_question_id 
ON project_observation_options(depends_on_question_id);

-- Drop the old integer column if it exists
ALTER TABLE project_observation_options 
DROP COLUMN IF EXISTS depends_on_question;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'project_observation_options' 
AND column_name IN ('depends_on_question_id', 'depends_on_answer')
ORDER BY column_name;




