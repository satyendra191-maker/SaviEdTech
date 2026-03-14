-- =============================================================================
-- RLS POLICIES - Run these in Supabase SQL Editor
-- =============================================================================

-- achievements policies
DROP POLICY IF EXISTS achievements_select ON public.achievements;
DROP POLICY IF EXISTS achievements_insert ON public.achievements;
DROP POLICY IF EXISTS achievements_update ON public.achievements;
DROP POLICY IF EXISTS achievements_delete ON public.achievements;
CREATE POLICY achievements_select ON public.achievements FOR SELECT USING (true);
CREATE POLICY achievements_insert ON public.achievements FOR INSERT WITH CHECK (true);
CREATE POLICY achievements_update ON public.achievements FOR UPDATE USING (true);
CREATE POLICY achievements_delete ON public.achievements FOR DELETE USING (true);

-- gov_notifications policies
DROP POLICY IF EXISTS gov_notifications_select ON public.gov_notifications;
DROP POLICY IF EXISTS gov_notifications_insert ON public.gov_notifications;
CREATE POLICY gov_notifications_select ON public.gov_notifications FOR SELECT USING (true);
CREATE POLICY gov_notifications_insert ON public.gov_notifications FOR INSERT WITH CHECK (true);

-- lead_followups policies
DROP POLICY IF EXISTS lead_followups_select ON public.lead_followups;
DROP POLICY IF EXISTS lead_followups_insert ON public.lead_followups;
DROP POLICY IF EXISTS lead_followups_update ON public.lead_followups;
CREATE POLICY lead_followups_select ON public.lead_followups FOR SELECT USING (true);
CREATE POLICY lead_followups_insert ON public.lead_followups FOR INSERT WITH CHECK (true);
CREATE POLICY lead_followups_update ON public.lead_followups FOR UPDATE USING (true);

-- exam_registrations policies
DROP POLICY IF EXISTS exam_registrations_select ON public.exam_registrations;
DROP POLICY IF EXISTS exam_registrations_insert ON public.exam_registrations;
DROP POLICY IF EXISTS exam_registrations_update ON public.exam_registrations;
CREATE POLICY exam_registrations_select ON public.exam_registrations FOR SELECT USING (true);
CREATE POLICY exam_registrations_insert ON public.exam_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY exam_registrations_update ON public.exam_registrations FOR UPDATE USING (true);

-- user_achievements policies
DROP POLICY IF EXISTS user_achievements_select ON public.user_achievements;
DROP POLICY IF EXISTS user_achievements_insert ON public.user_achievements;
DROP POLICY IF EXISTS user_achievements_update ON public.user_achievements;
CREATE POLICY user_achievements_select ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY user_achievements_insert ON public.user_achievements FOR INSERT WITH CHECK (true);
CREATE POLICY user_achievements_update ON public.user_achievements FOR UPDATE USING (true);

-- cron_job_logs_archive policies
DROP POLICY IF EXISTS cron_job_logs_archive_select ON public.cron_job_logs_archive;
CREATE POLICY cron_job_logs_archive_select ON public.cron_job_logs_archive FOR SELECT USING (true);

-- youtube_scripts policies
DROP POLICY IF EXISTS youtube_scripts_select ON public.youtube_scripts;
DROP POLICY IF EXISTS youtube_scripts_insert ON public.youtube_scripts;
DROP POLICY IF EXISTS youtube_scripts_update ON public.youtube_scripts;
DROP POLICY IF EXISTS youtube_scripts_delete ON public.youtube_scripts;
CREATE POLICY youtube_scripts_select ON public.youtube_scripts FOR SELECT USING (true);
CREATE POLICY youtube_scripts_insert ON public.youtube_scripts FOR INSERT WITH CHECK (true);
CREATE POLICY youtube_scripts_update ON public.youtube_scripts FOR UPDATE USING (true);
CREATE POLICY youtube_scripts_delete ON public.youtube_scripts FOR DELETE USING (true);

-- promotional_videos policies
DROP POLICY IF EXISTS promotional_videos_select ON public.promotional_videos;
DROP POLICY IF EXISTS promotional_videos_insert ON public.promotional_videos;
DROP POLICY IF EXISTS promotional_videos_update ON public.promotional_videos;
DROP POLICY IF EXISTS promotional_videos_delete ON public.promotional_videos;
CREATE POLICY promotional_videos_select ON public.promotional_videos FOR SELECT USING (true);
CREATE POLICY promotional_videos_insert ON public.promotional_videos FOR INSERT WITH CHECK (true);
CREATE POLICY promotional_videos_update ON public.promotional_videos FOR UPDATE USING (true);
CREATE POLICY promotional_videos_delete ON public.promotional_videos FOR DELETE USING (true);

-- invoices policies
DROP POLICY IF EXISTS invoices_select ON public.invoices;
DROP POLICY IF EXISTS invoices_insert ON public.invoices;
DROP POLICY IF EXISTS invoices_update ON public.invoices;
CREATE POLICY invoices_select ON public.invoices FOR SELECT USING (true);
CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (true);

-- adaptive_quizzes policies
DROP POLICY IF EXISTS adaptive_quizzes_select ON public.adaptive_quizzes;
DROP POLICY IF EXISTS adaptive_quizzes_insert ON public.adaptive_quizzes;
DROP POLICY IF EXISTS adaptive_quizzes_update ON public.adaptive_quizzes;
DROP POLICY IF EXISTS adaptive_quizzes_delete ON public.adaptive_quizzes;
CREATE POLICY adaptive_quizzes_select ON public.adaptive_quizzes FOR SELECT USING (true);
CREATE POLICY adaptive_quizzes_insert ON public.adaptive_quizzes FOR INSERT WITH CHECK (true);
CREATE POLICY adaptive_quizzes_update ON public.adaptive_quizzes FOR UPDATE USING (true);
CREATE POLICY adaptive_quizzes_delete ON public.adaptive_quizzes FOR DELETE USING (true);

-- live_class_sessions policies
DROP POLICY IF EXISTS live_class_sessions_select ON public.live_class_sessions;
DROP POLICY IF EXISTS live_class_sessions_insert ON public.live_class_sessions;
DROP POLICY IF EXISTS live_class_sessions_update ON public.live_class_sessions;
DROP POLICY IF EXISTS live_class_sessions_delete ON public.live_class_sessions;
CREATE POLICY live_class_sessions_select ON public.live_class_sessions FOR SELECT USING (true);
CREATE POLICY live_class_sessions_insert ON public.live_class_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY live_class_sessions_update ON public.live_class_sessions FOR UPDATE USING (true);
CREATE POLICY live_class_sessions_delete ON public.live_class_sessions FOR DELETE USING (true);

-- Verify RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
