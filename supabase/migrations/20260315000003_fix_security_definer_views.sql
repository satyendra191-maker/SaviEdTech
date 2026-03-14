-- =============================================================================
-- FIX SECURITY DEFINER VIEWS
-- These views need SECURITY DEFINER for cross-user data aggregation
-- Option 1: Remove SECURITY DEFINER (may break functionality)
-- Option 2: Keep and document (recommended for analytics views)
-- =============================================================================

-- Option 1: Remove SECURITY DEFINER (run only if you want to fix warnings)

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

CREATE OR REPLACE VIEW public.admin_dashboard_metrics AS
SELECT 
    (SELECT count(*)::int FROM profiles WHERE role = 'student') as total_students,
    (SELECT count(*)::int FROM courses) as total_courses,
    (SELECT count(*)::int FROM lectures) as total_lectures,
    (SELECT count(*)::int FROM tests) as total_tests,
    (SELECT count(*)::int FROM enrollments) as total_enrollments,
    now() as updated_at;

CREATE OR REPLACE VIEW public.users AS
SELECT 
    id,
    email,
    created_at
FROM auth.users;

CREATE OR REPLACE VIEW public.course_progress_view AS
SELECT 
    e.user_id,
    e.course_id,
    c.title as course_title,
    cp.progress_percentage,
    cp.last_accessed
FROM enrollments e
JOIN courses c ON c.id = e.course_id
LEFT JOIN course_progress cp ON cp.user_id = e.user_id AND cp.course_id = e.course_id;

CREATE OR REPLACE VIEW public.options AS
SELECT 
    id,
    question_id,
    option_text,
    is_correct,
    order_index
FROM question_options;

CREATE OR REPLACE VIEW public.student_leaderboard_view AS
SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(ta.score), 0) as total_score,
    COUNT(DISTINCT ta.id) as tests_completed,
    RANK() OVER (ORDER BY COALESCE(SUM(ta.score), 0) DESC) as rank
FROM profiles p
LEFT JOIN test_attempts ta ON ta.user_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.avatar_url;

CREATE OR REPLACE VIEW public.student_progress_summary AS
SELECT 
    p.id as user_id,
    p.full_name,
    COUNT(DISTINCT e.course_id) as courses_enrolled,
    COUNT(DISTINCT ta.id) as tests_attempted,
    COALESCE(AVG(ta.score), 0) as avg_score,
    MAX(ta.completed_at) as last_activity
FROM profiles p
LEFT JOIN enrollments e ON e.user_id = p.id
LEFT JOIN test_attempts ta ON ta.user_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name;

CREATE OR REPLACE VIEW public.revenue_analytics_view AS
SELECT 
    DATE(created_at) as date,
    count(*) as transaction_count,
    sum(amount) as total_amount,
    payment_type,
    status
FROM payments
WHERE status = 'completed'
GROUP BY DATE(created_at), payment_type, status;

CREATE OR REPLACE VIEW public.student_dashboard_view AS
SELECT 
    p.id,
    p.full_name,
    p.email,
    COUNT(DISTINCT e.id) as enrollments,
    COUNT(DISTINCT ta.id) as test_attempts,
    COALESCE(AVG(ta.score), 0) as avg_score
FROM profiles p
LEFT JOIN enrollments e ON e.user_id = p.id
LEFT JOIN test_attempts ta ON ta.user_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.email;

CREATE OR REPLACE VIEW public.parent_student_analytics_view AS
SELECT 
    pl.parent_id,
    pl.student_id,
    p.full_name as student_name,
    COUNT(DISTINCT e.id) as courses_enrolled,
    COUNT(DISTINCT ta.id) as tests_taken,
    COALESCE(AVG(ta.score), 0) as avg_score
FROM parent_links pl
JOIN profiles p ON p.id = pl.student_id
LEFT JOIN enrollments e ON e.user_id = pl.student_id
LEFT JOIN test_attempts ta ON ta.user_id = pl.student_id
GROUP BY pl.parent_id, pl.student_id, p.full_name;

-- Grant access to anon/authenticated roles
GRANT SELECT ON public.admin_dashboard_metrics TO anon, authenticated;
GRANT SELECT ON public.users TO anon, authenticated;
GRANT SELECT ON public.course_progress_view TO anon, authenticated;
GRANT SELECT ON public.options TO anon, authenticated;
GRANT SELECT ON public.student_leaderboard_view TO anon, authenticated;
GRANT SELECT ON public.student_progress_summary TO anon, authenticated;
GRANT SELECT ON public.revenue_analytics_view TO anon, authenticated;
GRANT SELECT ON public.student_dashboard_view TO anon, authenticated;
GRANT SELECT ON public.parent_student_analytics_view TO anon, authenticated;
