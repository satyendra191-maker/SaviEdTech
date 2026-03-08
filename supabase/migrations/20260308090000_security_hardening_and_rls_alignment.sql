BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Compatibility columns and constraints
-- -----------------------------------------------------------------------------

UPDATE public.profiles
SET role = 'content_manager'
WHERE role = 'faculty';

ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS referral_code TEXT,
    ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ads_disabled_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ads_disabled_permanent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code_unique
    ON public.profiles (referral_code)
    WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by
    ON public.profiles (referred_by);

ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE IF EXISTS public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'admin', 'content_manager', 'super_admin', 'parent', 'hr'));

ALTER TABLE IF EXISTS public.donations
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations(user_id);

ALTER TABLE IF EXISTS public.job_listings
    ADD COLUMN IF NOT EXISTS applications_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.job_applications
    ADD COLUMN IF NOT EXISTS referrer TEXT,
    ADD COLUMN IF NOT EXISTS resume_file_name TEXT,
    ADD COLUMN IF NOT EXISTS resume_file_size BIGINT,
    ADD COLUMN IF NOT EXISTS resume_storage_path TEXT;

CREATE INDEX IF NOT EXISTS idx_job_applications_resume_storage_path
    ON public.job_applications(resume_storage_path);

UPDATE public.job_applications
SET resume_storage_path = regexp_replace(resume_url, '^.*?/career-applications/', '')
WHERE resume_storage_path IS NULL
  AND resume_url IS NOT NULL
  AND resume_url ~ '/career-applications/';

ALTER TABLE IF EXISTS public.activity_logs
    ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::JSONB;

ALTER TABLE IF EXISTS public.webhook_logs
    ADD COLUMN IF NOT EXISTS signature TEXT;

ALTER TABLE IF EXISTS public.cron_logs
    ADD COLUMN IF NOT EXISTS job_id TEXT,
    ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS result JSONB DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS errors TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

ALTER TABLE IF EXISTS public.user_stats
    ADD COLUMN IF NOT EXISTS total_login_days INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_watch_time_minutes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_questions_attempted INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_correct_answers INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tests_taken INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_lectures_watched INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_dpp_completed INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rank INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tests_completed INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS average_score NUMERIC(6,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS public.biweekly_tests
    ADD COLUMN IF NOT EXISTS test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS test_date DATE,
    ADD COLUMN IF NOT EXISTS registration_opens_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS registration_closes_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    ADD COLUMN IF NOT EXISTS max_registrations INTEGER NOT NULL DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS current_registrations INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE IF EXISTS public.biweekly_registrations
    ADD COLUMN IF NOT EXISTS test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS user_email TEXT,
    ADD COLUMN IF NOT EXISTS user_name TEXT,
    ADD COLUMN IF NOT EXISTS user_phone TEXT,
    ADD COLUMN IF NOT EXISTS target_exam TEXT,
    ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- -----------------------------------------------------------------------------
-- Missing support tables used by the application
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.parent_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_phone TEXT NOT NULL,
    student_name TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_links_parent_id ON public.parent_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_student_id ON public.parent_links(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_status ON public.parent_links(verification_status);

CREATE TABLE IF NOT EXISTS public.backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type TEXT NOT NULL DEFAULT 'full' CHECK (backup_type IN ('full', 'incremental', 'schema')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    file_path TEXT,
    file_name TEXT,
    file_size_bytes BIGINT,
    row_count INTEGER,
    storage_bucket TEXT NOT NULL DEFAULT 'backups',
    download_url TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backups_status ON public.backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON public.backups(created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    dpp_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    revision_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    test_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    challenge_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    marketing_emails BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    email_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    send_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_send_at ON public.email_queue(send_at);
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON public.activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    thumbnail_url TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    total_lectures INTEGER NOT NULL DEFAULT 0,
    total_duration_minutes INTEGER NOT NULL DEFAULT 0,
    instructor UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    lectures_completed INTEGER NOT NULL DEFAULT 0,
    total_lectures INTEGER NOT NULL DEFAULT 0,
    last_lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.auth_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_occurred_at ON public.auth_audit_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_ip_address ON public.auth_audit_logs(ip_address);

CREATE TABLE IF NOT EXISTS public.blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL UNIQUE,
    reason TEXT,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    blocked_until TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_blocked_until ON public.blocked_ips(blocked_until DESC);

CREATE TABLE IF NOT EXISTS public.query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT,
    table_accessed TEXT,
    operation_type TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ip_address INET,
    query_text TEXT,
    row_count INTEGER,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_logs_occurred_at ON public.query_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_logs_table_accessed ON public.query_logs(table_accessed);

CREATE TABLE IF NOT EXISTS public.admin_escalation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attempted_action TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    "current_role" TEXT NOT NULL,
    "required_role" TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    blocked BOOLEAN NOT NULL DEFAULT TRUE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    ip_address INET,
    user_agent TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource TEXT,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_type TEXT NOT NULL,
    audit_subtype TEXT,
    time_range TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.performance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report JSONB NOT NULL,
    overall_score INTEGER,
    critical_issues INTEGER NOT NULL DEFAULT 0,
    high_priority_issues INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_lectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    teacher_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 45,
    difficulty TEXT NOT NULL DEFAULT 'intermediate',
    target_exam TEXT NOT NULL DEFAULT 'jee-main',
    language TEXT NOT NULL DEFAULT 'english',
    content JSONB NOT NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_question_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    teacher_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'mixed',
    target_exam TEXT NOT NULL DEFAULT 'jee-main',
    question_count INTEGER NOT NULL DEFAULT 0,
    total_marks INTEGER NOT NULL DEFAULT 0,
    estimated_time INTEGER NOT NULL DEFAULT 0,
    questions JSONB NOT NULL DEFAULT '[]'::JSONB,
    batch_id TEXT,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name TEXT NOT NULL,
    test_category TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped', 'running')),
    response_time_ms INTEGER,
    error_message TEXT,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    run_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON public.test_results(run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_executed_at ON public.test_results(executed_at DESC);

CREATE TABLE IF NOT EXISTS public.test_run_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL UNIQUE,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    total_tests INTEGER NOT NULL DEFAULT 0,
    passed INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    skipped INTEGER NOT NULL DEFAULT 0,
    total_duration_ms INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'all'
);

CREATE INDEX IF NOT EXISTS idx_test_run_summaries_started_at
    ON public.test_run_summaries(started_at DESC);

-- -----------------------------------------------------------------------------
-- Additional compatibility alignment for active frontend code paths
-- -----------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS target_exam TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'exam_target'
    ) THEN
        UPDATE public.profiles
        SET target_exam = exam_target
        WHERE target_exam IS NULL
          AND exam_target IS NOT NULL;
    END IF;
END $$;

ALTER TABLE IF EXISTS public.popup_ads
    ADD COLUMN IF NOT EXISTS button_text TEXT,
    ADD COLUMN IF NOT EXISTS button_url TEXT,
    ADD COLUMN IF NOT EXISTS display_duration_seconds INTEGER NOT NULL DEFAULT 10;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'popup_ads'
          AND column_name = 'link_text'
    ) THEN
        UPDATE public.popup_ads
        SET button_text = COALESCE(button_text, link_text)
        WHERE button_text IS NULL
          AND link_text IS NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'popup_ads'
          AND column_name = 'link_url'
    ) THEN
        UPDATE public.popup_ads
        SET button_url = COALESCE(button_url, link_url)
        WHERE button_url IS NULL
          AND link_url IS NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'popup_ads'
          AND column_name = 'show_after_seconds'
    ) THEN
        UPDATE public.popup_ads
        SET display_duration_seconds = COALESCE(display_duration_seconds, show_after_seconds, 10)
        WHERE display_duration_seconds IS NULL
           OR display_duration_seconds = 10;
    END IF;
END $$;

ALTER TABLE IF EXISTS public.job_listings
    ADD COLUMN IF NOT EXISTS type TEXT,
    ADD COLUMN IF NOT EXISTS experience_level TEXT,
    ADD COLUMN IF NOT EXISTS salary_min INTEGER,
    ADD COLUMN IF NOT EXISTS salary_max INTEGER,
    ADD COLUMN IF NOT EXISTS benefits TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'job_listings'
          AND column_name = 'employment_type'
    ) THEN
        UPDATE public.job_listings
        SET type = COALESCE(type, employment_type)
        WHERE type IS NULL
          AND employment_type IS NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'job_listings'
          AND column_name = 'application_deadline'
    ) THEN
        UPDATE public.job_listings
        SET deadline = COALESCE(deadline, application_deadline::timestamptz)
        WHERE deadline IS NULL
          AND application_deadline IS NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'job_listings'
          AND column_name = 'application_count'
    ) THEN
        UPDATE public.job_listings
        SET applications_count = COALESCE(NULLIF(applications_count, 0), application_count, 0);
    ELSE
        UPDATE public.job_listings
        SET applications_count = COALESCE(applications_count, 0);
    END IF;
END $$;

ALTER TABLE IF EXISTS public.study_plans
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'study_plans'
          AND column_name = 'name'
    ) THEN
        UPDATE public.study_plans
        SET title = COALESCE(title, name, 'Untitled Plan')
        WHERE title IS NULL;
    ELSE
        UPDATE public.study_plans
        SET title = COALESCE(title, 'Untitled Plan')
        WHERE title IS NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.study_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    topic TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    duration_minutes INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    completed_at TIMESTAMPTZ,
    lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_plan_items_plan_id ON public.study_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_study_plan_items_scheduled_date ON public.study_plan_items(scheduled_date);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'study_schedule_items'
    ) THEN
        INSERT INTO public.study_plan_items (
            id,
            plan_id,
            title,
            description,
            subject,
            topic,
            scheduled_date,
            scheduled_time,
            duration_minutes,
            status,
            completed_at,
            created_at
        )
        SELECT
            ssi.id,
            ssi.plan_id,
            COALESCE(ssi.topic, ssi.activity_type, 'Study Task'),
            ssi.notes,
            ssi.subject,
            ssi.topic,
            COALESCE(ssi.date, CURRENT_DATE),
            NULL,
            ssi.duration_minutes,
            COALESCE(ssi.status, 'pending'),
            ssi.completed_at,
            COALESCE(ssi.created_at, NOW())
        FROM public.study_schedule_items AS ssi
        WHERE NOT EXISTS (
            SELECT 1 FROM public.study_plan_items spi WHERE spi.id = ssi.id
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.doubts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    topic TEXT,
    lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'in_progress', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    assigned_faculty_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ
);

ALTER TABLE IF EXISTS public.doubts
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS subject TEXT,
    ADD COLUMN IF NOT EXISTS topic TEXT,
    ADD COLUMN IF NOT EXISTS lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS assigned_faculty_id TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_doubts_user_id ON public.doubts(user_id);
CREATE INDEX IF NOT EXISTS idx_doubts_status ON public.doubts(status);
CREATE INDEX IF NOT EXISTS idx_doubts_created_at ON public.doubts(created_at DESC);

CREATE TABLE IF NOT EXISTS public.doubt_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doubt_id UUID NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
    faculty_id TEXT NOT NULL,
    response TEXT NOT NULL,
    video_url TEXT,
    document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.doubt_responses
    ADD COLUMN IF NOT EXISTS doubt_id UUID REFERENCES public.doubts(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS faculty_id TEXT,
    ADD COLUMN IF NOT EXISTS response TEXT,
    ADD COLUMN IF NOT EXISTS video_url TEXT,
    ADD COLUMN IF NOT EXISTS document_url TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_doubt_responses_doubt_id ON public.doubt_responses(doubt_id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'doubt_posts'
    ) THEN
        INSERT INTO public.doubts (
            id,
            user_id,
            question,
            description,
            subject,
            topic,
            image_url,
            status,
            priority,
            assigned_faculty_id,
            created_at,
            answered_at
        )
        SELECT
            dp.id,
            dp.user_id,
            dp.title,
            dp.question,
            dp.subject,
            dp.topic,
            dp.image_url,
            CASE dp.status
                WHEN 'open' THEN 'pending'
                WHEN 'resolved' THEN 'answered'
                WHEN 'escalated' THEN 'in_progress'
                ELSE COALESCE(dp.status, 'pending')
            END,
            CASE dp.priority
                WHEN 'normal' THEN 'medium'
                WHEN 'urgent' THEN 'high'
                ELSE COALESCE(dp.priority, 'medium')
            END,
            NULL,
            COALESCE(dp.created_at, NOW()),
            CASE WHEN dp.status IN ('answered', 'resolved') THEN COALESCE(dp.updated_at, dp.created_at, NOW()) END
        FROM public.doubt_posts AS dp
        WHERE NOT EXISTS (
            SELECT 1 FROM public.doubts d WHERE d.id = dp.id
        );
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'doubt_answers'
    ) THEN
        INSERT INTO public.doubt_responses (
            id,
            doubt_id,
            faculty_id,
            response,
            video_url,
            document_url,
            created_at
        )
        SELECT
            da.id,
            da.post_id,
            COALESCE(da.faculty_id, da.user_id::text),
            da.answer,
            NULL,
            NULL,
            COALESCE(da.created_at, NOW())
        FROM public.doubt_answers AS da
        WHERE EXISTS (
            SELECT 1 FROM public.doubts d WHERE d.id = da.post_id
        )
          AND NOT EXISTS (
            SELECT 1 FROM public.doubt_responses dr WHERE dr.id = da.id
        );
    END IF;
END $$;

CREATE OR REPLACE VIEW public.test_sets
WITH (security_invoker = true) AS
SELECT * FROM public.tests;

-- -----------------------------------------------------------------------------
-- Helper functions and RPCs required by the application
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_profile_role(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT p.role
            FROM public.profiles AS p
            WHERE p.id = COALESCE(p_user_id, auth.uid())
            LIMIT 1
        ),
        'anonymous'
    );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(p_roles TEXT[], p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.current_profile_role(COALESCE(p_user_id, auth.uid())) = ANY(COALESCE(p_roles, ARRAY[]::TEXT[]));
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.current_profile_role(COALESCE(p_user_id, auth.uid())) = ANY(ARRAY['admin', 'super_admin']);
$$;

CREATE OR REPLACE FUNCTION public.is_content_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.current_profile_role(COALESCE(p_user_id, auth.uid())) = ANY(ARRAY['admin', 'super_admin', 'content_manager']);
$$;

CREATE OR REPLACE FUNCTION public.is_careers_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.current_profile_role(COALESCE(p_user_id, auth.uid())) = ANY(ARRAY['admin', 'super_admin', 'content_manager', 'hr']);
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of_student(p_student_id UUID, p_parent_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.parent_links AS pl
        WHERE pl.student_id = p_student_id
          AND pl.parent_id = COALESCE(p_parent_id, auth.uid())
          AND pl.verification_status = 'approved'
    );
$$;

CREATE OR REPLACE FUNCTION public.owns_study_plan(p_plan_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.study_plans AS sp
        WHERE sp.id = p_plan_id
          AND sp.user_id = COALESCE(p_user_id, auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.check_rls_status(p_table_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rls_enabled BOOLEAN;
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    SELECT c.relrowsecurity
    INTO v_rls_enabled
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = p_table_name
    LIMIT 1;

    RETURN COALESCE(v_rls_enabled, FALSE);
END;
$$;

DROP FUNCTION IF EXISTS public.get_policies_for_table(TEXT);
DROP FUNCTION IF EXISTS public.get_table_stats();
DROP FUNCTION IF EXISTS public.get_table_stats(TEXT);
DROP FUNCTION IF EXISTS public.get_connection_stats();
DROP FUNCTION IF EXISTS public.get_query_stats();
DROP FUNCTION IF EXISTS public.vacuum_analyze_table(TEXT);

CREATE OR REPLACE FUNCTION public.get_policies_for_table(p_table_name TEXT)
RETURNS TABLE (
    policyname TEXT,
    permissive TEXT,
    roles TEXT[],
    cmd TEXT,
    qual TEXT,
    with_check TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        pol.policyname::TEXT,
        pol.permissive::TEXT,
        pol.roles::TEXT[],
        pol.cmd::TEXT,
        pol.qual::TEXT,
        pol.with_check::TEXT
    FROM pg_policies AS pol
    WHERE pol.schemaname = 'public'
      AND pol.tablename = p_table_name
    ORDER BY pol.policyname;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_table_stats()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    size_bytes BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        st.relname::TEXT AS table_name,
        COALESCE(st.n_live_tup::BIGINT, 0) AS row_count,
        pg_total_relation_size(format('public.%I', st.relname)::regclass) AS size_bytes
    FROM pg_stat_user_tables AS st
    WHERE st.schemaname = 'public'
    ORDER BY size_bytes DESC, table_name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_table_stats(target_table_name TEXT)
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    size_bytes BIGINT,
    n_dead_tup BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        st.relname::TEXT AS table_name,
        COALESCE(st.n_live_tup::BIGINT, 0) AS row_count,
        pg_total_relation_size(format('public.%I', st.relname)::regclass) AS size_bytes,
        COALESCE(st.n_dead_tup::BIGINT, 0) AS n_dead_tup
    FROM pg_stat_user_tables AS st
    WHERE st.schemaname = 'public'
      AND (st.relname = get_table_stats.target_table_name OR format('public.%I', st.relname) = get_table_stats.target_table_name)
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_connection_stats()
RETURNS TABLE (
    total_connections BIGINT,
    active_connections BIGINT,
    idle_connections BIGINT,
    waiting_connections BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_connections,
        COUNT(*) FILTER (WHERE state = 'active')::BIGINT AS active_connections,
        COUNT(*) FILTER (WHERE state = 'idle')::BIGINT AS idle_connections,
        COUNT(*) FILTER (WHERE wait_event IS NOT NULL)::BIGINT AS waiting_connections
    FROM pg_stat_activity
    WHERE datname = current_database();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_query_stats()
RETURNS TABLE (
    total_queries BIGINT,
    slow_queries BIGINT,
    avg_query_time_ms NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
    ) THEN
        RETURN QUERY
        SELECT
            COALESCE(SUM(calls), 0)::BIGINT AS total_queries,
            COALESCE(SUM(CASE WHEN mean_exec_time > 1000 THEN calls ELSE 0 END), 0)::BIGINT AS slow_queries,
            COALESCE(AVG(mean_exec_time), 0)::NUMERIC AS avg_query_time_ms
        FROM pg_stat_statements;
    ELSE
        RETURN QUERY
        SELECT 0::BIGINT, 0::BIGINT, 0::NUMERIC;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.vacuum_analyze_table(table_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.role() <> 'service_role' AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    EXECUTE format('ANALYZE public.%I', replace(table_name, 'public.', ''));
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_job_application_count(job_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.job_listings
    SET applications_count = COALESCE(applications_count, 0) + 1,
        updated_at = NOW()
    WHERE id = increment_job_application_count.job_id
    RETURNING applications_count INTO v_count;

    RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_biweekly_registration(test_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.biweekly_tests
    SET current_registrations = COALESCE(current_registrations, 0) + 1,
        updated_at = NOW()
    WHERE id = increment_biweekly_registration.test_id
    RETURNING current_registrations INTO v_count;

    RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_biweekly_registration(test_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.biweekly_tests
    SET current_registrations = GREATEST(COALESCE(current_registrations, 0) - 1, 0),
        updated_at = NOW()
    WHERE id = decrement_biweekly_registration.test_id
    RETURNING current_registrations INTO v_count;

    RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.link_parent_to_student(
    p_parent_id UUID,
    p_student_phone TEXT,
    p_student_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_link_id UUID;
    v_existing_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF auth.uid() <> p_parent_id AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    IF public.current_profile_role(p_parent_id) NOT IN ('parent', 'admin', 'super_admin') THEN
        RAISE EXCEPTION 'Only parent accounts can create parent links';
    END IF;

    SELECT p.id
    INTO v_student_id
    FROM public.profiles AS p
    WHERE p.phone = p_student_phone
      AND p.role = 'student'
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Student account not found for the provided phone number';
    END IF;

    SELECT pl.id, pl.verification_status
    INTO v_link_id, v_existing_status
    FROM public.parent_links AS pl
    WHERE pl.parent_id = p_parent_id
      AND pl.student_id = v_student_id
    LIMIT 1;

    IF v_link_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'id', v_link_id,
            'student_id', v_student_id,
            'status', v_existing_status,
            'already_exists', TRUE
        );
    END IF;

    INSERT INTO public.parent_links (
        parent_id,
        student_id,
        student_phone,
        student_name,
        verification_status,
        created_at
    )
    VALUES (
        p_parent_id,
        v_student_id,
        p_student_phone,
        p_student_name,
        'pending',
        NOW()
    )
    RETURNING id INTO v_link_id;

    RETURN jsonb_build_object(
        'id', v_link_id,
        'student_id', v_student_id,
        'status', 'pending',
        'already_exists', FALSE
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_parent_link(
    p_link_id UUID,
    p_status TEXT DEFAULT 'approved'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_link public.parent_links%ROWTYPE;
    v_next_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    v_next_status := CASE
        WHEN p_status IN ('approved', 'rejected') THEN p_status
        ELSE 'approved'
    END;

    SELECT *
    INTO v_link
    FROM public.parent_links
    WHERE id = p_link_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent link not found';
    END IF;

    IF auth.uid() <> v_link.student_id AND NOT public.is_admin_user(auth.uid()) THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    UPDATE public.parent_links
    SET verification_status = v_next_status,
        approved_by = auth.uid(),
        approved_at = NOW()
    WHERE id = p_link_id;

    RETURN jsonb_build_object(
        'id', p_link_id,
        'status', v_next_status,
        'student_id', v_link.student_id,
        'parent_id', v_link.parent_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.current_profile_role(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_any_role(TEXT[], UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_content_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_careers_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_parent_of_student(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_study_plan(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rls_status(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_policies_for_table(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_table_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_table_stats(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_connection_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_query_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vacuum_analyze_table(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_job_application_count(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_biweekly_registration(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_biweekly_registration(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_parent_to_student(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_parent_link(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_profile_role(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_any_role(TEXT[], UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_content_user(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_careers_user(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_parent_of_student(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.owns_study_plan(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_rls_status(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_policies_for_table(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_table_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_table_stats(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_connection_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_query_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vacuum_analyze_table(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_job_application_count(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_biweekly_registration(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_biweekly_registration(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.link_parent_to_student(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_parent_link(UUID, TEXT) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Recreate RLS with a secure baseline and explicit user-facing exceptions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    reward_granted BOOLEAN NOT NULL DEFAULT FALSE,
    reward_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON public.referrals(created_at DESC);

ALTER TABLE IF EXISTS public.biweekly_tests
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'biweekly_tests' AND column_name = 'is_active'
    ) THEN
        UPDATE public.biweekly_tests
        SET status = CASE
            WHEN COALESCE(is_active, FALSE) = TRUE THEN COALESCE(NULLIF(status, 'draft'), 'open')
            ELSE COALESCE(status, 'draft')
        END
        WHERE status IS NULL OR status = 'draft';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'biweekly_tests' AND column_name = 'start_time'
    ) THEN
        UPDATE public.biweekly_tests
        SET registration_opens_at = COALESCE(registration_opens_at, start_time - INTERVAL '7 days', NOW()),
            registration_closes_at = COALESCE(registration_closes_at, start_time - INTERVAL '1 hour', NOW() + INTERVAL '7 days')
        WHERE registration_opens_at IS NULL
           OR registration_closes_at IS NULL;
    ELSE
        UPDATE public.biweekly_tests
        SET registration_opens_at = COALESCE(registration_opens_at, NOW()),
            registration_closes_at = COALESCE(registration_closes_at, NOW() + INTERVAL '7 days')
        WHERE registration_opens_at IS NULL
           OR registration_closes_at IS NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'biweekly_registrations' AND column_name = 'biweekly_test_id'
    ) THEN
        UPDATE public.biweekly_registrations AS br
        SET test_id = COALESCE(br.test_id, bt.test_id),
            exam_id = COALESCE(br.exam_id, bt.exam_id)
        FROM public.biweekly_tests AS bt
        WHERE br.biweekly_test_id = bt.id
          AND (br.test_id IS NULL OR br.exam_id IS NULL);
    END IF;
END $$;

DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;
END $$;

DO $$
DECLARE
    p RECORD;
BEGIN
    FOR p IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    END LOOP;
END $$;

DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL USING (auth.role() = ''service_role'' OR public.is_admin_user(auth.uid())) WITH CHECK (auth.role() = ''service_role'' OR public.is_admin_user(auth.uid()))',
            t.tablename || '_admin_manage',
            t.tablename
        );
    END LOOP;
END $$;

CREATE POLICY profiles_self_or_student_directory_select ON public.profiles
FOR SELECT TO authenticated
USING (
    id = auth.uid()
    OR public.is_parent_of_student(id)
    OR (role = 'student' AND COALESCE(is_active, TRUE) = TRUE)
);

CREATE POLICY profiles_self_insert ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY profiles_self_update ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY student_profiles_read ON public.student_profiles
FOR SELECT TO authenticated
USING (
    id = auth.uid()
    OR public.is_parent_of_student(id)
    OR TRUE
);

CREATE POLICY student_profiles_insert_own ON public.student_profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY student_profiles_update_own ON public.student_profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY user_sessions_own_access ON public.user_sessions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY user_sessions_own_insert ON public.user_sessions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY user_sessions_own_update ON public.user_sessions
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY parent_links_read ON public.parent_links
FOR SELECT TO authenticated
USING (
    parent_id = auth.uid()
    OR student_id = auth.uid()
    OR public.is_parent_of_student(student_id)
);

CREATE POLICY parent_links_insert ON public.parent_links
FOR INSERT TO authenticated
WITH CHECK (parent_id = auth.uid());

CREATE POLICY parent_links_update ON public.parent_links
FOR UPDATE TO authenticated
USING (parent_id = auth.uid() OR student_id = auth.uid())
WITH CHECK (parent_id = auth.uid() OR student_id = auth.uid());

CREATE POLICY lead_forms_public_insert ON public.lead_forms
FOR INSERT TO anon, authenticated
WITH CHECK (TRUE);

CREATE POLICY popup_ads_public_read ON public.popup_ads
FOR SELECT TO anon, authenticated
USING (
    COALESCE(is_active, TRUE) = TRUE
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW())
);

CREATE POLICY popup_ads_content_manage ON public.popup_ads
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY job_listings_public_read ON public.job_listings
FOR SELECT TO anon, authenticated
USING (COALESCE(is_active, TRUE) = TRUE);

CREATE POLICY job_listings_careers_manage ON public.job_listings
FOR ALL TO authenticated
USING (public.is_careers_user(auth.uid()))
WITH CHECK (public.is_careers_user(auth.uid()));

CREATE POLICY job_applications_careers_manage ON public.job_applications
FOR ALL TO authenticated
USING (public.is_careers_user(auth.uid()))
WITH CHECK (public.is_careers_user(auth.uid()));

CREATE POLICY exams_public_read ON public.exams
FOR SELECT TO anon, authenticated
USING (COALESCE(is_active, TRUE) = TRUE);

CREATE POLICY subjects_public_read ON public.subjects
FOR SELECT TO anon, authenticated
USING (COALESCE(is_active, TRUE) = TRUE);

CREATE POLICY chapters_public_read ON public.chapters
FOR SELECT TO anon, authenticated
USING (COALESCE(is_active, TRUE) = TRUE);

CREATE POLICY topics_public_read ON public.topics
FOR SELECT TO anon, authenticated
USING (COALESCE(is_active, TRUE) = TRUE);

CREATE POLICY faculties_public_read ON public.faculties
FOR SELECT TO anon, authenticated
USING (COALESCE(is_active, TRUE) = TRUE);

CREATE POLICY content_manage_exams ON public.exams
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY content_manage_subjects ON public.subjects
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY content_manage_chapters ON public.chapters
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY content_manage_topics ON public.topics
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY content_manage_faculties ON public.faculties
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY courses_public_read ON public.courses
FOR SELECT TO anon, authenticated
USING (COALESCE(is_published, FALSE) = TRUE);

CREATE POLICY courses_content_manage ON public.courses
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY lectures_public_read ON public.lectures
FOR SELECT TO anon, authenticated
USING (COALESCE(is_published, FALSE) = TRUE);

CREATE POLICY lectures_content_manage ON public.lectures
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY questions_authenticated_read ON public.questions
FOR SELECT TO authenticated
USING (COALESCE(is_published, FALSE) = TRUE);

CREATE POLICY questions_content_manage ON public.questions
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY tests_authenticated_read ON public.tests
FOR SELECT TO authenticated
USING (COALESCE(is_published, FALSE) = TRUE);

CREATE POLICY tests_content_manage ON public.tests
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY test_questions_authenticated_read ON public.test_questions
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.tests t
        WHERE t.id = test_questions.test_id
          AND COALESCE(t.is_published, FALSE) = TRUE
    )
);

CREATE POLICY test_questions_content_manage ON public.test_questions
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY dpp_sets_authenticated_read ON public.dpp_sets
FOR SELECT TO authenticated
USING (COALESCE(is_published, FALSE) = TRUE);

CREATE POLICY dpp_sets_content_manage ON public.dpp_sets
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY dpp_questions_authenticated_read ON public.dpp_questions
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.dpp_sets ds
        WHERE ds.id = dpp_set_id
          AND COALESCE(ds.is_published, FALSE) = TRUE
    )
);

CREATE POLICY dpp_questions_content_manage ON public.dpp_questions
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY daily_challenges_authenticated_read ON public.daily_challenges
FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY daily_challenges_content_manage ON public.daily_challenges
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY challenge_attempts_access ON public.challenge_attempts
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_parent_of_student(user_id));

CREATE POLICY challenge_attempts_write ON public.challenge_attempts
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY biweekly_tests_authenticated_read ON public.biweekly_tests
FOR SELECT TO authenticated
USING (
    COALESCE(is_active, TRUE) = TRUE
    OR COALESCE(status, 'draft') <> 'draft'
);

CREATE POLICY biweekly_tests_content_manage ON public.biweekly_tests
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY biweekly_registrations_own_access ON public.biweekly_registrations
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_parent_of_student(user_id)
);

CREATE POLICY biweekly_registrations_own_insert ON public.biweekly_registrations
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY biweekly_registrations_own_update ON public.biweekly_registrations
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY biweekly_registrations_own_delete ON public.biweekly_registrations
FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY lecture_progress_access ON public.lecture_progress
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_parent_of_student(user_id));

CREATE POLICY lecture_progress_write ON public.lecture_progress
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY dpp_attempts_access ON public.dpp_attempts
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_parent_of_student(user_id));

CREATE POLICY dpp_attempts_write ON public.dpp_attempts
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY test_attempts_access ON public.test_attempts
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_parent_of_student(user_id)
    OR status = 'completed'
);

CREATE POLICY test_attempts_write ON public.test_attempts
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY student_progress_access ON public.student_progress
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_parent_of_student(user_id)
    OR COALESCE(total_questions_attempted, 0) >= 20
);

CREATE POLICY student_progress_write ON public.student_progress
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY topic_mastery_access ON public.topic_mastery
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_parent_of_student(user_id));

CREATE POLICY topic_mastery_write ON public.topic_mastery
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY course_progress_access ON public.course_progress
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_parent_of_student(user_id));

CREATE POLICY course_progress_write ON public.course_progress
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY study_plans_access ON public.study_plans
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY study_plans_write ON public.study_plans
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY study_plan_items_access ON public.study_plan_items
FOR SELECT TO authenticated
USING (public.owns_study_plan(plan_id));

CREATE POLICY study_plan_items_write ON public.study_plan_items
FOR ALL TO authenticated
USING (public.owns_study_plan(plan_id))
WITH CHECK (public.owns_study_plan(plan_id));

CREATE POLICY doubts_access ON public.doubts
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_content_user(auth.uid()));

CREATE POLICY doubts_student_insert ON public.doubts
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY doubts_update ON public.doubts
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.is_content_user(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_content_user(auth.uid()));

CREATE POLICY doubt_responses_access ON public.doubt_responses
FOR SELECT TO authenticated
USING (
    public.is_content_user(auth.uid())
    OR EXISTS (
        SELECT 1
        FROM public.doubts d
        WHERE d.id = doubt_responses.doubt_id
          AND d.user_id = auth.uid()
    )
);

CREATE POLICY doubt_responses_content_manage ON public.doubt_responses
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY donations_select ON public.donations
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin_user(auth.uid())
);

CREATE POLICY donations_insert_own ON public.donations
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY donations_update_admin ON public.donations
FOR UPDATE TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY referrals_read ON public.referrals
FOR SELECT TO authenticated
USING (referrer_id = auth.uid() OR referee_id = auth.uid());

CREATE POLICY achievements_read ON public.achievements
FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY achievements_write ON public.achievements
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

CREATE POLICY leaderboard_snapshots_read ON public.leaderboard_snapshots
FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY notification_preferences_manage ON public.notification_preferences
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY activity_logs_read ON public.activity_logs
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY activity_logs_insert ON public.activity_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY user_points_read ON public.user_points
FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY user_points_insert_own ON public.user_points
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY study_streaks_read ON public.study_streaks
FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY study_streaks_write ON public.study_streaks
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Grants, realtime publication coverage, and storage security
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.test_sets TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

DO $$
DECLARE
    t TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH t IN ARRAY ARRAY[
            'profiles',
            'student_profiles',
            'parent_links',
            'lead_forms',
            'popup_ads',
            'job_listings',
            'job_applications',
            'donations',
            'courses',
            'lectures',
            'questions',
            'tests',
            'dpp_sets',
            'daily_challenges',
            'biweekly_tests',
            'biweekly_registrations',
            'lecture_progress',
            'dpp_attempts',
            'test_attempts',
            'student_progress',
            'topic_mastery',
            'study_plans',
            'study_plan_items',
            'doubts',
            'doubt_responses',
            'system_health'
        ]
        LOOP
            IF EXISTS (
                SELECT 1
                FROM pg_tables
                WHERE schemaname = 'public'
                  AND tablename = t
            ) AND NOT EXISTS (
                SELECT 1
                FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime'
                  AND schemaname = 'public'
                  AND tablename = t
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
            END IF;
        END LOOP;
    END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('content', 'content', TRUE, 104857600, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf', 'audio/mpeg']),
    ('career-applications', 'career-applications', FALSE, 1048576, ARRAY['application/pdf']),
    ('backups', 'backups', FALSE, 524288000, ARRAY['application/zip', 'application/gzip', 'application/octet-stream', 'application/sql'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS content_public_read ON storage.objects;
DROP POLICY IF EXISTS content_manage ON storage.objects;
DROP POLICY IF EXISTS career_applications_upload ON storage.objects;
DROP POLICY IF EXISTS career_applications_admin_read ON storage.objects;
DROP POLICY IF EXISTS career_applications_admin_update ON storage.objects;
DROP POLICY IF EXISTS career_applications_admin_delete ON storage.objects;
DROP POLICY IF EXISTS backups_admin_manage ON storage.objects;

CREATE POLICY content_public_read ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'content');

CREATE POLICY content_manage ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'content' AND public.is_content_user(auth.uid()))
WITH CHECK (bucket_id = 'content' AND public.is_content_user(auth.uid()));

CREATE POLICY career_applications_upload ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (
    bucket_id = 'career-applications'
    AND (storage.foldername(name))[1] = 'resumes'
    AND lower(storage.extension(name)) = 'pdf'
);

CREATE POLICY career_applications_admin_read ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'career-applications' AND public.is_careers_user(auth.uid()));

CREATE POLICY career_applications_admin_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'career-applications' AND public.is_careers_user(auth.uid()))
WITH CHECK (bucket_id = 'career-applications' AND public.is_careers_user(auth.uid()));

CREATE POLICY career_applications_admin_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'career-applications' AND public.is_careers_user(auth.uid()));

CREATE POLICY backups_admin_manage ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'backups' AND public.is_admin_user(auth.uid()))
WITH CHECK (bucket_id = 'backups' AND public.is_admin_user(auth.uid()));

COMMIT;
