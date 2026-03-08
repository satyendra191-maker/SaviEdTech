BEGIN;

CREATE TABLE IF NOT EXISTS public.popup_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    ad_title TEXT,
    ad_message TEXT,
    image_url TEXT,
    button_text TEXT,
    button_url TEXT,
    display_duration_seconds INTEGER NOT NULL DEFAULT 10,
    display_frequency TEXT NOT NULL DEFAULT 'once_per_session',
    placements TEXT[] NOT NULL DEFAULT ARRAY['homepage', 'student_dashboard']::TEXT[],
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    priority INTEGER NOT NULL DEFAULT 0,
    max_impressions INTEGER,
    current_impressions INTEGER NOT NULL DEFAULT 0,
    target_audience JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system',
    notification_type TEXT,
    data JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    sent_via TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    target_surface TEXT[] NOT NULL DEFAULT ARRAY['homepage', 'dashboard']::TEXT[],
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.popup_ads
    ADD COLUMN IF NOT EXISTS ad_title TEXT,
    ADD COLUMN IF NOT EXISTS ad_message TEXT,
    ADD COLUMN IF NOT EXISTS display_duration_seconds INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS display_frequency TEXT NOT NULL DEFAULT 'once_per_session',
    ADD COLUMN IF NOT EXISTS placements TEXT[] NOT NULL DEFAULT ARRAY['homepage', 'student_dashboard']::TEXT[],
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.popup_ads
SET
    ad_title = COALESCE(NULLIF(ad_title, ''), title),
    ad_message = COALESCE(ad_message, content),
    title = COALESCE(NULLIF(title, ''), ad_title, 'SaviEduTech Update'),
    content = COALESCE(content, ad_message),
    display_duration_seconds = GREATEST(COALESCE(display_duration_seconds, 10), 10),
    display_frequency = CASE
        WHEN COALESCE(NULLIF(display_frequency, ''), 'once_per_session') IN ('once_per_session', 'daily', 'weekly')
            THEN COALESCE(NULLIF(display_frequency, ''), 'once_per_session')
        ELSE 'once_per_session'
    END,
    placements = CASE
        WHEN placements IS NULL OR array_length(placements, 1) IS NULL
            THEN ARRAY['homepage', 'student_dashboard']::TEXT[]
        ELSE placements
    END,
    updated_at = COALESCE(updated_at, NOW());

ALTER TABLE IF EXISTS public.popup_ads
    DROP CONSTRAINT IF EXISTS popup_ads_display_frequency_check;

ALTER TABLE IF EXISTS public.popup_ads
    ADD CONSTRAINT popup_ads_display_frequency_check
    CHECK (display_frequency IN ('once_per_session', 'daily', 'weekly'));

ALTER TABLE IF EXISTS public.notifications
    ADD COLUMN IF NOT EXISTS type TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS target_surface TEXT[] NOT NULL DEFAULT ARRAY['homepage', 'dashboard']::TEXT[],
    ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.notifications
SET
    type = COALESCE(NULLIF(type, ''), NULLIF(notification_type, ''), 'system'),
    is_active = COALESCE(is_active, TRUE),
    target_surface = CASE
        WHEN target_surface IS NULL OR array_length(target_surface, 1) IS NULL
            THEN ARRAY['homepage', 'dashboard']::TEXT[]
        ELSE target_surface
    END,
    priority = COALESCE(priority, 0),
    updated_at = COALESCE(updated_at, NOW());

CREATE INDEX IF NOT EXISTS idx_popup_ads_active_window
    ON public.popup_ads(is_active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_popup_ads_frequency
    ON public.popup_ads(display_frequency);

CREATE INDEX IF NOT EXISTS idx_popup_ads_placements
    ON public.popup_ads USING GIN(placements);

CREATE INDEX IF NOT EXISTS idx_notifications_active_created
    ON public.notifications(is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type
    ON public.notifications(type);

CREATE INDEX IF NOT EXISTS idx_notifications_target_surface
    ON public.notifications USING GIN(target_surface);

ALTER TABLE IF EXISTS public.popup_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_public_active_read ON public.notifications;
CREATE POLICY notifications_public_active_read ON public.notifications
    FOR SELECT
    USING (is_active = TRUE AND user_id IS NULL);

DROP POLICY IF EXISTS notifications_authenticated_active_read ON public.notifications;
CREATE POLICY notifications_authenticated_active_read ON public.notifications
    FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND is_active = TRUE
        AND (user_id IS NULL OR auth.uid() = user_id)
    );

DROP POLICY IF EXISTS notifications_admin_manage ON public.notifications;
CREATE POLICY notifications_admin_manage ON public.notifications
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('admin', 'super_admin', 'content_manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('admin', 'super_admin', 'content_manager')
        )
    );

COMMIT;
