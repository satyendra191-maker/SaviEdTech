BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- SAVIEDTECH PRODUCTION-GRADE DATABASE SCHEMA
-- Supports 100M+ users with RLS and Realtime
-- =============================================================================

-- =============================================================================
-- GLOBAL SETTINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    native_name TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO languages (code, name, native_name, is_default) VALUES
    ('en', 'English', 'English', TRUE),
    ('hi', 'Hindi', 'हिन्दी', FALSE),
    ('bn', 'Bengali', 'বাংলা', FALSE),
    ('ta', 'Tamil', 'தமிழ்', FALSE),
    ('te', 'Telugu', 'తెలుగు', FALSE),
    ('mr', 'Marathi', 'मराठी', FALSE),
    ('gu', 'Gujarati', 'ગુજરાતી', FALSE),
    ('kn', 'Kannada', 'ಕನ್ನಡ', FALSE),
    ('ml', 'Malayalam', 'മലയാളം', FALSE),
    ('pa', 'Punjabi', 'ਪੰਜਾਬੀ', FALSE)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    language_code TEXT NOT NULL REFERENCES languages(code),
    translation_key TEXT NOT NULL,
    translation_value TEXT NOT NULL,
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(language_code, translation_key)
);

-- =============================================================================
-- NOTIFICATION SYSTEM
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'general'
        CHECK (notification_type IN ('general', 'assignment', 'payment', 'donation', 'live_class', 'announcement', 'system', 'reminder', 'achievement', 'message')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ANNOUNCEMENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    announcement_type TEXT NOT NULL DEFAULT 'general'
        CHECK (announcement_type IN ('general', 'academic', 'event', 'system', 'marketing', 'urgent')),
    audience TEXT NOT NULL DEFAULT 'all'
        CHECK (audience IN ('all', 'students', 'parents', 'faculty', 'staff', 'admin')),
    target_roles TEXT[] DEFAULT ARRAY['student']::TEXT[],
    target_classes TEXT[],
    is_published BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- HR MANAGEMENT
-- =============================================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    employee_code TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    designation TEXT NOT NULL,
    joining_date DATE NOT NULL,
    employment_type TEXT NOT NULL DEFAULT 'full_time'
        CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern', 'freelance')),
    employment_status TEXT NOT NULL DEFAULT 'active'
        CHECK (employment_status IN ('active', 'inactive', 'on_leave', 'terminated', 'resigned')),
    reporting_to UUID REFERENCES employees(id),
    salary DECIMAL(12,2),
    bank_name TEXT,
    bank_account TEXT,
    aadhaar_number TEXT,
    pan_number TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PAYROLL SYSTEM
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payroll_month INTEGER NOT NULL,
    payroll_year INTEGER NOT NULL,
    basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    hra DECIMAL(12,2) DEFAULT 0,
    conveyance_allowance DECIMAL(12,2) DEFAULT 0,
    special_allowance DECIMAL(12,2) DEFAULT 0,
    other_allowances DECIMAL(12,2) DEFAULT 0,
    gross_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    provident_fund DECIMAL(12,2) DEFAULT 0,
    professional_tax DECIMAL(12,2) DEFAULT 0,
    income_tax DECIMAL(12,2) DEFAULT 0,
    other_deductions DECIMAL(12,2) DEFAULT 0,
    total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_date DATE,
    payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'processed', 'paid', 'failed', 'on_hold')),
    payment_method TEXT,
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, payroll_month, payroll_year)
);

-- =============================================================================
-- LEAVE MANAGEMENT
-- =============================================================================
CREATE TABLE IF NOT EXISTS leaves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL
        CHECK (leave_type IN ('casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'work_from_home', 'other')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL,
    year INTEGER NOT NULL,
    total_leaves INTEGER NOT NULL DEFAULT 0,
    leaves_taken INTEGER NOT NULL DEFAULT 0,
    leaves_remaining INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, leave_type, year)
);

-- =============================================================================
-- STUDENT PROGRESS TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS student_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    time_spent_minutes INTEGER DEFAULT 0,
    last_position JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, course_id, lesson_id)
);

-- =============================================================================
-- QUIZ SYSTEM
-- =============================================================================
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    time_limit_minutes INTEGER,
    passing_percent INTEGER DEFAULT 50,
    max_attempts INTEGER DEFAULT 3,
    is_published BOOLEAN DEFAULT FALSE,
    shuffle_questions BOOLEAN DEFAULT FALSE,
    show_results BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice'
        CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'long_answer')),
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer TEXT,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    score DECIMAL(8,2),
    total_points INTEGER DEFAULT 0,
    earned_points INTEGER DEFAULT 0,
    percent_score DECIMAL(5,2),
    passed BOOLEAN DEFAULT FALSE,
    time_taken_seconds INTEGER,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES profiles(id),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(quiz_id, student_id)
);

-- =============================================================================
-- SUBSCRIPTION PLANS
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2),
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    course_ids UUID[] DEFAULT ARRAY[]::UUID[],
    max_live_classes_per_month INTEGER,
    max_downloads_per_month INTEGER,
    ai_tutor_enabled BOOLEAN DEFAULT FALSE,
    certificate_enabled BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'suspended')),
    subscription_type TEXT NOT NULL DEFAULT 'monthly'
        CHECK (subscription_type IN ('monthly', 'yearly', 'lifetime')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    cancelled_at TIMESTAMPTZ,
    payment_id UUID REFERENCES payments(id),
    razorpay_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, status)
);

-- =============================================================================
-- REFUNDS
-- =============================================================================
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    refund_amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    reason TEXT NOT NULL,
    refund_type TEXT NOT NULL DEFAULT 'full'
        CHECK (refund_type IN ('full', 'partial')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'failed')),
    refund_mode TEXT,
    razorpay_refund_id TEXT,
    transaction_id TEXT,
    processed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    processed_by UUID REFERENCES profiles(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MARKETING ANALYTICS
-- =============================================================================
CREATE TABLE IF NOT EXISTS marketing_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL
        CHECK (platform IN ('youtube', 'instagram', 'facebook', 'linkedin', 'twitter', 'telegram', 'whatsapp', 'website', 'google')),
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(6,4),
    reach_count INTEGER,
    impressions_count INTEGER,
    click_count INTEGER,
    conversion_count INTEGER,
    revenue_attributed DECIMAL(12,2) DEFAULT 0,
    ad_spend DECIMAL(12,2) DEFAULT 0,
    metrics_date DATE NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, metrics_date)
);

-- =============================================================================
-- SOCIAL MEDIA POSTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL
        CHECK (platform IN ('youtube', 'instagram', 'facebook', 'linkedin', 'twitter', 'telegram', 'whatsapp')),
    post_type TEXT NOT NULL DEFAULT 'post'
        CHECK (post_type IN ('post', 'story', 'reel', 'video', 'article', 'poll', 'announcement')),
    content TEXT NOT NULL,
    media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    reference_id TEXT,
    reference_type TEXT,
    scheduled_at TIMESTAMPTZ,
    posted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'scheduled', 'posting', 'posted', 'failed', 'deleted')),
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    reach_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(6,4),
    post_url TEXT,
    error_message TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DONATION CAMPAIGNS
-- =============================================================================
CREATE TABLE IF NOT EXISTS donation_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_name TEXT NOT NULL,
    campaign_type TEXT DEFAULT 'general'
        CHECK (campaign_type IN ('general', 'emergency', 'scholarship', 'infrastructure', 'technology')),
    description TEXT,
    goal_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    collected_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CRON TASKS
-- =============================================================================
CREATE TABLE IF NOT EXISTS cron_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_name TEXT UNIQUE NOT NULL,
    task_description TEXT,
    schedule TEXT NOT NULL,
    command TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    status TEXT DEFAULT 'idle'
        CHECK (status IN ('idle', 'running', 'completed', 'failed')),
    last_output TEXT,
    last_error TEXT,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SYSTEM LOGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_level TEXT NOT NULL
        CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'critical')),
    log_source TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES profiles(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ANALYTICS EVENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    event_name TEXT NOT NULL,
    event_category TEXT,
    event_properties JSONB DEFAULT '{}'::jsonb,
    page_url TEXT,
    referrer_url TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT,
    city TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- LIVE CLASS ATTENDEES
-- =============================================================================
CREATE TABLE IF NOT EXISTS live_class_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    live_class_id UUID NOT NULL REFERENCES live_classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    is_present BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(live_class_id, user_id)
);

-- =============================================================================
-- COURSE RATINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS course_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, user_id)
);

-- =============================================================================
-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(audience);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published, published_at);

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

CREATE INDEX IF NOT EXISTS idx_payroll_employee_month ON payroll(employee_id, payroll_year, payroll_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(payment_status);

CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_course ON student_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_last_activity ON student_progress(last_activity DESC);

CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student ON quiz_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz ON quiz_submissions(quiz_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);

CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

CREATE INDEX IF NOT EXISTS idx_marketing_metrics_platform_date ON marketing_metrics(platform, metrics_date DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_at);

CREATE INDEX IF NOT idx_system_logs_level_source ON system_logs(log_level, log_source);
CREATE INDEX IF NOT idx_system_logs_created ON system_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_class_attendees_class ON live_class_attendees(live_class_id);
CREATE INDEX IF NOT EXISTS idx_live_class_attendees_user ON live_class_attendees(user_id);

CREATE INDEX IF NOT EXISTS idx_course_ratings_course ON course_ratings(course_id);
CREATE INDEX IF NOT EXISTS idx_course_ratings_user ON course_ratings(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_class_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- System Settings: Admin only
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'system_settings_manage' AND tablename = 'system_settings') THEN
        CREATE POLICY system_settings_manage ON system_settings
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin']));
    END IF;
END $$;

-- Languages: Public read, Admin write
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'languages_select' AND tablename = 'languages') THEN
        CREATE POLICY languages_select ON languages
            FOR SELECT TO public
            USING (is_active = TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'languages_manage' AND tablename = 'languages') THEN
        CREATE POLICY languages_manage ON languages
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin']));
    END IF;
END $$;

-- Translations: Public read, Admin write
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'translations_select' AND tablename = 'translations') THEN
        CREATE POLICY translations_select ON translations
            FOR SELECT TO public
            USING (TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'translations_manage' AND tablename = 'translations') THEN
        CREATE POLICY translations_manage ON translations
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager']));
    END IF;
END $$;

-- Notifications: User-specific
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_select' AND tablename = 'notifications') THEN
        CREATE POLICY notifications_select ON notifications
            FOR SELECT TO authenticated
            USING (user_id = auth.uid() OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin']));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_insert' AND tablename = 'notifications') THEN
        CREATE POLICY notifications_insert ON notifications
            FOR INSERT TO authenticated
            WITH CHECK (TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_update' AND tablename = 'notifications') THEN
        CREATE POLICY notifications_update ON notifications
            FOR UPDATE TO authenticated
            USING (user_id = auth.uid() OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin']))
            WITH CHECK (user_id = auth.uid() OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin']));
    END IF;
END $$;

-- Announcements: Role-based
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'announcements_select' AND tablename = 'announcements') THEN
        CREATE POLICY announcements_select ON announcements
            FOR SELECT TO authenticated
            USING (
                is_published = TRUE
                OR created_by = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'announcements_manage' AND tablename = 'announcements') THEN
        CREATE POLICY announcements_manage ON announcements
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'marketing', 'marketing_manager']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'marketing', 'marketing_manager']));
    END IF;
END $$;

-- Employees: HR roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'employees_select' AND tablename = 'employees') THEN
        CREATE POLICY employees_select ON employees
            FOR SELECT TO authenticated
            USING (
                user_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'hr', 'hr_manager'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'employees_manage' AND tablename = 'employees') THEN
        CREATE POLICY employees_manage ON employees
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'hr', 'hr_manager']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'hr', 'hr_manager']));
    END IF;
END $$;

-- Payroll: Finance roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payroll_select' AND tablename = 'payroll') THEN
        CREATE POLICY payroll_select ON payroll
            FOR SELECT TO authenticated
            USING (
                employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance', 'finance_manager', 'hr', 'hr_manager'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payroll_manage' AND tablename = 'payroll') THEN
        CREATE POLICY payroll_manage ON payroll
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance', 'finance_manager']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance', 'finance_manager']));
    END IF;
END $$;

-- Leaves: Employee + HR
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leaves_select' AND tablename = 'leaves') THEN
        CREATE POLICY leaves_select ON leaves
            FOR SELECT TO authenticated
            USING (
                employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'hr', 'hr_manager'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leaves_insert' AND tablename = 'leaves') THEN
        CREATE POLICY leaves_insert ON leaves
            FOR INSERT TO authenticated
            WITH CHECK (
                employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'hr', 'hr_manager'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leaves_update' AND tablename = 'leaves') THEN
        CREATE POLICY leaves_update ON leaves
            FOR UPDATE TO authenticated
            USING (
                employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'hr', 'hr_manager'])
            )
            WITH CHECK (
                employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'hr', 'hr_manager'])
            );
    END IF;
END $$;

-- Leave Balances
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leave_balances_select' AND tablename = 'leave_balances') THEN
        CREATE POLICY leave_balances_select ON leave_balances
            FOR SELECT TO authenticated
            USING (
                employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'hr', 'hr_manager'])
            );
    END IF;
END $$;

-- Student Progress: Student + Faculty + Admin
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_progress_select' AND tablename = 'student_progress') THEN
        CREATE POLICY student_progress_select ON student_progress
            FOR SELECT TO authenticated
            USING (
                student_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'faculty', 'teacher', 'content_manager'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_progress_insert' AND tablename = 'student_progress') THEN
        CREATE POLICY student_progress_insert ON student_progress
            FOR INSERT TO authenticated
            WITH CHECK (
                student_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'student_progress_update' AND tablename = 'student_progress') THEN
        CREATE POLICY student_progress_update ON student_progress
            FOR UPDATE TO authenticated
            USING (
                student_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin'])
            )
            WITH CHECK (
                student_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin'])
            );
    END IF;
END $$;

-- Quizzes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quizzes_select' AND tablename = 'quizzes') THEN
        CREATE POLICY quizzes_select ON quizzes
            FOR SELECT TO authenticated
            USING (
                is_published = TRUE
                OR created_by = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager', 'faculty', 'teacher'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quizzes_manage' AND tablename = 'quizzes') THEN
        CREATE POLICY quizzes_manage ON quizzes
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager', 'faculty', 'teacher']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager', 'faculty', 'teacher']));
    END IF;
END $$;

-- Quiz Questions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quiz_questions_select' AND tablename = 'quiz_questions') THEN
        CREATE POLICY quiz_questions_select ON quiz_questions
            FOR SELECT TO authenticated
            USING (
                EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_questions.quiz_id AND (q.is_published = TRUE OR q.created_by = auth.uid()))
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quiz_questions_manage' AND tablename = 'quiz_questions') THEN
        CREATE POLICY quiz_questions_manage ON quiz_questions
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'content_manager']));
    END IF;
END $$;

-- Quiz Submissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quiz_submissions_select' AND tablename = 'quiz_submissions') THEN
        CREATE POLICY quiz_submissions_select ON quiz_submissions
            FOR SELECT TO authenticated
            USING (
                student_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'faculty', 'teacher'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quiz_submissions_insert' AND tablename = 'quiz_submissions') THEN
        CREATE POLICY quiz_submissions_insert ON quiz_submissions
            FOR INSERT TO authenticated
            WITH CHECK (student_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'quiz_submissions_update' AND tablename = 'quiz_submissions') THEN
        CREATE POLICY quiz_submissions_update ON quiz_submissions
            FOR UPDATE TO authenticated
            USING (
                student_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'faculty', 'teacher'])
            )
            WITH CHECK (
                student_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'faculty', 'teacher'])
            );
    END IF;
END $$;

-- Subscription Plans: Public read, Admin manage
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscription_plans_select' AND tablename = 'subscription_plans') THEN
        CREATE POLICY subscription_plans_select ON subscription_plans
            FOR SELECT TO public
            USING (is_active = TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscription_plans_manage' AND tablename = 'subscription_plans') THEN
        CREATE POLICY subscription_plans_manage ON subscription_plans
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance']));
    END IF;
END $$;

-- Subscriptions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscriptions_select' AND tablename = 'subscriptions') THEN
        CREATE POLICY subscriptions_select ON subscriptions
            FOR SELECT TO authenticated
            USING (
                user_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscriptions_insert' AND tablename = 'subscriptions') THEN
        CREATE POLICY subscriptions_insert ON subscriptions
            FOR INSERT TO authenticated
            WITH CHECK (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'subscriptions_update' AND tablename = 'subscriptions') THEN
        CREATE POLICY subscriptions_update ON subscriptions
            FOR UPDATE TO authenticated
            USING (
                user_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance'])
            )
            WITH CHECK (
                user_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance'])
            );
    END IF;
END $$;

-- Refunds: Finance roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'refunds_select' AND tablename = 'refunds') THEN
        CREATE POLICY refunds_select ON refunds
            FOR SELECT TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance', 'finance_manager']));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'refunds_insert' AND tablename = 'refunds') THEN
        CREATE POLICY refunds_insert ON refunds
            FOR INSERT TO authenticated
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance', 'finance_manager']));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'refunds_update' AND tablename = 'refunds') THEN
        CREATE POLICY refunds_update ON refunds
            FOR UPDATE TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance', 'finance_manager']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance', 'finance_manager']));
    END IF;
END $$;

-- Marketing Metrics
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'marketing_metrics_select' AND tablename = 'marketing_metrics') THEN
        CREATE POLICY marketing_metrics_select ON marketing_metrics
            FOR SELECT TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'marketing', 'marketing_manager', 'social_media_manager']));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'marketing_metrics_manage' AND tablename = 'marketing_metrics') THEN
        CREATE POLICY marketing_metrics_manage ON marketing_metrics
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'marketing', 'marketing_manager']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'marketing', 'marketing_manager']));
    END IF;
END $$;

-- Social Posts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_posts_select' AND tablename = 'social_posts') THEN
        CREATE POLICY social_posts_select ON social_posts
            FOR SELECT TO authenticated
            USING (
                status = 'posted'
                OR created_by = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'marketing', 'marketing_manager', 'social_media_manager'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'social_posts_manage' AND tablename = 'social_posts') THEN
        CREATE POLICY social_posts_manage ON social_posts
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'marketing', 'marketing_manager', 'social_media_manager']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'marketing', 'marketing_manager', 'social_media_manager']));
    END IF;
END $$;

-- Donation Campaigns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'donation_campaigns_select' AND tablename = 'donation_campaigns') THEN
        CREATE POLICY donation_campaigns_select ON donation_campaigns
            FOR SELECT TO public
            USING (is_active = TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'donation_campaigns_manage' AND tablename = 'donation_campaigns') THEN
        CREATE POLICY donation_campaigns_manage ON donation_campaigns
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'finance']));
    END IF;
END $$;

-- Cron Tasks: Admin only
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cron_tasks_manage' AND tablename = 'cron_tasks') THEN
        CREATE POLICY cron_tasks_manage ON cron_tasks
            FOR ALL TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'technical_support']))
            WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'technical_support']));
    END IF;
END $$;

-- System Logs: Admin only
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'system_logs_select' AND tablename = 'system_logs') THEN
        CREATE POLICY system_logs_select ON system_logs
            FOR SELECT TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'technical_support', 'compliance']));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'system_logs_insert' AND tablename = 'system_logs') THEN
        CREATE POLICY system_logs_insert ON system_logs
            FOR INSERT TO authenticated
            WITH CHECK (TRUE);
    END IF;
END $$;

-- Analytics Events: Read by auth, insert by app
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'analytics_events_select' AND tablename = 'analytics_events') THEN
        CREATE POLICY analytics_events_select ON analytics_events
            FOR SELECT TO authenticated
            USING (public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'marketing']));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'analytics_events_insert' AND tablename = 'analytics_events') THEN
        CREATE POLICY analytics_events_insert ON analytics_events
            FOR INSERT TO authenticated
            WITH CHECK (TRUE);
    END IF;
END $$;

-- Live Class Attendees
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'live_class_attendees_select' AND tablename = 'live_class_attendees') THEN
        CREATE POLICY live_class_attendees_select ON live_class_attendees
            FOR SELECT TO authenticated
            USING (
                user_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'faculty', 'teacher'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'live_class_attendees_insert' AND tablename = 'live_class_attendees') THEN
        CREATE POLICY live_class_attendees_insert ON live_class_attendees
            FOR INSERT TO authenticated
            WITH CHECK (TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'live_class_attendees_update' AND tablename = 'live_class_attendees') THEN
        CREATE POLICY live_class_attendees_update ON live_class_attendees
            FOR UPDATE TO authenticated
            USING (
                user_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'faculty', 'teacher'])
            )
            WITH CHECK (
                user_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin', 'faculty', 'teacher'])
            );
    END IF;
END $$;

-- Course Ratings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'course_ratings_select' AND tablename = 'course_ratings') THEN
        CREATE POLICY course_ratings_select ON course_ratings
            FOR SELECT TO authenticated
            USING (
                status = 'approved'
                OR user_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin'])
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'course_ratings_insert' AND tablename = 'course_ratings') THEN
        CREATE POLICY course_ratings_insert ON course_ratings
            FOR INSERT TO authenticated
            WITH CHECK (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'course_ratings_update' AND tablename = 'course_ratings') THEN
        CREATE POLICY course_ratings_update ON course_ratings
            FOR UPDATE TO authenticated
            USING (
                user_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin'])
            )
            WITH CHECK (
                user_id = auth.uid()
                OR public.has_any_role(ARRAY['admin', 'super_admin', 'platform_admin'])
            );
    END IF;
END $$;

COMMIT;
