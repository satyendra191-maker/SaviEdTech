# Career Portal Setup Guide

This guide will help you set up the Career Portal feature for SaviEdTech.

## Overview

The Career Portal includes:
- Job listings page with search and filters
- Individual job detail pages
- Application form with resume upload (PDF, max 1MB)
- Admin interface for managing jobs and applications
- API routes for handling applications

## Database Setup

### 1. Run the Migration

Execute the SQL migration file in your Supabase SQL Editor:

```sql
-- File: supabase/migrations/20240305_career_portal.sql
```

This will create:
- `job_listings` table - stores job postings
- `job_applications` table - stores candidate applications
- Row Level Security (RLS) policies
- Indexes for performance
- RPC function for incrementing application counts

### 2. Create Storage Bucket

In the Supabase Dashboard:

1. Go to **Storage** → **New Bucket**
2. Name: `career-applications`
3. Check **Public bucket** (for admin access)
4. Click **Create bucket**

#### Set up Storage Policies

Add these policies to the `career-applications` bucket:

**Policy 1: Allow public uploads (for applications)**
- Name: `Allow public uploads`
- Allowed operation: `INSERT`
- Target roles: `anon`, `authenticated`
- Policy definition: `true`

**Policy 2: Allow admin access**
- Name: `Allow admin access`
- Allowed operation: `SELECT`
- Target roles: `authenticated`
- Policy definition:
```sql
(auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'content_manager')
))
```

**Policy 3: Allow file deletion**
- Name: `Allow admin delete`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- Policy definition:
```sql
(auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'content_manager')
))
```

## File Structure

```
src/
├── app/
│   ├── careers/
│   │   ├── page.tsx              # Job listings page
│   │   ├── [jobId]/
│   │   │   └── page.tsx          # Job detail page
│   │   └── apply/
│   │       └── page.tsx          # Application form
│   ├── admin/
│   │   └── careers/
│   │       └── page.tsx          # Admin management
│   └── api/
│       └── careers/
│           └── route.ts          # API routes
├── types/
│   └── careers.ts                # TypeScript types
└── ...

supabase/
└── migrations/
    └── 20240305_career_portal.sql # Database schema
```

## Features

### Public Pages

1. **Job Listings** (`/careers`)
   - Search by title, skills, keywords
   - Filter by department, job type, experience level
   - Responsive grid layout
   - Real-time job count

2. **Job Detail** (`/careers/[jobId]`)
   - Full job description
   - Requirements and responsibilities
   - Skills and benefits
   - Apply button
   - Share functionality

3. **Application Form** (`/careers/apply?jobId=xxx`)
   - Personal information
   - Professional details
   - Resume upload (PDF, max 1MB)
   - Cover letter
   - Success confirmation

### Admin Interface (`/admin/careers`)

1. **Job Management**
   - Create new job postings
   - Edit existing jobs
   - Activate/deactivate listings
   - View application counts

2. **Application Tracking**
   - View all applications
   - Filter by status
   - Update application status (New, Reviewing, Shortlisted, Rejected, Hired)
   - Download resumes
   - View applicant details

### API Endpoints

- `GET /api/careers` - List jobs
- `POST /api/careers` - Submit application / Create job
- `PATCH /api/careers` - Update job/application
- `DELETE /api/careers?id=xxx` - Delete job/application

## TypeScript Types

The types are defined in `src/types/careers.ts`:

```typescript
- JobListing
- JobApplication
- ApplicationWithJob
- JobType ('full-time' | 'part-time' | 'contract' | 'internship')
- ExperienceLevel ('entry' | 'mid' | 'senior' | 'lead')
- ApplicationStatus ('new' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired')
```

## Security

1. **Row Level Security (RLS)** is enabled on all tables
2. Public users can:
   - View active job listings
   - Submit applications
3. Admins/Content Managers can:
   - Full CRUD on job listings
   - View and manage applications
   - Download resumes

## Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing the Setup

1. **Create a test job** (as admin):
   - Go to `/admin/careers`
   - Click "Post New Job"
   - Fill in details
   - Save

2. **View job listing**:
   - Go to `/careers`
   - Verify the job appears
   - Test search and filters

3. **Submit test application**:
   - Click on a job
   - Click "Apply Now"
   - Fill the form
   - Upload a PDF resume (under 1MB)
   - Submit
   - Verify success message

4. **Review application** (as admin):
   - Go to `/admin/careers`
   - Switch to "Applications" tab
   - View the submitted application
   - Download the resume
   - Update status

## Troubleshooting

### Resume upload fails
- Check storage bucket exists: `career-applications`
- Verify storage policies are set
- Check file is PDF and under 1MB

### Applications not showing
- Verify database migration ran successfully
- Check RLS policies
- Ensure `job_applications` table exists

### Cannot create jobs (admin)
- Verify user has `admin` or `content_manager` role in `profiles` table
- Check RLS policies allow admin access

## Next Steps

1. Set up email notifications for new applications
2. Add application notes/comments for team collaboration
3. Implement application stages/pipeline
4. Add analytics dashboard for recruitment metrics
5. Integrate with calendar for interview scheduling

## Support

For issues or questions, refer to:
- Database schema: `supabase/migrations/20240305_career_portal.sql`
- Type definitions: `src/types/careers.ts`
- API routes: `src/app/api/careers/route.ts`
