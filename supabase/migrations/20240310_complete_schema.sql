-- =============================================================================
-- SAVIEDUTECH COMPLETE DATABASE SCHEMA
-- =============================================================================
-- Complete database migration for SaviEduTech Platform
-- Run this in Supabase SQL Editor to set up the entire database
-- IMPORTANT: Run in order - this migration is idempotent (safe to run multiple times)
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. ENABLE UUID EXTENSION
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 2. USER MANAGEMENT & PROFILES
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'content_manager')),
    exam_target TEXT CHECK (exam_target IN ('JEE', 'NEET', 'Both')),
    class_level TEXT CHECK (class_level IN ('11', '12', 'Dropper')),
    city TEXT,
    state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    study_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_study_minutes INTEGER DEFAULT 0,
    rank_prediction INTEGER,
    percentile_prediction DECIMAL(5,2),
    subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'basic', 'premium')),
    subscription_expires_at TIMESTAMPTZ,
    preferred_subjects TEXT[] DEFAULT '{}',
    weak_topics TEXT[] DEFAULT '{}',
    strong_topics TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- =============================================================================
-- 3. LEAD GENERATION SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS lead_forms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    exam_target TEXT CHECK (exam_target IN ('JEE', 'NEET', 'Both', 'Other')),
    class_level TEXT CHECK (class_level IN ('10', '11', '12', 'Dropper')),
    city TEXT,
    source TEXT DEFAULT 'website',
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'disqualified')),
    converted_to_user_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES lead_forms(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT,
    performed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. ACADEMIC STRUCTURE
-- =============================================================================

CREATE TABLE IF NOT EXISTS exams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    subjects TEXT[] NOT NULL,
    total_marks INTEGER,
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    faculty_id UUID,
    description TEXT,
    color TEXT,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, code)
);

CREATE TABLE IF NOT EXISTS chapters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    estimated_hours DECIMAL(5,2),
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, code)
);

CREATE TABLE IF NOT EXISTS topics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    estimated_minutes INTEGER,
    weightage_percent DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chapter_id, code)
);

-- =============================================================================
-- 5. FACULTY SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS faculties (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    teaching_style TEXT,
    qualifications TEXT[],
    experience_years INTEGER,
    color_theme TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default faculties
INSERT INTO faculties (name, code, subject, color_theme, bio, teaching_style, experience_years) VALUES
('Dharmendra Sir', 'dharmendra', 'Physics', '#3b82f6', 'Expert Physics educator with 15+ years of JEE coaching experience', 'Conceptual with real-world examples', 15),
('Harendra Sir', 'harendra', 'Chemistry', '#10b981', 'Chemistry specialist focusing on organic and inorganic mastery', 'Visual learning with molecular models', 12),
('Ravindra Sir', 'ravindra', 'Mathematics', '#f59e0b', 'Mathematics genius making complex problems simple', 'Step-by-step problem solving approach', 18),
('Arvind Sir', 'arvind', 'Biology', '#ef4444', 'Biology expert for NEET preparation', 'Diagram-based visual teaching', 14)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 6. LECTURE SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS lectures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    faculty_id UUID REFERENCES faculties(id),
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    video_duration INTEGER,
    thumbnail_url TEXT,
    lecture_notes TEXT,
    attachments JSONB DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lecture_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    last_position INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    watch_count INTEGER DEFAULT 0,
    first_started_at TIMESTAMPTZ DEFAULT NOW(),
    last_watched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lecture_id)
);

CREATE TABLE IF NOT EXISTS lecture_bookmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
    position INTEGER,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lecture_id, position)
);

-- =============================================================================
-- 7. QUESTION BANK SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    question_type TEXT NOT NULL CHECK (question_type IN ('MCQ', 'NUMERICAL', 'ASSERTION_REASON')),
    question_text TEXT NOT NULL,
    question_image_url TEXT,
    solution_text TEXT NOT NULL,
    solution_video_url TEXT,
    solution_image_url TEXT,
    correct_answer TEXT NOT NULL,
    marks INTEGER DEFAULT 4,
    negative_marks DECIMAL(3,1) DEFAULT 1.0,
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    estimated_time_minutes INTEGER DEFAULT 2,
    average_solve_time DECIMAL(5,2),
    success_rate DECIMAL(5,2),
    attempt_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    hint TEXT,
    is_published BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_image_url TEXT,
    option_label TEXT NOT NULL,
    display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS question_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 8. QUESTION ATTEMPTS (Required for topic mastery)
-- =============================================================================

CREATE TABLE IF NOT EXISTS question_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    attempt_type TEXT CHECK (attempt_type IN ('practice', 'dpp', 'test', 'challenge')),
    attempt_id UUID,
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    marks_obtained DECIMAL(5,2),
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, question_id, attempt_type, attempt_id)
);

-- =============================================================================
-- 9. DAILY PRACTICE PROBLEM (DPP) SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS dpp_sets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    exam_id UUID REFERENCES exams(id),
    subject_id UUID REFERENCES subjects(id),
    topic_ids UUID[] DEFAULT '{}',
    difficulty_mix TEXT CHECK (difficulty_mix IN ('easy', 'medium', 'hard', 'mixed')),
    total_questions INTEGER DEFAULT 15,
    time_limit_minutes INTEGER DEFAULT 30,
    scheduled_date DATE,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dpp_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dpp_set_id UUID REFERENCES dpp_sets(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    UNIQUE(dpp_set_id, question_id)
);

CREATE TABLE IF NOT EXISTS dpp_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    dpp_set_id UUID REFERENCES dpp_sets(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    time_taken_seconds INTEGER,
    total_score INTEGER,
    max_score INTEGER,
    accuracy_percent DECIMAL(5,2),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    answers JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    UNIQUE(user_id, dpp_set_id)
);

-- =============================================================================
-- 10. MOCK TEST ENGINE
-- =============================================================================

CREATE TABLE IF NOT EXISTS tests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES exams(id),
    title TEXT NOT NULL,
    description TEXT,
    test_type TEXT CHECK (test_type IN ('full_mock', 'subject_test', 'chapter_test', 'custom')),
    duration_minutes INTEGER NOT NULL,
    total_marks INTEGER NOT NULL,
    negative_marking DECIMAL(3,2) DEFAULT 0.25,
    passing_percent DECIMAL(5,2) DEFAULT 35.0,
    question_count INTEGER NOT NULL,
    is_published BOOLEAN DEFAULT false,
    scheduled_at TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    allow_multiple_attempts BOOLEAN DEFAULT false,
    show_result_immediately BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    marks INTEGER DEFAULT 4,
    negative_marks DECIMAL(3,2) DEFAULT 1.0,
    display_order INTEGER DEFAULT 0,
    section TEXT,
    UNIQUE(test_id, question_id)
);

CREATE TABLE IF NOT EXISTS test_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    attempt_number INTEGER DEFAULT 1,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    time_taken_seconds INTEGER,
    total_score INTEGER,
    max_score INTEGER,
    accuracy_percent DECIMAL(5,2),
    correct_count INTEGER,
    incorrect_count INTEGER,
    unattempted_count INTEGER,
    percentile DECIMAL(5,2),
    rank INTEGER,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'time_up')),
    answers JSONB DEFAULT '{}',
    section_scores JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, test_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS test_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    attempt_id UUID REFERENCES test_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    user_answer TEXT,
    correct_answer TEXT,
    is_correct BOOLEAN,
    marks_obtained DECIMAL(5,2),
    time_taken_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_registrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'completed', 'absent')),
    UNIQUE(user_id, test_id)
);

-- =============================================================================
-- 11. BI-WEEKLY TESTS
-- =============================================================================

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

CREATE TABLE IF NOT EXISTS biweekly_registrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    biweekly_test_id UUID REFERENCES biweekly_tests(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'completed', 'absent')),
    UNIQUE(user_id, biweekly_test_id)
);

-- =============================================================================
-- 12. ANALYTICS & PROGRESS
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    total_questions_attempted INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    incorrect_answers INTEGER DEFAULT 0,
    accuracy_percent DECIMAL(5,2) DEFAULT 0.0,
    average_time_per_question DECIMAL(5,2),
    total_study_minutes INTEGER DEFAULT 0,
    tests_taken INTEGER DEFAULT 0,
    average_test_score DECIMAL(5,2),
    best_rank INTEGER,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, subject_id)
);

CREATE TABLE IF NOT EXISTS topic_mastery (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    mastery_level DECIMAL(5,2) DEFAULT 0.0,
    questions_attempted INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    accuracy_percent DECIMAL(5,2) DEFAULT 0.0,
    last_practiced_at TIMESTAMPTZ,
    strength_status TEXT CHECK (strength_status IN ('weak', 'average', 'strong', 'mastered')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- =============================================================================
-- 13. RANK PREDICTION SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS rank_predictions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id),
    prediction_date DATE DEFAULT CURRENT_DATE,
    predicted_rank INTEGER,
    predicted_percentile DECIMAL(5,2),
    confidence_score DECIMAL(5,2),
    exam_readiness_percent DECIMAL(5,2),
    test_scores_avg DECIMAL(5,2),
    accuracy_avg DECIMAL(5,2),
    solve_time_avg DECIMAL(5,2),
    model_version TEXT,
    factors JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 14. SMART REVISION ENGINE
-- =============================================================================

CREATE TABLE IF NOT EXISTS mistake_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    attempt_id UUID,
    mistake_type TEXT CHECK (mistake_type IN ('conceptual', 'calculation', 'misread', 'time_pressure', 'guess')),
    user_answer TEXT,
    correct_answer TEXT,
    topic_id UUID REFERENCES topics(id),
    difficulty_level TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    is_reviewed BOOLEAN DEFAULT false,
    reviewed_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS revision_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    task_type TEXT CHECK (task_type IN ('lecture_review', 'practice_questions', 'mock_test', 'revision_set')),
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
    scheduled_for DATE,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    related_mistake_ids UUID[] DEFAULT '{}',
    recommended_questions UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 15. DAILY NATIONAL CHALLENGE SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_challenges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    exam_id UUID REFERENCES exams(id),
    question_id UUID REFERENCES questions(id),
    challenge_date DATE UNIQUE NOT NULL,
    title TEXT,
    description TEXT,
    difficulty_level TEXT,
    total_participants INTEGER DEFAULT 0,
    correct_participants INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    closes_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS challenge_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES daily_challenges(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    is_correct BOOLEAN,
    time_taken_seconds INTEGER,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    rank_for_day INTEGER,
    UNIQUE(user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('daily', 'weekly', 'monthly', 'all_time')),
    exam_id UUID REFERENCES exams(id),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    average_time DECIMAL(5,2),
    rank INTEGER,
    period_start DATE,
    period_end DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(leaderboard_type, exam_id, user_id, period_start)
);

-- =============================================================================
-- 16. GAMIFICATION SYSTEM
-- =============================================================================

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

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS study_streaks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    study_minutes INTEGER DEFAULT 0,
    activities_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, streak_date)
);

CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    weekly_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 17. NOTIFICATION SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT CHECK (notification_type IN ('dpp_ready', 'revision_reminder', 'test_reminder', 'achievement', 'challenge', 'system')),
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    sent_via TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    dpp_reminders BOOLEAN DEFAULT true,
    revision_reminders BOOLEAN DEFAULT true,
    test_reminders BOOLEAN DEFAULT true,
    challenge_reminders BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =============================================================================
-- 18. PAYMENTS & DONATIONS (RAZORPAY ONLY)
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

-- =============================================================================
-- 19. POPUP ADS SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS popup_ads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'promo', 'notice', 'alert')),
    link_url TEXT,
    link_text TEXT,
    image_url TEXT,
    target_role TEXT DEFAULT 'all' CHECK (target_role IN ('all', 'student', 'admin', 'guest')),
    show_on_pages TEXT[] DEFAULT '{}',
    show_after_seconds INTEGER DEFAULT 0,
    dismissible BOOLEAN DEFAULT true,
    show_again_after_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    priority INTEGER DEFAULT 0,
    max_impressions INTEGER,
    current_impressions INTEGER DEFAULT 0,
    target_audience JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_clicks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ad_id UUID REFERENCES popup_ads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    clicked_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET
);

-- =============================================================================
-- 20. CAREER PORTAL - JOB LISTINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_listings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT,
    location TEXT,
    employment_type TEXT CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship')),
    description TEXT NOT NULL,
    requirements TEXT[],
    responsibilities TEXT[],
    qualifications TEXT[],
    salary_range TEXT,
    experience_required TEXT,
    application_deadline DATE,
    is_remote BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES job_listings(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    linkedin TEXT,
    portfolio TEXT,
    current_company TEXT,
    years_of_experience TEXT,
    current_ctc TEXT,
    expected_ctc TEXT,
    notice_period TEXT,
    cover_letter TEXT,
    referrer TEXT,
    resume_url TEXT NOT NULL,
    resume_file_name TEXT NOT NULL,
    resume_file_size INTEGER NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'shortlisted', 'rejected', 'hired')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 21. COURSES SYSTEM
-- =============================================================================

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

-- =============================================================================
-- 22. SYSTEM OPERATIONS
-- =============================================================================

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

-- =============================================================================
-- 23. SYSTEM HEALTH & MONITORING
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_health (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    check_name TEXT NOT NULL,
    status TEXT CHECK (status IN ('healthy', 'degraded', 'critical')),
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    details JSONB DEFAULT '{}',
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS error_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    error_type TEXT NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    user_id UUID REFERENCES profiles(id),
    request_path TEXT,
    request_method TEXT,
    user_agent TEXT,
    ip_address INET,
    metadata JSONB DEFAULT '{}',
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 24. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpp_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpp_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpp_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE biweekly_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE biweekly_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistake_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 25. RLS POLICIES
-- =============================================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Lectures policies
CREATE POLICY "Lectures are viewable by authenticated users" ON lectures FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "Admins can manage lectures" ON lectures FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager')));

-- Questions policies
CREATE POLICY "Questions are viewable by authenticated users" ON questions FOR SELECT TO authenticated USING (is_published = true);

-- Progress policies
CREATE POLICY "Users can view own progress" ON lecture_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON lecture_progress FOR ALL USING (auth.uid() = user_id);

-- Donations policies
CREATE POLICY "Users can view own donations" ON donations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all donations" ON donations FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Service role can insert donations" ON donations FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update donations" ON donations FOR UPDATE USING (true);

-- Popup ads policies
CREATE POLICY "Anyone can view active popup ads" ON popup_ads FOR SELECT USING (is_active = true AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()));
CREATE POLICY "Admins can manage popup ads" ON popup_ads FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Job listings policies
CREATE POLICY "Anyone can view active jobs" ON job_listings FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage jobs" ON job_listings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Job applications policies
CREATE POLICY "Anyone can submit applications" ON job_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage applications" ON job_applications FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Bi-weekly tests policies
CREATE POLICY "Authenticated users can view biweekly tests" ON biweekly_tests FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage biweekly tests" ON biweekly_tests FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager')));

-- Bi-weekly registrations policies
CREATE POLICY "Users can manage own registrations" ON biweekly_registrations FOR ALL USING (auth.uid() = user_id);

-- Activity logs policies
CREATE POLICY "Users can view own activity" ON activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all activity" ON activity_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- User stats policies
CREATE POLICY "Users can view own stats" ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all stats" ON user_stats FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Course progress policies
CREATE POLICY "Users can manage own course progress" ON course_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all course progress" ON course_progress FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Courses policies
CREATE POLICY "Anyone can view published courses" ON courses FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage courses" ON courses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager')));

-- Question attempts policies
CREATE POLICY "Users can view own question attempts" ON question_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own question attempts" ON question_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User achievements policies
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Study streaks policies
CREATE POLICY "Users can view own streaks" ON study_streaks FOR SELECT USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Mistake logs policies
CREATE POLICY "Users can view own mistakes" ON mistake_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mistakes" ON mistake_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Revision tasks policies
CREATE POLICY "Users can manage own revision tasks" ON revision_tasks FOR ALL USING (auth.uid() = user_id);

-- Challenge attempts policies
CREATE POLICY "Users can view own challenge attempts" ON challenge_attempts FOR SELECT USING (auth.uid() = user_id);

-- Test attempts policies
CREATE POLICY "Users can view own test attempts" ON test_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert test attempts" ON test_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- DPP attempts policies
CREATE POLICY "Users can view own dpp attempts" ON dpp_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert dpp attempts" ON dpp_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Leaderboards policies
CREATE POLICY "Anyone can view leaderboards" ON leaderboards FOR SELECT USING (true);

-- =============================================================================
-- 26. UTILITY FUNCTIONS
-- =============================================================================

-- Update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at on all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lectures_updated_at BEFORE UPDATE ON lectures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dpp_attempts_updated_at BEFORE UPDATE ON dpp_attempts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_attempts_updated_at BEFORE UPDATE ON test_attempts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biweekly_tests_updated_at BEFORE UPDATE ON biweekly_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_progress_updated_at BEFORE UPDATE ON course_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_popup_ads_updated_at BEFORE UPDATE ON popup_ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_listings_updated_at BEFORE UPDATE ON job_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate accuracy
CREATE OR REPLACE FUNCTION calculate_accuracy(correct INTEGER, total INTEGER)
RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF total = 0 THEN
        RETURN 0.0;
    END IF;
    RETURN ROUND((correct::DECIMAL / total::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to increment job application count
CREATE OR REPLACE FUNCTION increment_job_application_count(job_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE job_listings
    SET application_count = application_count + 1
    WHERE id = job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 27. INDEXES FOR PERFORMANCE
-- =============================================================================

-- User and auth indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(is_active, last_active_at);

-- Academic structure indexes
CREATE INDEX idx_lectures_topic ON lectures(topic_id);
CREATE INDEX idx_lectures_faculty ON lectures(faculty_id);
CREATE INDEX idx_lectures_published ON lectures(is_published, published_at);
CREATE INDEX idx_lecture_progress_user ON lecture_progress(user_id);
CREATE INDEX idx_lecture_progress_lecture ON lecture_progress(lecture_id);
CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX idx_question_attempts_user ON question_attempts(user_id);
CREATE INDEX idx_question_attempts_question ON question_attempts(question_id);
CREATE INDEX idx_question_attempts_user_question ON question_attempts(user_id, question_id);

-- Test indexes
CREATE INDEX idx_tests_exam ON tests(exam_id);
CREATE INDEX idx_tests_published ON tests(is_published);
CREATE INDEX idx_test_attempts_user ON test_attempts(user_id);
CREATE INDEX idx_test_attempts_test ON test_attempts(test_id);
CREATE INDEX idx_test_attempts_status ON test_attempts(status);
CREATE INDEX idx_test_questions_test ON test_questions(test_id);
CREATE INDEX idx_test_registrations_test ON test_registrations(test_id);
CREATE INDEX idx_test_registrations_user ON test_registrations(user_id);

-- Bi-weekly test indexes
CREATE INDEX idx_biweekly_tests_date ON biweekly_tests(test_date);
CREATE INDEX idx_biweekly_tests_active ON biweekly_tests(is_active);
CREATE INDEX idx_biweekly_registrations_user ON biweekly_registrations(user_id);
CREATE INDEX idx_biweekly_registrations_test ON biweekly_registrations(biweekly_test_id);

-- Progress indexes
CREATE INDEX idx_student_progress_user ON student_progress(user_id);
CREATE INDEX idx_topic_mastery_user ON topic_mastery(user_id);
CREATE INDEX idx_topic_mastery_topic ON topic_mastery(topic_id);

-- DPP indexes
CREATE INDEX idx_dpp_sets_date ON dpp_sets(scheduled_date);
CREATE INDEX idx_dpp_attempts_user ON dpp_attempts(user_id);
CREATE INDEX idx_dpp_attempts_status ON dpp_attempts(status);

-- Challenge indexes
CREATE INDEX idx_daily_challenges_date ON daily_challenges(challenge_date);
CREATE INDEX idx_daily_challenges_exam ON daily_challenges(challenge_date, exam_id);
CREATE INDEX idx_challenge_attempts_challenge ON challenge_attempts(challenge_id);
CREATE INDEX idx_challenge_attempts_user ON challenge_attempts(user_id);

-- Leaderboard indexes
CREATE INDEX idx_leaderboards_type ON leaderboards(leaderboard_type, period_start);
CREATE INDEX idx_leaderboards_rank ON leaderboards(leaderboard_type, rank);
CREATE INDEX idx_leaderboard_snapshots_type_date ON leaderboard_snapshots(leaderboard_type, snapshot_date);

-- Gamification indexes
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_study_streaks_user ON study_streaks(user_id);
CREATE INDEX idx_study_streaks_date ON study_streaks(streak_date);
CREATE INDEX idx_user_points_user ON user_points(user_id);

-- Notification indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- Lead indexes
CREATE INDEX idx_lead_forms_status ON lead_forms(status);
CREATE INDEX idx_lead_forms_created ON lead_forms(created_at);

-- Error and system indexes
CREATE INDEX idx_error_logs_type ON error_logs(error_type, occurred_at);
CREATE INDEX idx_system_health_check ON system_health(check_name);
CREATE INDEX idx_cron_logs_job ON cron_logs(job_name, started_at);

-- Popup ads indexes
CREATE INDEX idx_popup_ads_active ON popup_ads(is_active, start_date, end_date);

-- Job listings indexes
CREATE INDEX idx_job_listings_active ON job_listings(is_active);
CREATE INDEX idx_job_listings_department ON job_listings(department);
CREATE INDEX idx_job_applications_job ON job_applications(job_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);

-- Activity logs indexes
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);

-- Email queue indexes
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_send_at ON email_queue(send_at);

-- Donation indexes
CREATE INDEX idx_donations_user ON donations(user_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_order_id ON donations(order_id);
CREATE INDEX idx_donations_created_at ON donations(created_at);

-- =============================================================================
-- 28. SAMPLE DATA
-- =============================================================================

-- Sample popup ads
INSERT INTO popup_ads (title, content, type, target_role, is_active, dismissible)
SELECT 'Welcome to SaviEduTech', 'Start your JEE/NEET preparation journey with expert faculty!', 'info', 'all', true, true
WHERE NOT EXISTS (SELECT 1 FROM popup_ads LIMIT 1);

-- Sample courses
INSERT INTO courses (title, description, is_free, is_published)
SELECT 'JEE Complete Preparation Course', 'Comprehensive JEE preparation with all subjects', true, true
WHERE NOT EXISTS (SELECT 1 FROM courses LIMIT 1);

INSERT INTO courses (title, description, is_free, is_published)
SELECT 'NEET Complete Preparation Course', 'Comprehensive NEET preparation with all subjects', true, true
WHERE NOT EXISTS (SELECT 1 FROM courses LIMIT 2);

-- Sample job listings
INSERT INTO job_listings (title, department, location, employment_type, description, is_active)
SELECT 'Physics Faculty', 'Academic', 'Delhi', 'full-time', 'Join our team of expert physics educators', true
WHERE NOT EXISTS (SELECT 1 FROM job_listings LIMIT 1);

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT 'Migration completed successfully!' AS status;

-- List all created tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
