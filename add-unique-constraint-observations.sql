-- Add unique constraint to prevent duplicate observations
-- This ensures only one observation per session per question

-- Add unique constraint on session_id and project_observation_option_id
ALTER TABLE observations 
ADD CONSTRAINT unique_observation_per_session_per_question 
UNIQUE (session_id, project_observation_option_id);

-- Create index for better performance on the unique constraint
CREATE INDEX IF NOT EXISTS idx_observations_session_question_unique 
ON observations (session_id, project_observation_option_id);

-- Verify the constraint was added
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'observations'::regclass 
AND conname = 'unique_observation_per_session_per_question';

