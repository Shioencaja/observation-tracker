# Multi-Organization Observation Tracker - Setup Guide

## Overview

This guide will help you set up the new multi-organization observation tracking system from scratch. The new schema supports multiple organizations with customizable terminology and settings.

## Key Features

- **Multi-tenant architecture** - Each organization is isolated
- **Customizable terminology** - No more hardcoded Spanish terms
- **Flexible location fields** - "Agencia" becomes configurable "location"
- **Role-based permissions** - Admin, member, viewer roles
- **Organization-specific settings** - Custom configurations per organization

## Step-by-Step Setup

### 1. Create the Database Schema

Run the complete schema creation script:

```sql
-- Run this file in your Supabase SQL editor
\i setup-multi-org-step-by-step.sql
```

### 2. Add Sample Data (Optional)

To test the system with sample data:

```sql
-- Run this file after creating the schema
\i sample-data-multi-org.sql
```

**Important**: Replace the placeholder user IDs in the sample data with actual user IDs from your `auth.users` table.

### 3. Verify Setup

Check that everything was created correctly:

```sql
-- Check organizations
SELECT name, slug, terminology->>'session_alias_prefix' as alias_prefix
FROM organizations;

-- Check projects
SELECT o.name as org, p.name as project
FROM organizations o
JOIN projects p ON p.organization_id = o.id;

-- Check observations with aliases
SELECT o.name as org, obs.alias, obs.response
FROM organizations o
JOIN projects p ON p.organization_id = o.id
JOIN sessions s ON s.project_id = p.id
JOIN observations obs ON obs.session_id = s.id;
```

## Database Structure

### Core Tables

1. **`organizations`** - Root entity for multi-tenancy
2. **`organization_users`** - User access control per organization
3. **`projects`** - Scoped to organizations
4. **`project_observation_options`** - Questionnaire questions
5. **`sessions`** - Observation sessions with flexible location
6. **`observations`** - Questionnaire responses with flexible aliases

### Key Relationships

```
organizations (1) ←→ (many) projects
organizations (1) ←→ (many) organization_users
projects (1) ←→ (many) sessions
projects (1) ←→ (many) project_observation_options
sessions (1) ←→ (many) observations
```

## Organization Terminology

Each organization can customize its terminology:

```json
{
  "session_alias_prefix": "Cliente", // "Customer", "Patient"
  "location_field_label": "Agencia", // "Branch", "Store", "Department"
  "location_field_placeholder": "Selecciona una agencia",
  "participant_label": "Participante", // "Customer", "Patient"
  "observation_label": "Observación" // "Feedback", "Assessment"
}
```

## Usage Examples

### Create a New Organization

```sql
INSERT INTO organizations (name, slug, description, terminology) VALUES (
  'Retail Corp',
  'retail-corp',
  'Retail customer experience tracking',
  '{
    "session_alias_prefix": "Customer",
    "location_field_label": "Store Location",
    "location_field_placeholder": "Select a store",
    "participant_label": "Customer",
    "observation_label": "Feedback"
  }'
);
```

### Add Users to Organization

```sql
INSERT INTO organization_users (organization_id, user_id, role, added_by) VALUES
('org-uuid', 'user-uuid', 'admin', 'admin-user-uuid');
```

### Create a Project

```sql
INSERT INTO projects (organization_id, name, description, created_by) VALUES
('org-uuid', 'Store Experience', 'Customer experience tracking', 'user-uuid');
```

### Create Observation Questions

```sql
INSERT INTO project_observation_options (project_id, name, question_type, options) VALUES
('project-uuid', 'How was your experience?', 'radio', ARRAY['Excellent', 'Good', 'Fair', 'Poor']);
```

### Create a Session

```sql
INSERT INTO sessions (user_id, project_id, location, start_time) VALUES
('user-uuid', 'project-uuid', 'Downtown Store', NOW());
```

### Create Observations

```sql
INSERT INTO observations (session_id, project_observation_option_id, response) VALUES
('session-uuid', 'option-uuid', 'Excellent');
```

## API Integration

### Get User's Organizations

```sql
SELECT * FROM get_user_organizations('user-uuid');
```

### Check Organization Access

```sql
SELECT check_organization_access('user-uuid', 'org-uuid');
```

### Get Observations with Organization Context

```sql
SELECT
  o.name as organization,
  p.name as project,
  obs.alias,
  obs.response,
  poo.name as question
FROM observations obs
JOIN sessions s ON s.id = obs.session_id
JOIN projects p ON p.id = s.project_id
JOIN organizations o ON o.id = p.organization_id
JOIN project_observation_options poo ON poo.id = obs.project_observation_option_id
WHERE obs.user_id = 'user-uuid';
```

## Row Level Security (RLS)

The schema includes comprehensive RLS policies:

- **Organizations**: Users can only see organizations they belong to
- **Projects**: Users can only see projects in their organizations
- **Sessions**: Users can only see sessions in their accessible projects
- **Observations**: Users can only see observations in their accessible projects

## Migration from Single-Organization

If you have an existing single-organization setup, use the migration script:

```sql
\i migrate-to-multi-org.sql
```

## Troubleshooting

### Common Issues

1. **User not in organization**: Add user to `organization_users` table
2. **Permission denied**: Check user's role in the organization
3. **Alias not generated**: Check organization terminology settings
4. **Location field issues**: Verify organization terminology configuration

### Verification Queries

```sql
-- Check user's organization access
SELECT o.name, ou.role
FROM organizations o
JOIN organization_users ou ON ou.organization_id = o.id
WHERE ou.user_id = 'user-uuid';

-- Check project access
SELECT p.name, o.name as organization
FROM projects p
JOIN organizations o ON o.id = p.organization_id
JOIN organization_users ou ON ou.organization_id = o.id
WHERE ou.user_id = 'user-uuid';

-- Check observation aliases
SELECT obs.alias, o.terminology->>'session_alias_prefix' as prefix
FROM observations obs
JOIN sessions s ON s.id = obs.session_id
JOIN projects p ON p.id = s.project_id
JOIN organizations o ON o.id = p.organization_id
LIMIT 10;
```

## Next Steps

1. **Update your application code** to use the new schema
2. **Implement organization selection** in your UI
3. **Update forms** to use organization-specific terminology
4. **Test with multiple organizations** to verify isolation
5. **Customize terminology** for each organization's needs

## Support

If you encounter any issues:

1. Check the verification queries above
2. Ensure all user IDs are valid
3. Verify RLS policies are working correctly
4. Check organization terminology settings

The new schema is designed to be flexible and scalable for multiple organizations with different business contexts and terminology requirements.


