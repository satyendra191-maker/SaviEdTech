-- Drop problematic views entirely
DROP VIEW IF EXISTS public.users CASCADE;
DROP VIEW IF EXISTS public.student_leaderboard_view CASCADE;
DROP VIEW IF EXISTS public.revenue_analytics_view CASCADE;
DROP VIEW IF EXISTS public.admin_dashboard_metrics CASCADE;
DROP VIEW IF EXISTS public.course_progress_view CASCADE;
DROP VIEW IF EXISTS public.options CASCADE;
DROP VIEW IF EXISTS public.student_progress_summary CASCADE;
DROP VIEW IF EXISTS public.student_dashboard_view CASCADE;
DROP VIEW IF EXISTS public.parent_student_analytics_view CASCADE;
