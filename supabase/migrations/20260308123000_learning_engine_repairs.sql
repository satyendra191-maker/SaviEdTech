-- Features 7-10 learning engine repairs
-- Student dashboard, practice, DPP, and mock test support

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.question_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    time_taken_seconds INTEGER,
    user_answer TEXT,
    correct_answer TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.question_attempts
    ADD COLUMN IF NOT EXISTS is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS user_answer TEXT,
    ADD COLUMN IF NOT EXISTS correct_answer TEXT,
    ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'question_attempts' AND column_name = 'attempted_at'
    ) THEN
        UPDATE public.question_attempts
        SET occurred_at = COALESCE(occurred_at, attempted_at)
        WHERE occurred_at IS NULL;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.test_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_answer TEXT,
    is_correct BOOLEAN,
    marks_obtained DECIMAL(6,2),
    time_spent_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.test_answers
    ADD COLUMN IF NOT EXISTS selected_answer TEXT,
    ADD COLUMN IF NOT EXISTS is_correct BOOLEAN,
    ADD COLUMN IF NOT EXISTS marks_obtained DECIMAL(6,2),
    ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'test_answers' AND column_name = 'user_answer'
    ) THEN
        UPDATE public.test_answers
        SET selected_answer = COALESCE(selected_answer, user_answer)
        WHERE selected_answer IS NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'test_answers' AND column_name = 'time_taken_seconds'
    ) THEN
        UPDATE public.test_answers
        SET time_spent_seconds = COALESCE(time_spent_seconds, time_taken_seconds)
        WHERE time_spent_seconds IS NULL;
    END IF;
END
$$;

ALTER TABLE IF EXISTS public.question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dpp_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dpp_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dpp_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.question_options ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'question_attempts' AND policyname = 'question_attempts_access'
    ) THEN
        CREATE POLICY question_attempts_access ON public.question_attempts
        FOR SELECT TO authenticated
        USING (user_id = auth.uid() OR public.is_parent_of_student(user_id));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'question_attempts' AND policyname = 'question_attempts_write'
    ) THEN
        CREATE POLICY question_attempts_write ON public.question_attempts
        FOR ALL TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'test_answers' AND policyname = 'test_answers_access'
    ) THEN
        CREATE POLICY test_answers_access ON public.test_answers
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.test_attempts ta
                WHERE ta.id = test_answers.attempt_id
                  AND (ta.user_id = auth.uid() OR public.is_parent_of_student(ta.user_id))
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'test_answers' AND policyname = 'test_answers_write'
    ) THEN
        CREATE POLICY test_answers_write ON public.test_answers
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1
                FROM public.test_attempts ta
                WHERE ta.id = test_answers.attempt_id
                  AND ta.user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.test_attempts ta
                WHERE ta.id = test_answers.attempt_id
                  AND ta.user_id = auth.uid()
            )
        );
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_questions_topic_published
    ON public.questions(topic_id, is_published);

CREATE INDEX IF NOT EXISTS idx_question_options_question_display
    ON public.question_options(question_id, display_order);

CREATE INDEX IF NOT EXISTS idx_dpp_sets_schedule_published
    ON public.dpp_sets(scheduled_date, is_published);

CREATE INDEX IF NOT EXISTS idx_dpp_questions_set_display
    ON public.dpp_questions(dpp_set_id, display_order);

CREATE INDEX IF NOT EXISTS idx_dpp_attempts_user_set_status
    ON public.dpp_attempts(user_id, dpp_set_id, status);

CREATE INDEX IF NOT EXISTS idx_tests_published_schedule
    ON public.tests(is_published, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_test_questions_test_display
    ON public.test_questions(test_id, display_order);

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_test_status
    ON public.test_attempts(user_id, test_id, status);

CREATE INDEX IF NOT EXISTS idx_test_answers_attempt_question
    ON public.test_answers(attempt_id, question_id);

CREATE INDEX IF NOT EXISTS idx_question_attempts_user_occurred
    ON public.question_attempts(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_question_attempts_question_occurred
    ON public.question_attempts(question_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_progress_user_subject
    ON public.student_progress(user_id, subject_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.question_attempts;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.test_answers;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;
