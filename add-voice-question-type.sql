-- ==============================================
-- ADD VOICE QUESTION TYPE TO EXISTING SCHEMA
-- ==============================================
-- This migration adds the 'voice' question type to your existing database

-- 1. First, let's see the current question_type constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'project_observation_options'::regclass 
    AND contype = 'c';

-- 2. Drop the existing constraint (replace with your actual constraint name)
-- You'll need to replace 'project_observation_options_question_type_check' with the actual constraint name from step 1
-- ALTER TABLE project_observation_options DROP CONSTRAINT project_observation_options_question_type_check;

-- 3. Add the new constraint with 'voice' included
-- ALTER TABLE project_observation_options ADD CONSTRAINT project_observation_options_question_type_check 
-- CHECK (question_type IN ('string', 'boolean', 'radio', 'checkbox', 'counter', 'timer', 'voice'));

-- 4. Update the options validation constraint if it exists
-- First check if there's an options validation constraint:
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'project_observation_options'::regclass 
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%options%';

-- If there's an options validation constraint, you'll need to drop and recreate it:
-- ALTER TABLE project_observation_options DROP CONSTRAINT [constraint_name_from_above];
-- ALTER TABLE project_observation_options ADD CONSTRAINT project_observation_options_options_valid 
-- CHECK (
--     (question_type IN ('radio', 'checkbox') AND array_length(options, 1) > 0) OR
--     (question_type IN ('string', 'boolean', 'counter', 'timer', 'voice') AND array_length(options, 1) = 0)
-- );

-- 5. Verify the changes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'project_observation_options'
ORDER BY ordinal_position;
