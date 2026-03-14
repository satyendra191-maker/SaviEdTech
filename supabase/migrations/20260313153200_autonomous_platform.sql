-- ============================================================
-- SaviEduTech — Autonomous Platform Tables Migration
-- ============================================================

-- cron_job_logs: execution records for every cron job
CREATE TABLE IF NOT EXISTS public.cron_job_logs (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name    TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    details     JSONB DEFAULT '{}',
    duration_ms INTEGER,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON public.cron_job_logs (job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_executed_at ON public.cron_job_logs (executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status ON public.cron_job_logs (status);

-- cron_job_logs_archive: archive of old cron logs (> 30 days)
CREATE TABLE IF NOT EXISTS public.cron_job_logs_archive (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name    TEXT NOT NULL,
    status      TEXT NOT NULL,
    details     JSONB DEFAULT '{}',
    duration_ms INTEGER,
    executed_at TIMESTAMPTZ NOT NULL
);

-- cron_job_configs: admin-managed enable/disable per job
CREATE TABLE IF NOT EXISTS public.cron_job_configs (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name    TEXT UNIQUE NOT NULL,
    is_enabled  BOOLEAN NOT NULL DEFAULT true,
    schedule    TEXT,
    description TEXT,
    updated_at  TIMESTAMPTZ DEFAULT now(),
    updated_by  UUID REFERENCES public.profiles(id)
);

-- Seed default cron job configurations
INSERT INTO public.cron_job_configs (job_name, is_enabled, schedule, description) VALUES
    ('ai-content',              true, '0 2 * * *',   'AI lecture scripts, slides, narration, video, publish'),
    ('exam-engine',             true, '0 3 * * *',   'Mock exam generation, question bank, adaptive quizzes, rebalance'),
    ('student-analytics',       true, '0 4 * * *',   'Student progress, mastery heatmaps, rank predictions, leaderboard'),
    ('engagement',              true, '0 5 * * *',   'Study reminders, lecture alerts, test alerts, leaderboard'),
    ('marketing-automation',    true, '0 6 * * *',   'SEO content, YouTube scripts, promo videos, marketing analytics'),
    ('financial-automation',    true, '0 7 * * *',   'Payment verification, invoices, donation receipts, analytics'),
    ('database-maintenance',    true, '0 8 * * *',   'Index optimization, log archiving, table integrity, slow query repair'),
    ('security-monitoring',     true, '0 9 * * *',   'Auth audit, suspicious activity, RLS verification, alerts'),
    ('performance-optimization',true, '0 10 * * *',  'API latency, page speed, caching, resource usage'),
    ('automated-testing',       true, '0 11 * * *',  'Frontend UI, backend API, DB queries, AI modules'),
    ('live-class-automation',   true, '0 12 * * *',  'Schedule classes, reminders, attendance, archive recordings'),
    ('lead-management',         true, '0 13 * * *',  'CRM capture, follow-up campaigns, lead analytics'),
    ('supabase-health',         true, '0 14 * * *',  'DB connectivity, query performance, RLS validation, repair'),
    ('auth-check',              true, '0 15 * * *',  'Login system, Google OAuth, branding, token refresh'),
    ('health-monitor',          true, '*/5 * * * *', 'Continuous health monitoring and self-healing (every 5min)'),
    ('rank-prediction',         true, '30 4 * * *',  'AI rank calculations and national leaderboard update'),
    ('platform-auditor',        true, '0 16 * * *',  'Global platform audit: pages, links, dashboards, RLS'),
    ('database-backup',         true, '0 1 * * *',   'Nightly database backup'),
    ('seo-automation',          true, '0 6 * * 1',   'Weekly SEO content generation'),
    ('email-notifications',     true, '0 7 * * 1',   'Weekly email digest notifications'),
    ('gamification',            true, '0 0 * * *',   'Daily gamification: XP, streaks, badges')
ON CONFLICT (job_name) DO NOTHING;

-- system_alerts: platform-wide alert feed
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type     TEXT NOT NULL,
    severity       TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    message        TEXT NOT NULL,
    service_name   TEXT,
    endpoint       TEXT,
    is_resolved    BOOLEAN DEFAULT false,
    resolved_at    TIMESTAMPTZ,
    escalated      BOOLEAN DEFAULT false,
    escalation_level INTEGER DEFAULT 0,
    metadata       JSONB DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_is_resolved ON public.system_alerts (is_resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON public.system_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON public.system_alerts (severity);

-- marketing_analytics table
CREATE TABLE IF NOT EXISTS public.marketing_analytics (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date             DATE UNIQUE NOT NULL,
    total_leads      INTEGER DEFAULT 0,
    converted_leads  INTEGER DEFAULT 0,
    blog_views_7d    INTEGER DEFAULT 0,
    conversion_rate  INTEGER DEFAULT 0,
    updated_at       TIMESTAMPTZ DEFAULT now()
);

-- financial_analytics table
CREATE TABLE IF NOT EXISTS public.financial_analytics (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date                 DATE UNIQUE NOT NULL,
    total_revenue        NUMERIC(12,2) DEFAULT 0,
    donation_revenue     NUMERIC(12,2) DEFAULT 0,
    course_revenue       NUMERIC(12,2) DEFAULT 0,
    subscription_revenue NUMERIC(12,2) DEFAULT 0,
    updated_at           TIMESTAMPTZ DEFAULT now()
);

-- youtube_scripts table
CREATE TABLE IF NOT EXISTS public.youtube_scripts (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title           TEXT UNIQUE NOT NULL,
    script          TEXT NOT NULL,
    status          TEXT DEFAULT 'draft',
    is_ai_generated BOOLEAN DEFAULT true,
    generated_at    TIMESTAMPTZ DEFAULT now()
);

-- promotional_videos table
CREATE TABLE IF NOT EXISTS public.promotional_videos (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title      TEXT NOT NULL,
    status     TEXT DEFAULT 'queued',
    type       TEXT DEFAULT 'promotional',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    payment_id     UUID REFERENCES public.payments(id),
    user_id        UUID REFERENCES public.profiles(id),
    amount         NUMERIC(12,2),
    payment_type   TEXT,
    generated_at   TIMESTAMPTZ DEFAULT now()
);

-- donation_receipts table
CREATE TABLE IF NOT EXISTS public.donation_receipts (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_number TEXT UNIQUE NOT NULL,
    payment_id     UUID REFERENCES public.payments(id),
    user_id        UUID REFERENCES public.profiles(id),
    amount         NUMERIC(12,2),
    generated_at   TIMESTAMPTZ DEFAULT now()
);

-- adaptive_quizzes table
CREATE TABLE IF NOT EXISTS public.adaptive_quizzes (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id   UUID REFERENCES public.profiles(id),
    topic        TEXT NOT NULL,
    question_ids UUID[] DEFAULT '{}',
    generated_at TIMESTAMPTZ DEFAULT now(),
    is_completed BOOLEAN DEFAULT false,
    UNIQUE(student_id, topic)
);

-- live_class_sessions table
CREATE TABLE IF NOT EXISTS public.live_class_sessions (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id             UUID,
    title                TEXT NOT NULL,
    teacher_id           UUID REFERENCES public.profiles(id),
    subject              TEXT,
    scheduled_date       DATE,
    scheduled_at         TIMESTAMPTZ,
    duration_minutes     INTEGER DEFAULT 60,
    status               TEXT DEFAULT 'scheduled',
    reminders_sent       BOOLEAN DEFAULT false,
    reminders_sent_at    TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    recording_archived   BOOLEAN DEFAULT false,
    archived_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to existing tables (safe with IF NOT EXISTS alternative)
ALTER TABLE public.lectures 
    ADD COLUMN IF NOT EXISTS script TEXT,
    ADD COLUMN IF NOT EXISTS script_generated BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS script_generated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS slides_metadata JSONB,
    ADD COLUMN IF NOT EXISTS slides_generated BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS slides_generated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS narration_queued BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS narration_queued_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS video_render_queued BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS video_render_queued_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS questions_generated BOOLEAN DEFAULT false;

ALTER TABLE public.tests
    ADD COLUMN IF NOT EXISTS auto_generate BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_generated BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS avg_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS pass_rate NUMERIC(5,3),
    ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS difficulty_rebalanced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS question_ids UUID[] DEFAULT '{}';

ALTER TABLE public.questions
    ADD COLUMN IF NOT EXISTS computed_difficulty TEXT,
    ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT false;

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS receipt_number TEXT,
    ADD COLUMN IF NOT EXISTS receipt_generated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS requires_reauth BOOLEAN DEFAULT false;

-- RLS Policies for new tables
ALTER TABLE public.cron_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_job_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read cron logs" ON public.cron_job_logs;
CREATE POLICY "Admins can read cron logs"
    ON public.cron_job_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "Service role bypass cron logs" ON public.cron_job_logs;
CREATE POLICY "Service role bypass cron logs"
    ON public.cron_job_logs FOR ALL
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can manage cron configs" ON public.cron_job_configs;
CREATE POLICY "Admins can manage cron configs"
    ON public.cron_job_configs FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "Admins can read system alerts" ON public.system_alerts;
CREATE POLICY "Admins can read system alerts"
    ON public.system_alerts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "Service role bypass system alerts" ON public.system_alerts;
CREATE POLICY "Service role bypass system alerts"
    ON public.system_alerts FOR ALL
    USING (auth.role() = 'service_role');
