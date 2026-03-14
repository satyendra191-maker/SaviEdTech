-- ============================================================
-- SaviEduTech — Additional Platform Tables
-- ============================================================

-- system_health: health check results for various platform services
CREATE TABLE IF NOT EXISTS public.system_health (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_name      TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'critical')),
    response_time_ms INTEGER,
    details         JSONB DEFAULT '{}',
    endpoint        TEXT,
    service_name    TEXT,
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_check_name ON public.system_health (check_name);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON public.system_health (status);
CREATE INDEX IF NOT EXISTS idx_system_health_checked_at ON public.system_health (checked_at DESC);

-- platform_metrics: real-time platform statistics
CREATE TABLE IF NOT EXISTS public.platform_metrics (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name     TEXT NOT NULL,
    metric_value    NUMERIC(12,2),
    metric_unit     TEXT,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_metrics_name ON public.platform_metrics (metric_name);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_recorded_at ON public.platform_metrics (recorded_at DESC);

-- RLS Policies
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "Service role can manage system_health" ON public.system_health;
CREATE POLICY "Service role can manage system_health"
    ON public.system_health FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage platform_metrics" ON public.platform_metrics;
CREATE POLICY "Service role can manage platform_metrics"
    ON public.platform_metrics FOR ALL
    USING (auth.role() = 'service_role');

-- Insert initial health check
INSERT INTO public.system_health (check_name, status, details, checked_at)
VALUES ('initial_setup', 'healthy', '{"message": "Platform initialized"}', now())
ON CONFLICT DO NOTHING;
