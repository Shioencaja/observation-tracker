# Role-Based Permissions System

## Roles Overview

| Role           | Label         | Badge Color | Description                             |
| -------------- | ------------- | ----------- | --------------------------------------- |
| 🟣 **Creator** | Creador       | Purple      | Project owner with full control         |
| 🔵 **Admin**   | Administrador | Blue        | Full management except delete project   |
| 🟢 **Editor**  | Editor        | Green       | Can edit content but limited management |
| ⚪ **Viewer**  | Observador    | Gray        | Read-only, can only register sessions   |

## Permission Matrix

| Action                        | Creator | Admin | Editor | Viewer |
| ----------------------------- | ------- | ----- | ------ | ------ |
| **Project Management**        |
| Access project settings       | ✅      | ✅    | ✅     | ❌     |
| Edit project name/description | ✅      | ✅    | ❌     | ❌     |
| Finish project                | ✅      | ✅    | ❌     | ❌     |
| Delete project                | ✅      | ❌    | ❌     | ❌     |
| **User Management**           |
| Add/remove users              | ✅      | ✅    | ❌     | ❌     |
| Assign roles                  | ✅      | ✅    | ❌     | ❌     |
| **Agencies**                  |
| Add/remove agencies           | ✅      | ✅    | ✅     | ❌     |
| **Questions**                 |
| Add new questions             | ✅      | ✅    | ✅     | ❌     |
| Edit question details         | ✅      | ✅    | ✅     | ❌     |
| Set question as mandatory     | ✅      | ✅    | ✅     | ❌     |
| Edit conditional logic        | ✅      | ✅    | ✅     | ❌     |
| Delete questions              | ✅      | ✅    | ❌     | ❌     |
| Reorder questions             | ✅      | ✅    | ✅     | ❌     |
| **Sessions**                  |
| Create new sessions           | ✅      | ✅    | ✅     | ✅     |
| Edit observations             | ✅      | ✅    | ✅     | ❌     |
| View all sessions             | ✅      | ✅    | ✅     | ✅     |

## Implementation

### 1. Database Setup

**Run these SQL migrations:**

```sql
-- 1. Add role column to project_users
-- See: add-user-roles.sql

-- 2. Add get_all_users function
-- See: add-get-all-users-function.sql
```

### 2. Permission Functions (`src/lib/roles.ts`)

```typescript
canAccessSettings(role); // Creator, Admin, Editor (NOT Viewer)
canEditProject(role); // Creator, Admin
canManageUsers(role); // Creator, Admin
canDeleteProject(role); // Creator only
canFinishProject(role); // Creator, Admin
canAddAgencies(role); // Creator, Admin, Editor
canManageQuestions(role); // Creator, Admin, Editor
canEditQuestionDetails(role); // Creator, Admin, Editor
canCreateSessions(role); // All except Viewer
canEditObservations(role); // All except Viewer
```

### 3. Role Hook (`src/hooks/use-project-role.ts`)

```typescript
const { role, isLoading } = useProjectRole(projectId, userId, createdBy);
```

Automatically determines user's role:

- Checks if user is creator
- Queries `project_users` table for assigned role
- Falls back to "viewer" if not found

### 4. UI Components

**UserManagement Component** (`src/components/UserManagement.tsx`)

- Reusable component for both create and edit modes
- Shows role badges with color coding
- Handles adding/removing users
- Creator always shown with purple badge

**QuestionCard Component** (`src/components/QuestionCard.tsx`)

- Accepts `canDelete` and `canEdit` props
- Hides delete button if `canDelete=false`
- Hides edit button if `canEdit=false`

## User Experience by Role

### 🟣 Creator

- Full access to everything
- Can delete the project
- Purple "Creador" badge
- Cannot be removed from project

### 🔵 Admin (Administrador)

- Can manage users and their roles
- Can edit project settings
- Can finish project
- Can manage all questions
- **Cannot** delete project
- Blue badge

### 🟢 Editor

- Can edit question labels
- Can set questions as mandatory
- Can edit conditional logic
- Can add agencies
- Can create sessions and edit observations
- **Cannot** delete questions
- **Cannot** manage users
- **Cannot** edit project name/description
- Green badge

### ⚪ Viewer (Observador)

- **Cannot** access project settings at all
- Can only view sessions page
- Can create new sessions
- **Cannot** edit any observations
- Sees lock screen if they try to access settings
- Gray badge

## Testing

1. **Create a project** → You're automatically the creator
2. **Add users with different roles**:
   - Add an admin
   - Add an editor
   - Add a viewer
3. **Test each role:**
   - Log in as each user
   - Verify permissions match the matrix above
   - Check that restricted actions are hidden/disabled

## Security

- ✅ Database-level enforcement via RLS policies
- ✅ UI-level access control
- ✅ API-level validation
- ✅ Clear error messages for unauthorized actions
- ✅ Graceful degradation when features aren't available

## Notes

- Creator role is assigned automatically on project creation
- Role is stored in `project_users.role` column
- Creator is also tracked in `projects.created_by`
- Viewer role is default if no role is specified
