-- ==============================================
-- MIGRATION SCRIPT - OLD TO NEW SCHEMA
-- ==============================================
-- This script helps migrate from old schema to new schema
-- Run this if you have existing data to preserve
-- ==============================================

-- ==============================================
-- 1. BACKUP EXISTING DATA
-- ==============================================

-- Create backup tables
CREATE TABLE IF NOT EXISTS projects_backup AS SELECT * FROM projects;
CREATE TABLE IF NOT EXISTS sessions_backup AS SELECT * FROM sessions;
CREATE TABLE IF NOT EXISTS project_observation_options_backup AS SELECT * FROM project_observation_options;
CREATE TABLE IF NOT EXISTS project_users_backup AS SELECT * FROM project_users;
CREATE TABLE IF NOT EXISTS observations_backup AS SELECT * FROM observations;

-- ==============================================
-- 2. MIGRATE DATA TO NEW SCHEMA
-- ==============================================

-- Migrate projects (if they exist)
INSERT INTO projects (id, name, description, created_by, agencies, created_at, updated_at)
SELECT 
    id,
    COALESCE(name, 'Unnamed Project'),
    description,
    created_by,
    COALESCE(agencies, '{}'),
    COALESCE(created_at, NOW()),
    COALESCE(updated_at, NOW())
FROM projects_backup
ON CONFLICT (id) DO NOTHING;

-- Migrate sessions (if they exist)
INSERT INTO sessions (id, user_id, project_id, agency, start_time, end_time, created_at, updated_at)
SELECT 
    id,
    user_id,
    project_id,
    COALESCE(agency, location), -- Map location to agency if it exists
    COALESCE(start_time, NOW()),
    end_time,
    COALESCE(created_at, NOW()),
    COALESCE(updated_at, NOW())
FROM sessions_backup
ON CONFLICT (id) DO NOTHING;

-- Migrate project observation options (if they exist)
INSERT INTO project_observation_options (id, project_id, name, description, question_type, options, is_visible, "order", sort_order, created_at, updated_at)
SELECT 
    id,
    project_id,
    name,
    description,
    question_type,
    COALESCE(options, '{}'),
    COALESCE(is_visible, true),
    COALESCE("order", 0),
    sort_order,
    COALESCE(created_at, NOW()),
    COALESCE(updated_at, NOW())
FROM project_observation_options_backup
ON CONFLICT (id) DO NOTHING;

-- Migrate project users (if they exist)
INSERT INTO project_users (id, project_id, user_id, added_by, created_at)
SELECT 
    id,
    project_id,
    user_id,
    added_by,
    COALESCE(created_at, NOW())
FROM project_users_backup
ON CONFLICT (id) DO NOTHING;

-- Migrate observations (if they exist)
INSERT INTO observations (id, session_id, project_id, project_observation_option_id, user_id, response, agency, alias, created_at, updated_at)
SELECT 
    id,
    session_id,
    project_id,
    project_observation_option_id,
    user_id,
    response,
    agency,
    alias,
    COALESCE(created_at, NOW()),
    COALESCE(updated_at, NOW())
FROM observations_backup
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- 3. CLEANUP BACKUP TABLES (OPTIONAL)
-- ==============================================

-- Uncomment the following lines to remove backup tables after successful migration
-- DROP TABLE IF EXISTS projects_backup;
-- DROP TABLE IF EXISTS sessions_backup;
-- DROP TABLE IF EXISTS project_observation_options_backup;
-- DROP TABLE IF EXISTS project_users_backup;
-- DROP TABLE IF EXISTS observations_backup;

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================
