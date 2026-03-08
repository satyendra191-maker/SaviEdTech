BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_type TEXT NOT NULL,
    audit_subtype TEXT,
    time_range TEXT,
    status TEXT NOT NULL DEFAULT 'healthy',
    title TEXT,
    summary TEXT,
    affected_module TEXT,
    recovery_action TEXT,
    recovery_status TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    notified_admin BOOLEAN NOT NULL DEFAULT FALSE,
    notified_email BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_audit_logs
    ADD COLUMN IF NOT EXISTS status TEXT,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS summary TEXT,
    ADD COLUMN IF NOT EXISTS affected_module TEXT,
    ADD COLUMN IF NOT EXISTS recovery_action TEXT,
    ADD COLUMN IF NOT EXISTS recovery_status TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB,
    ADD COLUMN IF NOT EXISTS notified_admin BOOLEAN,
    ADD COLUMN IF NOT EXISTS notified_email BOOLEAN;

UPDATE public.platform_audit_logs
SET
    status = COALESCE(status, 'healthy'),
    metadata = COALESCE(metadata, '{}'::JSONB),
    notified_admin = COALESCE(notified_admin, FALSE),
    notified_email = COALESCE(notified_email, FALSE)
WHERE
    status IS NULL
    OR metadata IS NULL
    OR notified_admin IS NULL
    OR notified_email IS NULL;

ALTER TABLE public.platform_audit_logs
    ALTER COLUMN status SET DEFAULT 'healthy',
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN metadata SET DEFAULT '{}'::JSONB,
    ALTER COLUMN metadata SET NOT NULL,
    ALTER COLUMN notified_admin SET DEFAULT FALSE,
    ALTER COLUMN notified_admin SET NOT NULL,
    ALTER COLUMN notified_email SET DEFAULT FALSE,
    ALTER COLUMN notified_email SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'platform_audit_logs_status_check'
    ) THEN
        ALTER TABLE public.platform_audit_logs
            ADD CONSTRAINT platform_audit_logs_status_check
            CHECK (status IN ('healthy', 'warning', 'critical'));
    END IF;
END;
$$;

ALTER TABLE IF EXISTS public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_audit_logs_admin_manage ON public.platform_audit_logs;
CREATE POLICY platform_audit_logs_admin_manage ON public.platform_audit_logs
    FOR ALL
    USING (auth.role() = 'service_role' OR public.is_admin_user(auth.uid()))
    WITH CHECK (auth.role() = 'service_role' OR public.is_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created_at
    ON public.platform_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_status_created_at
    ON public.platform_audit_logs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_audit_type_created_at
    ON public.platform_audit_logs(audit_type, created_at DESC);

COMMIT;
