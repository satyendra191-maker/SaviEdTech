-- =========================================
-- SAVIEDUTECH DASHBOARD OPTIMIZATION MIGRATION
-- High Performance Queries for Dashboards
-- Applied: 2026-03-12
-- =========================================

BEGIN;

-- =========================================
-- STUDENT DASHBOARD VIEW
-- =========================================
CREATE OR REPLACE VIEW public.student_dashboard_view AS
SELECT
    p.id AS student_id,
    p.full_name,
    sp.exam_target,
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
GROUP BY p.id, p.full_name, sp.exam_target, sp.study_streak, sp.rank_prediction, sp.total_study_minutes;

-- =========================================
-- COURSE PROGRESS VIEW
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
LEFT JOIN lectures l ON l.course_id = c.id
LEFT JOIN lecture_progress lp ON lp.lecture_id = l.id
WHERE c.is_published = true
GROUP BY c.id, c.title, s.id, s.name;

-- =========================================
-- STUDENT LEADERBOARD VIEW
-- =========================================
CREATE OR REPLACE VIEW public.student_leaderboard_view AS
SELECT
    p.id AS student_id,
    p.full_name,
    COALESCE(us.total_points, 0) AS total_points,
    COALESCE(us.streak_days, 0) AS streak_days,
    COALESCE(us.rank, 0) AS national_rank,
    COALESCE(us.average_score, 0) AS average_score,
    ROW_NUMBER() OVER (ORDER BY COALESCE(us.total_points, 0) DESC) AS leaderboard_position
FROM profiles p
LEFT JOIN user_stats us ON us.user_id = p.id
WHERE p.role = 'student' AND p.is_active = true
ORDER BY leaderboard_position;

-- =========================================
-- PARENT STUDENT ANALYTICS VIEW
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
    sp.study_streak,
    sp.rank_prediction,
    sp.percentile_prediction,
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
    (SELECT COUNT(*)::integer FROM payments WHERE status = 'completed') AS completed_payments,
    (SELECT COUNT(*)::integer FROM donations WHERE status = 'completed') AS completed_donations,
    (SELECT COALESCE(SUM(amount), 0)::numeric FROM donations WHERE status = 'completed') AS total_donations,
    (SELECT COUNT(*)::integer FROM lead_forms) AS total_leads,
    (SELECT COUNT(*)::integer FROM lead_forms WHERE status = 'converted') AS converted_leads;

-- =========================================
-- RECENT ACTIVITY VIEW
-- =========================================
CREATE OR REPLACE VIEW public.recent_activity_view AS
SELECT
    n.id,
    n.user_id,
    n.type,
    n.title,
    n.message,
    n.is_read,
    n.created_at
FROM notifications n
ORDER BY n.created_at DESC
LIMIT 50;

-- =========================================
-- COURSE POPULARITY VIEW
-- =========================================
CREATE OR REPLACE VIEW public.course_popularity_view AS
SELECT
    c.id AS course_id,
    c.title,
    c.thumbnail_url,
    s.name AS subject_name,
    COUNT(DISTINCT ce.user_id) AS enrollments,
    COUNT(DISTINCT l.id) AS lecture_count,
    COALESCE(SUM(l.duration_minutes), 0) AS total_duration_minutes,
    ROUND(AVG(cp.progress_percent), 1) AS avg_progress
FROM courses c
LEFT JOIN subjects s ON s.id = c.subject_id
LEFT JOIN course_enrollments ce ON ce.course_id = c.id
LEFT JOIN lectures l ON l.course_id = c.id
LEFT JOIN course_progress cp ON cp.course_id = c.id
WHERE c.is_published = true
GROUP BY c.id, c.title, c.thumbnail_url, s.name
ORDER BY enrollments DESC;

-- =========================================
-- EXAM PERFORMANCE VIEW
-- =========================================
CREATE OR REPLACE VIEW public.exam_performance_view AS
SELECT
    ta.id AS attempt_id,
    ta.user_id,
    ta.test_id,
    t.title AS test_title,
    t.total_questions,
    t.duration_minutes,
    ta.score,
    ta.max_score,
    ROUND((ta.score::numeric / NULLIF(ta.max_score, 0)) * 100, 1) AS percentage,
    ta.status,
    ta.submitted_at,
    p.full_name,
    sp.exam_target
FROM test_attempts ta
JOIN tests t ON t.id = ta.test_id
JOIN profiles p ON p.id = ta.user_id
LEFT JOIN student_profiles sp ON sp.id = ta.user_id
ORDER BY ta.submitted_at DESC;

-- =========================================
-- ADDITIONAL PERFORMANCE INDEXES
-- =========================================

-- Student progress indexes
CREATE INDEX IF NOT EXISTS idx_student_progress_user_lecture 
ON student_progress(user_id, lecture_id);

CREATE INDEX IF NOT EXISTS idx_student_progress_completed 
ON student_progress(user_id, is_completed) 
WHERE is_completed = true;

-- Lecture progress indexes
CREATE INDEX IF NOT EXISTS idx_lecture_progress_user_completed 
ON lecture_progress(user_id, is_completed) 
WHERE is_completed = true;

CREATE INDEX IF NOT EXISTS idx_lecture_progress_last_watched 
ON lecture_progress(user_id, last_watched_at DESC);

-- Test attempts indexes
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_submitted 
ON test_attempts(user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_attempts_status 
ON test_attempts(status, submitted_at DESC);

-- Topic mastery indexes
CREATE INDEX IF NOT EXISTS idx_topic_mastery_strength 
ON topic_mastery(user_id, strength_status);

CREATE INDEX IF NOT EXISTS idx_topic_mastery_accuracy 
ON topic_mastery(user_id, accuracy_percent DESC);

-- User stats indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_points 
ON user_stats(total_points DESC);

CREATE INDEX IF NOT EXISTS idx_user_stats_rank 
ON user_stats(rank ASC) 
WHERE rank > 0;

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, is_read, created_at DESC);

-- Course progress indexes
CREATE INDEX IF NOT EXISTS idx_course_progress_user_course 
ON course_progress(user_id, course_id);

-- Parent links indexes
CREATE INDEX IF NOT EXISTS idx_parent_links_status 
ON parent_links(verification_status, parent_id);

-- =========================================
-- HELPER FUNCTIONS FOR DASHBOARDS
-- =========================================

-- Function to get student rank
CREATE OR REPLACE FUNCTION public.get_student_rank(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_rank INTEGER;
BEGIN
    SELECT rank INTO v_rank
    FROM user_stats
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_rank, 0);
END;
$$;

-- Function to calculate predicted rank based on average score
CREATE OR REPLACE FUNCTION public.calculate_predicted_rank(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_avg_score NUMERIC;
    v_rank INTEGER;
BEGIN
    SELECT AVG(score::numeric) INTO v_avg_score
    FROM test_attempts
    WHERE user_id = p_user_id AND status IN ('completed', 'time_up');
    
    IF v_avg_score IS NULL THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*) + 1 INTO v_rank
    FROM (
        SELECT user_id, AVG(score::numeric) AS avg_score
        FROM test_attempts
        WHERE status IN ('completed', 'time_up')
        GROUP BY user_id
        HAVING AVG(score::numeric) > v_avg_score
    ) AS higher_scorers;
    
    RETURN COALESCE(v_rank, 0);
END;
$$;

-- Function to get weak topics for a student
CREATE OR REPLACE FUNCTION public.get_weak_topics(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
    topic_id UUID,
    topic_name TEXT,
    accuracy_percent NUMERIC,
    strength_status TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.topic_id,
        t.name AS topic_name,
        tm.accuracy_percent,
        tm.strength_status
    FROM topic_mastery tm
    JOIN topics t ON t.id = tm.topic_id
    WHERE tm.user_id = p_user_id 
      AND tm.strength_status IN ('weak', 'average')
    ORDER BY tm.accuracy_percent ASC
    LIMIT p_limit;
END;
$$;

-- =========================================
-- REALTIME NOTIFICATION FUNCTION
-- =========================================

-- Function to notify on new notifications
CREATE OR REPLACE FUNCTION public.fn_notify_new_notification()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'notifications',
        json_build_object(
            'id', NEW.id,
            'user_id', NEW.user_id,
            'type', NEW.type,
            'title', NEW.title,
            'message', NEW.message,
            'created_at', NEW.created_at
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_notify_notification ON notifications;

-- Create trigger for realtime notifications
CREATE TRIGGER trg_notify_notification
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_new_notification();

-- =========================================
-- GRANT PERMISSIONS FOR VIEWS AND FUNCTIONS
-- =========================================

GRANT SELECT ON public.student_dashboard_view TO authenticated;
GRANT SELECT ON public.course_progress_view TO authenticated;
GRANT SELECT ON public.student_leaderboard_view TO authenticated;
GRANT SELECT ON public.parent_student_analytics_view TO authenticated;
GRANT SELECT ON public.admin_dashboard_metrics TO authenticated;
GRANT SELECT ON public.recent_activity_view TO authenticated;
GRANT SELECT ON public.course_popularity_view TO authenticated;
GRANT SELECT ON public.exam_performance_view TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_student_rank(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_predicted_rank(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weak_topics(UUID, INTEGER) TO authenticated;

COMMIT;

SELECT 'Dashboard optimization migration completed successfully!' AS status;
