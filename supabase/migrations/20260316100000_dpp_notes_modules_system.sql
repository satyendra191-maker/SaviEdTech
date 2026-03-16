-- DPP (Daily Practice Problems) System
BEGIN;

-- DPP Table
CREATE TABLE IF NOT EXISTS public.dpp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    class_level TEXT,
    description TEXT,
    questions_count INTEGER DEFAULT 0,
    time_limit_minutes INTEGER,
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    scheduled_date DATE,
    due_date TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DPP Questions
CREATE TABLE IF NOT EXISTS public.dpp_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpp_id UUID NOT NULL REFERENCES public.dpp(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'numerical', 'true_false', 'short_answer')),
    options JSONB DEFAULT '[]'::jsonb,
    correct_answer TEXT,
    explanation TEXT,
    marks INTEGER DEFAULT 1,
    difficulty TEXT DEFAULT 'medium',
    topic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DPP Attempts (Student submissions)
CREATE TABLE IF NOT EXISTS public.dpp_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dpp_id UUID NOT NULL REFERENCES public.dpp(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    answers JSONB DEFAULT '{}'::jsonb,
    score DECIMAL(5,2),
    total_marks INTEGER DEFAULT 0,
    earned_marks INTEGER DEFAULT 0,
    time_taken_seconds INTEGER,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dpp_id, student_id)
);

-- Notes Table (Enhanced from generated_notes)
ALTER TABLE public.generated_notes
    ADD COLUMN IF NOT EXISTS class_level TEXT,
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Course Modules
CREATE TABLE IF NOT EXISTS public.course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dpp_subject ON public.dpp(subject);
CREATE INDEX IF NOT EXISTS idx_dpp_class_level ON public.dpp(class_level);
CREATE INDEX IF NOT EXISTS idx_dpp_scheduled ON public.dpp(scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_dpp_questions_dpp ON public.dpp_questions(dpp_id);
CREATE INDEX IF NOT EXISTS idx_dpp_attempts_student ON public.dpp_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_dpp_attempts_dpp ON public.dpp_attempts(dpp_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_course ON public.course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_generated_notes_subject ON public.generated_notes(topic_name);

-- RLS
ALTER TABLE public.dpp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpp_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpp_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_notes ENABLE ROW LEVEL SECURITY;

-- DPP Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dpp_select' AND tablename = 'dpp') THEN
        CREATE POLICY dpp_select ON public.dpp
            FOR SELECT TO authenticated
            USING (is_active = TRUE OR created_by = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dpp_insert' AND tablename = 'dpp') THEN
        CREATE POLICY dpp_insert ON public.dpp
            FOR INSERT TO authenticated
            WITH CHECK (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'teacher', 'content_manager')));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dpp_update' AND tablename = 'dpp') THEN
        CREATE POLICY dpp_update ON public.dpp
            FOR UPDATE TO authenticated
            USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'teacher', 'content_manager')));
    END IF;
END $$;

-- DPP Questions Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dpp_questions_select' AND tablename = 'dpp_questions') THEN
        CREATE POLICY dpp_questions_select ON public.dpp_questions
            FOR SELECT TO authenticated
            USING (TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dpp_questions_manage' AND tablename = 'dpp_questions') THEN
        CREATE POLICY dpp_questions_manage ON public.dpp_questions
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'teacher', 'content_manager')));
    END IF;
END $$;

-- DPP Attempts Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dpp_attempts_select' AND tablename = 'dpp_attempts') THEN
        CREATE POLICY dpp_attempts_select ON public.dpp_attempts
            FOR SELECT TO authenticated
            USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'teacher')));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dpp_attempts_insert' AND tablename = 'dpp_attempts') THEN
        CREATE POLICY dpp_attempts_insert ON public.dpp_attempts
            FOR INSERT TO authenticated
            WITH CHECK (student_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dpp_attempts_update' AND tablename = 'dpp_attempts') THEN
        CREATE POLICY dpp_attempts_update ON public.dpp_attempts
            FOR UPDATE TO authenticated
            USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'teacher')));
    END IF;
END $$;

-- Course Modules Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'course_modules_select' AND tablename = 'course_modules') THEN
        CREATE POLICY course_modules_select ON public.course_modules
            FOR SELECT TO authenticated
            USING (is_published = TRUE OR created_by = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'course_modules_manage' AND tablename = 'course_modules') THEN
        CREATE POLICY course_modules_manage ON public.course_modules
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'teacher', 'content_manager')));
    END IF;
END $$;

-- Generated Notes Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'generated_notes_select' AND tablename = 'generated_notes') THEN
        CREATE POLICY generated_notes_select ON public.generated_notes
            FOR SELECT TO authenticated
            USING (is_published = TRUE OR created_by = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'generated_notes_manage' AND tablename = 'generated_notes') THEN
        CREATE POLICY generated_notes_manage ON public.generated_notes
            FOR ALL TO authenticated
            USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'teacher', 'content_manager')));
    END IF;
END $$;

COMMIT;
