-- Complete database recreation without description column in observations
-- This script will:
-- 1. Drop all existing tables and related objects
-- 2. Recreate tables with proper structure
-- 3. Remove description column from observations table
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
DROP FUNCTION IF EXISTS get_option_names(TEXT) CASCADE;
DROP FUNCTION IF EXISTS validate_option_ids(TEXT) CASCADE;

-- Drop views
DROP VIEW IF EXISTS session_stats CASCADE;

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
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_end_time ON sessions(end_time);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- STEP 4: CREATE HELPER FUNCTIONS (BEFORE TABLES THAT USE THEM)
-- ==============================================

-- Function to validate option IDs
CREATE OR REPLACE FUNCTION validate_option_ids(option_ids TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  option_id_array TEXT[];
  option_id TEXT;
  option_count INTEGER;
BEGIN
  IF option_ids IS NULL OR option_ids = '' THEN
    RETURN TRUE;
  END IF;
  
  option_id_array := string_to_array(option_ids, ',');
  
  -- Check if all option IDs exist
  FOR option_id IN SELECT unnest(option_id_array)
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
CREATE OR REPLACE FUNCTION get_option_names(option_ids TEXT)
RETURNS TEXT[] AS $$
BEGIN
  IF option_ids IS NULL OR option_ids = '' THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  RETURN ARRAY(
    SELECT name 
    FROM observation_options 
    WHERE id = ANY(string_to_array(option_ids, ',')::UUID[])
    ORDER BY name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- STEP 5: CREATE OBSERVATIONS TABLE (WITHOUT DESCRIPTION)
-- ==============================================

CREATE TABLE observations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_ids TEXT, -- Comma-separated list of option IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Validate that all option_ids exist in observation_options
  CONSTRAINT valid_option_ids CHECK (
    option_ids IS NULL OR 
    validate_option_ids(option_ids)
  )
);

-- Create indexes for better performance
CREATE INDEX idx_observations_session_id ON observations(session_id);
CREATE INDEX idx_observations_user_id ON observations(user_id);
CREATE INDEX idx_observations_created_at ON observations(created_at);
CREATE INDEX idx_observations_updated_at ON observations(updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own observations" ON observations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own observations" ON observations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own observations" ON observations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own observations" ON observations
  FOR DELETE USING (auth.uid() = user_id);


-- ==============================================
-- STEP 6: CREATE TRIGGERS
-- ==============================================

-- Trigger for sessions table
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for observations table
CREATE TRIGGER update_observations_updated_at
  BEFORE UPDATE ON observations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for observation_options table
CREATE TRIGGER update_observation_options_updated_at
  BEFORE UPDATE ON observation_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- STEP 7: CREATE VIEWS
-- ==============================================

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
-- STEP 8: INSERT DEFAULT OBSERVATION OPTIONS
-- ==============================================

-- Insert default global observation options
INSERT INTO observation_options (name, description, is_visible) VALUES
-- Academic/Educational Options
('Academic Performance', 'Student academic achievements and performance', true),
('Attention/Focus', 'Student attention and focus levels', true),
('Behavioral Issues', 'Problematic behaviors observed', true),
('Class Participation', 'Level of participation in class activities', true),
('Comprehension', 'Understanding of material being taught', true),
('Critical Thinking', 'Evidence of critical thinking skills', true),
('Following Instructions', 'Ability to follow directions and instructions', true),
('Group Work', 'Performance in collaborative activities', true),
('Homework Completion', 'Completion and quality of homework assignments', true),
('Independent Work', 'Ability to work independently', true),
('Learning Style', 'Preferred learning methods and styles', true),
('Motivation', 'Level of motivation and engagement', true),
('Problem Solving', 'Approach to solving problems', true),
('Reading Skills', 'Reading ability and comprehension', true),
('Social Skills', 'Interpersonal and social interaction skills', true),
('Study Habits', 'Study techniques and organization', true),
('Test Performance', 'Performance on assessments and tests', true),
('Time Management', 'Ability to manage time effectively', true),
('Writing Skills', 'Writing ability and expression', true),

-- Behavioral/Emotional Options
('Aggressive Behavior', 'Physical or verbal aggression', true),
('Anxiety', 'Signs of anxiety or worry', true),
('Confidence', 'Level of self-confidence', true),
('Cooperation', 'Willingness to cooperate with others', true),
('Emotional Regulation', 'Ability to manage emotions', true),
('Frustration', 'Signs of frustration or anger', true),
('Impulse Control', 'Ability to control impulses', true),
('Leadership', 'Leadership qualities and behaviors', true),
('Peer Relationships', 'Interactions with classmates', true),
('Respect', 'Showing respect for others and rules', true),
('Self-Control', 'Ability to control behavior', true),
('Social Interaction', 'Quality of social interactions', true),
('Stress', 'Signs of stress or pressure', true),
('Teamwork', 'Ability to work effectively in teams', true),

-- Environmental/Contextual Options
('Classroom Environment', 'Physical and social classroom conditions', true),
('Distractions', 'Environmental distractions affecting learning', true),
('Equipment Use', 'Use of classroom materials and technology', true),
('Physical Environment', 'Physical space and setup observations', true),
('Routine Changes', 'Response to changes in routine', true),
('Seating Arrangement', 'Impact of seating on behavior/learning', true),
('Technology Integration', 'Use of technology in learning', true),

-- Health/Physical Options
('Energy Level', 'Physical energy and alertness', true),
('Health Concerns', 'Physical health observations', true),
('Physical Activity', 'Level of physical movement and activity', true),
('Sleepiness', 'Signs of fatigue or sleepiness', true),

-- Communication Options
('Communication Skills', 'Verbal and non-verbal communication', true),
('Listening Skills', 'Ability to listen and follow instructions', true),
('Question Asking', 'Willingness and ability to ask questions', true),
('Response Time', 'Speed of response to questions or tasks', true),
('Speaking Skills', 'Oral communication abilities', true),

-- Special Needs/Support Options
('Accommodations', 'Use of special accommodations or supports', true),
('Assistive Technology', 'Use of assistive devices or technology', true),
('Individual Support', 'Need for or response to individual help', true),
('Special Needs', 'Observations related to special needs', true),
('Support Services', 'Use of additional support services', true);

-- ==============================================
-- STEP 9: GRANT PERMISSIONS
-- ==============================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON observation_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON observations TO authenticated;
GRANT SELECT ON session_stats TO authenticated;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

-- Display completion message
DO $$
BEGIN
  RAISE NOTICE 'Database recreation completed successfully!';
  RAISE NOTICE 'Tables created: observation_options, sessions, observations';
  RAISE NOTICE 'Description column removed from observations table';
  RAISE NOTICE 'Default observation options inserted: % options', (SELECT COUNT(*) FROM observation_options);
  RAISE NOTICE 'RLS policies and triggers configured';
  RAISE NOTICE 'Helper functions and views created';
END $$;
