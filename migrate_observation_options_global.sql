-- Migration to make observation_options global (not linked to user_id)
-- This script will:
-- 1. Drop existing RLS policies
-- 2. Remove user_id column and related constraints
-- 3. Update RLS policies for global access
-- 4. Remove user-specific indexes

-- Step 1: Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own observation options" ON observation_options;
DROP POLICY IF EXISTS "Users can insert their own observation options" ON observation_options;
DROP POLICY IF EXISTS "Users can update their own observation options" ON observation_options;
DROP POLICY IF EXISTS "Users can delete their own observation options" ON observation_options;

-- Step 2: Drop the user_id index
DROP INDEX IF EXISTS idx_observation_options_user_id;

-- Step 3: Remove user_id column and its foreign key constraint
ALTER TABLE observation_options DROP CONSTRAINT IF EXISTS observation_options_user_id_fkey;
ALTER TABLE observation_options DROP COLUMN IF EXISTS user_id;

-- Step 4: Create new RLS policies for global access
-- Allow all authenticated users to view observation options
CREATE POLICY "Authenticated users can view observation options" ON observation_options
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert observation options
CREATE POLICY "Authenticated users can insert observation options" ON observation_options
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update observation options
CREATE POLICY "Authenticated users can update observation options" ON observation_options
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow all authenticated users to delete observation options
CREATE POLICY "Authenticated users can delete observation options" ON observation_options
  FOR DELETE USING (auth.role() = 'authenticated');

-- Step 5: Insert some default global observation options
-- These will be available to all users
INSERT INTO observation_options (name, description, is_visible) VALUES
  ('Good behavior', 'Positive behavior observed', true),
  ('Needs attention', 'Behavior requiring attention', true),
  ('Following instructions', 'Student following directions well', true),
  ('Distracted', 'Student appears distracted', true),
  ('Helping others', 'Student helping classmates', true),
  ('Disruptive', 'Disruptive behavior observed', true),
  ('On task', 'Student is focused on assigned work', true),
  ('Off task', 'Student is not focused on assigned work', true),
  ('Participating', 'Student actively participating in class', true),
  ('Quiet', 'Student is being quiet and respectful', true),
  ('Asking questions', 'Student asking relevant questions', true),
  ('Working independently', 'Student working on their own', true),
  ('Collaborating', 'Student working well with others', true),
  ('Creative thinking', 'Student showing creative problem solving', true),
  ('Leadership', 'Student demonstrating leadership qualities', true)
ON CONFLICT (name) DO NOTHING;

-- Note: The ON CONFLICT clause assumes we might want to add a unique constraint on name
-- If you want to prevent duplicate option names globally, you can add:
-- ALTER TABLE observation_options ADD CONSTRAINT unique_option_name UNIQUE (name);
