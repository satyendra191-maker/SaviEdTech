-- Add RLS policies for tables with RLS but no policies

-- achievements
CREATE POLICY achievements_select ON public.achievements FOR SELECT USING (true);

-- adaptive_quizzes  
CREATE POLICY adaptive_quizzes_select ON public.adaptive_quizzes FOR SELECT USING (true);
CREATE POLICY adaptive_quizzes_insert ON public.adaptive_quizzes FOR INSERT WITH CHECK (true);

-- cron_job_logs_archive
CREATE POLICY cron_job_logs_archive_select ON public.cron_job_logs_archive FOR SELECT USING (true);

-- exam_registrations
CREATE POLICY exam_registrations_select ON public.exam_registrations FOR SELECT USING (true);
CREATE POLICY exam_registrations_insert ON public.exam_registrations FOR INSERT WITH CHECK (true);

-- experiment_simulations
CREATE POLICY experiment_simulations_select ON public.experiment_simulations FOR SELECT USING (true);
CREATE POLICY experiment_simulations_insert ON public.experiment_simulations FOR INSERT WITH CHECK (true);

-- financial_analytics
CREATE POLICY financial_analytics_select ON public.financial_analytics FOR SELECT USING (true);

-- gov_notifications
CREATE POLICY gov_notifications_select ON public.gov_notifications FOR SELECT USING (true);
CREATE POLICY gov_notifications_insert ON public.gov_notifications FOR INSERT WITH CHECK (true);

-- invoices
CREATE POLICY invoices_select ON public.invoices FOR SELECT USING (true);
CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (true);

-- lead_followups
CREATE POLICY lead_followups_select ON public.lead_followups FOR SELECT USING (true);
CREATE POLICY lead_followups_insert ON public.lead_followups FOR INSERT WITH CHECK (true);

-- live_class_sessions
CREATE POLICY live_class_sessions_select ON public.live_class_sessions FOR SELECT USING (true);
CREATE POLICY live_class_sessions_insert ON public.live_class_sessions FOR INSERT WITH CHECK (true);

-- marketing_analytics
CREATE POLICY marketing_analytics_select ON public.marketing_analytics FOR SELECT USING (true);

-- promotional_videos
CREATE POLICY promotional_videos_select ON public.promotional_videos FOR SELECT USING (true);
CREATE POLICY promotional_videos_insert ON public.promotional_videos FOR INSERT WITH CHECK (true);

-- user_achievements
CREATE POLICY user_achievements_select ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY user_achievements_insert ON public.user_achievements FOR INSERT WITH CHECK (true);

-- youtube_scripts
CREATE POLICY youtube_scripts_select ON public.youtube_scripts FOR SELECT USING (true);
CREATE POLICY youtube_scripts_insert ON public.youtube_scripts FOR INSERT WITH CHECK (true);
