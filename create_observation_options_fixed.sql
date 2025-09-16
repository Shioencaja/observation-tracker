-- Create observation_options table
CREATE TABLE IF NOT EXISTS observation_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_observation_options_user_id ON observation_options(user_id);
CREATE INDEX IF NOT EXISTS idx_observation_options_visible ON observation_options(is_visible);
CREATE INDEX IF NOT EXISTS idx_observation_options_created_at ON observation_options(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE observation_options ENABLE ROW LEVEL SECURITY;

-- Create policies for user-specific access
CREATE POLICY "Users can view their own observation options" ON observation_options
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own observation options" ON observation_options
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own observation options" ON observation_options
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own observation options" ON observation_options
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_observation_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_observation_options_updated_at
  BEFORE UPDATE ON observation_options
  FOR EACH ROW
  EXECUTE FUNCTION update_observation_options_updated_at();

-- Add option_id column to observations table
ALTER TABLE observations ADD COLUMN IF NOT EXISTS option_id UUID REFERENCES observation_options(id) ON DELETE SET NULL;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_observations_option_id ON observations(option_id);

-- Note: The default options will be created automatically when users first log in
-- through the application interface, or you can manually insert them for specific users
-- by replacing 'YOUR_USER_ID_HERE' with the actual user ID from auth.users table

-- To manually insert default options for a specific user, uncomment and modify this:
/*
INSERT INTO observation_options (user_id, name, description, is_visible) VALUES
  ('YOUR_USER_ID_HERE', 'Good behavior', 'Positive behavior observed', true),
  ('YOUR_USER_ID_HERE', 'Needs attention', 'Behavior requiring attention', true),
  ('YOUR_USER_ID_HERE', 'Following instructions', 'Student following directions well', true),
  ('YOUR_USER_ID_HERE', 'Distracted', 'Student appears distracted', true),
  ('YOUR_USER_ID_HERE', 'Helping others', 'Student helping classmates', true),
  ('YOUR_USER_ID_HERE', 'Disruptive', 'Disruptive behavior observed', true),
  ('YOUR_USER_ID_HERE', 'On task', 'Student is focused on assigned work', true),
  ('YOUR_USER_ID_HERE', 'Off task', 'Student is not focused on assigned work', true)
ON CONFLICT DO NOTHING;
*/
