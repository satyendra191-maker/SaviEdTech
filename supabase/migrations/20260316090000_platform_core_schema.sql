BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Core profile normalization
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS parent_student_id UUID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (
        role IN (
            'student',
            'parent',
            'faculty',
            'teacher',
            'admin',
            'super_admin',
            'platform_admin',
            'academic_director',
            'content_manager',
            'video_production_manager',
            'ai_content_trainer',
            'ai_trainer',
            'hr',
            'hr_manager',
            'finance',
            'finance_manager',
            'accounts_manager',
            'marketing',
            'marketing_manager',
            'social_media_manager',
            'technical_support',
            'support',
            'compliance',
            'compliance_team'
        )
    );

-- ---------------------------------------------------------------------------
-- Roles catalog (extend, never replace)
-- ---------------------------------------------------------------------------
INSERT INTO public.roles (name, slug, description, is_system)
VALUES
    ('Student', 'student', 'Learner role for enrolled students.', TRUE),
    ('Parent', 'parent', 'Parent access role linked to student accounts.', TRUE),
    ('Faculty', 'faculty', 'Faculty role for instructors and teachers.', TRUE),
    ('Teacher', 'teacher', 'Teacher role for classroom instruction.', TRUE),
    ('Admin', 'admin', 'Administrative role for platform operators.', TRUE),
    ('Super Admin', 'super_admin', 'Highest privilege role for platform governance.', TRUE),
    ('Platform Admin', 'platform_admin', 'Platform-wide administrative role.', TRUE),
    ('Academic Director', 'academic_director', 'Academic leadership and oversight.', TRUE),
    ('Content Manager', 'content_manager', 'Content publishing and academic ops.', TRUE),
    ('Video Production Manager', 'video_production_manager', 'Video production operations.', TRUE),
    ('AI Content Trainer', 'ai_content_trainer', 'AI content training role.', TRUE),
    ('AI Trainer', 'ai_trainer', 'AI training and oversight role.', TRUE),
    ('HR', 'hr', 'Human resources operations.', TRUE),
    ('HR Manager', 'hr_manager', 'Human resources leadership.', TRUE),
    ('Finance', 'finance', 'Finance operations role.', TRUE),
    ('Finance Manager', 'finance_manager', 'Finance leadership role.', TRUE),
    ('Accounts Manager', 'accounts_manager', 'Accounts and billing operations.', TRUE),
    ('Marketing', 'marketing', 'Marketing operations role.', TRUE),
    ('Marketing Manager', 'marketing_manager', 'Marketing leadership role.', TRUE),
    ('Social Media Manager', 'social_media_manager', 'Social media operations.', TRUE),
    ('Technical Support', 'technical_support', 'Technical support operations.', TRUE),
    ('Support', 'support', 'General support operations.', TRUE),
    ('Compliance', 'compliance', 'Compliance operations.', TRUE),
    ('Compliance Team', 'compliance_team', 'Compliance team role.', TRUE)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Faculty extension and normalized faculty profile table
-- ---------------------------------------------------------------------------
ALTER TABLE public.faculties
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS qualification TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT,
    experience_years INTEGER,
    qualification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Student and parent core tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_level TEXT,
    school_name TEXT,
    enrollment_status TEXT NOT NULL DEFAULT 'active'
        CHECK (enrollment_status IN ('active', 'inactive', 'suspended', 'graduated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relationship TEXT DEFAULT 'parent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, student_id)
);

-- ---------------------------------------------------------------------------
-- Courses and lessons
-- ---------------------------------------------------------------------------
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS class_level TEXT,
    ADD COLUMN IF NOT EXISTS subject TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

UPDATE public.courses
SET created_by = COALESCE(created_by, instructor)
WHERE created_by IS NULL;

CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT,
    notes TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Experiments, journals, simulations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    class_level TEXT,
    materials TEXT,
    procedure TEXT,
    observation_template TEXT,
    conclusion_template TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
    observations TEXT,
    conclusion TEXT,
    submitted_at TIMESTAMPTZ,
    pdf_url TEXT,
    status TEXT NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    class_level TEXT,
    simulation_url TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Live classes and assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    faculty_id UUID REFERENCES public.faculty(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
    meeting_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('submitted', 'reviewed', 'accepted', 'rejected', 'resubmitted')),
    grade NUMERIC(5,2),
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

-- ---------------------------------------------------------------------------
-- Marketing system
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    budget NUMERIC(12,2) NOT NULL DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'disqualified')),
    utm_source TEXT,
    utm_campaign TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- AI interaction logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    response TEXT,
    interaction_type TEXT NOT NULL,
    model TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Financial reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL UNIQUE,
    total_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_donations NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_refunds NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- System events (realtime)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Users view (kept compatible with existing references)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.users AS
SELECT
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.role,
    p.avatar_url,
    p.exam_target,
    p.class_level,
    p.city,
    p.state,
    COALESCE(p.is_active, TRUE) AS is_active,
    p.created_at,
    p.updated_at,
    p.last_active_at
FROM public.profiles AS p;

-- ---------------------------------------------------------------------------
-- Backfills (safe, idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO public.students (user_id, class_level, school_name, enrollment_status)
SELECT
    p.id,
    p.class_level,
    NULL,
    'active'
FROM public.profiles AS p
WHERE p.role = 'student'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.faculty (user_id, subject, experience_years, qualification)
SELECT
    p.id,
    NULL,
    NULL,
    NULL
FROM public.profiles AS p
WHERE p.role IN ('faculty', 'teacher')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.parents (user_id, student_id, relationship)
SELECT
    pl.parent_id,
    pl.student_id,
    'parent'
FROM public.parent_links AS pl
ON CONFLICT (user_id, student_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Indexes for performance
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON public.students(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_parents_user_id ON public.parents(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_student_id ON public.parents(student_id);

CREATE INDEX IF NOT EXISTS idx_faculty_user_id ON public.faculty(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_subject ON public.faculty(subject);

CREATE INDEX IF NOT EXISTS idx_courses_created_by ON public.courses(created_by);
CREATE INDEX IF NOT EXISTS idx_courses_subject_level ON public.courses(subject, class_level);

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_position ON public.lessons(course_id, position);

CREATE INDEX IF NOT EXISTS idx_experiments_subject_level ON public.experiments(subject, class_level);
CREATE INDEX IF NOT EXISTS idx_experiments_created_at ON public.experiments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_journals_student_id ON public.journals(student_id);
CREATE INDEX IF NOT EXISTS idx_journals_experiment_id ON public.journals(experiment_id);
CREATE INDEX IF NOT EXISTS idx_journals_submitted_at ON public.journals(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_simulations_subject_level ON public.simulations(subject, class_level);

CREATE INDEX IF NOT EXISTS idx_live_classes_course_id ON public.live_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_live_classes_start_time ON public.live_classes(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON public.submissions(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_platform ON public.marketing_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_dates ON public.marketing_campaigns(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON public.leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON public.leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_utm ON public.leads(utm_source, utm_campaign);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON public.ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_type_created ON public.ai_interactions(interaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_reports_report_date ON public.financial_reports(report_date DESC);

CREATE INDEX IF NOT EXISTS idx_system_events_type_created ON public.system_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_actor_id ON public.system_events(actor_id);

-- ---------------------------------------------------------------------------
-- Helper role predicates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_finance_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_any_role(
        ARRAY['finance', 'finance_manager', 'accounts_manager', 'admin', 'super_admin', 'platform_admin'],
        COALESCE(p_user_id, auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.is_marketing_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_any_role(
        ARRAY['marketing', 'marketing_manager', 'social_media_manager', 'admin', 'super_admin', 'platform_admin'],
        COALESCE(p_user_id, auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.is_faculty_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_any_role(
        ARRAY['faculty', 'teacher', 'admin', 'super_admin', 'platform_admin', 'academic_director'],
        COALESCE(p_user_id, auth.uid())
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS: enable for new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    -- Faculty
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'faculty' AND policyname = 'faculty_self_select'
    ) THEN
        CREATE POLICY faculty_self_select ON public.faculty
        FOR SELECT TO authenticated
        USING (
            user_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'faculty' AND policyname = 'faculty_admin_manage'
    ) THEN
        CREATE POLICY faculty_admin_manage ON public.faculty
        FOR ALL TO authenticated
        USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director']))
        WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director']));
    END IF;

    -- Students
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'students' AND policyname = 'students_self_select'
    ) THEN
        CREATE POLICY students_self_select ON public.students
        FOR SELECT TO authenticated
        USING (
            user_id = auth.uid()
            OR public.is_parent_of_student(user_id)
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'students' AND policyname = 'students_self_write'
    ) THEN
        CREATE POLICY students_self_write ON public.students
        FOR ALL TO authenticated
        USING (
            user_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        )
        WITH CHECK (
            user_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        );
    END IF;

    -- Parents
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'parents' AND policyname = 'parents_self_select'
    ) THEN
        CREATE POLICY parents_self_select ON public.parents
        FOR SELECT TO authenticated
        USING (
            user_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'parents' AND policyname = 'parents_self_write'
    ) THEN
        CREATE POLICY parents_self_write ON public.parents
        FOR ALL TO authenticated
        USING (
            user_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        )
        WITH CHECK (
            user_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        );
    END IF;

    -- Lessons (course visibility)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'lessons' AND policyname = 'lessons_select'
    ) THEN
        CREATE POLICY lessons_select ON public.lessons
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.courses c
                WHERE c.id = lessons.course_id
                  AND (
                      c.is_published = TRUE
                      OR c.instructor = auth.uid()
                      OR c.created_by = auth.uid()
                  )
            )
            OR EXISTS (
                SELECT 1
                FROM public.course_enrollments ce
                WHERE ce.course_id = lessons.course_id
                  AND ce.user_id = auth.uid()
            )
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager'])
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'lessons' AND policyname = 'lessons_manage'
    ) THEN
        CREATE POLICY lessons_manage ON public.lessons
        FOR ALL TO authenticated
        USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager']))
        WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager']));
    END IF;

    -- Experiments
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'experiments' AND policyname = 'experiments_select'
    ) THEN
        CREATE POLICY experiments_select ON public.experiments
        FOR SELECT TO authenticated
        USING (TRUE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'experiments' AND policyname = 'experiments_manage'
    ) THEN
        CREATE POLICY experiments_manage ON public.experiments
        FOR ALL TO authenticated
        USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager']))
        WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager']));
    END IF;

    -- Journals
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'journals' AND policyname = 'journals_select'
    ) THEN
        CREATE POLICY journals_select ON public.journals
        FOR SELECT TO authenticated
        USING (
            student_id = auth.uid()
            OR public.is_parent_of_student(student_id)
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
            OR EXISTS (
                SELECT 1
                FROM public.faculty f
                JOIN public.experiments e ON e.id = journals.experiment_id
                WHERE f.user_id = auth.uid()
                  AND (f.subject IS NULL OR f.subject = e.subject)
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'journals' AND policyname = 'journals_write'
    ) THEN
        CREATE POLICY journals_write ON public.journals
        FOR ALL TO authenticated
        USING (
            student_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        )
        WITH CHECK (
            student_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        );
    END IF;

    -- Simulations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'simulations' AND policyname = 'simulations_select'
    ) THEN
        CREATE POLICY simulations_select ON public.simulations
        FOR SELECT TO authenticated
        USING (TRUE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'simulations' AND policyname = 'simulations_manage'
    ) THEN
        CREATE POLICY simulations_manage ON public.simulations
        FOR ALL TO authenticated
        USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager']))
        WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager']));
    END IF;

    -- Live classes
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'live_classes' AND policyname = 'live_classes_select'
    ) THEN
        CREATE POLICY live_classes_select ON public.live_classes
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.course_enrollments ce
                WHERE ce.course_id = live_classes.course_id
                  AND ce.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1
                FROM public.courses c
                WHERE c.id = live_classes.course_id
                  AND (c.instructor = auth.uid() OR c.created_by = auth.uid())
            )
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'live_classes' AND policyname = 'live_classes_manage'
    ) THEN
        CREATE POLICY live_classes_manage ON public.live_classes
        FOR ALL TO authenticated
        USING (
            public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
            OR EXISTS (
                SELECT 1
                FROM public.courses c
                WHERE c.id = live_classes.course_id
                  AND (c.instructor = auth.uid() OR c.created_by = auth.uid())
            )
        )
        WITH CHECK (
            public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
            OR EXISTS (
                SELECT 1
                FROM public.courses c
                WHERE c.id = live_classes.course_id
                  AND (c.instructor = auth.uid() OR c.created_by = auth.uid())
            )
        );
    END IF;

    -- Assignments
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'assignments' AND policyname = 'assignments_select'
    ) THEN
        CREATE POLICY assignments_select ON public.assignments
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.course_enrollments ce
                WHERE ce.course_id = assignments.course_id
                  AND ce.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1
                FROM public.courses c
                WHERE c.id = assignments.course_id
                  AND (c.instructor = auth.uid() OR c.created_by = auth.uid())
            )
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'assignments' AND policyname = 'assignments_manage'
    ) THEN
        CREATE POLICY assignments_manage ON public.assignments
        FOR ALL TO authenticated
        USING (
            public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
            OR EXISTS (
                SELECT 1
                FROM public.courses c
                WHERE c.id = assignments.course_id
                  AND (c.instructor = auth.uid() OR c.created_by = auth.uid())
            )
        )
        WITH CHECK (
            public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
            OR EXISTS (
                SELECT 1
                FROM public.courses c
                WHERE c.id = assignments.course_id
                  AND (c.instructor = auth.uid() OR c.created_by = auth.uid())
            )
        );
    END IF;

    -- Submissions
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'submissions' AND policyname = 'submissions_select'
    ) THEN
        CREATE POLICY submissions_select ON public.submissions
        FOR SELECT TO authenticated
        USING (
            student_id = auth.uid()
            OR public.is_parent_of_student(student_id)
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
            OR EXISTS (
                SELECT 1
                FROM public.assignments a
                JOIN public.courses c ON c.id = a.course_id
                WHERE a.id = submissions.assignment_id
                  AND (c.instructor = auth.uid() OR c.created_by = auth.uid())
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'submissions' AND policyname = 'submissions_write'
    ) THEN
        CREATE POLICY submissions_write ON public.submissions
        FOR ALL TO authenticated
        USING (
            student_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        )
        WITH CHECK (
            student_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director'])
        );
    END IF;

    -- Marketing campaigns
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'marketing_campaigns' AND policyname = 'marketing_campaigns_manage'
    ) THEN
        CREATE POLICY marketing_campaigns_manage ON public.marketing_campaigns
        FOR ALL TO authenticated
        USING (public.is_marketing_user(auth.uid()))
        WITH CHECK (public.is_marketing_user(auth.uid()));
    END IF;

    -- Leads
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'leads_select'
    ) THEN
        CREATE POLICY leads_select ON public.leads
        FOR SELECT TO authenticated
        USING (public.is_marketing_user(auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'leads_public_insert'
    ) THEN
        CREATE POLICY leads_public_insert ON public.leads
        FOR INSERT TO anon, authenticated
        WITH CHECK (TRUE);
    END IF;

    -- AI interactions
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'ai_interactions' AND policyname = 'ai_interactions_select'
    ) THEN
        CREATE POLICY ai_interactions_select ON public.ai_interactions
        FOR SELECT TO authenticated
        USING (
            user_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin'])
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'ai_interactions' AND policyname = 'ai_interactions_write'
    ) THEN
        CREATE POLICY ai_interactions_write ON public.ai_interactions
        FOR ALL TO authenticated
        USING (
            user_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin'])
        )
        WITH CHECK (
            user_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin'])
        );
    END IF;

    -- Financial reports
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'financial_reports' AND policyname = 'financial_reports_manage'
    ) THEN
        CREATE POLICY financial_reports_manage ON public.financial_reports
        FOR ALL TO authenticated
        USING (public.is_finance_user(auth.uid()))
        WITH CHECK (public.is_finance_user(auth.uid()));
    END IF;

    -- System events
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'system_events' AND policyname = 'system_events_select'
    ) THEN
        CREATE POLICY system_events_select ON public.system_events
        FOR SELECT TO authenticated
        USING (
            actor_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin'])
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'system_events' AND policyname = 'system_events_insert'
    ) THEN
        CREATE POLICY system_events_insert ON public.system_events
        FOR INSERT TO authenticated
        WITH CHECK (
            actor_id = auth.uid()
            OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin'])
        );
    END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Grants for helper functions
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.is_finance_user(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_marketing_user(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_faculty_user(UUID) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- updated_at triggers (only if helper exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname = 'update_updated_at_column'
    ) THEN
        DROP TRIGGER IF EXISTS update_faculty_updated_at ON public.faculty;
        CREATE TRIGGER update_faculty_updated_at
        BEFORE UPDATE ON public.faculty
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
        CREATE TRIGGER update_students_updated_at
        BEFORE UPDATE ON public.students
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_parents_updated_at ON public.parents;
        CREATE TRIGGER update_parents_updated_at
        BEFORE UPDATE ON public.parents
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_lessons_updated_at ON public.lessons;
        CREATE TRIGGER update_lessons_updated_at
        BEFORE UPDATE ON public.lessons
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_experiments_updated_at ON public.experiments;
        CREATE TRIGGER update_experiments_updated_at
        BEFORE UPDATE ON public.experiments
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_journals_updated_at ON public.journals;
        CREATE TRIGGER update_journals_updated_at
        BEFORE UPDATE ON public.journals
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_simulations_updated_at ON public.simulations;
        CREATE TRIGGER update_simulations_updated_at
        BEFORE UPDATE ON public.simulations
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_live_classes_updated_at ON public.live_classes;
        CREATE TRIGGER update_live_classes_updated_at
        BEFORE UPDATE ON public.live_classes
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_assignments_updated_at ON public.assignments;
        CREATE TRIGGER update_assignments_updated_at
        BEFORE UPDATE ON public.assignments
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_submissions_updated_at ON public.submissions;
        CREATE TRIGGER update_submissions_updated_at
        BEFORE UPDATE ON public.submissions
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_marketing_campaigns_updated_at ON public.marketing_campaigns;
        CREATE TRIGGER update_marketing_campaigns_updated_at
        BEFORE UPDATE ON public.marketing_campaigns
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
        CREATE TRIGGER update_leads_updated_at
        BEFORE UPDATE ON public.leads
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_ai_interactions_updated_at ON public.ai_interactions;
        CREATE TRIGGER update_ai_interactions_updated_at
        BEFORE UPDATE ON public.ai_interactions
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_financial_reports_updated_at ON public.financial_reports;
        CREATE TRIGGER update_financial_reports_updated_at
        BEFORE UPDATE ON public.financial_reports
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_system_events_updated_at ON public.system_events;
        CREATE TRIGGER update_system_events_updated_at
        BEFORE UPDATE ON public.system_events
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Realtime publication (idempotent)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'live_classes',
        'assignments',
        'submissions',
        'journals',
        'payments',
        'donations',
        'system_events'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END
$$;

COMMIT;
