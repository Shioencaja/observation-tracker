-- ==============================================
-- UPDATE CONSTRAINTS TO ADD VOICE QUESTION TYPE
-- ==============================================
-- Run these commands in your Supabase SQL editor

-- 1. Drop the existing question_type constraint
ALTER TABLE project_observation_options 
DROP CONSTRAINT project_observation_options_question_type_check;

-- 2. Add the new constraint with 'voice' included
ALTER TABLE project_observation_options 
ADD CONSTRAINT project_observation_options_question_type_check 
CHECK (question_type = ANY (ARRAY['string'::text, 'boolean'::text, 'radio'::text, 'checkbox'::text, 'counter'::text, 'timer'::text, 'voice'::text]));

-- 3. Drop the existing options validation constraint
ALTER TABLE project_observation_options 
DROP CONSTRAINT project_observation_options_options_valid;

-- 4. Add the updated options validation constraint with 'voice' included
ALTER TABLE project_observation_options 
ADD CONSTRAINT project_observation_options_options_valid 
CHECK (
    ((question_type = ANY (ARRAY['radio'::text, 'checkbox'::text])) AND (array_length(options, 1) > 0)) OR 
    ((question_type = ANY (ARRAY['string'::text, 'boolean'::text, 'counter'::text, 'timer'::text, 'voice'::text])) AND (array_length(options, 1) = 0))
);

-- 5. Verify the changes
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'project_observation_options'::regclass 
    AND contype = 'c';

-- 6. Test by creating a voice question (optional)
-- INSERT INTO project_observation_options (project_id, name, description, question_type, options)
-- VALUES (
--     (SELECT id FROM projects LIMIT 1), 
--     'Test Voice Question', 
--     'Test description for voice recording', 
--     'voice', 
--     '{}'::text[]
-- );
