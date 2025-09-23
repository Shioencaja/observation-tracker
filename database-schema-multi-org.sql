-- ==============================================
-- MULTI-ORGANIZATION OBSERVATION TRACKER - DATABASE SCHEMA
-- ==============================================
-- Scalable database schema for multi-organization observation tracking
-- This schema supports multiple organizations with customizable terminology
-- 
-- Last Updated: December 2024
-- Version: 2.0
-- ==============================================

-- ==============================================
-- 1. ENABLE EXTENSIONS
-- ==============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 2. DROP EXISTING OBJECTS (IF ANY)
-- ==============================================

-- Drop all triggers first
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations CASCADE;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects CASCADE;
DROP TRIGGER IF EXISTS update_organization_users_updated_at ON organization_users CASCADE;
DROP TRIGGER IF EXISTS update_project_observation_options_updated_at ON project_observation_options CASCADE;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions CASCADE;
DROP TRIGGER IF EXISTS update_observations_updated_at ON observations CASCADE;
DROP TRIGGER IF EXISTS populate_observation_linked_fields_trigger ON observations CASCADE;
DROP TRIGGER IF EXISTS add_project_creator_to_org_users_trigger ON projects CASCADE;
DROP TRIGGER IF EXISTS set_observation_alias_trigger ON observations CASCADE;
DROP TRIGGER IF EXISTS set_observation_alias_update_trigger ON observations CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS populate_observation_linked_fields() CASCADE;
DROP FUNCTION IF EXISTS add_project_creator_to_org_users() CASCADE;
DROP FUNCTION IF EXISTS get_user_emails(UUID[]) CASCADE;
DROP FUNCTION IF EXISTS validate_option_ids(UUID[]) CASCADE;
DROP FUNCTION IF EXISTS generate_session_alias(uuid) CASCADE;
DROP FUNCTION IF EXISTS set_observation_alias() CASCADE;
DROP FUNCTION IF EXISTS set_observation_alias_on_update() CASCADE;
DROP FUNCTION IF EXISTS get_user_organizations(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_organization_access(UUID, UUID) CASCADE;

-- Drop all policies
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations CASCADE;
DROP POLICY IF EXISTS "Organization admins can manage their organization" ON organizations CASCADE;
DROP POLICY IF EXISTS "Users can view projects in their organizations" ON projects CASCADE;
DROP POLICY IF EXISTS "Organization admins can create projects" ON projects CASCADE;
DROP POLICY IF EXISTS "Project creators can update their projects" ON projects CASCADE;
DROP POLICY IF EXISTS "Project creators can delete their projects" ON projects CASCADE;
DROP POLICY IF EXISTS "Users can view organization users in their organizations" ON organization_users CASCADE;
DROP POLICY IF EXISTS "Organization admins can manage organization users" ON organization_users CASCADE;
DROP POLICY IF EXISTS "Users can view observation options in their projects" ON project_observation_options CASCADE;
DROP POLICY IF EXISTS "Project creators can manage observation options" ON project_observation_options CASCADE;
DROP POLICY IF EXISTS "Users can view sessions in their projects" ON sessions CASCADE;
DROP POLICY IF EXISTS "Users can create sessions in their projects" ON sessions CASCADE;
DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions CASCADE;
DROP POLICY IF EXISTS "Project creators can delete sessions in their projects" ON sessions CASCADE;
DROP POLICY IF EXISTS "Users can view observations in their projects" ON observations CASCADE;
DROP POLICY IF EXISTS "Users can insert observations in their projects" ON observations CASCADE;
DROP POLICY IF EXISTS "Users can update their own observations" ON observations CASCADE;
DROP POLICY IF EXISTS "Project creators can delete observations in their projects" ON observations CASCADE;

-- Drop all indexes
DROP INDEX IF EXISTS idx_organizations_created_by CASCADE;
DROP INDEX IF EXISTS idx_organizations_created_at CASCADE;
DROP INDEX IF EXISTS idx_projects_organization_id CASCADE;
DROP INDEX IF EXISTS idx_projects_created_by CASCADE;
DROP INDEX IF EXISTS idx_projects_created_at CASCADE;
DROP INDEX IF EXISTS idx_organization_users_organization_id CASCADE;
DROP INDEX IF EXISTS idx_organization_users_user_id CASCADE;
DROP INDEX IF EXISTS idx_organization_users_role CASCADE;
DROP INDEX IF EXISTS idx_project_observation_options_project_id CASCADE;
DROP INDEX IF EXISTS idx_project_observation_options_question_type CASCADE;
DROP INDEX IF EXISTS idx_project_observation_options_is_visible CASCADE;
DROP INDEX IF EXISTS idx_sessions_user_id CASCADE;
DROP INDEX IF EXISTS idx_sessions_project_id CASCADE;
DROP INDEX IF EXISTS idx_sessions_start_time CASCADE;
DROP INDEX IF EXISTS idx_sessions_end_time CASCADE;
DROP INDEX IF EXISTS idx_observations_session_id CASCADE;
DROP INDEX IF EXISTS idx_observations_project_id CASCADE;
DROP INDEX IF EXISTS idx_observations_user_id CASCADE;
DROP INDEX IF EXISTS idx_observations_project_observation_option_id CASCADE;
DROP INDEX IF EXISTS idx_observations_created_at CASCADE;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS observations CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS project_observation_options CASCADE;
DROP TABLE IF EXISTS organization_users CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ==============================================
-- 3. CREATE CORE TABLES
-- ==============================================

-- Organizations table - Multi-tenant root
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
    description TEXT,
    settings JSONB DEFAULT '{}', -- Organization-specific settings
    terminology JSONB DEFAULT '{
        "session_alias_prefix": "Cliente",
        "location_field_label": "Agencia",
        "location_field_placeholder": "Selecciona una agencia",
        "participant_label": "Participante",
        "observation_label": "Observación"
    }',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Data integrity constraints
    CONSTRAINT organizations_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT organizations_name_max_length CHECK (length(name) <= 255),
    CONSTRAINT organizations_slug_not_empty CHECK (length(trim(slug)) > 0),
    CONSTRAINT organizations_slug_max_length CHECK (length(slug) <= 100),
    CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Projects table - Now organization-scoped
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}', -- Project-specific settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Data integrity constraints
    CONSTRAINT projects_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT projects_name_max_length CHECK (length(name) <= 255)
);

-- Organization users table - User access control per organization
CREATE TABLE organization_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique user per organization
    UNIQUE(organization_id, user_id),
    
    -- Prevent self-addition loops
    CONSTRAINT organization_users_no_self_add CHECK (user_id != added_by)
);

-- Project observation options table - Questionnaire questions (unchanged)
CREATE TABLE project_observation_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    question_type TEXT NOT NULL CHECK (question_type IN ('string', 'boolean', 'radio', 'checkbox', 'counter', 'timer', 'voice')),
    options TEXT[] DEFAULT '{}',
    is_visible BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Data integrity constraints
    CONSTRAINT project_observation_options_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT project_observation_options_name_max_length CHECK (length(name) <= 500),
    CONSTRAINT project_observation_options_options_valid CHECK (
        (question_type IN ('radio', 'checkbox') AND array_length(options, 1) > 0) OR
        (question_type IN ('string', 'boolean', 'counter', 'timer', 'voice') AND array_length(options, 1) = 0)
    )
);

-- Sessions table - Now with flexible location field
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    location TEXT, -- Flexible field (was "agency")
    metadata JSONB DEFAULT '{}', -- Additional session-specific data
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Data integrity constraints
    CONSTRAINT sessions_end_after_start CHECK (end_time IS NULL OR end_time >= start_time),
    CONSTRAINT sessions_location_max_length CHECK (location IS NULL OR length(location) <= 100)
);

-- Observations table - With flexible alias generation
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_observation_option_id UUID NOT NULL REFERENCES project_observation_options(id) ON DELETE CASCADE,
    response TEXT,
    location TEXT, -- Flexible field (was "agency")
    alias VARCHAR(50), -- Flexible alias (was hardcoded "Cliente X")
    
    -- Denormalized fields for performance (populated by trigger)
    session_start_time TIMESTAMP WITH TIME ZONE,
    session_end_time TIMESTAMP WITH TIME ZONE,
    session_created_at TIMESTAMP WITH TIME ZONE,
    session_user_id UUID,
    session_user_email TEXT,
    session_user_name TEXT,
    project_name TEXT,
    organization_name TEXT,
    observation_option_name TEXT,
    observation_option_description TEXT,
    user_email TEXT,
    user_name TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Data integrity constraints
    CONSTRAINT observations_response_max_length CHECK (response IS NULL OR length(response) <= 10000),
    CONSTRAINT observations_location_max_length CHECK (location IS NULL OR length(location) <= 100),
    CONSTRAINT observations_alias_max_length CHECK (alias IS NULL OR length(alias) <= 50)
);

-- ==============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ==============================================

-- Organizations indexes
CREATE INDEX idx_organizations_created_by ON organizations(created_by);
CREATE INDEX idx_organizations_created_at ON organizations(created_at DESC);
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Projects indexes
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Organization users indexes
CREATE INDEX idx_organization_users_organization_id ON organization_users(organization_id);
CREATE INDEX idx_organization_users_user_id ON organization_users(user_id);
CREATE INDEX idx_organization_users_role ON organization_users(role);

-- Project observation options indexes
CREATE INDEX idx_project_observation_options_project_id ON project_observation_options(project_id);
CREATE INDEX idx_project_observation_options_question_type ON project_observation_options(question_type);
CREATE INDEX idx_project_observation_options_is_visible ON project_observation_options(is_visible);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_location ON sessions(location);
CREATE INDEX idx_sessions_start_time ON sessions(start_time DESC);
CREATE INDEX idx_sessions_end_time ON sessions(end_time);

-- Observations indexes
CREATE INDEX idx_observations_session_id ON observations(session_id);
CREATE INDEX idx_observations_project_id ON observations(project_id);
CREATE INDEX idx_observations_user_id ON observations(user_id);
CREATE INDEX idx_observations_project_observation_option_id ON observations(project_observation_option_id);
CREATE INDEX idx_observations_location ON observations(location);
CREATE INDEX idx_observations_created_at ON observations(created_at);

-- ==============================================
-- 5. CREATE TRIGGER FUNCTIONS
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to populate observation linked fields
CREATE OR REPLACE FUNCTION populate_observation_linked_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Populate project_id from session
    SELECT s.project_id INTO NEW.project_id
    FROM sessions s
    WHERE s.id = NEW.session_id;

    -- Populate session information
    SELECT 
        s.start_time,
        s.end_time,
        s.created_at,
        s.user_id,
        s.location
    INTO 
        NEW.session_start_time,
        NEW.session_end_time,
        NEW.session_created_at,
        NEW.session_user_id,
        NEW.location
    FROM sessions s
    WHERE s.id = NEW.session_id;

    -- Populate project and organization information
    SELECT 
        p.name,
        o.name
    INTO 
        NEW.project_name,
        NEW.organization_name
    FROM projects p
    JOIN organizations o ON o.id = p.organization_id
    WHERE p.id = NEW.project_id;

    -- Populate observation option information
    IF NEW.project_observation_option_id IS NOT NULL THEN
        SELECT 
            poo.name,
            poo.description
        INTO 
            NEW.observation_option_name,
            NEW.observation_option_description
        FROM project_observation_options poo
        WHERE poo.id = NEW.project_observation_option_id;
    END IF;

    -- Set default values for user information
    NEW.user_email := 'user@example.com';
    NEW.user_name := 'User';
    NEW.session_user_email := 'user@example.com';
    NEW.session_user_name := 'User';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Function to automatically add project creator to organization users
CREATE OR REPLACE FUNCTION add_project_creator_to_org_users()
RETURNS TRIGGER AS $$
BEGIN
    -- Add creator as admin to the organization if not already a member
    INSERT INTO organization_users (organization_id, user_id, role, added_by)
    SELECT 
        NEW.organization_id, 
        NEW.created_by, 
        'admin', 
        NEW.created_by
    WHERE NOT EXISTS (
        SELECT 1 FROM organization_users ou 
        WHERE ou.organization_id = NEW.organization_id 
        AND ou.user_id = NEW.created_by
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate session alias using organization terminology
CREATE OR REPLACE FUNCTION generate_session_alias(session_id_input uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_number integer;
    project_id_val uuid;
    organization_id_val uuid;
    alias_prefix text;
BEGIN
    -- Get the project_id and organization_id for this session
    SELECT s.project_id, p.organization_id
    INTO project_id_val, organization_id_val
    FROM sessions s
    JOIN projects p ON p.id = s.project_id
    WHERE s.id = session_id_input;
    
    -- Get the alias prefix from organization terminology
    SELECT COALESCE(
        (terminology->>'session_alias_prefix')::text,
        'Cliente'
    )
    INTO alias_prefix
    FROM organizations
    WHERE id = organization_id_val;
    
    -- Get the next number for this project
    SELECT COALESCE(MAX(
        CASE 
            WHEN alias ~ ('^' || alias_prefix || ' [0-9]+$')
            THEN CAST(SUBSTRING(alias FROM (alias_prefix || ' ([0-9]+)')) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM observations
    WHERE session_id IN (
        SELECT id FROM sessions WHERE project_id = project_id_val
    );
    
    RETURN alias_prefix || ' ' || next_number;
END;
$$;

-- Function to set observation alias
CREATE OR REPLACE FUNCTION set_observation_alias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only set alias if it's not already set
    IF NEW.alias IS NULL OR NEW.alias = '' THEN
        NEW.alias := generate_session_alias(NEW.session_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to set observation alias on update
CREATE OR REPLACE FUNCTION set_observation_alias_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only set alias if it's being set to NULL or empty
    IF NEW.alias IS NULL OR NEW.alias = '' THEN
        NEW.alias := generate_session_alias(NEW.session_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to get user organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_id_input UUID)
RETURNS TABLE(organization_id UUID, organization_name TEXT, role TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as organization_id,
        o.name as organization_name,
        ou.role
    FROM organizations o
    JOIN organization_users ou ON ou.organization_id = o.id
    WHERE ou.user_id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function to check organization access
CREATE OR REPLACE FUNCTION check_organization_access(user_id_input UUID, organization_id_input UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.user_id = user_id_input
        AND ou.organization_id = organization_id_input
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function to get user emails
CREATE OR REPLACE FUNCTION get_user_emails(user_ids UUID[])
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email::TEXT as email
    FROM auth.users au
    WHERE au.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

-- Function to validate observation option IDs
CREATE OR REPLACE FUNCTION validate_option_ids(option_ids UUID[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) = array_length(option_ids, 1)
        FROM project_observation_options
        WHERE id = ANY(option_ids)
    );
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 6. CREATE TRIGGERS
-- ==============================================

-- Update timestamps triggers
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_users_updated_at
    BEFORE UPDATE ON organization_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_observation_options_updated_at
    BEFORE UPDATE ON project_observation_options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_observations_updated_at
    BEFORE UPDATE ON observations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Populate observation linked fields trigger
CREATE TRIGGER populate_observation_linked_fields_trigger
    BEFORE INSERT OR UPDATE ON observations
    FOR EACH ROW EXECUTE FUNCTION populate_observation_linked_fields();

-- Add project creator to organization users trigger
CREATE TRIGGER add_project_creator_to_org_users_trigger
    AFTER INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION add_project_creator_to_org_users();

-- Alias generation triggers
CREATE TRIGGER set_observation_alias_trigger
    BEFORE INSERT ON observations
    FOR EACH ROW
    EXECUTE FUNCTION set_observation_alias();

CREATE TRIGGER set_observation_alias_update_trigger
    BEFORE UPDATE ON observations
    FOR EACH ROW
    EXECUTE FUNCTION set_observation_alias_on_update();

-- ==============================================
-- 7. CREATE ROW LEVEL SECURITY POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_observation_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to"
ON organizations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = organizations.id
        AND ou.user_id = auth.uid()
    )
);

CREATE POLICY "Organization admins can manage their organization"
ON organizations FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = organizations.id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = organizations.id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
    )
);

-- Projects policies
CREATE POLICY "Users can view projects in their organizations"
ON projects FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = projects.organization_id
        AND ou.user_id = auth.uid()
    )
);

CREATE POLICY "Organization admins can create projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = projects.organization_id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
    )
);

CREATE POLICY "Project creators can update their projects"
ON projects FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Project creators can delete their projects"
ON projects FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Organization users policies
CREATE POLICY "Users can view organization users in their organizations"
ON organization_users FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = organization_users.organization_id
        AND ou.user_id = auth.uid()
    )
);

CREATE POLICY "Organization admins can manage organization users"
ON organization_users FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = organization_users.organization_id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.organization_id = organization_users.organization_id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
    )
);

-- Project observation options policies
CREATE POLICY "Users can view observation options in their projects"
ON project_observation_options FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN organization_users ou ON ou.organization_id = p.organization_id
        WHERE p.id = project_observation_options.project_id
        AND ou.user_id = auth.uid()
    )
);

CREATE POLICY "Project creators can manage observation options"
ON project_observation_options FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_observation_options.project_id
        AND p.created_by = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_observation_options.project_id
        AND p.created_by = auth.uid()
    )
);

-- Sessions policies
CREATE POLICY "Users can view sessions in their projects"
ON sessions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN organization_users ou ON ou.organization_id = p.organization_id
        WHERE p.id = sessions.project_id
        AND ou.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create sessions in their projects"
ON sessions FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM projects p
        JOIN organization_users ou ON ou.organization_id = p.organization_id
        WHERE p.id = sessions.project_id
        AND ou.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own sessions"
ON sessions FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Project creators can delete sessions in their projects"
ON sessions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = sessions.project_id
        AND p.created_by = auth.uid()
    )
);

-- Observations policies
CREATE POLICY "Users can view observations in their projects"
ON observations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        JOIN organization_users ou ON ou.organization_id = p.organization_id
        WHERE p.id = observations.project_id
        AND ou.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert observations in their projects"
ON observations FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM projects p
        JOIN organization_users ou ON ou.organization_id = p.organization_id
        WHERE p.id = observations.project_id
        AND ou.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own observations"
ON observations FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Project creators can delete observations in their projects"
ON observations FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = observations.project_id
        AND p.created_by = auth.uid()
    )
);

-- ==============================================
-- 8. GRANT PERMISSIONS
-- ==============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION populate_observation_linked_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION add_project_creator_to_org_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_emails(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_option_ids(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_session_alias(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION set_observation_alias() TO authenticated;
GRANT EXECUTE ON FUNCTION set_observation_alias_on_update() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organizations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_organization_access(UUID, UUID) TO authenticated;

-- ==============================================
-- 9. ANALYZE TABLES FOR OPTIMIZATION
-- ==============================================

-- Analyze all tables for query optimization
ANALYZE organizations;
ANALYZE projects;
ANALYZE organization_users;
ANALYZE project_observation_options;
ANALYZE sessions;
ANALYZE observations;

-- ==============================================
-- 10. VERIFICATION QUERIES
-- ==============================================

-- Verify table creation
SELECT 'Tables created successfully:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organizations', 'projects', 'organization_users', 'project_observation_options', 'sessions', 'observations')
ORDER BY table_name;

-- Verify indexes
SELECT 'Indexes created successfully:' as status;
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'projects', 'organization_users', 'project_observation_options', 'sessions', 'observations')
ORDER BY tablename, indexname;

-- Verify triggers
SELECT 'Triggers created successfully:' as status;
SELECT trigger_name, event_object_table FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN ('organizations', 'projects', 'organization_users', 'project_observation_options', 'sessions', 'observations')
ORDER BY event_object_table, trigger_name;

-- Verify policies
SELECT 'Policies created successfully:' as status;
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'projects', 'organization_users', 'project_observation_options', 'sessions', 'observations')
ORDER BY tablename, policyname;

-- Verify functions
SELECT 'Functions created successfully:' as status;
SELECT routine_name, routine_type FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('update_updated_at_column', 'populate_observation_linked_fields', 'add_project_creator_to_org_users', 'get_user_emails', 'validate_option_ids', 'generate_session_alias', 'set_observation_alias', 'set_observation_alias_on_update', 'get_user_organizations', 'check_organization_access')
ORDER BY routine_name;

SELECT '✅ Multi-organization database schema created successfully!' as result;

-- ==============================================
-- 11. SAMPLE DATA (OPTIONAL - UNCOMMENT TO USE)
-- ==============================================

/*
-- Sample organizations
INSERT INTO organizations (id, name, slug, description, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'BCP Bank', 'bcp-bank', 'Banking observation system', auth.uid()),
('550e8400-e29b-41d4-a716-446655440002', 'Retail Corp', 'retail-corp', 'Retail customer experience tracking', auth.uid());

-- Sample projects
INSERT INTO projects (id, organization_id, name, description, created_by) VALUES 
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', 'Branch Service Quality', 'Customer service observations at branches', auth.uid()),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002', 'Store Experience', 'In-store customer experience tracking', auth.uid());

-- Sample observation options
INSERT INTO project_observation_options (project_id, name, description, question_type, options) VALUES 
('550e8400-e29b-41d4-a716-446655440010', '¿Cómo calificarías el servicio?', 'Calificación del servicio recibido', 'radio', ARRAY['Excelente', 'Bueno', 'Regular', 'Malo']),
('550e8400-e29b-41d4-a716-446655440010', '¿Recomendarías el servicio?', 'Recomendación del servicio', 'boolean', ARRAY[]),
('550e8400-e29b-41d4-a716-446655440011', 'How would you rate the service?', 'Service quality rating', 'radio', ARRAY['Excellent', 'Good', 'Fair', 'Poor']),
('550e8400-e29b-41d4-a716-446655440011', 'Would you recommend us?', 'Recommendation likelihood', 'boolean', ARRAY[]);
*/

-- ==============================================
-- END OF SCHEMA
-- ==============================================


