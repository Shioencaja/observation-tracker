# 🚀 Deployment Guide - Dependencia del guía

## Prerequisites

1. **Supabase Project**: Make sure your Supabase project is set up with the correct database schema
2. **Environment Variables**: You'll need to configure these in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Deployment Steps

### Option 1: Using Vercel CLI (Recommended)

1. **Login to Vercel**:

   ```bash
   vercel login
   ```

2. **Deploy**:

   ```bash
   vercel --prod
   ```

3. **Set Environment Variables**:
   - Go to your Vercel dashboard
   - Navigate to your project settings
   - Add the environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

### Option 2: Using Vercel Dashboard

1. **Connect Repository**:

   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your Git repository

2. **Configure Build Settings**:

   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Set Environment Variables**:
   - Add the Supabase environment variables in the project settings

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Setup

Make sure your Supabase database has the correct schema:

1. **Tables**:

   - `sessions` (with `option_ids` column)
   - `observations` (without `description` column)
   - `observation_options` (global, read-only)

2. **Functions**:

   - `validate_option_ids`
   - `get_option_names`

3. **Views**:
   - `session_stats`

## Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database schema up to date
- [ ] Authentication working
- [ ] Mobile responsiveness tested
- [ ] Session creation/deletion working
- [ ] Observation management working

## Features Included

✅ **Spanish Translation**: Complete UI in Spanish
✅ **Mobile-First Design**: Optimized for 375px width
✅ **Modern Navbar**: Sticky header with hamburger menu
✅ **Session Management**: Create, end, and delete sessions
✅ **Observation Tracking**: Multi-select options with tags
✅ **Responsive Tables**: Mobile-optimized layouts
✅ **Authentication**: Supabase Auth integration
✅ **Real-time Updates**: Live data synchronization

## Support

If you encounter any issues:

1. Check the Vercel deployment logs
2. Verify environment variables are set correctly
3. Ensure database schema matches the application requirements
4. Test authentication flow
