# Deployment Guide - Ballon SaaS

This guide will help you deploy the Ballon SaaS platform to Vercel with a fresh Supabase instance.

## Prerequisites

- GitHub account
- Vercel account
- Supabase account
- Node.js 18+ (for local development)

## Step 1: Create New Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `ballon-saas`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

## Step 2: Setup Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Copy the entire content from `database-schema-orgs.sql`
3. Paste it into the SQL Editor
4. Click **Run** to execute the schema

This will create:

- All necessary tables with proper relationships
- Row Level Security (RLS) policies
- Helper functions
- Indexes for performance

## Step 3: Configure Supabase Settings

### Enable Email Authentication

1. Go to **Authentication > Settings**
2. Enable **Email** provider
3. Configure email templates (optional)
4. Set up redirect URLs:
   - Site URL: `http://localhost:3000` (for development)
   - Redirect URLs: `http://localhost:3000/auth/callback`

### Configure RLS

1. Go to **Authentication > Policies**
2. Verify that RLS is enabled for all tables
3. Check that the policies from the schema are active

### Get API Keys

1. Go to **Settings > API**
2. Copy the following values:
   - **Project URL**
   - **anon public** key

## Step 4: Deploy to Vercel

### Option A: Deploy from GitHub

1. **Push to GitHub**:

   ```bash
   git init
   git add .
   git commit -m "Initial commit - Ballon SaaS with organizations"
   git branch -M main
   git remote add origin https://github.com/your-username/ballon-saas.git
   git push -u origin main
   ```

2. **Connect to Vercel**:

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure project settings

3. **Set Environment Variables**:
   In Vercel project settings, add:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete

### Option B: Deploy with Vercel CLI

1. **Install Vercel CLI**:

   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:

   ```bash
   vercel login
   ```

3. **Deploy**:

   ```bash
   vercel
   ```

4. **Set Environment Variables**:

   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

5. **Redeploy**:
   ```bash
   vercel --prod
   ```

## Step 5: Configure Production Settings

### Update Supabase Redirect URLs

1. In Supabase, go to **Authentication > Settings**
2. Update redirect URLs:
   - Site URL: `https://your-vercel-app.vercel.app`
   - Redirect URLs: `https://your-vercel-app.vercel.app/auth/callback`

### Configure Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings > Domains**
2. Add your custom domain
3. Update Supabase redirect URLs with your custom domain

## Step 6: Initial Setup

### Create First Organization

1. Visit your deployed application
2. Sign up with your email
3. Create your first organization
4. You'll automatically become the owner

### Test Features

1. Create a project within your organization
2. Add observation questions
3. Create a session
4. Make observations
5. Test data export

## Step 7: Production Optimizations

### Database Optimization

1. **Enable Connection Pooling** in Supabase
2. **Set up Database Backups**
3. **Monitor Performance** in Supabase dashboard

### Vercel Optimizations

1. **Enable Analytics** in Vercel dashboard
2. **Set up Error Tracking** (optional)
3. **Configure Custom Headers** if needed

### Security Hardening

1. **Review RLS Policies**
2. **Set up Database Webhooks** for important events
3. **Configure Rate Limiting** (if needed)

## Environment Variables Reference

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional (for advanced features)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**:

   - Check that all policies are properly configured
   - Verify user authentication is working
   - Check Supabase logs for policy violations

2. **Environment Variable Issues**:

   - Verify variables are set in Vercel
   - Check that variable names match exactly
   - Redeploy after adding new variables

3. **Database Connection Issues**:

   - Verify Supabase URL and keys
   - Check if project is paused (free tier)
   - Review connection limits

4. **Authentication Issues**:
   - Check redirect URLs in Supabase
   - Verify email provider is enabled
   - Check email templates configuration

### Debugging Steps

1. **Check Vercel Logs**:

   ```bash
   vercel logs your-deployment-url
   ```

2. **Check Supabase Logs**:

   - Go to Supabase dashboard > Logs
   - Review authentication and database logs

3. **Test Locally**:
   ```bash
   npm run dev
   ```
   - Test with production Supabase instance
   - Verify all features work

## Monitoring and Maintenance

### Regular Tasks

1. **Monitor Database Performance**
2. **Review Error Logs**
3. **Update Dependencies**
4. **Backup Important Data**

### Scaling Considerations

1. **Database Scaling**: Upgrade Supabase plan as needed
2. **CDN**: Vercel provides global CDN automatically
3. **Monitoring**: Set up alerts for errors and performance

## Support

If you encounter issues:

1. Check this guide first
2. Review Supabase and Vercel documentation
3. Check the application logs
4. Create an issue in the repository

---

Your Ballon SaaS platform is now ready for production use! 🚀


