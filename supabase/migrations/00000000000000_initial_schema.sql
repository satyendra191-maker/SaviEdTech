-- SaviEduTech Platform - Initial Database Schema
-- This schema supports the complete digital learning ecosystem

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- ============================================
-- USER MANAGEMENT & PROFILES
-- ============================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
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

-- Student profiles with additional details
CREATE TABLE student_profiles (
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

-- User sessions tracking
CREATE TABLE user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- LEAD GENERATION SYSTEM
-- ============================================

CREATE TABLE lead_forms (
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

-- Lead activities tracking
CREATE TABLE lead_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES lead_forms(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT,
    performed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACADEMIC STRUCTURE
-- ============================================

-- Exams (JEE, NEET, etc.)
CREATE TABLE exams (
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

-- Subjects
CREATE TABLE subjects (
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

-- Chapters
CREATE TABLE chapters (
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

-- Topics
CREATE TABLE topics (
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

-- ============================================
-- FACULTY SYSTEM
-- ============================================

CREATE TABLE faculties (
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
('Arvind Sir', 'arvind', 'Biology', '#ef4444', 'Biology expert for NEET preparation', 'Diagram-based visual teaching', 14);

-- ============================================
-- LECTURE SYSTEM
-- ============================================

CREATE TABLE lectures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    faculty_id UUID REFERENCES faculties(id),
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    video_duration INTEGER, -- in seconds
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

-- Lecture progress tracking
CREATE TABLE lecture_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    last_position INTEGER DEFAULT 0, -- last watched position in seconds
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    watch_count INTEGER DEFAULT 0,
    first_started_at TIMESTAMPTZ DEFAULT NOW(),
    last_watched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lecture_id)
);

-- Lecture bookmarks
CREATE TABLE lecture_bookmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
    position INTEGER,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lecture_id, position)
);

-- ============================================
-- QUESTION BANK SYSTEM
-- ============================================

CREATE TABLE questions (
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

-- Question options for MCQ
CREATE TABLE question_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_image_url TEXT,
    option_label TEXT NOT NULL, -- A, B, C, D
    display_order INTEGER DEFAULT 0
);

-- Question tags
CREATE TABLE question_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAILY PRACTICE PROBLEM (DPP) SYSTEM
-- ============================================

CREATE TABLE dpp_sets (
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

-- DPP questions mapping
CREATE TABLE dpp_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dpp_set_id UUID REFERENCES dpp_sets(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    UNIQUE(dpp_set_id, question_id)
);

-- DPP attempts by students
CREATE TABLE dpp_attempts (
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
    UNIQUE(user_id, dpp_set_id)
);

-- ============================================
-- MOCK TEST ENGINE
-- ============================================

CREATE TABLE tests (
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

-- Test questions mapping
CREATE TABLE test_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    marks INTEGER DEFAULT 4,
    negative_marks DECIMAL(3,2) DEFAULT 1.0,
    display_order INTEGER DEFAULT 0,
    section TEXT, -- Physics, Chemistry, etc.
    UNIQUE(test_id, question_id)
);

-- Test attempts
CREATE TABLE test_attempts (
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, test_id, attempt_number)
);

-- Test rankings
CREATE TABLE test_rankings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    accuracy_percent DECIMAL(5,2),
    time_taken_seconds INTEGER,
    rank INTEGER NOT NULL,
    percentile DECIMAL(5,2),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(test_id, user_id)
);

-- ============================================
-- ANALYTICS & PROGRESS
-- ============================================

CREATE TABLE student_progress (
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

-- Topic mastery tracking
CREATE TABLE topic_mastery (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    mastery_level DECIMAL(5,2) DEFAULT 0.0, -- 0-100
    questions_attempted INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    accuracy_percent DECIMAL(5,2) DEFAULT 0.0,
    last_practiced_at TIMESTAMPTZ,
    strength_status TEXT CHECK (strength_status IN ('weak', 'average', 'strong', 'mastered')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- ============================================
-- RANK PREDICTION SYSTEM
-- ============================================

CREATE TABLE rank_predictions (
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

-- ============================================
-- SMART REVISION ENGINE
-- ============================================

CREATE TABLE mistake_logs (
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

CREATE TABLE revision_tasks (
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

-- ============================================
-- DAILY NATIONAL CHALLENGE SYSTEM
-- ============================================

CREATE TABLE daily_challenges (
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
    closes_at TIMESTAMPTZ
);

CREATE TABLE challenge_attempts (
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

CREATE TABLE leaderboards (
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

-- ============================================
-- GAMIFICATION SYSTEM
-- ============================================

CREATE TABLE achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    badge_color TEXT,
    criteria_type TEXT NOT NULL,
    criteria_value INTEGER NOT NULL,
    points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

CREATE TABLE study_streaks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    study_minutes INTEGER DEFAULT 0,
    activities_count INTEGER DEFAULT 0,
    UNIQUE(user_id, streak_date)
);

CREATE TABLE user_points (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    weekly_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATION SYSTEM
-- ============================================

CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT CHECK (notification_type IN ('dpp_ready', 'revision_reminder', 'test_reminder', 'achievement', 'challenge', 'system')),
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    sent_via TEXT[] DEFAULT '{}', -- in_app, email, push
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_preferences (
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

-- ============================================
-- POPUP ADVERTISEMENT SYSTEM
-- ============================================

CREATE TABLE popup_ads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    button_text TEXT,
    button_url TEXT,
    display_duration_seconds INTEGER DEFAULT 10,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    priority INTEGER DEFAULT 0,
    max_impressions INTEGER,
    current_impressions INTEGER DEFAULT 0,
    target_audience JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ad_clicks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ad_id UUID REFERENCES popup_ads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    clicked_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET
);

-- ============================================
-- SYSTEM HEALTH & MONITORING
-- ============================================

CREATE TABLE system_health (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    check_name TEXT NOT NULL,
    status TEXT CHECK (status IN ('healthy', 'degraded', 'critical')),
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    details JSONB DEFAULT '{}',
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE error_logs (
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

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpp_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistake_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- Lectures policies (readable by all authenticated users)
CREATE POLICY "Lectures are viewable by authenticated users"
    ON lectures FOR SELECT
    TO authenticated
    USING (is_published = true);

CREATE POLICY "Admins can manage lectures"
    ON lectures FOR ALL
    USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'content_manager')
    ));

-- Questions policies
CREATE POLICY "Questions are viewable by authenticated users"
    ON questions FOR SELECT
    TO authenticated
    USING (is_published = true);

-- Progress policies (users can only see their own)
CREATE POLICY "Users can view own progress"
    ON lecture_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON lecture_progress FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lectures_updated_at BEFORE UPDATE ON lectures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
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

-- Function to update topic mastery after attempt
CREATE OR REPLACE FUNCTION update_topic_mastery()
RETURNS TRIGGER AS $$
DECLARE
    v_topic_id UUID;
    v_total_attempts INTEGER;
    v_correct INTEGER;
    v_accuracy DECIMAL(5,2);
BEGIN
    -- Get topic_id from question
    SELECT topic_id INTO v_topic_id FROM questions WHERE id = NEW.question_id;
    
    -- Calculate totals
    SELECT 
        COUNT(*),
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)
    INTO v_total_attempts, v_correct
    FROM question_attempts
    WHERE user_id = NEW.user_id AND question_id IN (
        SELECT id FROM questions WHERE topic_id = v_topic_id
    );
    
    v_accuracy := calculate_accuracy(v_correct, v_total_attempts);
    
    -- Upsert topic mastery
    INSERT INTO topic_mastery (user_id, topic_id, questions_attempted, correct_answers, accuracy_percent, last_practiced_at)
    VALUES (NEW.user_id, v_topic_id, v_total_attempts, v_correct, v_accuracy, NOW())
    ON CONFLICT (user_id, topic_id)
    DO UPDATE SET
        questions_attempted = v_total_attempts,
        correct_answers = v_correct,
        accuracy_percent = v_accuracy,
        last_practiced_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- QUESTION ATTEMPTS TABLE (Missing - Required for triggers)
-- ============================================

CREATE TABLE question_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    attempt_type TEXT CHECK (attempt_type IN ('practice', 'dpp', 'test', 'challenge')),
    attempt_id UUID, -- Reference to dpp_attempts, test_attempts, or challenge_attempts
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    marks_obtained DECIMAL(5,2),
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, question_id, attempt_type, attempt_id)
);

-- Enable RLS on question_attempts
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for question_attempts
CREATE POLICY "Users can view own question attempts"
    ON question_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own question attempts"
    ON question_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_question_attempts_user ON question_attempts(user_id);
CREATE INDEX idx_question_attempts_question ON question_attempts(question_id);
CREATE INDEX idx_question_attempts_user_question ON question_attempts(user_id, question_id);
CREATE INDEX idx_lectures_topic ON lectures(topic_id);
CREATE INDEX idx_lectures_faculty ON lectures(faculty_id);
CREATE INDEX idx_lectures_published ON lectures(is_published, published_at);
CREATE INDEX idx_lecture_progress_user ON lecture_progress(user_id);
CREATE INDEX idx_lecture_progress_lecture ON lecture_progress(lecture_id);
CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level);
CREATE INDEX idx_dpp_attempts_user ON dpp_attempts(user_id);
CREATE INDEX idx_test_attempts_user ON test_attempts(user_id);
CREATE INDEX idx_student_progress_user ON student_progress(user_id);
CREATE INDEX idx_topic_mastery_user ON topic_mastery(user_id);
CREATE INDEX idx_mistake_logs_user ON mistake_logs(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_daily_challenges_date ON daily_challenges(challenge_date);
CREATE INDEX idx_lead_forms_status ON lead_forms(status);
CREATE INDEX idx_leaderboards_type ON leaderboards(leaderboard_type, period_start);
CREATE INDEX idx_leaderboards_rank ON leaderboards(leaderboard_type, rank);
CREATE INDEX idx_test_attempts_test ON test_attempts(test_id);
CREATE INDEX idx_test_attempts_status ON test_attempts(status);
CREATE INDEX idx_dpp_attempts_status ON dpp_attempts(status);
CREATE INDEX idx_challenges_date_exam ON daily_challenges(challenge_date, exam_id);
CREATE INDEX idx_challenge_attempts_challenge ON challenge_attempts(challenge_id);
CREATE INDEX idx_mistake_logs_topic ON mistake_logs(topic_id);
CREATE INDEX idx_mistake_logs_reviewed ON mistake_logs(user_id, is_reviewed);
CREATE INDEX idx_revision_tasks_scheduled ON revision_tasks(user_id, scheduled_for, status);
CREATE INDEX idx_popup_ads_active ON popup_ads(is_active, start_date, end_date);
CREATE INDEX idx_error_logs_type ON error_logs(error_type, occurred_at);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_active ON profiles(is_active, last_active_at);
CREATE INDEX idx_lead_forms_created ON lead_forms(created_at);

-- Materialized view for analytics
CREATE MATERIALIZED VIEW analytics_summary AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(DISTINCT id) as new_users,
    COUNT(DISTINCT CASE WHEN last_active_at >= DATE_TRUNC('day', created_at) THEN id END) as active_users
FROM profiles
GROUP BY DATE_TRUNC('day', created_at);

CREATE INDEX idx_analytics_summary_date ON analytics_summary(date);