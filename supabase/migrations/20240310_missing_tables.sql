-- =============================================================================
-- SAVIEDUTECH COMPLETE DATABASE MIGRATION
-- =============================================================================
-- This migration adds all missing tables and columns required by the platform
-- Run this in Supabase SQL Editor
-- Date: 2024-03-10
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================================================

-- Add retry_count and last_retry_at to test_attempts if not exists
ALTER TABLE test_attempts 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;

-- Add retry_count to dpp_attempts if not exists
ALTER TABLE dpp_attempts 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;

-- Add user_id to daily_challenges if not exists (for created_by)
ALTER TABLE daily_challenges 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Add metadata to test_attempts for additional data
ALTER TABLE test_attempts 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add metadata to dpp_attempts
ALTER TABLE dpp_attempts 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add gateway column to existing tables if needed for payments
-- (This ensures compatibility with donation tracking)

-- =============================================================================
-- 2. CREATE DONATIONS TABLE (Razorpay Only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS donations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    gateway TEXT NOT NULL DEFAULT 'razorpay' CHECK (gateway = 'razorpay'),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    order_id TEXT UNIQUE,
    payment_id TEXT,
    donor_email TEXT,
    donor_name TEXT,
    donor_phone TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    gateway_response JSONB,
    error_message TEXT,
    error_code TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for donations
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_order_id ON donations(order_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);

-- =============================================================================
-- 3. ADD MISSING TABLES FOR SYSTEM OPERATIONS
-- =============================================================================

-- Webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gateway TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_gateway ON webhook_logs(gateway);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);

-- Cron logs table
CREATE TABLE IF NOT EXISTS cron_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    message TEXT,
    details JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_job_name ON cron_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_logs_status ON cron_logs(status);

-- Email queue table
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    email_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    send_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_send_at ON email_queue(send_at);

-- Bi-weekly tests table
CREATE TABLE IF NOT EXISTS biweekly_tests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    exam_id UUID REFERENCES exams(id),
    test_date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biweekly_tests_date ON biweekly_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_biweekly_tests_active ON biweekly_tests(is_active);

-- Bi-weekly test registrations
CREATE TABLE IF NOT EXISTS biweekly_registrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    biweekly_test_id UUID REFERENCES biweekly_tests(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'completed', 'absent')),
    UNIQUE(user_id, biweekly_test_id)
);

CREATE INDEX IF NOT EXISTS idx_biweekly_registrations_user ON biweekly_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_biweekly_registrations_test ON biweekly_registrations(biweekly_test_id);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- User stats table
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    total_login_days INTEGER DEFAULT 0,
    total_watch_time_minutes INTEGER DEFAULT 0,
    total_questions_attempted INTEGER DEFAULT 0,
    total_correct_answers INTEGER DEFAULT 0,
    total_tests_taken INTEGER DEFAULT 0,
    total_lectures_watched INTEGER DEFAULT 0,
    total_dpp_completed INTEGER DEFAULT 0,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- Leaderboard snapshots for historical data
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    leaderboard_type TEXT NOT NULL,
    exam_id UUID REFERENCES exams(id),
    snapshot_date DATE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(leaderboard_type, exam_id, snapshot_date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_type_date ON leaderboard_snapshots(leaderboard_type, snapshot_date);

-- Course progress table
CREATE TABLE IF NOT EXISTS course_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    lectures_completed INTEGER DEFAULT 0,
    total_lectures INTEGER DEFAULT 0,
    last_lecture_id UUID REFERENCES lectures(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_progress_user ON course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_course ON course_progress(course_id);

-- Courses table (if not exists)
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    exam_id UUID REFERENCES exams(id),
    subject_id UUID REFERENCES subjects(id),
    thumbnail_url TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    is_free BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    total_lectures INTEGER DEFAULT 0,
    total_duration_minutes INTEGER DEFAULT 0,
    instructor UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_exam ON courses(exam_id);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);

-- =============================================================================
-- 4. ENABLE ROW LEVEL SECURITY ON NEW TABLES
-- =============================================================================

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE biweekly_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE biweekly_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. CREATE RLS POLICIES
-- =============================================================================

-- Donations RLS (keep private - users see own, admins see all)
DROP POLICY IF EXISTS "Users can view own donations" ON donations;
CREATE POLICY "Users can view own donations" ON donations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all donations" ON donations;
CREATE POLICY "Admins can view all donations" ON donations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Service role can insert donations" ON donations;
CREATE POLICY "Service role can insert donations" ON donations
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update donations" ON donations;
CREATE POLICY "Service role can update donations" ON donations
    FOR UPDATE USING (true);

-- Webhook logs (admin only)
DROP POLICY IF EXISTS "Admins can view webhook logs" ON webhook_logs;
CREATE POLICY "Admins can view webhook logs" ON webhook_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Cron logs (admin only)
DROP POLICY IF EXISTS "Admins can view cron logs" ON cron_logs;
CREATE POLICY "Admins can view cron logs" ON cron_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Email queue (system only - no direct access)
DROP POLICY IF EXISTS "System can manage email queue" ON email_queue;
CREATE POLICY "System can manage email queue" ON email_queue
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

-- Bi-weekly tests (read by authenticated, manage by admin)
DROP POLICY IF EXISTS "Authenticated users can view biweekly tests" ON biweekly_tests;
CREATE POLICY "Authenticated users can view biweekly tests" ON biweekly_tests
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage biweekly tests" ON biweekly_tests;
CREATE POLICY "Admins can manage biweekly tests" ON biweekly_tests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

-- Bi-weekly registrations (users manage own)
DROP POLICY IF EXISTS "Users can manage own registrations" ON biweekly_registrations;
CREATE POLICY "Users can manage own registrations" ON biweekly_registrations
    FOR ALL USING (auth.uid() = user_id);

-- Activity logs (users see own, admins see all)
DROP POLICY IF EXISTS "Users can view own activity" ON activity_logs;
CREATE POLICY "Users can view own activity" ON activity_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all activity" ON activity_logs;
CREATE POLICY "Admins can view all activity" ON activity_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- User stats (users see own, admins see all)
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
CREATE POLICY "Users can view own stats" ON user_stats
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all stats" ON user_stats;
CREATE POLICY "Admins can view all stats" ON user_stats
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Leaderboard snapshots (public read)
DROP POLICY IF EXISTS "Anyone can view leaderboard snapshots" ON leaderboard_snapshots;
CREATE POLICY "Anyone can view leaderboard snapshots" ON leaderboard_snapshots
    FOR SELECT USING (true);

-- Course progress (users manage own)
DROP POLICY IF EXISTS "Users can manage own course progress" ON course_progress;
CREATE POLICY "Users can manage own course progress" ON course_progress
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all course progress" ON course_progress;
CREATE POLICY "Admins can view all course progress" ON course_progress
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Courses (public read, admin manage)
DROP POLICY IF EXISTS "Anyone can view published courses" ON courses;
CREATE POLICY "Anyone can view published courses" ON courses
    FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
CREATE POLICY "Admins can manage courses" ON courses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager'))
    );

-- =============================================================================
-- 6. UPDATE EXISTING POPUP ADS (Make compatible)
-- =============================================================================

-- Add missing columns to popup_ads if they don't exist
ALTER TABLE popup_ads 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info' CHECK (type IN ('info', 'promo', 'notice', 'alert')),
ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'all' CHECK (target_role IN ('all', 'student', 'admin', 'guest')),
ADD COLUMN IF NOT EXISTS dismissible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_again_after_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =============================================================================
-- 7. UPDATE EXISTING JOB LISTINGS (Make compatible)
-- =============================================================================

-- Add missing columns to job_listings if they don't exist
ALTER TABLE job_listings 
ADD COLUMN IF NOT EXISTS employment_type TEXT CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship')),
ADD COLUMN IF NOT EXISTS experience_required TEXT,
ADD COLUMN IF NOT EXISTS application_deadline DATE,
ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS application_count INTEGER DEFAULT 0;

-- =============================================================================
-- 8. CREATE OR REPLACE UTILITY FUNCTIONS
-- =============================================================================

-- Function to get user's daily challenge
CREATE OR REPLACE FUNCTION get_user_daily_challenge(user_uuid UUID)
RETURNS TABLE (
    challenge_id UUID,
    question_text TEXT,
    solution_text TEXT,
    difficulty_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        q.question_text,
        q.solution_text,
        q.difficulty_level
    FROM daily_challenges dc
    JOIN questions q ON dc.question_id = q.id
    WHERE dc.challenge_date = CURRENT_DATE
    ORDER BY RANDOM()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user rank
CREATE OR REPLACE FUNCTION calculate_user_rank(user_uuid UUID, exam_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    user_score INTEGER;
    user_count INTEGER;
BEGIN
    -- Get user's total score
    SELECT COALESCE(SUM(ta.total_score), 0) INTO user_score
    FROM test_attempts ta
    WHERE ta.user_id = user_uuid AND ta.status = 'completed';

    -- Count users with higher scores
    SELECT COUNT(DISTINCT ta2.user_id) INTO user_count
    FROM test_attempts ta2
    WHERE ta2.test_id IN (SELECT id FROM tests WHERE exam_id = exam_uuid)
    AND ta2.status = 'completed'
    AND ta2.total_score > user_score;

    RETURN user_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_stats (user_id, total_login_days, total_watch_time_minutes, total_questions_attempted, 
        total_correct_answers, total_tests_taken, total_lectures_watched, total_dpp_completed, last_active_at)
    VALUES (user_uuid, 1, 0, 0, 0, 0, 0, 0, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        total_login_days = user_stats.total_login_days + 1,
        last_active_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 9. INSERT SAMPLE DATA
-- =============================================================================

-- Sample popup ads (only if table is empty)
INSERT INTO popup_ads (title, content, type, target_role, is_active, dismissible)
SELECT 'Welcome to SaviEduTech', 'Start your JEE/NEET preparation journey with expert faculty!', 'info', 'all', true, true
WHERE NOT EXISTS (SELECT 1 FROM popup_ads LIMIT 1);

-- Sample courses (only if table is empty)
INSERT INTO courses (title, description, is_free, is_published)
SELECT 'JEE Complete Preparation Course', 'Comprehensive JEE preparation with all subjects', true, true
WHERE NOT EXISTS (SELECT 1 FROM courses LIMIT 1);

INSERT INTO courses (title, description, is_free, is_published)
SELECT 'NEET Complete Preparation Course', 'Comprehensive NEET preparation with all subjects', true, true
WHERE NOT EXISTS (SELECT 1 FROM courses LIMIT 2);

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT 'Migration completed successfully!' AS status;

-- List all created tables
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
