-- Drop existing views
DROP VIEW IF EXISTS public.admin_dashboard_metrics CASCADE;
DROP VIEW IF EXISTS public.users CASCADE;
DROP VIEW IF EXISTS public.course_progress_view CASCADE;
DROP VIEW IF EXISTS public.options CASCADE;
DROP VIEW IF EXISTS public.student_leaderboard_view CASCADE;
DROP VIEW IF EXISTS public.student_progress_summary CASCADE;
DROP VIEW IF EXISTS public.revenue_analytics_view CASCADE;
DROP VIEW IF EXISTS public.student_dashboard_view CASCADE;
DROP VIEW IF EXISTS public.parent_student_analytics_view CASCADE;

-- Recreate without SECURITY DEFINER

CREATE VIEW public.admin_dashboard_metrics AS
SELECT 
    (SELECT count(*)::int FROM profiles WHERE role = 'student') as total_students,
    (SELECT count(*)::int FROM courses) as total_courses,
    (SELECT count(*)::int FROM lectures) as total_lectures,
    (SELECT count(*)::int FROM tests) as total_tests,
    now() as updated_at;

CREATE VIEW public.users AS
SELECT id, email, created_at FROM auth.users;

CREATE VIEW public.student_leaderboard_view AS
SELECT p.id, p.full_name, p.avatar_url,
    COALESCE(SUM(ta.total_score), 0) as total_score,
    RANK() OVER (ORDER BY COALESCE(SUM(ta.total_score), 0) DESC) as rank
FROM profiles p
LEFT JOIN test_attempts ta ON ta.user_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.avatar_url;

CREATE VIEW public.revenue_analytics_view AS
SELECT DATE(created_at) as date, count(*) as transaction_count,
    sum(amount) as total_amount, payment_type, status
FROM payments WHERE status = 'completed'
GROUP BY DATE(created_at), payment_type, status;

-- Grant access
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
