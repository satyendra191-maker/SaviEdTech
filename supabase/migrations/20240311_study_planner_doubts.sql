-- =============================================================================
-- SAVIEDUTECH MISSING MODULES DATABASE SCHEMA
-- =============================================================================
-- Study Planner and Doubt System tables
-- Run this in Supabase SQL Editor
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. STUDY PLANNER TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS study_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_exam TEXT CHECK (target_exam IN ('JEE', 'NEET', 'Both')),
    difficulty_level TEXT DEFAULT 'intermediate',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_schedule_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    date DATE,
    subject TEXT NOT NULL,
    topic TEXT,
    chapter TEXT,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('lecture', 'practice', 'revision', 'test', 'break')),
    duration_minutes INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'in_progress')),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    schedule_item_id UUID REFERENCES study_schedule_items(id) ON DELETE CASCADE,
    reminder_time TIME NOT NULL,
    reminder_type TEXT CHECK (reminder_type IN ('notification', 'email', 'sms')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. DOUBT SYSTEM TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS doubt_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    parent_id UUID REFERENCES doubt_categories(id),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doubt_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES doubt_categories(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    chapter TEXT,
    topic TEXT,
    title TEXT NOT NULL,
    question TEXT NOT NULL,
    image_url TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'answered', 'resolved', 'closed', 'escalated')),
    views INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doubt_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES doubt_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    faculty_id TEXT,
    answer TEXT NOT NULL,
    is_best_answer BOOLEAN DEFAULT false,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_faculty_answer BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doubt_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES doubt_posts(id) ON DELETE CASCADE,
    answer_id UUID REFERENCES doubt_answers(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_id),
    UNIQUE(user_id, answer_id)
);

CREATE TABLE IF NOT EXISTS doubt_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES doubt_posts(id) ON DELETE CASCADE,
    answer_id UUID REFERENCES doubt_answers(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES doubt_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. FACULTY DOUBT ASSIGNMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS faculty_doubt_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    faculty_id TEXT NOT NULL,
    doubt_post_id UUID REFERENCES doubt_posts(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'answered', 'reassigned'))
);

-- =============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_study_plans_user ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_schedule_items_plan ON study_schedule_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_study_schedule_items_date ON study_schedule_items(date);
CREATE INDEX IF NOT EXISTS idx_doubt_posts_user ON doubt_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_doubt_posts_category ON doubt_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_doubt_posts_status ON doubt_posts(status);
CREATE INDEX IF NOT EXISTS idx_doubt_answers_post ON doubt_answers(post_id);
CREATE INDEX IF NOT EXISTS idx_faculty_assignments_faculty ON faculty_doubt_assignments(faculty_id);

-- =============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubt_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_doubt_assignments ENABLE ROW LEVEL SECURITY;

-- Study Plans RLS
CREATE POLICY "Users can view own study plans" ON study_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study plans" ON study_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study plans" ON study_plans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study plans" ON study_plans FOR DELETE
    USING (auth.uid() = user_id);

-- Study Schedule Items RLS
CREATE POLICY "Users can view own schedule items" ON study_schedule_items FOR SELECT
    USING (plan_id IN (SELECT id FROM study_plans WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own schedule items" ON study_schedule_items FOR ALL
    USING (plan_id IN (SELECT id FROM study_plans WHERE user_id = auth.uid()));

-- Doubt Posts RLS
CREATE POLICY "Anyone can view doubt posts" ON doubt_posts FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create doubt posts" ON doubt_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own doubt posts" ON doubt_posts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own doubt posts" ON doubt_posts FOR DELETE
    USING (auth.uid() = user_id);

-- Doubt Answers RLS
CREATE POLICY "Anyone can view doubt answers" ON doubt_answers FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create answers" ON doubt_answers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers" ON doubt_answers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own answers" ON doubt_answers FOR DELETE
    USING (auth.uid() = user_id);

-- Doubt Categories - Public Read
CREATE POLICY "Anyone can view categories" ON doubt_categories FOR SELECT
    USING (is_active = true);

-- Doubt Comments RLS
CREATE POLICY "Anyone can view comments" ON doubt_comments FOR SELECT
    USING (true);

CREATE POLICY "Users can create comments" ON doubt_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON doubt_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON doubt_comments FOR DELETE
    USING (auth.uid() = user_id);

-- Faculty Assignments - Admin only
CREATE POLICY "Admins can manage faculty assignments" ON faculty_doubt_assignments FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'content_manager'))
    );

-- Study Reminders RLS
CREATE POLICY "Users can manage own reminders" ON study_reminders FOR ALL
    USING (auth.uid() = user_id);

-- Doubt Votes RLS
CREATE POLICY "Users can manage own votes" ON doubt_votes FOR ALL
    USING (auth.uid() = user_id);

-- =============================================================================
-- 6. DEFAULT DOUBT CATEGORIES
-- =============================================================================

INSERT INTO doubt_categories (name, slug, description, icon, display_order) VALUES
    ('Physics', 'physics', 'Physics doubts and questions', 'atom', 1),
    ('Chemistry', 'chemistry', 'Chemistry doubts and questions', 'flask', 2),
    ('Mathematics', 'mathematics', 'Mathematics doubts and questions', 'calculator', 3),
    ('Biology', 'biology', 'Biology doubts and questions', 'dna', 4),
    ('General', 'general', 'General exam-related doubts', 'help-circle', 5)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
