BEGIN;

CREATE TABLE IF NOT EXISTS public.online_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    exam_mode TEXT NOT NULL DEFAULT 'jee' CHECK (exam_mode IN ('jee', 'neet', 'cbse_board')),
    total_marks INTEGER NOT NULL DEFAULT 0,
    question_count INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER NOT NULL DEFAULT 180,
    scheduled_at TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    instructions TEXT[] NOT NULL DEFAULT ARRAY[
        'Read every question carefully before selecting an answer.',
        'Use Save & Next to preserve progress as you move through the exam.',
        'Do not refresh the page, switch tabs, or exit fullscreen mode during the exam.',
        'The exam auto-submits when the timer reaches zero.'
    ]::TEXT[],
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    show_result_immediately BOOLEAN NOT NULL DEFAULT TRUE,
    proctoring_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    desktop_only BOOLEAN NOT NULL DEFAULT TRUE,
    warning_threshold INTEGER NOT NULL DEFAULT 3,
    auto_submit_threshold INTEGER NOT NULL DEFAULT 5,
    snapshot_retention_days INTEGER NOT NULL DEFAULT 30,
    auto_save_interval_seconds INTEGER NOT NULL DEFAULT 30,
    section_config JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exam_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.online_exams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    subject_name TEXT,
    instructions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    display_order INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (exam_id, name)
);

CREATE TABLE IF NOT EXISTS public.exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.online_exams(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.exam_sections(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    question_type TEXT CHECK (question_type IN ('MCQ', 'NUMERICAL', 'ASSERTION_REASON')),
    marks INTEGER NOT NULL DEFAULT 4,
    negative_marks NUMERIC(6,2) NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    correct_answer_override TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (exam_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.online_exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'auto_submitted', 'flagged', 'abandoned')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    time_taken_seconds INTEGER,
    time_remaining_seconds INTEGER,
    total_score NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_score NUMERIC(10,2) NOT NULL DEFAULT 0,
    accuracy NUMERIC(6,2) NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    incorrect_count INTEGER NOT NULL DEFAULT 0,
    unattempted_count INTEGER NOT NULL DEFAULT 0,
    percentile NUMERIC(6,2),
    rank_prediction INTEGER,
    warning_count INTEGER NOT NULL DEFAULT 0,
    tab_switch_count INTEGER NOT NULL DEFAULT 0,
    fullscreen_exit_count INTEGER NOT NULL DEFAULT 0,
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    auto_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    answers JSONB NOT NULL DEFAULT '{}'::JSONB,
    question_time_map JSONB NOT NULL DEFAULT '{}'::JSONB,
    marked_for_review JSONB NOT NULL DEFAULT '[]'::JSONB,
    current_question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
    current_section_id UUID REFERENCES public.exam_sections(id) ON DELETE SET NULL,
    device_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exam_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.exam_sections(id) ON DELETE SET NULL,
    selected_answer TEXT,
    correct_answer TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    marks_obtained NUMERIC(10,2) NOT NULL DEFAULT 0,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    is_marked_for_review BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL UNIQUE REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.online_exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_score NUMERIC(10,2) NOT NULL DEFAULT 0,
    accuracy NUMERIC(6,2) NOT NULL DEFAULT 0,
    percentile NUMERIC(6,2),
    rank_prediction INTEGER,
    correct_count INTEGER NOT NULL DEFAULT 0,
    incorrect_count INTEGER NOT NULL DEFAULT 0,
    unattempted_count INTEGER NOT NULL DEFAULT 0,
    warning_count INTEGER NOT NULL DEFAULT 0,
    flagged BOOLEAN NOT NULL DEFAULT FALSE,
    auto_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    section_analysis JSONB NOT NULL DEFAULT '[]'::JSONB,
    topic_performance JSONB NOT NULL DEFAULT '[]'::JSONB,
    weak_topics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    question_review JSONB NOT NULL DEFAULT '[]'::JSONB,
    subject_time_breakdown JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.proctoring_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.online_exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    warning_message TEXT,
    screenshot_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_online_exams_schedule
    ON public.online_exams(is_published, scheduled_at, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_online_exams_mode_published
    ON public.online_exams(exam_mode, is_published);
CREATE INDEX IF NOT EXISTS idx_exam_sections_exam_order
    ON public.exam_sections(exam_id, display_order);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_section_order
    ON public.exam_questions(exam_id, section_id, display_order);
CREATE INDEX IF NOT EXISTS idx_exam_questions_question_id
    ON public.exam_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_status
    ON public.exam_attempts(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_status
    ON public.exam_attempts(exam_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_created
    ON public.exam_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_created
    ON public.exam_results(exam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proctoring_logs_exam_created
    ON public.proctoring_logs(exam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proctoring_logs_attempt_created
    ON public.proctoring_logs(attempt_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proctoring_logs_user_created
    ON public.proctoring_logs(user_id, created_at DESC);

ALTER TABLE public.online_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctoring_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS online_exams_authenticated_read ON public.online_exams;
CREATE POLICY online_exams_authenticated_read ON public.online_exams
FOR SELECT TO authenticated
USING (
    COALESCE(is_published, FALSE) = TRUE
    AND (start_time IS NULL OR start_time <= NOW())
    AND (end_time IS NULL OR end_time >= NOW())
);

DROP POLICY IF EXISTS online_exams_content_manage ON public.online_exams;
CREATE POLICY online_exams_content_manage ON public.online_exams
FOR ALL TO authenticated
USING (public.is_content_user(auth.uid()))
WITH CHECK (public.is_content_user(auth.uid()));

DROP POLICY IF EXISTS exam_sections_authenticated_read ON public.exam_sections;
CREATE POLICY exam_sections_authenticated_read ON public.exam_sections
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.online_exams oe
        WHERE oe.id = exam_sections.exam_id
          AND COALESCE(oe.is_published, FALSE) = TRUE
    )
);

DROP POLICY IF EXISTS exam_sections_content_manage ON public.exam_sections;
CREATE POLICY exam_sections_content_manage ON public.exam_sections
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.online_exams oe
        WHERE oe.id = exam_sections.exam_id
          AND public.is_content_user(auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.online_exams oe
        WHERE oe.id = exam_sections.exam_id
          AND public.is_content_user(auth.uid())
    )
);

DROP POLICY IF EXISTS exam_questions_authenticated_read ON public.exam_questions;
CREATE POLICY exam_questions_authenticated_read ON public.exam_questions
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.online_exams oe
        WHERE oe.id = exam_questions.exam_id
          AND COALESCE(oe.is_published, FALSE) = TRUE
    )
);

DROP POLICY IF EXISTS exam_questions_content_manage ON public.exam_questions;
CREATE POLICY exam_questions_content_manage ON public.exam_questions
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.online_exams oe
        WHERE oe.id = exam_questions.exam_id
          AND public.is_content_user(auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.online_exams oe
        WHERE oe.id = exam_questions.exam_id
          AND public.is_content_user(auth.uid())
    )
);

DROP POLICY IF EXISTS exam_attempts_access ON public.exam_attempts;
CREATE POLICY exam_attempts_access ON public.exam_attempts
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_parent_of_student(user_id)
    OR public.is_admin_user(auth.uid())
);

DROP POLICY IF EXISTS exam_attempts_write ON public.exam_attempts;
CREATE POLICY exam_attempts_write ON public.exam_attempts
FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS exam_answers_access ON public.exam_answers;
CREATE POLICY exam_answers_access ON public.exam_answers
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.exam_attempts ea
        WHERE ea.id = exam_answers.attempt_id
          AND (
              ea.user_id = auth.uid()
              OR public.is_parent_of_student(ea.user_id)
              OR public.is_admin_user(auth.uid())
          )
    )
);

DROP POLICY IF EXISTS exam_answers_write ON public.exam_answers;
CREATE POLICY exam_answers_write ON public.exam_answers
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.exam_attempts ea
        WHERE ea.id = exam_answers.attempt_id
          AND (ea.user_id = auth.uid() OR public.is_admin_user(auth.uid()))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.exam_attempts ea
        WHERE ea.id = exam_answers.attempt_id
          AND (ea.user_id = auth.uid() OR public.is_admin_user(auth.uid()))
    )
);

DROP POLICY IF EXISTS exam_results_access ON public.exam_results;
CREATE POLICY exam_results_access ON public.exam_results
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_parent_of_student(user_id)
    OR public.is_admin_user(auth.uid())
);

DROP POLICY IF EXISTS exam_results_write ON public.exam_results;
CREATE POLICY exam_results_write ON public.exam_results
FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS proctoring_logs_admin_access ON public.proctoring_logs;
CREATE POLICY proctoring_logs_admin_access ON public.proctoring_logs
FOR ALL TO authenticated
USING (
    public.is_admin_user(auth.uid())
    OR EXISTS (
        SELECT 1
        FROM public.exam_attempts ea
        WHERE ea.id = proctoring_logs.attempt_id
          AND ea.user_id = auth.uid()
    )
)
WITH CHECK (
    public.is_admin_user(auth.uid())
    OR EXISTS (
        SELECT 1
        FROM public.exam_attempts ea
        WHERE ea.id = proctoring_logs.attempt_id
          AND ea.user_id = auth.uid()
    )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'proctoring-snapshots',
    'proctoring-snapshots',
    FALSE,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS proctoring_snapshots_student_insert ON storage.objects;
DROP POLICY IF EXISTS proctoring_snapshots_student_select ON storage.objects;
DROP POLICY IF EXISTS proctoring_snapshots_admin_update ON storage.objects;
DROP POLICY IF EXISTS proctoring_snapshots_admin_delete ON storage.objects;

CREATE POLICY proctoring_snapshots_student_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'proctoring-snapshots'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

CREATE POLICY proctoring_snapshots_student_select ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'proctoring-snapshots'
    AND (
        (storage.foldername(name))[1] = auth.uid()::TEXT
        OR public.is_admin_user(auth.uid())
    )
);

CREATE POLICY proctoring_snapshots_admin_update ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'proctoring-snapshots'
    AND public.is_admin_user(auth.uid())
)
WITH CHECK (
    bucket_id = 'proctoring-snapshots'
    AND public.is_admin_user(auth.uid())
);

CREATE POLICY proctoring_snapshots_admin_delete ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'proctoring-snapshots'
    AND public.is_admin_user(auth.uid())
);

DO $$
DECLARE
    t TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH t IN ARRAY ARRAY[
            'online_exams',
            'exam_sections',
            'exam_questions',
            'exam_attempts',
            'exam_answers',
            'exam_results',
            'proctoring_logs'
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

COMMIT;
