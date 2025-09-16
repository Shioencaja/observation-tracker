-- Migration to drop and recreate observation_options table with global, read-only options
-- This script will:
-- 1. Drop the existing observation_options table (and all its data)
-- 2. Recreate the table without user_id
-- 3. Set up read-only RLS policies
-- 4. Insert predefined global options

-- Step 1: Drop the existing table (this will also drop all constraints, indexes, and policies)
DROP TABLE IF EXISTS observation_options CASCADE;

-- Step 2: Recreate the observation_options table without user_id
CREATE TABLE observation_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for better performance
CREATE INDEX idx_observation_options_visible ON observation_options(is_visible);
CREATE INDEX idx_observation_options_created_at ON observation_options(created_at);
CREATE INDEX idx_observation_options_name ON observation_options(name);

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE observation_options ENABLE ROW LEVEL SECURITY;

-- Step 5: Create read-only RLS policies (users can only view, not modify)
-- Allow all authenticated users to view observation options
CREATE POLICY "Authenticated users can view observation options" ON observation_options
  FOR SELECT USING (auth.role() = 'authenticated');

-- Step 6: Insert predefined global observation options
-- These will be available to all users and cannot be modified by users
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
  ('Leadership', 'Student demonstrating leadership qualities', true),
  ('Respectful', 'Student showing respect to others', true),
  ('Prepared', 'Student comes to class prepared', true),
  ('Engaged', 'Student is actively engaged in learning', true),
  ('Problem solving', 'Student working through problems effectively', true),
  ('Time management', 'Student managing time well', true);

-- Step 7: Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_observation_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 8: Create trigger to automatically update updated_at
CREATE TRIGGER update_observation_options_updated_at
  BEFORE UPDATE ON observation_options
  FOR EACH ROW
  EXECUTE FUNCTION update_observation_options_updated_at();

-- Note: Users will only be able to SELECT from this table
-- No INSERT, UPDATE, or DELETE policies are created, making it effectively read-only for users
-- Only database administrators can modify the options directly
