# Ballon SaaS - Multi-Organization Observation Platform

A comprehensive multi-organization observation tracking platform with role-based access control, built with Next.js, Supabase, and TypeScript.

## Features

### 🏢 Multi-Organization Support

- Create and manage multiple organizations
- Organization-specific projects and data isolation
- Organization branding and settings

### 👥 Role-Based Access Control

- **Owner**: Full control over organization and all resources
- **Admin**: Manage projects, invite members, access all data
- **Member**: Create projects, manage own sessions
- **Viewer**: Read-only access to organization data

### 📊 Project Management

- Create projects within organizations
- Custom observation questions and types
- Session tracking and data collection
- CSV export with organization-aware data

### 🔐 Security & Authentication

- Supabase Auth integration
- Row Level Security (RLS) policies
- Organization-scoped access control
- Secure API endpoints

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI Components**: Radix UI, Tailwind CSS
- **Deployment**: Vercel
- **Database**: PostgreSQL with advanced RLS policies

## Database Schema

The enhanced schema includes:

- `organizations` - Organization entities with settings
- `organization_users` - User membership and roles
- `projects` - Projects scoped to organizations
- `project_users` - Project-level access control
- `sessions` - Observation sessions
- `observations` - Individual observations
- `organization_invitations` - Invitation system

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Vercel account (for deployment)

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd ballon-saas
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `database-schema-orgs.sql`
3. Configure RLS policies (included in schema)

### 4. Development

```bash
npm run dev
```

Visit `http://localhost:3000`

### 5. Deployment

#### Deploy to Vercel

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

```bash
npm run build
```

## Project Structure

```
src/
├── app/
│   ├── organizations/          # Organization management
│   ├── org/[slug]/            # Organization dashboard
│   ├── org/[slug]/projects/   # Project management
│   └── ...
├── components/
│   ├── organizations/         # Organization components
│   ├── questions/            # Question types
│   └── ...
├── lib/
│   ├── auth-utils-orgs.ts    # Organization-aware auth
│   ├── supabase.ts          # Supabase client
│   └── ...
├── types/
│   ├── supabase-orgs.ts     # Enhanced type definitions
│   └── ...
└── ...
```

## Key Features Implementation

### Organization Management

- Create organizations with unique slugs
- Role-based member management
- Organization settings and branding

### Project Access Control

- Projects belong to organizations
- Multi-level access control (org + project level)
- Automatic access inheritance

### Data Isolation

- All data scoped to organizations
- RLS policies prevent cross-organization access
- Secure API endpoints with validation

### User Experience

- Intuitive organization switching
- Role-based UI permissions
- Responsive design for all devices

## API Endpoints

### Organization Management

- `GET /api/organizations` - List user organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/[id]` - Get organization details

### Project Management

- `GET /api/org/[slug]/projects` - List organization projects
- `POST /api/org/[slug]/projects` - Create project
- `GET /api/org/[slug]/projects/[id]` - Get project details

### Data Export

- `GET /api/org/[slug]/projects/[id]/export` - Export project data

## Security Considerations

1. **Row Level Security**: All tables have comprehensive RLS policies
2. **Organization Isolation**: Data is strictly isolated by organization
3. **Role Validation**: All operations validate user roles and permissions
4. **Input Sanitization**: All inputs are validated and sanitized
5. **Secure Authentication**: Supabase Auth with JWT tokens

## Development Guidelines

### Adding New Features

1. Update database schema if needed
2. Add TypeScript types
3. Implement server-side validation
4. Add client-side components
5. Update RLS policies
6. Test with different user roles

### Database Changes

1. Update `database-schema-orgs.sql`
2. Update TypeScript types in `src/types/supabase-orgs.ts`
3. Test RLS policies
4. Update API endpoints

### UI Components

- Use Radix UI primitives
- Follow Tailwind CSS patterns
- Implement role-based visibility
- Add loading and error states

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the code examples

---

Built with ❤️ for multi-organization data management and observation tracking.


