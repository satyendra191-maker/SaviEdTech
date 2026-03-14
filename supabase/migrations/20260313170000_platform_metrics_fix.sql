-- Add missing platform_metrics table
CREATE TABLE IF NOT EXISTS public.platform_metrics (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name     TEXT NOT NULL,
    metric_value    NUMERIC(12,2),
    metric_unit     TEXT,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_metrics_name ON public.platform_metrics (metric_name);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_recorded_at ON public.platform_metrics (recorded_at DESC);

-- RLS
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage platform_metrics" ON public.platform_metrics;
CREATE POLICY "Service role can manage platform_metrics"
    ON public.platform_metrics FOR ALL
    USING (auth.role() = 'service_role');

-- Add system_health RLS if missing
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage system_health" ON public.system_health;
CREATE POLICY "Service role can manage system_health"
    ON public.system_health FOR ALL
    USING (auth.role() = 'service_role');

-- Insert initial health check if not exists
INSERT INTO public.system_health (check_name, status, details, checked_at)
VALUES ('initial_setup', 'healthy', '{"message": "Platform initialized"}', now())
ON CONFLICT DO NOTHING;
