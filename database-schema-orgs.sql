-- Enhanced Database Schema for Ballon SaaS with Organizations
-- This schema includes organizations, roles, and enhanced access control

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE organization_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE project_status AS ENUM ('active', 'archived', 'draft');

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  status organization_status DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization users with roles
CREATE TABLE organization_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Projects table (enhanced with organization support)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status project_status DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project users (for sharing projects within organization)
CREATE TABLE project_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  added_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Project observation options (questions)
CREATE TABLE project_observation_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  question_type TEXT NOT NULL CHECK (
    question_type = ANY (ARRAY[
      'string'::text, 
      'boolean'::text, 
      'radio'::text, 
      'checkbox'::text, 
      'counter'::text, 
      'timer'::text, 
      'voice'::text
    ])
  ),
  options TEXT[] DEFAULT '{}',
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  agency TEXT,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Observations table
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_observation_option_id UUID NOT NULL REFERENCES project_observation_options(id) ON DELETE CASCADE,
  response TEXT,
  agency TEXT,
  alias CHARACTER VARYING,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization invitations table
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- Create indexes for better performance
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organization_users_org_id ON organization_users(organization_id);
CREATE INDEX idx_organization_users_user_id ON organization_users(user_id);
CREATE INDEX idx_organization_users_role ON organization_users(role);
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_users_project_id ON project_users(project_id);
CREATE INDEX idx_project_users_user_id ON project_users(user_id);
CREATE INDEX idx_project_observation_options_project_id ON project_observation_options(project_id);
CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_observations_session_id ON observations(session_id);
CREATE INDEX idx_observations_project_id ON observations(project_id);
CREATE INDEX idx_observations_user_id ON observations(user_id);
CREATE INDEX idx_organization_invitations_organization_id ON organization_invitations(organization_id);
CREATE INDEX idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX idx_organization_invitations_email ON organization_invitations(email);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_users_updated_at BEFORE UPDATE ON organization_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_observation_options_updated_at BEFORE UPDATE ON project_observation_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_observations_updated_at BEFORE UPDATE ON observations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_observation_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners can update their organization" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Organization owners can delete their organization" ON organizations
  FOR DELETE USING (
    id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Organization users policies
CREATE POLICY "Users can view organization members of their organizations" ON organization_users
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners and admins can manage members" ON organization_users
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Projects policies
CREATE POLICY "Users can view projects in their organizations" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create projects" ON projects
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners and org admins can update projects" ON projects
  FOR UPDATE USING (
    created_by = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Project owners and org admins can delete projects" ON projects
  FOR DELETE USING (
    created_by = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Project users policies
CREATE POLICY "Users can view project members of accessible projects" ON project_users
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project owners and org admins can manage project users" ON project_users
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE 
        created_by = auth.uid() OR
        organization_id IN (
          SELECT organization_id FROM organization_users 
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
  );

-- Project observation options policies
CREATE POLICY "Users can view observation options of accessible projects" ON project_observation_options
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project owners and org admins can manage observation options" ON project_observation_options
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE 
        created_by = auth.uid() OR
        organization_id IN (
          SELECT organization_id FROM organization_users 
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
  );

-- Sessions policies
CREATE POLICY "Users can view sessions of accessible projects" ON sessions
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create sessions in accessible projects" ON sessions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own sessions" ON sessions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Session creators and org admins can delete sessions" ON sessions
  FOR DELETE USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Observations policies
CREATE POLICY "Users can view observations of accessible projects" ON observations
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create observations in accessible projects" ON observations
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own observations" ON observations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Observation creators and org admins can delete observations" ON observations
  FOR DELETE USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- Organization invitations policies
CREATE POLICY "Users can view invitations to their organizations" ON organization_invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization owners and admins can manage invitations" ON organization_invitations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Helper functions

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name VARCHAR(255),
  organization_slug VARCHAR(100),
  user_role user_role,
  joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    ou.role,
    ou.joined_at
  FROM organizations o
  JOIN organization_users ou ON o.id = ou.organization_id
  WHERE ou.user_id = get_user_organizations.user_id
  AND o.status = 'active'
  ORDER BY o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has organization access
CREATE OR REPLACE FUNCTION user_has_organization_access(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_users 
    WHERE organization_id = org_id 
    AND user_id = user_has_organization_access.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in organization
CREATE OR REPLACE FUNCTION get_user_organization_role(user_id UUID, org_id UUID)
RETURNS user_role AS $$
DECLARE
  user_role user_role;
BEGIN
  SELECT role INTO user_role
  FROM organization_users 
  WHERE organization_id = org_id 
  AND user_id = get_user_organization_role.user_id;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all users (for user management)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  user_id UUID,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate organization slug
CREATE OR REPLACE FUNCTION generate_organization_slug(org_name VARCHAR(255))
RETURNS VARCHAR(100) AS $$
DECLARE
  base_slug VARCHAR(100);
  final_slug VARCHAR(100);
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(org_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
  
  -- Ensure it's not too long
  IF LENGTH(base_slug) > 50 THEN
    base_slug := LEFT(base_slug, 50);
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to create organization with owner
CREATE OR REPLACE FUNCTION create_organization_with_owner(
  org_name VARCHAR(255),
  org_description TEXT DEFAULT NULL,
  owner_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
  org_slug VARCHAR(100);
BEGIN
  -- Generate unique slug
  org_slug := generate_organization_slug(org_name);
  
  -- Create organization
  INSERT INTO organizations (name, slug, description)
  VALUES (org_name, org_slug, org_description)
  RETURNING id INTO org_id;
  
  -- Add creator as owner
  INSERT INTO organization_users (organization_id, user_id, role)
  VALUES (org_id, owner_user_id, 'owner');
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample data for development (optional)
-- Uncomment the following lines to create sample organizations

-- INSERT INTO organizations (name, slug, description) VALUES 
-- ('Acme Corporation', 'acme-corp', 'Leading technology solutions provider'),
-- ('TechStart Inc', 'techstart', 'Innovative startup company');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;


