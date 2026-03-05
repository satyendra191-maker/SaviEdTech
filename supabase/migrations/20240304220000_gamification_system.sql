:no_data:-- Gamification System Tables
-- This migration adds tables for the complete gamification system

-- ============================================
-- Achievements Table
-- ============================================
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
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    points = EXCLUDED.points;

-- ============================================
-- User Achievements Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- Enable RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
    ON user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view others achievements"
    ON user_achievements FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "System can insert achievements"
    ON user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' IN ('admin', 'content_manager'));

-- ============================================
-- Study Streaks Table
-- ============================================
CREATE TABLE IF NOT EXISTS study_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    study_minutes INTEGER DEFAULT 0,
    activities_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, streak_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_study_streaks_user_id ON study_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_study_streaks_date ON study_streaks(streak_date);

-- Enable RLS
ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_streaks
CREATE POLICY "Users can view their own streaks"
    ON study_streaks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view others streaks"
    ON study_streaks FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "System can insert streaks"
    ON study_streaks FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' IN ('admin', 'content_manager'));

CREATE POLICY "System can update streaks"
    ON study_streaks FOR UPDATE
    USING (auth.uid() = user_id OR auth.jwt()->>'role' IN ('admin', 'content_manager'));

-- ============================================
-- User Points Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    points INTEGER NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_created_at ON user_points(created_at);
CREATE INDEX IF NOT EXISTS idx_user_points_activity_type ON user_points(activity_type);

-- Enable RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_points
CREATE POLICY "Users can view their own points"
    ON user_points FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view others points"
    ON user_points FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "System can insert points"
    ON user_points FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.jwt()->>'role' IN ('admin', 'content_manager'));

-- ============================================
-- Leaderboard Snapshots Table (for caching)
-- ============================================
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period VARCHAR(20) NOT NULL,
    leaderboard_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(period, leaderboard_type)
);

-- Enable RLS
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard snapshots"
    ON leaderboard_snapshots FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- Update Student Profiles Table
-- ============================================
-- Add gamification-related columns if they don't exist
DO $$
BEGIN
    -- Add total_points column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'total_points') THEN
        ALTER TABLE student_profiles ADD COLUMN total_points INTEGER DEFAULT 0;
    END IF;

    -- Add streak_freeze_used_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'student_profiles' AND column_name = 'streak_freeze_used_at') THEN
        ALTER TABLE student_profiles ADD COLUMN streak_freeze_used_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================
-- Functions for Gamification
-- ============================================

-- Function to increment study minutes (for upserts)
CREATE OR REPLACE FUNCTION increment_study_minutes(minutes INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE((SELECT study_minutes FROM study_streaks WHERE id = (SELECT id FROM study_streaks LIMIT 1)), 0) + minutes;
END;
$$ LANGUAGE plpgsql;

-- Function to increment activity count (for upserts)
CREATE OR REPLACE FUNCTION increment_activity_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE((SELECT activities_count FROM study_streaks WHERE id = (SELECT id FROM study_streaks LIMIT 1)), 0) + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get user rank in leaderboard
CREATE OR REPLACE FUNCTION get_user_leaderboard_rank(
    p_user_id UUID,
    p_type VARCHAR(50),
    p_period VARCHAR(20)
)
RETURNS INTEGER AS $$
DECLARE
    v_rank INTEGER;
BEGIN
    IF p_type = 'points' THEN
        SELECT rank INTO v_rank
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank
            FROM student_profiles
        ) ranked
        WHERE id = p_user_id;
    ELSIF p_type = 'streaks' THEN
        SELECT rank INTO v_rank
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY study_streak DESC) as rank
            FROM student_profiles
        ) ranked
        WHERE id = p_user_id;
    END IF;
    
    RETURN COALESCE(v_rank, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers for Automatic Gamification Updates
-- ============================================

-- Trigger to update total_points when new points are added
CREATE OR REPLACE FUNCTION update_total_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE student_profiles
    SET total_points = COALESCE(total_points, 0) + NEW.points
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_total_points ON user_points;
CREATE TRIGGER trigger_update_total_points
    AFTER INSERT ON user_points
    FOR EACH ROW
    EXECUTE FUNCTION update_total_points();

-- Trigger to update streak when study_streaks is updated
CREATE OR REPLACE FUNCTION update_study_streak()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the current streak in student_profiles
    UPDATE student_profiles
    SET 
        study_streak = (
            SELECT COUNT(DISTINCT streak_date)
            FROM study_streaks
            WHERE user_id = NEW.user_id
            AND streak_date >= CURRENT_DATE - INTERVAL '30 days'
        ),
        longest_streak = GREATEST(
            COALESCE(longest_streak, 0),
            (
                SELECT COUNT(DISTINCT streak_date)
                FROM study_streaks
                WHERE user_id = NEW.user_id
                AND streak_date >= CURRENT_DATE - INTERVAL '30 days'
            )
        )
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_study_streak ON study_streaks;
CREATE TRIGGER trigger_update_study_streak
    AFTER INSERT ON study_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_study_streak();

-- ============================================
-- Add Notifications Support
-- ============================================

-- Update notification type enum if needed
DO $$
BEGIN
    -- Check if the notification_type column exists in notifications table
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'notifications' AND column_name = 'notification_type') THEN
        -- The table exists, check if we need to add 'achievement' to the enum
        -- Note: This is a simplified check. In production, you might need more sophisticated enum handling
        NULL;
    END IF;
END $$;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE achievements IS 'Defines all available achievements/badges in the system';
COMMENT ON TABLE user_achievements IS 'Tracks which achievements each user has earned';
COMMENT ON TABLE study_streaks IS 'Daily study activity tracking for streak calculations';
COMMENT ON TABLE user_points IS 'Point transaction history for gamification';
COMMENT ON TABLE leaderboard_snapshots IS 'Cached leaderboard data for performance';

COMMENT ON COLUMN student_profiles.total_points IS 'Total accumulated gamification points';
COMMENT ON COLUMN student_profiles.streak_freeze_used_at IS 'Last time user used streak freeze feature';
