-- ==============================================
-- OBSERVATION TRACKER - DATABASE SCHEMA
-- ==============================================
-- Database schema based on Supabase types
-- Generated from src/types/supabase.ts
-- 
-- Last Updated: December 2024
-- Version: 3.0
-- ==============================================

-- ==============================================
-- 1. ENABLE EXTENSIONS
-- ==============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 2. DROP EXISTING OBJECTS (IF ANY)
-- ==============================================

-- Drop all triggers first
DROP TRIGGER IF EXISTS update_observations_updated_at ON observations CASCADE;
DROP TRIGGER IF EXISTS update_project_observation_options_updated_at ON project_observation_options CASCADE;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects CASCADE;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_all_users() CASCADE;
DROP FUNCTION IF EXISTS get_user_emails(UUID[]) CASCADE;
DROP FUNCTION IF EXISTS user_has_project_access(UUID) CASCADE;
DROP FUNCTION IF EXISTS user_is_project_creator(UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_session_alias(UUID) CASCADE;

-- Drop all policies
DROP POLICY IF EXISTS "Users can view observations in their projects" ON observations CASCADE;
DROP POLICY IF EXISTS "Users can insert observations in their projects" ON observations CASCADE;
DROP POLICY IF EXISTS "Users can update their own observations" ON observations CASCADE;
DROP POLICY IF EXISTS "Project creators can delete observations in their projects" ON observations CASCADE;
DROP POLICY IF EXISTS "Users can view observation options in their projects" ON project_observation_options CASCADE;
DROP POLICY IF EXISTS "Project creators can manage observation options" ON project_observation_options CASCADE;
DROP POLICY IF EXISTS "Users can view projects they have access to" ON projects CASCADE;
DROP POLICY IF EXISTS "Project creators can manage their projects" ON projects CASCADE;
DROP POLICY IF EXISTS "Users can view sessions in their projects" ON sessions CASCADE;
DROP POLICY IF EXISTS "Users can create sessions in their projects" ON sessions CASCADE;
DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions CASCADE;
DROP POLICY IF EXISTS "Project creators can delete sessions in their projects" ON sessions CASCADE;
DROP POLICY IF EXISTS "Users can view project users in their projects" ON project_users CASCADE;
DROP POLICY IF EXISTS "Project creators can manage project users" ON project_users CASCADE;

-- Drop all indexes
DROP INDEX IF EXISTS idx_observations_session_id CASCADE;
DROP INDEX IF EXISTS idx_observations_project_id CASCADE;
DROP INDEX IF EXISTS idx_observations_user_id CASCADE;
DROP INDEX IF EXISTS idx_observations_project_observation_option_id CASCADE;
DROP INDEX IF EXISTS idx_observations_created_at CASCADE;
DROP INDEX IF EXISTS idx_project_observation_options_project_id CASCADE;
DROP INDEX IF EXISTS idx_project_observation_options_question_type CASCADE;
DROP INDEX IF EXISTS idx_project_observation_options_is_visible CASCADE;
DROP INDEX IF EXISTS idx_projects_created_by CASCADE;
DROP INDEX IF EXISTS idx_projects_created_at CASCADE;
DROP INDEX IF EXISTS idx_sessions_user_id CASCADE;
DROP INDEX IF EXISTS idx_sessions_project_id CASCADE;
DROP INDEX IF EXISTS idx_sessions_start_time CASCADE;
DROP INDEX IF EXISTS idx_sessions_end_time CASCADE;
DROP INDEX IF EXISTS idx_project_users_project_id CASCADE;
DROP INDEX IF EXISTS idx_project_users_user_id CASCADE;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS observations CASCADE;
DROP TABLE IF EXISTS project_observation_options CASCADE;
DROP TABLE IF EXISTS project_users CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- ==============================================
-- 3. CREATE CORE TABLES
-- ==============================================

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agencies TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Data integrity constraints
    CONSTRAINT projects_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT projects_name_max_length CHECK (length(name) <= 100),
    CONSTRAINT projects_description_max_length CHECK (description IS NULL OR length(description) <= 500)
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    agency TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Data integrity constraints
    CONSTRAINT sessions_end_after_start CHECK (end_time IS NULL OR end_time >= start_time),
    CONSTRAINT sessions_agency_max_length CHECK (agency IS NULL OR length(agency) <= 100)
);

-- Project observation options table (questions)
CREATE TABLE project_observation_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    question_type TEXT NOT NULL,
    options TEXT[] DEFAULT '{}',
    is_visible BOOLEAN DEFAULT true,
    order INTEGER DEFAULT 0,
    sort_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Data integrity constraints
    CONSTRAINT project_observation_options_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT project_observation_options_name_max_length CHECK (length(name) <= 200),
    CONSTRAINT project_observation_options_description_max_length CHECK (description IS NULL OR length(description) <= 500),
    CONSTRAINT project_observation_options_question_type_valid CHECK (question_type IN ('string', 'boolean', 'radio', 'checkbox', 'counter', 'timer', 'voice')),
    CONSTRAINT project_observation_options_order_positive CHECK (order >= 0),
    CONSTRAINT project_observation_options_sort_order_positive CHECK (sort_order IS NULL OR sort_order >= 0)
);

-- Project users table (access control)
CREATE TABLE project_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique user per project
    CONSTRAINT project_users_unique_user_project UNIQUE (project_id, user_id)
);

-- Observations table
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_observation_option_id UUID NOT NULL REFERENCES project_observation_options(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    response TEXT,
    agency TEXT,
    alias TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Data integrity constraints
    CONSTRAINT observations_response_max_length CHECK (response IS NULL OR length(response) <= 10000),
    CONSTRAINT observations_agency_max_length CHECK (agency IS NULL OR length(agency) <= 100),
    CONSTRAINT observations_alias_max_length CHECK (alias IS NULL OR length(alias) <= 100)
);

-- ==============================================
-- 4. CREATE INDEXES
-- ==============================================

-- Projects indexes
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_end_time ON sessions(end_time);

-- Project observation options indexes
CREATE INDEX idx_project_observation_options_project_id ON project_observation_options(project_id);
CREATE INDEX idx_project_observation_options_question_type ON project_observation_options(question_type);
CREATE INDEX idx_project_observation_options_is_visible ON project_observation_options(is_visible);

-- Project users indexes
CREATE INDEX idx_project_users_project_id ON project_users(project_id);
CREATE INDEX idx_project_users_user_id ON project_users(user_id);

-- Observations indexes
CREATE INDEX idx_observations_session_id ON observations(session_id);
CREATE INDEX idx_observations_project_id ON observations(project_id);
CREATE INDEX idx_observations_user_id ON observations(user_id);
CREATE INDEX idx_observations_project_observation_option_id ON observations(project_observation_option_id);
CREATE INDEX idx_observations_created_at ON observations(created_at);

-- ==============================================
-- 5. CREATE FUNCTIONS
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
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is project creator or has explicit access
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
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is project creator
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
    -- Get session data
    SELECT s.start_time, s.agency, p.name as project_name
    INTO session_data
    FROM sessions s
    JOIN projects p ON p.id = s.project_id
    WHERE s.id = session_id_input;
    
    IF NOT FOUND THEN
        RETURN 'Sesión ' || substring(session_id_input::TEXT, 1, 8);
    END IF;
    
    -- Generate alias based on time and agency
    alias_text := 'Sesión ' || to_char(session_data.start_time, 'HH24:MI');
    
    IF session_data.agency IS NOT NULL AND session_data.agency != '' THEN
        alias_text := alias_text || ' - ' || session_data.agency;
    END IF;
    
    RETURN alias_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 6. CREATE TRIGGERS
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
-- 7. CREATE ROW LEVEL SECURITY POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_observation_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view projects they have access to"
    ON projects FOR SELECT
    USING (
        created_by = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM project_users pu 
            WHERE pu.project_id = id AND pu.user_id = auth.uid()
        )
    );

CREATE POLICY "Project creators can manage their projects"
    ON projects FOR ALL
    USING (created_by = auth.uid());

-- Sessions policies
CREATE POLICY "Users can view sessions in their projects"
    ON sessions FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id AND p.created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM project_users pu
            WHERE pu.project_id = project_id AND pu.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create sessions in their projects"
    ON sessions FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id AND (
                p.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM project_users pu
                    WHERE pu.project_id = project_id AND pu.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can update their own sessions"
    ON sessions FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Project creators can delete sessions in their projects"
    ON sessions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id AND p.created_by = auth.uid()
        )
    );

-- Project observation options policies
CREATE POLICY "Users can view observation options in their projects"
    ON project_observation_options FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id AND (
                p.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM project_users pu
                    WHERE pu.project_id = project_id AND pu.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Project creators can manage observation options"
    ON project_observation_options FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id AND p.created_by = auth.uid()
        )
    );

-- Project users policies
CREATE POLICY "Users can view project users in their projects"
    ON project_users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id AND (
                p.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM project_users pu
                    WHERE pu.project_id = project_id AND pu.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Project creators can manage project users"
    ON project_users FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id AND p.created_by = auth.uid()
        )
    );

-- Observations policies
CREATE POLICY "Users can view observations in their projects"
    ON observations FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id AND (
                p.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM project_users pu
                    WHERE pu.project_id = project_id AND pu.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can insert observations in their projects"
    ON observations FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id AND (
                p.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM project_users pu
                    WHERE pu.project_id = project_id AND pu.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can update their own observations"
    ON observations FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Project creators can delete observations in their projects"
    ON observations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id AND p.created_by = auth.uid()
        )
    );

-- ==============================================
-- 8. GRANT PERMISSIONS
-- ==============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant function permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- ==============================================
-- 9. SAMPLE DATA (OPTIONAL)
-- ==============================================

-- Uncomment the following section to add sample data for testing

/*
-- Sample project
INSERT INTO projects (id, name, description, created_by, agencies) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Sample Project', 'A sample project for testing', 
 (SELECT id FROM auth.users LIMIT 1), ARRAY['Agency A', 'Agency B']);

-- Sample project observation options
INSERT INTO project_observation_options (project_id, name, description, question_type, options, is_visible, "order") VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Sample Text Question', 'A sample text question', 'string', '{}', true, 1),
('550e8400-e29b-41d4-a716-446655440000', 'Sample Boolean Question', 'A sample boolean question', 'boolean', '{}', true, 2),
('550e8400-e29b-41d4-a716-446655440000', 'Sample Radio Question', 'A sample radio question', 'radio', ARRAY['Option 1', 'Option 2', 'Option 3'], true, 3);
*/

-- ==============================================
-- SCHEMA CREATION COMPLETE
-- ==============================================
