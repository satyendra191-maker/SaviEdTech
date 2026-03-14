-- =========================================
-- SAVIEDUTECH DASHBOARD OPTIMIZATION MIGRATION
-- High Performance Queries for Dashboards
-- Applied: 2026-03-12 (Fixed)
-- =========================================

BEGIN;

-- =========================================
-- STUDENT DASHBOARD VIEW
-- =========================================
CREATE OR REPLACE VIEW public.student_dashboard_view AS
SELECT
    p.id AS student_id,
    p.full_name,
    p.exam_target,
    COALESCE(sp.study_streak, 0) AS study_streak,
    COALESCE(sp.rank_prediction, 0) AS predicted_rank,
    COUNT(DISTINCT lp.lecture_id) AS lectures_completed,
    COUNT(DISTINCT ta.id) AS exams_attempted,
    COALESCE(AVG(ta.total_score), 0) AS average_score,
    COALESCE(sp.total_study_minutes, 0) AS total_study_minutes
FROM profiles p
LEFT JOIN student_profiles sp ON sp.id = p.id
LEFT JOIN lecture_progress lp ON lp.user_id = p.id AND lp.is_completed = true
LEFT JOIN test_attempts ta ON ta.user_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.exam_target, sp.study_streak, sp.rank_prediction, sp.total_study_minutes;

-- =========================================
-- COURSE PROGRESS VIEW (FIXED: lectures.topic_id, subjects.name)
-- =========================================
CREATE OR REPLACE VIEW public.course_progress_view AS
SELECT
    c.id AS course_id,
    c.title AS course_title,
    s.id AS subject_id,
    s.name AS subject_name,
    COUNT(DISTINCT l.id) AS total_lectures,
    COUNT(DISTINCT lp.lecture_id) FILTER (WHERE lp.is_completed = true) AS completed_lectures,
    ROUND(
        COUNT(DISTINCT lp.lecture_id) FILTER (WHERE lp.is_completed = true)::numeric * 100.0 / 
        NULLIF(COUNT(DISTINCT l.id), 0), 1
    ) AS completion_percentage
FROM courses c
LEFT JOIN subjects s ON s.id = c.subject_id
LEFT JOIN lectures l ON l.topic_id IN (SELECT id FROM topics WHERE subject_id = c.subject_id)
LEFT JOIN lecture_progress lp ON lp.lecture_id = l.id
WHERE c.is_published = true
GROUP BY c.id, c.title, s.id, s.name;

-- =========================================
-- STUDENT LEADERBOARD VIEW (FIXED: user_stats columns)
-- =========================================
CREATE OR REPLACE VIEW public.student_leaderboard_view AS
SELECT
    p.id AS student_id,
    p.full_name,
    COALESCE(us.total_watch_time_minutes, 0) AS total_points,
    COALESCE(sp.study_streak, 0) AS streak_days,
    COALESCE(sp.rank_prediction, 0) AS national_rank,
    CASE WHEN COUNT(ta.id) > 0 THEN COALESCE(AVG(ta.total_score), 0) ELSE 0 END AS average_score,
    ROW_NUMBER() OVER (ORDER BY COALESCE(sp.rank_prediction, 999999) ASC) AS leaderboard_position
FROM profiles p
LEFT JOIN user_stats us ON us.user_id = p.id
LEFT JOIN student_profiles sp ON sp.id = p.id
LEFT JOIN test_attempts ta ON ta.user_id = p.id
WHERE p.role = 'student' AND p.is_active = true
GROUP BY p.id, p.full_name, us.total_watch_time_minutes, sp.study_streak, sp.rank_prediction
ORDER BY leaderboard_position;

-- =========================================
-- PARENT STUDENT ANALYTICS VIEW (FIXED: parent_links table)
-- =========================================
CREATE OR REPLACE VIEW public.parent_student_analytics_view AS
SELECT
    pl.id AS link_id,
    pl.parent_id,
    pl.student_id,
    pl.student_name,
    pl.student_phone,
    pl.verification_status,
    p.full_name AS parent_name,
    COALESCE(sp.study_streak, 0) AS study_streak,
    COALESCE(sp.rank_prediction, 0) AS rank_prediction,
    COALESCE(sp.percentile_prediction, 0) AS percentile_prediction,
    COUNT(DISTINCT lp.lecture_id) FILTER (WHERE lp.is_completed = true) AS lectures_completed,
    COUNT(DISTINCT ta.id) AS tests_attempted,
    COALESCE(AVG(ta.total_score), 0) AS average_score,
    COUNT(DISTINCT tm.topic_id) FILTER (WHERE tm.strength_status = 'weak') AS weak_topics_count
FROM parent_links pl
JOIN profiles p ON p.id = pl.parent_id
LEFT JOIN student_profiles sp ON sp.id = pl.student_id
LEFT JOIN lecture_progress lp ON lp.user_id = pl.student_id AND lp.is_completed = true
LEFT JOIN test_attempts ta ON ta.user_id = pl.student_id
LEFT JOIN topic_mastery tm ON tm.user_id = pl.student_id
WHERE pl.verification_status = 'approved'
GROUP BY pl.id, pl.parent_id, pl.student_id, pl.student_name, pl.student_phone, 
         pl.verification_status, p.full_name, sp.study_streak, sp.rank_prediction, sp.percentile_prediction;

-- =========================================
-- ADMIN DASHBOARD METRICS VIEW
-- =========================================
CREATE OR REPLACE VIEW public.admin_dashboard_metrics AS
SELECT
    (SELECT COUNT(*)::integer FROM profiles WHERE role = 'student') AS total_students,
    (SELECT COUNT(*)::integer FROM profiles WHERE role = 'student' AND is_active = true) AS active_students,
    (SELECT COUNT(*)::integer FROM profiles WHERE is_active = true) AS total_active_users,
    (SELECT COUNT(*)::integer FROM courses WHERE is_published = true) AS published_courses,
    (SELECT COUNT(*)::integer FROM lectures WHERE is_published = true) AS published_lectures,
    (SELECT COUNT(*)::integer FROM tests WHERE is_published = true) AS published_tests,
    (SELECT COALESCE(SUM(amount), 0)::numeric FROM payments WHERE status = 'completed') AS total_revenue,
    (SELECT COUNT(*)::integer FROM enrollments WHERE status = 'active') AS active_enrollments;

-- =========================================
-- REVENUE ANALYTICS VIEW
-- =========================================
CREATE OR REPLACE VIEW public.revenue_analytics_view AS
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount,
    COUNT(*) FILTER (WHERE status = 'completed') AS successful_count,
    SUM(amount) FILTER (WHERE status = 'completed') AS successful_amount,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
FROM payments
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =========================================
-- STUDENT PROGRESS SUMMARY
-- =========================================
CREATE OR REPLACE VIEW public.student_progress_summary AS
SELECT 
    p.id AS student_id,
    p.full_name,
    p.email,
    p.exam_target,
    COALESCE(sp.study_streak, 0) AS current_streak,
    COALESCE(sp.longest_streak, 0) AS longest_streak,
    COALESCE(sp.total_study_minutes, 0) AS total_study_minutes,
    COUNT(DISTINCT lp.id) AS lectures_watched,
    COUNT(DISTINCT ta.id) AS tests_attempted,
    COALESCE(AVG(ta.total_score), 0) AS avg_test_score,
    COALESCE(sp.rank_prediction, 0) AS predicted_rank,
    sp.subscription_status
FROM profiles p
LEFT JOIN student_profiles sp ON sp.id = p.id
LEFT JOIN lecture_progress lp ON lp.user_id = p.id
LEFT JOIN test_attempts ta ON ta.user_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.email, p.exam_target, sp.study_streak, sp.longest_streak, 
         sp.total_study_minutes, sp.rank_prediction, sp.subscription_status;

COMMIT;
