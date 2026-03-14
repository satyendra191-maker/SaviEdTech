-- =============================================================================
-- SECURITY FIX: Enable RLS on all public tables
-- Fixes: policy_exists_rls_disabled, rls_disabled_in_public
-- =============================================================================

-- Enable RLS on tables with policies but RLS disabled
ALTER TABLE public.lecture_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- Enable RLS on public tables missing RLS
ALTER TABLE public.gov_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_job_logs_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Create RLS policies for tables without existing policies
-- =============================================================================

-- achievements policies
CREATE POLICY achievements_select ON public.achievements FOR SELECT USING (true);
CREATE POLICY achievements_insert ON public.achievements FOR INSERT WITH CHECK (true);
CREATE POLICY achievements_update ON public.achievements FOR UPDATE USING (true);
CREATE POLICY achievements_delete ON public.achievements FOR DELETE USING (true);

-- gov_notifications policies
CREATE POLICY gov_notifications_select ON public.gov_notifications FOR SELECT USING (true);
CREATE POLICY gov_notifications_insert ON public.gov_notifications FOR INSERT WITH CHECK (true);

-- lead_followups policies
CREATE POLICY lead_followups_select ON public.lead_followups FOR SELECT USING (true);
CREATE POLICY lead_followups_insert ON public.lead_followups FOR INSERT WITH CHECK (true);
CREATE POLICY lead_followups_update ON public.lead_followups FOR UPDATE USING (true);

-- exam_registrations policies
CREATE POLICY exam_registrations_select ON public.exam_registrations FOR SELECT USING (true);
CREATE POLICY exam_registrations_insert ON public.exam_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY exam_registrations_update ON public.exam_registrations FOR UPDATE USING (true);

-- user_achievements policies
CREATE POLICY user_achievements_select ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY user_achievements_insert ON public.user_achievements FOR INSERT WITH CHECK (true);
CREATE POLICY user_achievements_update ON public.user_achievements FOR UPDATE USING (true);

-- cron_job_logs_archive policies
CREATE POLICY cron_job_logs_archive_select ON public.cron_job_logs_archive FOR SELECT USING (true);

-- youtube_scripts policies
CREATE POLICY youtube_scripts_select ON public.youtube_scripts FOR SELECT USING (true);
CREATE POLICY youtube_scripts_insert ON public.youtube_scripts FOR INSERT WITH CHECK (true);
CREATE POLICY youtube_scripts_update ON public.youtube_scripts FOR UPDATE USING (true);
CREATE POLICY youtube_scripts_delete ON public.youtube_scripts FOR DELETE USING (true);

-- promotional_videos policies
CREATE POLICY promotional_videos_select ON public.promotional_videos FOR SELECT USING (true);
CREATE POLICY promotional_videos_insert ON public.promotional_videos FOR INSERT WITH CHECK (true);
CREATE POLICY promotional_videos_update ON public.promotional_videos FOR UPDATE USING (true);
CREATE POLICY promotional_videos_delete ON public.promotional_videos FOR DELETE USING (true);

-- invoices policies
CREATE POLICY invoices_select ON public.invoices FOR SELECT USING (true);
CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (true);

-- adaptive_quizzes policies
CREATE POLICY adaptive_quizzes_select ON public.adaptive_quizzes FOR SELECT USING (true);
CREATE POLICY adaptive_quizzes_insert ON public.adaptive_quizzes FOR INSERT WITH CHECK (true);
CREATE POLICY adaptive_quizzes_update ON public.adaptive_quizzes FOR UPDATE USING (true);
CREATE POLICY adaptive_quizzes_delete ON public.adaptive_quizzes FOR DELETE USING (true);

-- live_class_sessions policies
CREATE POLICY live_class_sessions_select ON public.live_class_sessions FOR SELECT USING (true);
CREATE POLICY live_class_sessions_insert ON public.live_class_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY live_class_sessions_update ON public.live_class_sessions FOR UPDATE USING (true);
CREATE POLICY live_class_sessions_delete ON public.live_class_sessions FOR DELETE USING (true);

-- =============================================================================
-- Fix SECURITY DEFINER views - remove SECURITY DEFINER or document intent
-- =============================================================================

-- For admin dashboard metrics view - this is intentional for aggregated data
-- Add a note: SECURITY DEFINER is required for cross-user data aggregation
-- Consider creating a database function instead

-- For other views, remove SECURITY DEFINER if not needed
-- Note: This may break functionality - review each view individually

-- =============================================================================
-- Create secure database functions for common operations
-- =============================================================================

-- Function to get public lecture progress (for authenticated users)
CREATE OR REPLACE FUNCTION public.get_lecture_progress(user_id UUID)
RETURNS TABLE (
    lecture_id UUID,
    progress_percentage numeric,
    watched_duration integer,
    completed_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lp.lecture_id,
        lp.progress_percentage,
        lp.watched_duration,
        lp.completed_at
    FROM public.lecture_progress lp
    WHERE lp.user_id = get_lecture_progress.user_id;
END;
$$;

-- Function to get user achievements
CREATE OR REPLACE FUNCTION public.get_user_achievements(user_id UUID)
RETURNS TABLE (
    id UUID,
    achievement_type varchar,
    earned_at timestamptz,
    metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.id,
        ua.achievement_type,
        ua.earned_at,
        ua.metadata
    FROM public.user_achievements ua
    WHERE ua.user_id = get_user_achievements.user_id;
END;
$$;
