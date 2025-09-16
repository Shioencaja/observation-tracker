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

-- Insert some default observation options for the current user
-- Note: This will only work if there's a user logged in
-- You may need to run this manually with a specific user_id
INSERT INTO observation_options (user_id, name, description, is_visible) VALUES
  (auth.uid(), 'Good behavior', 'Positive behavior observed', true),
  (auth.uid(), 'Needs attention', 'Behavior requiring attention', true),
  (auth.uid(), 'Following instructions', 'Student following directions well', true),
  (auth.uid(), 'Distracted', 'Student appears distracted', true),
  (auth.uid(), 'Helping others', 'Student helping classmates', true),
  (auth.uid(), 'Disruptive', 'Disruptive behavior observed', true),
  (auth.uid(), 'On task', 'Student is focused on assigned work', true),
  (auth.uid(), 'Off task', 'Student is not focused on assigned work', true)
ON CONFLICT DO NOTHING;
