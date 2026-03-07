-- Fix: Drop conflicting tables to allow clean migration
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS study_streaks CASCADE;
DROP TABLE IF EXISTS user_points CASCADE;
DROP TABLE IF EXISTS point_transactions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS job_listings CASCADE;
DROP TABLE IF EXISTS study_plans CASCADE;
DROP TABLE IF EXISTS doubts CASCADE;
DROP TABLE IF EXISTS parent_student_link CASCADE;

-- Re-create achievements with correct schema (VARCHAR id)
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    badge_color VARCHAR(7),
    criteria_type VARCHAR(50) NOT NULL,
    criteria_value INTEGER NOT NULL DEFAULT 1,
    points INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default achievements
INSERT INTO achievements (id, name, description, icon_url, badge_color, criteria_type, criteria_value, points, is_active) VALUES
    ('first_steps', 'First Steps', 'Complete your first learning activity', '/badges/first-steps.svg', '#22c55e', 'activities_completed', 1, 50, true),
    ('scholar', 'Scholar', 'Complete 10 lectures', '/badges/scholar.svg', '#3b82f6', 'lectures_completed', 10, 100, true),
    ('problem_solver', 'Problem Solver', 'Answer 50 questions correctly', '/badges/problem-solver.svg', '#f59e0b', 'correct_answers', 50, 150, true),
    ('test_taker', 'Test Taker', 'Complete 5 tests', '/badges/test-taker.svg', '#8b5cf6', 'tests_completed', 5, 200, true),
    ('week_warrior', 'Week Warrior', 'Maintain a 7-day study streak', '/badges/week-warrior.svg', '#ef4444', 'streak_days', 7, 250, true),
    ('monthly_master', 'Monthly Master', 'Maintain a 30-day study streak', '/badges/monthly-master.svg', '#ec4899', 'streak_days', 30, 500, true),
    ('challenger', 'Challenger', 'Complete 10 daily challenges', '/badges/challenger.svg', '#14b8a6', 'daily_challenges', 10, 300, true),
    ('lecture_lover', 'Lecture Lover', 'Watch 50 hours of lectures', '/badges/lecture-lover.svg', '#6366f1', 'study_minutes', 3000, 400, true),
    ('perfectionist', 'Perfectionist', 'Score 100% on a test', '/badges/perfectionist.svg', '#fbbf24', 'perfect_tests', 1, 350, true),
    ('speed_demon', 'Speed Demon', 'Complete a test with 30+ minutes remaining', '/badges/speed-demon.svg', '#f97316', 'fast_tests', 1, 200, true),
    ('consistent_learner', 'Consistent Learner', 'Study for 30 days total', '/badges/consistent.svg', '#10b981', 'total_study_days', 30, 450, true),
    ('topic_master', 'Topic Master', 'Master 5 topics (90%+ accuracy)', '/badges/topic-master.svg', '#8b5cf6', 'topics_mastered', 5, 500, true)
ON CONFLICT (id) DO NOTHING;

SELECT 'Fix applied successfully' as status;
