BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway TEXT NOT NULL DEFAULT 'razorpay',
    user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending',
    donor_email TEXT NULL,
    donor_name TEXT NULL,
    donor_phone TEXT NULL,
    email TEXT NULL,
    message TEXT NULL,
    order_id TEXT NULL,
    payment_id TEXT NULL,
    transaction_id TEXT NULL,
    receipt_number TEXT NULL,
    gateway_response JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT NULL,
    error_code TEXT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_retry_at TIMESTAMPTZ NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL
);

ALTER TABLE public.donations
    ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS email TEXT NULL,
    ADD COLUMN IF NOT EXISTS message TEXT NULL,
    ADD COLUMN IF NOT EXISTS transaction_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS receipt_number TEXT NULL,
    ADD COLUMN IF NOT EXISTS gateway_response JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS error_message TEXT NULL,
    ADD COLUMN IF NOT EXISTS error_code TEXT NULL,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

UPDATE public.donations
SET
    email = COALESCE(email, donor_email),
    donor_email = COALESCE(donor_email, email),
    transaction_id = COALESCE(transaction_id, payment_id, order_id),
    timestamp = COALESCE(timestamp, completed_at, created_at, NOW())
WHERE
    email IS DISTINCT FROM COALESCE(email, donor_email)
    OR donor_email IS DISTINCT FROM COALESCE(donor_email, email)
    OR transaction_id IS NULL
    OR timestamp IS NULL;

CREATE INDEX IF NOT EXISTS idx_donations_transaction_id ON public.donations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_donations_timestamp_desc ON public.donations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_donations_status_timestamp ON public.donations(status, timestamp DESC);

CREATE TABLE IF NOT EXISTS public.job_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'full_time',
    experience_level TEXT NOT NULL DEFAULT 'entry',
    salary_min INTEGER NULL,
    salary_max INTEGER NULL,
    description TEXT NOT NULL DEFAULT '',
    requirements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    responsibilities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    benefits TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    deadline TIMESTAMPTZ NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    applications_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.job_listings
    ADD COLUMN IF NOT EXISTS benefits TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS applications_count INTEGER NOT NULL DEFAULT 0;

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
    resume_file_size INTEGER NULL,
    additional_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.job_applications
    ADD COLUMN IF NOT EXISTS resume_storage_path TEXT NULL,
    ADD COLUMN IF NOT EXISTS additional_info JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.career_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_application_id UUID UNIQUE NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    job_id UUID NULL REFERENCES public.job_listings(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NULL,
    position TEXT NULL,
    resume_url TEXT NULL,
    resume_storage_path TEXT NULL,
    resume_file_name TEXT NULL,
    resume_file_size INTEGER NULL,
    status TEXT NOT NULL DEFAULT 'new',
    additional_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_listings_active_created_at ON public.job_listings(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_status_created_at ON public.job_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_resume_storage_path ON public.job_applications(resume_storage_path);
CREATE INDEX IF NOT EXISTS idx_career_applications_email ON public.career_applications(email);
CREATE INDEX IF NOT EXISTS idx_career_applications_position ON public.career_applications(position);
CREATE INDEX IF NOT EXISTS idx_career_applications_status_submitted_at ON public.career_applications(status, submitted_at DESC);

ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of active jobs" ON public.job_listings;
DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.job_listings;
CREATE POLICY "Allow public read of active jobs"
ON public.job_listings
FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Allow admin full access to jobs" ON public.job_listings;
DROP POLICY IF EXISTS "Admins can manage jobs" ON public.job_listings;
CREATE POLICY "Allow admin full access to jobs"
ON public.job_listings
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'content_manager', 'hr')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'content_manager', 'hr')
    )
);

DROP POLICY IF EXISTS "Allow public to submit applications" ON public.job_applications;
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.job_applications;
CREATE POLICY "Allow public to submit applications"
ON public.job_applications
FOR INSERT
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow admin to read applications" ON public.job_applications;
DROP POLICY IF EXISTS "Admins can manage applications" ON public.job_applications;
CREATE POLICY "Allow admin to read applications"
ON public.job_applications
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'content_manager', 'hr')
    )
);

DROP POLICY IF EXISTS "Allow admin to update applications" ON public.job_applications;
CREATE POLICY "Allow admin to update applications"
ON public.job_applications
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'content_manager', 'hr')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'content_manager', 'hr')
    )
);

DROP POLICY IF EXISTS "Allow admin to delete applications" ON public.job_applications;
CREATE POLICY "Allow admin to delete applications"
ON public.job_applications
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'content_manager', 'hr')
    )
);

INSERT INTO public.career_applications (
    job_application_id,
    job_id,
    name,
    email,
    phone,
    position,
    resume_url,
    resume_storage_path,
    resume_file_name,
    resume_file_size,
    status,
    additional_info,
    submitted_at,
    updated_at
)
SELECT
    ja.id,
    ja.job_id,
    ja.full_name,
    ja.email,
    ja.phone,
    COALESCE(
        NULLIF(ja.additional_info ->> 'position_applied', ''),
        jl.title,
        'General Application'
    ),
    ja.resume_url,
    ja.resume_storage_path,
    ja.resume_file_name,
    ja.resume_file_size,
    ja.status,
    COALESCE(ja.additional_info, '{}'::jsonb),
    COALESCE(ja.created_at, NOW()),
    COALESCE(ja.updated_at, ja.created_at, NOW())
FROM public.job_applications ja
LEFT JOIN public.job_listings jl ON jl.id = ja.job_id
ON CONFLICT (job_application_id) DO UPDATE
SET
    job_id = EXCLUDED.job_id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    position = EXCLUDED.position,
    resume_url = EXCLUDED.resume_url,
    resume_storage_path = EXCLUDED.resume_storage_path,
    resume_file_name = EXCLUDED.resume_file_name,
    resume_file_size = EXCLUDED.resume_file_size,
    status = EXCLUDED.status,
    additional_info = EXCLUDED.additional_info,
    submitted_at = EXCLUDED.submitted_at,
    updated_at = EXCLUDED.updated_at;

CREATE OR REPLACE FUNCTION public.sync_career_application_mirror()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    resolved_position TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.career_applications
        WHERE job_application_id = OLD.id;
        RETURN OLD;
    END IF;

    SELECT title
    INTO resolved_position
    FROM public.job_listings
    WHERE id = NEW.job_id;

    INSERT INTO public.career_applications (
        job_application_id,
        job_id,
        name,
        email,
        phone,
        position,
        resume_url,
        resume_storage_path,
        resume_file_name,
        resume_file_size,
        status,
        additional_info,
        submitted_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.job_id,
        NEW.full_name,
        NEW.email,
        NEW.phone,
        COALESCE(NULLIF(NEW.additional_info ->> 'position_applied', ''), resolved_position, 'General Application'),
        NEW.resume_url,
        NEW.resume_storage_path,
        NEW.resume_file_name,
        NEW.resume_file_size,
        NEW.status,
        COALESCE(NEW.additional_info, '{}'::jsonb),
        COALESCE(NEW.created_at, NOW()),
        COALESCE(NEW.updated_at, NEW.created_at, NOW())
    )
    ON CONFLICT (job_application_id) DO UPDATE
    SET
        job_id = EXCLUDED.job_id,
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        position = EXCLUDED.position,
        resume_url = EXCLUDED.resume_url,
        resume_storage_path = EXCLUDED.resume_storage_path,
        resume_file_name = EXCLUDED.resume_file_name,
        resume_file_size = EXCLUDED.resume_file_size,
        status = EXCLUDED.status,
        additional_info = EXCLUDED.additional_info,
        submitted_at = EXCLUDED.submitted_at,
        updated_at = EXCLUDED.updated_at;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_career_application_mirror_trigger ON public.job_applications;
CREATE TRIGGER sync_career_application_mirror_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.sync_career_application_mirror();

ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Career applications admin read" ON public.career_applications;
CREATE POLICY "Career applications admin read"
ON public.career_applications
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'content_manager', 'hr')
    )
);

DROP POLICY IF EXISTS "Career applications admin update" ON public.career_applications;
CREATE POLICY "Career applications admin update"
ON public.career_applications
FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'content_manager', 'hr')
    )
);

DROP POLICY IF EXISTS "Career applications admin delete" ON public.career_applications;
CREATE POLICY "Career applications admin delete"
ON public.career_applications
FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin', 'content_manager', 'hr')
    )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'career-applications',
    'career-applications',
    FALSE,
    1048576,
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE INDEX IF NOT EXISTS idx_payments_type_status_created_at
    ON public.payments(payment_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lecture_progress_updated_at
    ON public.lecture_progress(last_watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_attempts_started_at
    ON public.question_attempts(occurred_at DESC);

COMMIT;
