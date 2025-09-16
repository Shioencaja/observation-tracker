-- Complete database recreation with support for multiple observation options
-- This script will:
-- 1. Drop all existing tables and related objects
-- 2. Recreate tables with proper structure
-- 3. Add support for multiple observation options
-- 4. Set up proper relationships and constraints

-- ==============================================
-- STEP 1: DROP ALL EXISTING TABLES AND OBJECTS
-- ==============================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS observations CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS observation_options CASCADE;

-- Drop any remaining functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_observation_options_updated_at() CASCADE;

-- ==============================================
-- STEP 2: CREATE OBSERVATION_OPTIONS TABLE
-- ==============================================

CREATE TABLE observation_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_observation_options_visible ON observation_options(is_visible);
CREATE INDEX idx_observation_options_created_at ON observation_options(created_at);
CREATE INDEX idx_observation_options_name ON observation_options(name);

-- Enable Row Level Security (RLS)
ALTER TABLE observation_options ENABLE ROW LEVEL SECURITY;

-- Create read-only RLS policies (users can only view, not modify)
CREATE POLICY "Authenticated users can view observation options" ON observation_options
  FOR SELECT USING (auth.role() = 'authenticated');

-- ==============================================
-- STEP 3: CREATE SESSIONS TABLE
-- ==============================================

CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);

-- Enable Row Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user-specific access
CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- STEP 4: CREATE OBSERVATIONS TABLE
-- ==============================================

CREATE TABLE observations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  option_ids TEXT, -- Comma-separated list of option IDs for multiple options
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_observations_session_id ON observations(session_id);
CREATE INDEX idx_observations_user_id ON observations(user_id);
CREATE INDEX idx_observations_created_at ON observations(created_at);
CREATE INDEX idx_observations_option_ids ON observations(option_ids);

-- Enable Row Level Security (RLS)
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- Create policies for user-specific access
CREATE POLICY "Users can view their own observations" ON observations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own observations" ON observations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own observations" ON observations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own observations" ON observations
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- STEP 5: CREATE UPDATE FUNCTIONS
-- ==============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function specifically for observation_options
CREATE OR REPLACE FUNCTION update_observation_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================
-- STEP 6: CREATE TRIGGERS
-- ==============================================

-- Triggers to automatically update updated_at
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_observations_updated_at
  BEFORE UPDATE ON observations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_observation_options_updated_at
  BEFORE UPDATE ON observation_options
  FOR EACH ROW
  EXECUTE FUNCTION update_observation_options_updated_at();

-- ==============================================
-- STEP 7: INSERT DEFAULT OBSERVATION OPTIONS
-- ==============================================

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
  ('Time management', 'Student managing time well', true),
  ('Confused', 'Student appears confused or needs clarification', true),
  ('Excited', 'Student showing enthusiasm for the topic', true),
  ('Frustrated', 'Student showing signs of frustration', true),
  ('Proud', 'Student showing pride in their work', true),
  ('Shy', 'Student being reserved or hesitant to participate', true)
ON CONFLICT (name) DO NOTHING;

-- ==============================================
-- STEP 8: CREATE HELPER FUNCTIONS FOR OPTIONS
-- ==============================================

-- Function to validate option IDs
CREATE OR REPLACE FUNCTION validate_option_ids(option_ids_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  option_id TEXT;
  option_count INTEGER;
BEGIN
  -- If null or empty, it's valid
  IF option_ids_text IS NULL OR option_ids_text = '' THEN
    RETURN TRUE;
  END IF;
  
  -- Check each option ID exists
  FOR option_id IN SELECT unnest(string_to_array(option_ids_text, ','))
  LOOP
    SELECT COUNT(*) INTO option_count 
    FROM observation_options 
    WHERE id = option_id::UUID;
    
    IF option_count = 0 THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get option names from comma-separated IDs
CREATE OR REPLACE FUNCTION get_option_names(option_ids_text TEXT)
RETURNS TEXT[] AS $$
BEGIN
  IF option_ids_text IS NULL OR option_ids_text = '' THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  RETURN ARRAY(
    SELECT name 
    FROM observation_options 
    WHERE id = ANY(string_to_array(option_ids_text, ',')::UUID[])
    ORDER BY name
  );
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- STEP 9: ADD CONSTRAINTS AND VALIDATIONS
-- ==============================================

-- Add constraint to validate option_ids format
ALTER TABLE observations 
ADD CONSTRAINT check_option_ids_format 
CHECK (
  option_ids IS NULL OR 
  option_ids = '' OR 
  option_ids ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(,[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})*$'
);

-- Add constraint to validate that all option IDs exist
ALTER TABLE observations 
ADD CONSTRAINT check_option_ids_exist 
CHECK (validate_option_ids(option_ids));

-- ==============================================
-- STEP 10: CREATE USEFUL VIEWS
-- ==============================================

-- View to get observations with option names
CREATE VIEW observations_with_options AS
SELECT 
  o.id,
  o.session_id,
  o.user_id,
  o.description,
  o.option_ids,
  o.created_at,
  o.updated_at,
  get_option_names(o.option_ids) as option_names,
  s.start_time as session_start_time,
  s.end_time as session_end_time
FROM observations o
JOIN sessions s ON o.session_id = s.id;

-- View to get session statistics
CREATE VIEW session_stats AS
SELECT 
  s.id as session_id,
  s.user_id,
  s.start_time,
  s.end_time,
  COUNT(o.id) as observation_count,
  COUNT(DISTINCT o.option_ids) as unique_option_combinations,
  array_agg(DISTINCT option_name) as all_option_names
FROM sessions s
LEFT JOIN observations o ON s.id = o.session_id
LEFT JOIN LATERAL unnest(get_option_names(o.option_ids)) as option_name ON true
GROUP BY s.id, s.user_id, s.start_time, s.end_time;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

-- Note: The database has been completely recreated with support for multiple observation options
-- Key changes:
-- 1. observation_options table is now global (no user_id)
-- 2. observations.option_ids stores comma-separated option IDs
-- 3. Helper functions for validation and name retrieval
-- 4. Proper constraints to ensure data integrity
-- 5. Useful views for common queries
-- 6. 25 default observation options available to all users

SELECT 'Database recreation completed successfully!' as status;
