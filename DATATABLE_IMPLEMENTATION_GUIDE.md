# DataTable Implementation Guide

## Overview

This guide shows how to implement the new Shadcn-style DataTable components in your existing tables using `@tanstack/react-table`.

## Components Created

### 1. Core DataTable Components

- `src/components/ui/data-table.tsx` - Basic DataTable without pagination
- `src/components/ui/data-table-with-pagination.tsx` - DataTable with built-in pagination

### 2. Column Definitions

- `src/components/tables/sessions-columns.tsx` - Sessions table columns
- `src/components/tables/projects-columns.tsx` - Projects table columns
- `src/components/tables/observations-columns.tsx` - Observations table columns

### 3. Wrapper Components

- `src/components/tables/SessionsDataTable.tsx` - Sessions table with actions
- `src/components/tables/ProjectsDataTable.tsx` - Projects table with actions
- `src/components/tables/ObservationsDataTable.tsx` - Observations table

## How to Replace Existing Tables

### Step 1: Replace SessionsTable

**Old usage:**

```tsx
import SessionsTable from "@/components/SessionsTable";

<SessionsTable
  sessions={sessions}
  onSessionSelect={handleSessionSelect}
  selectedSessionId={selectedSessionId}
/>;
```

**New usage:**

```tsx
import SessionsDataTable from "@/components/tables/SessionsDataTable";

<SessionsDataTable
  sessions={sessions}
  onSessionSelect={handleSessionSelect}
  selectedSessionId={selectedSessionId}
/>;
```

### Step 2: Replace Projects Table

**Old usage:**

```tsx
// In projects page - replace the table section
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Proyecto</TableHead>
      <TableHead>Agencias</TableHead>
      <TableHead>Sesiones</TableHead>
      <TableHead>Acciones</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {paginatedProjects.map((project) => (
      <TableRow key={project.id}>{/* ... table cells ... */}</TableRow>
    ))}
  </TableBody>
</Table>
```

**New usage:**

```tsx
import ProjectsDataTable from "@/components/tables/ProjectsDataTable";

<ProjectsDataTable
  projects={projects}
  onProjectSelect={handleProjectSelect}
  onProjectSettings={handleProjectSettings}
/>;
```

### Step 3: Replace ObservationsTable

**Old usage:**

```tsx
import ObservationsTable from "@/components/ObservationsTable";

<ObservationsTable
  observations={observations}
  onObservationUpdate={handleObservationUpdate}
/>;
```

**New usage:**

```tsx
import ObservationsDataTable from "@/components/tables/ObservationsDataTable";

<ObservationsDataTable observations={observations} />;
```

## Key Features

### 1. Sorting

- Click any column header to sort
- Multi-column sorting support
- Visual indicators for sort direction

### 2. Pagination

- 10 items per page (configurable)
- Fixed table height with empty rows
- Navigation controls with ellipsis

### 3. Custom Cell Renderers

- **Voice responses**: Audio players for voice recordings
- **Timer responses**: Cycle count display
- **Boolean responses**: Yes/No badges
- **Date formatting**: Localized date display

### 4. Fixed Width Columns

- **First column is fixed at 192px width** (w-48)
- **Text truncation** with ellipsis (...) when text exceeds width
- **Hover tooltip** shows full text on hover
- **Other columns are flexible** and can be resized
- **Column resizing** is enabled for non-fixed columns

### 5. Action Buttons

- **Sessions**: "Ver Detalles" button
- **Projects**: "Ver" and "Settings" buttons
- **Observations**: Read-only display

## Data Type Requirements

### Sessions

```typescript
interface Session {
  id: string;
  alias: string;
  agency: string | null;
  start_time: string;
  end_time: string | null;
  user_email?: string;
  observation_count?: number;
  is_finished?: boolean;
}
```

### Projects

```typescript
interface Project {
  id: string;
  name: string;
  description: string | null;
  agencies: string[];
  created_at: string;
  session_count?: number;
  user_count?: number;
}
```

### Observations

```typescript
interface Observation {
  id: string;
  question_name: string;
  question_type: string;
  response: string | null;
  created_at: string;
  user_email?: string;
}
```

## Migration Steps

1. **Install dependencies** (already done):

   ```bash
   npm install @tanstack/react-table date-fns
   ```

2. **Replace table imports** in your pages:

   - Update import statements
   - Replace component usage
   - Remove old pagination logic

3. **Update data mapping** if needed:

   - Ensure your data matches the expected interfaces
   - Add missing fields if necessary

4. **Test functionality**:
   - Verify sorting works
   - Check pagination
   - Test action buttons
   - Verify responsive design

## Demo Page

Visit `/demo-tables` to see all DataTable components in action with sample data.

## Benefits

- **Consistent UI**: All tables use the same design system
- **Better UX**: Built-in sorting and pagination
- **Type Safety**: Full TypeScript support
- **Maintainable**: Centralized column definitions
- **Accessible**: Proper ARIA labels and keyboard navigation
- **Responsive**: Works on all screen sizes

## Next Steps

1. Replace existing tables one by one
2. Test thoroughly in each context
3. Remove old table components once migration is complete
4. Consider adding filtering capabilities if needed
