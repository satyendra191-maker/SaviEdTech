-- Career Portal Database Schema
-- Migration: Create tables for job listings and applications

-- ============================================================
-- 1. CREATE JOB LISTINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS job_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('full-time', 'part-time', 'contract', 'internship')),
    experience_level TEXT NOT NULL CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead')),
    salary_min INTEGER,
    salary_max INTEGER,
    description TEXT NOT NULL,
    requirements TEXT[] DEFAULT '{}',
    responsibilities TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    benefits TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    deadline TIMESTAMP WITH TIME ZONE,
    applications_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for active jobs
CREATE INDEX IF NOT EXISTS idx_job_listings_active ON job_listings(is_active);
CREATE INDEX IF NOT EXISTS idx_job_listings_department ON job_listings(department);
CREATE INDEX IF NOT EXISTS idx_job_listings_type ON job_listings(type);

-- ============================================================
-- 2. CREATE JOB APPLICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES job_listings(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    linkedin TEXT,
    portfolio TEXT,
    current_company TEXT,
    years_of_experience TEXT,
    current_ctc TEXT,
    expected_ctc TEXT,
    notice_period TEXT,
    cover_letter TEXT,
    referrer TEXT,
    resume_url TEXT NOT NULL,
    resume_file_name TEXT NOT NULL,
    resume_file_size INTEGER NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'shortlisted', 'rejected', 'hired')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at);

-- ============================================================
-- 3. CREATE STORAGE BUCKET FOR RESUMES
-- ============================================================

-- Note: Execute this in Supabase Dashboard SQL Editor
-- The bucket needs to be created via the Storage API or Dashboard

-- Create policy for public read access to resumes (if needed for admin download)
-- CREATE POLICY "Allow admin read access to career applications"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'career-applications' AND auth.role() = 'authenticated');

-- ============================================================
-- 4. CREATE RPC FUNCTION TO INCREMENT APPLICATION COUNT
-- ============================================================

CREATE OR REPLACE FUNCTION increment_job_application_count(job_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE job_listings
    SET applications_count = applications_count + 1
    WHERE id = job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on job_listings
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on job_applications
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. CREATE RLS POLICIES FOR JOB LISTINGS
-- ============================================================

-- Allow anyone to read active job listings
CREATE POLICY "Allow public read of active jobs"
ON job_listings FOR SELECT
USING (is_active = true);

-- Allow admin to manage all job listings
CREATE POLICY "Allow admin full access to jobs"
ON job_listings FOR ALL
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('admin', 'content_manager')
    )
);

-- ============================================================
-- 7. CREATE RLS POLICIES FOR JOB APPLICATIONS
-- ============================================================

-- Allow anyone to submit applications (INSERT)
CREATE POLICY "Allow public to submit applications"
ON job_applications FOR INSERT
WITH CHECK (true);

-- Allow admin to read all applications
CREATE POLICY "Allow admin to read applications"
ON job_applications FOR SELECT
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('admin', 'content_manager')
    )
);

-- Allow admin to update application status
CREATE POLICY "Allow admin to update applications"
ON job_applications FOR UPDATE
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('admin', 'content_manager')
    )
);

-- Allow admin to delete applications
CREATE POLICY "Allow admin to delete applications"
ON job_applications FOR DELETE
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('admin', 'content_manager')
    )
);

-- ============================================================
-- 8. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_listings_updated_at
    BEFORE UPDATE ON job_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. INSERT SAMPLE JOB LISTINGS (OPTIONAL)
-- ============================================================

-- Uncomment and modify to add sample jobs
/*
INSERT INTO job_listings (
    title, department, location, type, experience_level,
    salary_min, salary_max, description, requirements, responsibilities, skills, benefits
) VALUES 
(
    'Senior Frontend Developer',
    'Engineering',
    'Bangalore / Remote',
    'full-time',
    'senior',
    1500000,
    2500000,
    'We are looking for an experienced Frontend Developer to lead our web application development...',
    ARRAY['5+ years of experience with React', 'Strong TypeScript skills', 'Experience with Next.js'],
    ARRAY['Develop and maintain frontend applications', 'Lead technical decisions', 'Mentor junior developers'],
    ARRAY['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL'],
    ARRAY['Health Insurance', 'Flexible Work Hours', 'Learning Budget', 'Stock Options']
),
(
    'Content Creator - Physics',
    'Content',
    'Remote',
    'full-time',
    'mid',
    600000,
    1200000,
    'Create engaging physics content for JEE and NEET preparation...',
    ARRAY['Masters in Physics or related field', 'Experience in ed-tech content creation', 'Strong communication skills'],
    ARRAY['Create video lectures', 'Develop practice questions', 'Review and improve content quality'],
    ARRAY['Physics', 'Content Creation', 'Video Editing', 'Educational Technology'],
    ARRAY['Work from Home', 'Performance Bonus', 'Professional Development']
);
*/
