# Observation Options Global Migration

This document describes the changes made to convert the observation options table from user-specific to global (shared across all users).

## Changes Made

### 1. Database Schema Changes

**File: `migrate_observation_options_global.sql`**
- Removed `user_id` column from `observation_options` table
- Dropped user-specific foreign key constraint
- Removed user-specific indexes
- Updated RLS policies to allow global access for all authenticated users
- Added default global observation options

### 2. TypeScript Type Updates

**File: `src/types/observation.ts`**
- Removed `user_id` field from `ObservationOption` interface
- The interface now only contains: `id`, `name`, `description`, `is_visible`, `created_at`, `updated_at`

### 3. Component Updates

**File: `src/components/ObservationOptionsManager.tsx`**
- Removed user authentication check in `loadOptions()`
- Removed `user_id` from insert operations in `handleCreate()`
- Now loads all global observation options instead of user-specific ones

**File: `src/components/ObservationsTable.tsx`**
- Removed user authentication check in `loadOptions()`
- Removed `user_id` filter from database queries
- Now loads all visible global observation options

## Migration Steps

To apply these changes to your database:

1. **Run the migration script:**
   ```sql
   -- Execute the contents of migrate_observation_options_global.sql
   ```

2. **Verify the changes:**
   - Check that the `user_id` column has been removed from `observation_options`
   - Verify that RLS policies allow global access
   - Confirm that default options have been inserted

## Benefits of Global Options

1. **Consistency**: All users see the same observation options
2. **Easier Management**: Administrators can manage options centrally
3. **Reduced Duplication**: No need for each user to create their own options
4. **Better Data Analysis**: Standardized options across all observations

## Default Global Options

The migration includes these default observation options:
- Good behavior
- Needs attention
- Following instructions
- Distracted
- Helping others
- Disruptive
- On task
- Off task
- Participating
- Quiet
- Asking questions
- Working independently
- Collaborating
- Creative thinking
- Leadership

## Security Considerations

- All authenticated users can view, create, update, and delete observation options
- If you need more restrictive access, you can modify the RLS policies
- Consider adding role-based access control if needed

## Rollback Plan

If you need to revert to user-specific options:

1. Add back the `user_id` column to `observation_options`
2. Restore the foreign key constraint to `auth.users(id)`
3. Update RLS policies to be user-specific
4. Revert the component changes to include user authentication
5. Update the TypeScript interface to include `user_id`

## Testing

After applying the migration:

1. Verify that all users can see the same observation options
2. Test creating, editing, and deleting options
3. Confirm that observations can still be linked to options
4. Check that the UI displays options correctly
