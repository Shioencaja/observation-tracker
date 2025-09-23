-- ==============================================
-- ADD VOICE QUESTION TYPE - FINAL MIGRATION
-- ==============================================
-- Run these commands in your Supabase SQL editor

-- 1. First, check current constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'project_observation_options'::regclass 
    AND contype = 'c';

-- 2. Drop the existing question_type constraint (replace with actual name from step 1)
-- Example: ALTER TABLE project_observation_options DROP CONSTRAINT project_observation_options_question_type_check;

-- 3. Add the new constraint with 'voice' included
ALTER TABLE project_observation_options 
ADD CONSTRAINT project_observation_options_question_type_check 
CHECK (question_type IN ('string', 'boolean', 'radio', 'checkbox', 'counter', 'timer', 'voice'));

-- 4. Check if there's an options validation constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'project_observation_options'::regclass 
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%options%';

-- 5. If there's an options validation constraint, drop and recreate it
-- (Replace 'constraint_name' with the actual name from step 4)
-- ALTER TABLE project_observation_options DROP CONSTRAINT constraint_name;
-- ALTER TABLE project_observation_options ADD CONSTRAINT project_observation_options_options_valid 
-- CHECK (
--     (question_type IN ('radio', 'checkbox') AND array_length(options, 1) > 0) OR
--     (question_type IN ('string', 'boolean', 'counter', 'timer', 'voice') AND array_length(options, 1) = 0)
-- );

-- 6. Verify the changes
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'project_observation_options'::regclass 
    AND contype = 'c';

-- 7. Test by inserting a voice question type (optional)
-- INSERT INTO project_observation_options (project_id, name, description, question_type, options)
-- VALUES (
--     (SELECT id FROM projects LIMIT 1), 
--     'Test Voice Question', 
--     'Test description', 
--     'voice', 
--     '{}'::text[]
-- );
