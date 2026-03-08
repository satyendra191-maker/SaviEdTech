BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    gateway TEXT NOT NULL DEFAULT 'razorpay',
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending',
    order_id TEXT NULL,
    payment_id TEXT NULL,
    donor_email TEXT NULL,
    donor_name TEXT NULL,
    donor_phone TEXT NULL,
    email TEXT NULL,
    message TEXT NULL,
    transaction_id TEXT NULL,
    receipt_number TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    gateway_response JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT NULL,
    error_code TEXT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_retry_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.donations
    ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS gateway TEXT NOT NULL DEFAULT 'razorpay',
    ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS order_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS payment_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS donor_email TEXT NULL,
    ADD COLUMN IF NOT EXISTS donor_name TEXT NULL,
    ADD COLUMN IF NOT EXISTS donor_phone TEXT NULL,
    ADD COLUMN IF NOT EXISTS email TEXT NULL,
    ADD COLUMN IF NOT EXISTS message TEXT NULL,
    ADD COLUMN IF NOT EXISTS transaction_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS receipt_number TEXT NULL,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS gateway_response JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS error_message TEXT NULL,
    ADD COLUMN IF NOT EXISTS error_code TEXT NULL,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON public.donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_order_id ON public.donations(order_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON public.donations(created_at DESC);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'success',
    signature TEXT NULL,
    error_message TEXT NULL,
    processed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cron_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    job_id TEXT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER NULL,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    errors TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status TEXT NOT NULL DEFAULT 'success',
    message TEXT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    email_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    send_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ NULL,
    error_message TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'General',
    location TEXT NOT NULL DEFAULT 'Remote',
    type TEXT NULL,
    experience_level TEXT NULL,
    salary_min INTEGER NULL,
    salary_max INTEGER NULL,
    description TEXT NOT NULL DEFAULT '',
    requirements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    responsibilities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    benefits TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    deadline TIMESTAMPTZ NULL,
    employment_type TEXT NULL,
    experience_required TEXT NULL,
    application_deadline DATE NULL,
    is_remote BOOLEAN NOT NULL DEFAULT FALSE,
    view_count INTEGER NOT NULL DEFAULT 0,
    application_count INTEGER NOT NULL DEFAULT 0,
    applications_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.job_listings
    ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'General',
    ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'Remote',
    ADD COLUMN IF NOT EXISTS type TEXT NULL,
    ADD COLUMN IF NOT EXISTS experience_level TEXT NULL,
    ADD COLUMN IF NOT EXISTS salary_min INTEGER NULL,
    ADD COLUMN IF NOT EXISTS salary_max INTEGER NULL,
    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS requirements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS responsibilities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS benefits TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS employment_type TEXT NULL,
    ADD COLUMN IF NOT EXISTS experience_required TEXT NULL,
    ADD COLUMN IF NOT EXISTS application_deadline DATE NULL,
    ADD COLUMN IF NOT EXISTS is_remote BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS application_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS applications_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NULL REFERENCES public.job_listings(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NULL,
    linkedin TEXT NULL,
    portfolio TEXT NULL,
    current_company TEXT NULL,
    years_of_experience NUMERIC NULL,
    current_ctc NUMERIC NULL,
    expected_ctc NUMERIC NULL,
    notice_period TEXT NULL,
    cover_letter TEXT NULL,
    referrer TEXT NULL,
    resume_url TEXT NULL,
    resume_storage_path TEXT NULL,
    resume_file_name TEXT NULL,
    resume_file_size BIGINT NULL,
    additional_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.job_applications
    ADD COLUMN IF NOT EXISTS job_id UUID NULL REFERENCES public.job_listings(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS full_name TEXT NULL,
    ADD COLUMN IF NOT EXISTS email TEXT NULL,
    ADD COLUMN IF NOT EXISTS phone TEXT NULL,
    ADD COLUMN IF NOT EXISTS linkedin TEXT NULL,
    ADD COLUMN IF NOT EXISTS portfolio TEXT NULL,
    ADD COLUMN IF NOT EXISTS current_company TEXT NULL,
    ADD COLUMN IF NOT EXISTS years_of_experience NUMERIC NULL,
    ADD COLUMN IF NOT EXISTS current_ctc NUMERIC NULL,
    ADD COLUMN IF NOT EXISTS expected_ctc NUMERIC NULL,
    ADD COLUMN IF NOT EXISTS notice_period TEXT NULL,
    ADD COLUMN IF NOT EXISTS cover_letter TEXT NULL,
    ADD COLUMN IF NOT EXISTS referrer TEXT NULL,
    ADD COLUMN IF NOT EXISTS resume_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS resume_storage_path TEXT NULL,
    ADD COLUMN IF NOT EXISTS resume_file_name TEXT NULL,
    ADD COLUMN IF NOT EXISTS resume_file_size BIGINT NULL,
    ADD COLUMN IF NOT EXISTS additional_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_job_applications_resume_storage_path
    ON public.job_applications(resume_storage_path);

CREATE TABLE IF NOT EXISTS public.biweekly_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NULL REFERENCES public.tests(id) ON DELETE SET NULL,
    exam_id UUID NULL REFERENCES public.exams(id) ON DELETE SET NULL,
    title TEXT NULL,
    description TEXT NULL,
    scheduled_date DATE NULL,
    test_date DATE NULL,
    start_time TIMESTAMPTZ NULL,
    end_time TIMESTAMPTZ NULL,
    duration_minutes INTEGER NULL,
    total_questions INTEGER NULL,
    registration_opens_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registration_closes_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    max_registrations INTEGER NOT NULL DEFAULT 1000,
    current_registrations INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.biweekly_tests
    ADD COLUMN IF NOT EXISTS test_id UUID NULL REFERENCES public.tests(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS exam_id UUID NULL REFERENCES public.exams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS title TEXT NULL,
    ADD COLUMN IF NOT EXISTS description TEXT NULL,
    ADD COLUMN IF NOT EXISTS scheduled_date DATE NULL,
    ADD COLUMN IF NOT EXISTS test_date DATE NULL,
    ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NULL,
    ADD COLUMN IF NOT EXISTS total_questions INTEGER NULL,
    ADD COLUMN IF NOT EXISTS registration_opens_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS registration_closes_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    ADD COLUMN IF NOT EXISTS max_registrations INTEGER NOT NULL DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS current_registrations INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.biweekly_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    biweekly_test_id UUID NULL REFERENCES public.biweekly_tests(id) ON DELETE CASCADE,
    test_id UUID NULL REFERENCES public.tests(id) ON DELETE SET NULL,
    exam_id UUID NULL REFERENCES public.exams(id) ON DELETE SET NULL,
    user_email TEXT NULL,
    user_name TEXT NULL,
    user_phone TEXT NULL,
    target_exam TEXT NULL,
    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'registered',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, biweekly_test_id)
);

ALTER TABLE IF EXISTS public.biweekly_registrations
    ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS biweekly_test_id UUID NULL REFERENCES public.biweekly_tests(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS test_id UUID NULL REFERENCES public.tests(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS exam_id UUID NULL REFERENCES public.exams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS user_email TEXT NULL,
    ADD COLUMN IF NOT EXISTS user_name TEXT NULL,
    ADD COLUMN IF NOT EXISTS user_phone TEXT NULL,
    ADD COLUMN IF NOT EXISTS target_exam TEXT NULL,
    ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'registered',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    description TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    total_login_days INTEGER NOT NULL DEFAULT 0,
    total_watch_time_minutes INTEGER NOT NULL DEFAULT 0,
    total_questions_attempted INTEGER NOT NULL DEFAULT 0,
    total_correct_answers INTEGER NOT NULL DEFAULT 0,
    total_tests_taken INTEGER NOT NULL DEFAULT 0,
    total_lectures_watched INTEGER NOT NULL DEFAULT 0,
    total_dpp_completed INTEGER NOT NULL DEFAULT 0,
    last_active_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.user_stats
    ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS total_login_days INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_watch_time_minutes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_questions_attempted INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_correct_answers INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tests_taken INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_lectures_watched INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_dpp_completed INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_type TEXT NOT NULL DEFAULT 'overall',
    exam_id UUID NULL REFERENCES public.exams(id) ON DELETE SET NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    user_id UUID NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(leaderboard_type, exam_id, snapshot_date, user_id)
);

CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NULL,
    exam_id UUID NULL REFERENCES public.exams(id) ON DELETE SET NULL,
    subject_id UUID NULL REFERENCES public.subjects(id) ON DELETE SET NULL,
    thumbnail_url TEXT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    total_lectures INTEGER NOT NULL DEFAULT 0,
    total_duration_minutes INTEGER NOT NULL DEFAULT 0,
    instructor UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    progress_percent INTEGER NOT NULL DEFAULT 0,
    lectures_completed INTEGER NOT NULL DEFAULT 0,
    total_lectures INTEGER NOT NULL DEFAULT 0,
    last_lecture_id UUID NULL REFERENCES public.lectures(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.popup_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NULL,
    content TEXT NULL,
    message TEXT NULL,
    link_text TEXT NULL,
    link_url TEXT NULL,
    show_after_seconds INTEGER NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.popup_ads
    ADD COLUMN IF NOT EXISTS title TEXT NULL,
    ADD COLUMN IF NOT EXISTS content TEXT NULL,
    ADD COLUMN IF NOT EXISTS message TEXT NULL,
    ADD COLUMN IF NOT EXISTS link_text TEXT NULL,
    ADD COLUMN IF NOT EXISTS link_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS show_after_seconds INTEGER NULL,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMIT;
