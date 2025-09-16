# Database Recreation Guide

## Overview

This guide explains the complete database recreation process to support multiple observation options per observation.

## 🗄️ **Database Changes**

### **Key Structural Changes:**

1. **Dropped all existing tables** to start fresh
2. **Changed `option_id` to `option_ids`** in observations table
3. **Made observation_options global** (no user_id dependency)
4. **Added proper constraints and validations**
5. **Created helper functions and views**

### **New Table Structure:**

#### **observation_options** (Global)

```sql
- id: UUID (Primary Key)
- name: TEXT (Unique)
- description: TEXT
- is_visible: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### **sessions** (User-specific)

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- start_time: TIMESTAMPTZ
- end_time: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### **observations** (User-specific)

```sql
- id: UUID (Primary Key)
- session_id: UUID (Foreign Key to sessions)
- user_id: UUID (Foreign Key to auth.users)
- description: TEXT
- option_ids: TEXT (Comma-separated option IDs)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

## 🔧 **New Features**

### **1. Multiple Option Support**

- **Storage**: Comma-separated option IDs in `option_ids` field
- **Validation**: Ensures all option IDs exist in observation_options table
- **Format**: UUIDs separated by commas (e.g., "uuid1,uuid2,uuid3")

### **2. Helper Functions**

- **`validate_option_ids(text)`**: Validates that all option IDs exist
- **`get_option_names(text)`**: Returns array of option names from comma-separated IDs

### **3. Database Views**

- **`observations_with_options`**: Observations with parsed option names
- **`session_stats`**: Session statistics with option usage

### **4. Constraints**

- **Format validation**: Ensures option_ids follows UUID format
- **Existence validation**: Ensures all referenced options exist
- **Data integrity**: Prevents orphaned option references

## 📊 **Default Options**

25 pre-loaded observation options available to all users:

- Good behavior, Needs attention, Following instructions
- Distracted, Helping others, Disruptive
- On task, Off task, Participating, Quiet
- Asking questions, Working independently, Collaborating
- Creative thinking, Leadership, Respectful, Prepared
- Engaged, Problem solving, Time management
- Confused, Excited, Frustrated, Proud, Shy

## 🚀 **Migration Steps**

### **1. Run the SQL Script**

```bash
# Execute the complete recreation script
psql -d your_database -f recreate_database_with_multiple_options.sql
```

### **2. Update Application Code**

- ✅ Updated TypeScript types (`option_id` → `option_ids`)
- ✅ Updated ObservationsTable component
- ✅ Updated page.tsx for new field names
- ✅ Updated all database queries

### **3. Verify Installation**

- Check that all tables are created
- Verify 25 default options are loaded
- Test multi-select functionality
- Confirm data integrity constraints work

## 🔒 **Security & Access**

### **Row Level Security (RLS)**

- **observation_options**: Read-only for authenticated users
- **sessions**: Full CRUD for own sessions only
- **observations**: Full CRUD for own observations only

### **Policies**

- Users can only access their own sessions and observations
- All users can view global observation options
- Only database administrators can modify observation options

## 📈 **Performance Optimizations**

### **Indexes**

- `idx_observation_options_visible`: Fast filtering by visibility
- `idx_observation_options_name`: Fast name lookups
- `idx_observations_option_ids`: Fast option-based queries
- `idx_sessions_user_id`: Fast user session queries
- `idx_observations_session_id`: Fast session observation queries

### **Views**

- Pre-computed option names for faster display
- Session statistics for analytics
- Optimized queries for common operations

## 🧪 **Testing the Migration**

### **1. Basic Functionality**

```sql
-- Test option loading
SELECT * FROM observation_options WHERE is_visible = true;

-- Test option validation
SELECT validate_option_ids('uuid1,uuid2,uuid3');

-- Test name retrieval
SELECT get_option_names('uuid1,uuid2');
```

### **2. Application Testing**

- Create new observations with multiple options
- Edit existing observations to add/remove options
- Verify option display in the UI
- Test combobox multi-select functionality

## ⚠️ **Important Notes**

### **Data Loss Warning**

- **This migration DROPS ALL EXISTING DATA**
- Make sure to backup any important data before running
- All existing sessions and observations will be lost

### **Backward Compatibility**

- Old `option_id` field is completely removed
- Application code has been updated to use `option_ids`
- No backward compatibility with previous data structure

### **Future Considerations**

- Consider creating a proper junction table for better normalization
- Monitor performance with large numbers of options
- Consider adding option categories or hierarchies

## 🎯 **Benefits of New Structure**

1. **Multiple Options**: Users can assign multiple observation types
2. **Global Options**: Consistent options across all users
3. **Data Integrity**: Proper validation and constraints
4. **Performance**: Optimized indexes and views
5. **Scalability**: Easy to add new options
6. **Analytics**: Better reporting capabilities with views

## 📝 **Next Steps**

1. **Run the migration script**
2. **Test the application thoroughly**
3. **Train users on new multi-select functionality**
4. **Monitor performance and usage**
5. **Consider adding more observation options as needed**

The new database structure provides a solid foundation for a more flexible and powerful observation tracking system!
