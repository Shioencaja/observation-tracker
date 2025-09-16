# Observation Options Setup

This guide explains how to set up the observation options feature in your Observation Tracker application.

## Database Setup

### 1. Run the SQL Script

Execute the SQL script `create_observation_options.sql` in your Supabase dashboard:

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `create_observation_options.sql`
4. Run the script

This will:

- Create the `observation_options` table
- Add an `option_id` column to the `observations` table
- Set up proper indexes and Row Level Security (RLS)
- Insert default observation options

### 2. Default Options

The script will create these default observation options:

- Good behavior
- Needs attention
- Following instructions
- Distracted
- Helping others
- Disruptive
- On task
- Off task

## Features

### 1. Options Management

- **Create Options**: Add new observation options with names and descriptions
- **Edit Options**: Modify existing option names and descriptions
- **Delete Options**: Remove options (observations using deleted options will have their option reference removed)
- **Visibility Control**: Toggle options on/off to control which ones appear in the observation interface

### 2. Observation Interface

- **Checkbox Selection**: Instead of typing, select from predefined options using checkboxes
- **Option Display**: Selected options are shown as badges in the observations table
- **Random Assignment**: New observations are automatically assigned a random option (if available)
- **Edit Mode**: Click on any observation to edit both description and option selection

### 3. Benefits

- **Consistency**: Standardized observation categories across all sessions
- **Efficiency**: Faster observation entry with predefined options
- **Organization**: Better categorization and filtering of observations
- **Flexibility**: Easy to add, modify, or hide options as needed

## Usage

### Managing Options

1. Click the "Manage Options" button in the observations section
2. Use the "Add Option" button to create new options
3. Edit existing options by clicking the edit icon
4. Toggle visibility using the switch in the "Visible" column
5. Delete options using the trash icon (with confirmation dialog)

### Creating Observations

1. When creating new observations, they will automatically be assigned a random option
2. To change the option, click on the observation to enter edit mode
3. Select the desired option from the checkboxes
4. Save your changes

### Editing Observations

1. Click on any observation to enter edit mode
2. Modify the description in the text area
3. Select/deselect options using the checkboxes
4. Click the checkmark to save or X to cancel

## Database Schema

### observation_options Table

```sql
CREATE TABLE observation_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### observations Table (Updated)

The observations table now includes:

- `option_id UUID REFERENCES observation_options(id) ON DELETE SET NULL`

## Security

- All options are user-specific (filtered by `user_id`)
- Row Level Security (RLS) is enabled
- Users can only see, create, edit, and delete their own options
- When an option is deleted, observations using that option have their `option_id` set to NULL

## Troubleshooting

### Options Not Showing

1. Check that the `observation_options` table exists
2. Verify that options have `is_visible = true`
3. Ensure you're logged in as the correct user

### Database Errors

1. Make sure you've run the SQL script completely
2. Check that the `option_id` column exists in the `observations` table
3. Verify that foreign key constraints are properly set up

### UI Issues

1. Refresh the page after making database changes
2. Check the browser console for any JavaScript errors
3. Ensure all shadcn/ui components are properly installed
