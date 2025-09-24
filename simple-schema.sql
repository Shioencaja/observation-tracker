-- ==============================================
-- OBSERVATION TRACKER - SIMPLE SCHEMA
-- ==============================================
-- Simplified database schema based on Supabase types
-- Use this for quick setup and testing
-- ==============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- CREATE TABLES
-- ==============================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agencies TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agency TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project observation options table (questions)
CREATE TABLE IF NOT EXISTS project_observation_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    question_type TEXT NOT NULL,
    options TEXT[] DEFAULT '{}',
    is_visible BOOLEAN DEFAULT true,
    "order" INTEGER DEFAULT 0,
    sort_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project users table (access control)
CREATE TABLE IF NOT EXISTS project_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Observations table
CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_observation_option_id UUID NOT NULL REFERENCES project_observation_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    response TEXT,
    agency TEXT,
    alias TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- CREATE INDEXES
-- ==============================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_end_time ON sessions(end_time);

-- Project observation options indexes
CREATE INDEX IF NOT EXISTS idx_project_observation_options_project_id ON project_observation_options(project_id);
CREATE INDEX IF NOT EXISTS idx_project_observation_options_question_type ON project_observation_options(question_type);
CREATE INDEX IF NOT EXISTS idx_project_observation_options_is_visible ON project_observation_options(is_visible);

-- Project users indexes
CREATE INDEX IF NOT EXISTS idx_project_users_project_id ON project_users(project_id);
CREATE INDEX IF NOT EXISTS idx_project_users_user_id ON project_users(user_id);

-- Observations indexes
CREATE INDEX IF NOT EXISTS idx_observations_session_id ON observations(session_id);
CREATE INDEX IF NOT EXISTS idx_observations_project_id ON observations(project_id);
CREATE INDEX IF NOT EXISTS idx_observations_user_id ON observations(user_id);
CREATE INDEX IF NOT EXISTS idx_observations_project_observation_option_id ON observations(project_observation_option_id);
CREATE INDEX IF NOT EXISTS idx_observations_created_at ON observations(created_at);

-- ==============================================
-- CREATE FUNCTIONS
-- ==============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get all users (for RPC)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email
    FROM auth.users au
    ORDER BY au.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user emails by IDs (for RPC)
CREATE OR REPLACE FUNCTION get_user_emails(user_ids UUID[])
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email
    FROM auth.users au
    WHERE au.id = ANY(user_ids)
    ORDER BY au.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has project access (for RPC)
CREATE OR REPLACE FUNCTION user_has_project_access(project_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    has_access BOOLEAN := FALSE;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM projects p
        WHERE p.id = project_id_param
        AND (p.created_by = current_user_id OR EXISTS(
            SELECT 1 FROM project_users pu
            WHERE pu.project_id = project_id_param
            AND pu.user_id = current_user_id
        ))
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is project creator (for RPC)
CREATE OR REPLACE FUNCTION user_is_project_creator(project_id_input UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    is_creator BOOLEAN := FALSE;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM projects p
        WHERE p.id = project_id_input
        AND p.created_by = current_user_id
    ) INTO is_creator;
    
    RETURN is_creator;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate session alias
CREATE OR REPLACE FUNCTION generate_session_alias(session_id_input UUID)
RETURNS TEXT AS $$
DECLARE
    session_data RECORD;
    alias_text TEXT;
BEGIN
    SELECT s.start_time, s.agency, p.name as project_name
    INTO session_data
    FROM sessions s
    JOIN projects p ON p.id = s.project_id
    WHERE s.id = session_id_input;
    
    IF NOT FOUND THEN
        RETURN 'Sesión ' || substring(session_id_input::TEXT, 1, 8);
    END IF;
    
    alias_text := 'Sesión ' || to_char(session_data.start_time, 'HH24:MI');
    
    IF session_data.agency IS NOT NULL AND session_data.agency != '' THEN
        alias_text := alias_text || ' - ' || session_data.agency;
    END IF;
    
    RETURN alias_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- CREATE TRIGGERS
-- ==============================================

-- Update triggers for updated_at columns
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_observation_options_updated_at
    BEFORE UPDATE ON project_observation_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_observations_updated_at
    BEFORE UPDATE ON observations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_observation_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- GRANT PERMISSIONS
-- ==============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
