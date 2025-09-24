# Database Setup Guide

This guide explains how to set up the database schema for the Observation Tracker application.

## 📁 Files Overview

- **`database-schema.sql`** - Complete schema with all features, constraints, and RLS policies
- **`simple-schema.sql`** - Simplified schema for quick setup and testing
- **`migrate-to-new-schema.sql`** - Migration script for existing data

## 🚀 Quick Start (New Installation)

For a fresh installation, use the simple schema:

```sql
-- Run this in your Supabase SQL Editor
\i simple-schema.sql
```

## 🏗️ Full Setup (Production)

For production with all features:

```sql
-- Run this in your Supabase SQL Editor
\i database-schema.sql
```

## 🔄 Migration (Existing Data)

If you have existing data to preserve:

1. **First, run the migration script:**

   ```sql
   \i migrate-to-new-schema.sql
   ```

2. **Then, apply the new schema:**
   ```sql
   \i simple-schema.sql
   ```

## 📊 Database Structure

### Core Tables

| Table                         | Purpose             | Key Fields                                                      |
| ----------------------------- | ------------------- | --------------------------------------------------------------- |
| `projects`                    | Project management  | `id`, `name`, `created_by`, `agencies`                          |
| `sessions`                    | User sessions       | `id`, `user_id`, `project_id`, `start_time`, `end_time`         |
| `project_observation_options` | Questions/templates | `id`, `project_id`, `name`, `question_type`, `options`          |
| `project_users`               | Access control      | `id`, `project_id`, `user_id`, `added_by`                       |
| `observations`                | User responses      | `id`, `session_id`, `response`, `project_observation_option_id` |

### Question Types Supported

- `string` - Text input
- `boolean` - Yes/No questions
- `radio` - Single choice (dropdown/radio buttons)
- `checkbox` - Multiple choice
- `counter` - Numeric input
- `timer` - Time tracking
- `voice` - Audio recording

## 🔐 Security Features

### Row Level Security (RLS)

- All tables have RLS enabled
- Users can only access their own data
- Project creators have full access to their projects
- Project users have read access to shared projects

### Access Control

- Project creators can manage all aspects of their projects
- Users can only create sessions in projects they have access to
- Observations are tied to specific users and sessions

## 🛠️ RPC Functions

The schema includes several RPC functions for the application:

- `get_all_users()` - Get all users (for admin functions)
- `get_user_emails(user_ids)` - Get emails for specific users
- `user_has_project_access(project_id)` - Check if user can access project
- `user_is_project_creator(project_id)` - Check if user created project
- `generate_session_alias(session_id)` - Generate session display name

## 📝 Sample Data

To add sample data for testing, uncomment the sample data section in `database-schema.sql`:

```sql
-- Uncomment this section in database-schema.sql
INSERT INTO projects (id, name, description, created_by, agencies) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Sample Project', 'A sample project for testing',
 (SELECT id FROM auth.users LIMIT 1), ARRAY['Agency A', 'Agency B']);
```

## 🔧 Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure RLS policies are properly set up
2. **Foreign Key Errors**: Ensure all referenced records exist
3. **UUID Issues**: Make sure `uuid-ossp` extension is enabled

### Verification

After setup, verify the schema:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('projects', 'sessions', 'project_observation_options', 'project_users', 'observations');

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('projects', 'sessions', 'project_observation_options', 'project_users', 'observations');

-- Test RPC functions
SELECT * FROM get_all_users();
```

## 📚 Next Steps

1. Run the appropriate schema file in Supabase
2. Update your application's environment variables
3. Test the application with sample data
4. Deploy to production

## 🆘 Support

If you encounter issues:

1. Check the Supabase logs for errors
2. Verify all foreign key relationships
3. Ensure RLS policies are correctly configured
4. Test RPC functions individually
