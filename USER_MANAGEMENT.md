# User Management Guide

## Overview

The Observation Tracker app now only allows sign-in (no public sign-up). You need to manually create users in your Supabase database.

## How to Add Users

### Method 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**

   - Visit [supabase.com](https://supabase.com)
   - Sign in and select your project: `tnhptcxqtvdguvsjnoty`

2. **Navigate to Authentication**

   - In the left sidebar, click **"Authentication"**
   - Click on **"Users"** tab

3. **Add a New User**

   - Click **"Add user"** button
   - Enter the user's email address
   - Set a temporary password (user can change it later)
   - Click **"Create user"**

4. **Send Credentials to User**
   - Share the email and temporary password with the user
   - They can sign in and change their password if needed

### Method 2: SQL Command

You can also add users directly via SQL in the Supabase SQL Editor:

```sql
-- Create a new user (replace with actual email and password)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'user@example.com',
  crypt('temporary_password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
```

## User Management Features

### Reset Password

- In Supabase Dashboard → Authentication → Users
- Find the user and click the **"..."** menu
- Select **"Reset password"**
- User will receive an email to reset their password

### Disable User

- In Supabase Dashboard → Authentication → Users
- Find the user and click the **"..."** menu
- Select **"Disable user"** to prevent them from signing in

### Delete User

- In Supabase Dashboard → Authentication → Users
- Find the user and click the **"..."** menu
- Select **"Delete user"** to permanently remove them

## Security Notes

- Only you (the admin) can create new users
- Users cannot sign up themselves
- All user data is isolated per user (Row Level Security is enabled)
- Users can only see their own sessions and observations

## Current App Behavior

- **Login Page**: Shows only sign-in form
- **No Sign-up**: Users cannot create accounts themselves
- **Admin Message**: Shows "Contact your administrator to request access"
- **User Control**: You have full control over who can access the app
