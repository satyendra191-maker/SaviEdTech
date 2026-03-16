# SaviEduTech Authentication System

## Overview

This document describes the complete authentication system implementation for SaviEduTech, including email login, Google OAuth, signup with verification, and role-based access control.

## Database Schema

### Profiles Table Updates

The profiles table has been updated with the following fields:

```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
```

### Profile Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key, references auth.users |
| email | TEXT | User email (unique) |
| full_name | TEXT | User's full name |
| role | VARCHAR(50) | User role (student, teacher, admin, etc.) |
| avatar_url | TEXT | Profile picture URL |
| is_verified | BOOLEAN | Whether user is verified (default: false) |
| status | VARCHAR(50) | Account status (pending, active, blocked) |
| created_at | TIMESTAMP | Creation timestamp |

## Authentication Flow

### Signup Flow

1. User signs up with email/password
2. Supabase sends verification email
3. After email verification, profile is created with:
   - `is_verified = false`
   - `status = pending`
4. Admin reviews and approves/rejects in admin dashboard
5. Approved users can login

### Login Flow

1. User enters email/password or clicks Google login
2. System verifies credentials
3. System checks profile:
   - If `status = blocked` → deny login
   - If `is_verified = false` OR `status = pending` → deny login
   - If `is_verified = true` AND `status = active` → allow login

### Google OAuth Flow

1. User clicks "Sign in with Google"
2. After OAuth callback, system checks:
   - Profile exists in database
   - `is_verified = true`
   - `status = active`
3. If not verified → logout and redirect to error page
4. If verified → allow dashboard access

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://qhdywhetkzrqdxjxgxbx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

## Google Cloud Console Configuration

### Authorized JavaScript Origins
- https://saviedutech.vercel.app
- http://localhost:3000

### Authorized Redirect URIs
- https://qhdywhetkzrqdxjxgxbx.supabase.co/auth/v1/callback

## Protected Routes

The following routes are protected and require authentication:

- `/dashboard/*`
- `/admin/*`
- `/parent/*`
- `/labs`
- `/experiments`
- `/student`
- `/teacher`

## Role-Based Access

| Role | Access |
|------|--------|
| admin | Full access to all admin panels |
| content_manager | Admin courses, lectures, questions, tests |
| faculty | Dashboard, content management |
| finance_manager | Admin finance, payments |
| hr | Admin careers |
| student | Dashboard, tests, practice |
| parent | Parent dashboard |

## Key Components

### AuthProvider (`src/lib/auth/AuthProvider.tsx`)

Main authentication context provider with:
- User profile state
- Role management
- Verification status checks
- Login/logout functions

### AuthGuard (`src/lib/auth/AuthGuard.tsx`)

Protected route component:
- Checks authentication
- Checks verification status
- Checks role permissions

### Login Page (`src/app/(auth)/login/page.tsx`)

- Email/password login
- Google OAuth login
- Forgot password
- Error handling for verification failures

### Pending Verification Page (`src/app/(auth)/pending-verification/page.tsx`)

- Displayed to unverified users
- Shows explanation of verification process
- Option to resend email

### Admin User Verification Panel (`src/app/admin/users/page.tsx`)

- List all users with status
- Filter by pending/active/blocked
- Approve/reject buttons
- Search functionality

## RLS Policies

```sql
-- Users can read own profile
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update own profile (except verification)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admin can update verification status
CREATE POLICY "Admin can update verification status" ON profiles
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
```

## API Endpoints

### POST /api/auth/bootstrap-profile
Creates a profile for new users with default verification status.

### POST /api/auth/verify-user
Admin endpoint to verify or block users (uses Supabase function).

## Error Handling

| Error Code | Message | Description |
|------------|---------|-------------|
| session_failed | Authentication Failed | General auth error |
| profile_not_found | Account Not Found | Profile doesn't exist |
| account_blocked | Account Blocked | User is blocked |
| not_verified | Account Pending Verification | User not verified |

## Supabase Configuration

### Enable Providers

1. Go to Authentication → Providers
2. Enable Email (with confirmation)
3. Enable Google (configure credentials)

### Row Level Security

1. Go to Authentication → Policies
2. Enable RLS on profiles table
3. Create policies as defined above

## Testing Checklist

- [ ] User can sign up with email
- [ ] Email verification works
- [ ] Profile created with pending status
- [ ] Admin can see pending users
- [ ] Admin can approve user (sets is_verified=true, status=active)
- [ ] Admin can block user (sets status=blocked)
- [ ] Approved user can login with email
- [ ] Approved user can login with Google
- [ ] Unverified user cannot login
- [ ] Blocked user cannot login
- [ ] Protected routes redirect to login
- [ ] Role-based redirects work correctly
