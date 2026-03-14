-- ================================================
-- PLATFORM POLICIES & ANALYTICS TABLES
-- Created: March 2026
-- ================================================

-- ================================================
-- PLATFORM POLICIES TABLE
-- Stores policy metadata (terms, privacy, etc.)
-- ================================================

CREATE TABLE IF NOT EXISTS platform_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_type VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    requires_acceptance BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- POLICY VERSIONS TABLE
-- Stores version history of each policy
-- ================================================

CREATE TABLE IF NOT EXISTS policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES platform_policies(id) ON DELETE CASCADE,
    version_number VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    effective_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ================================================
-- USER POLICY ACCEPTANCE TABLE
-- Tracks which users have accepted which policies
-- ================================================

CREATE TABLE IF NOT EXISTS user_policy_acceptance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES platform_policies(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES policy_versions(id),
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    UNIQUE(user_id, policy_id)
);

-- ================================================
-- ANALYTICS EVENTS TABLE
-- Stores user activity events
-- ================================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    event_data JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- AI USAGE LOGS TABLE
-- Tracks AI tutor usage for billing/analytics
-- ================================================

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    query_type VARCHAR(50),
    input_tokens INTEGER,
    output_tokens INTEGER,
    model_used VARCHAR(100),
    duration_ms INTEGER,
    cost_usd DECIMAL(10,6),
    subject VARCHAR(50),
    topic VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Policy indexes
CREATE INDEX IF NOT EXISTS idx_platform_policies_type ON platform_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_policy_versions_policy ON policy_versions(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_versions_current ON policy_versions(policy_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_user_policy_acceptance_user ON user_policy_acceptance(user_id);
CREATE INDEX IF NOT EXISTS idx_user_policy_acceptance_policy ON user_policy_acceptance(policy_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_recorded ON analytics_events(recorded_at);

-- AI usage indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_subject ON ai_usage_logs(subject);

-- ================================================
-- SEED INITIAL POLICIES
-- ================================================

INSERT INTO platform_policies (policy_type, title, display_order, requires_acceptance) VALUES
    ('terms_of_service', 'Terms of Service', 1, true),
    ('privacy_policy', 'Privacy Policy', 2, true),
    ('acceptable_use', 'Acceptable Use Policy', 3, true),
    ('student_code_of_conduct', 'Student Code of Conduct', 4, true),
    ('faculty_agreement', 'Faculty Agreement', 5, false)
ON CONFLICT (policy_type) DO NOTHING;

-- ================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================

ALTER TABLE platform_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_policy_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES
-- ================================================

-- Platform policies: readable by all, writable by service role
CREATE POLICY "Anyone can read policies" ON platform_policies
    FOR SELECT USING (true);

-- Policy versions: readable by all, writable by service role
CREATE POLICY "Anyone can read policy versions" ON policy_versions
    FOR SELECT USING (true);

-- User policy acceptance: users can view their own
CREATE POLICY "Users can view own acceptance" ON user_policy_acceptance
    FOR SELECT USING (auth.uid() = user_id);

-- Analytics events: readable by admins only
CREATE POLICY "Admins can read analytics" ON analytics_events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- AI usage logs: users can view own, admins can view all
CREATE POLICY "Users can view own AI usage" ON ai_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

-- ================================================
-- CREATE UPDATED AT TRIGGER FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_platform_policies_updated_at
    BEFORE UPDATE ON platform_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE platform_policies IS 'Stores metadata for platform policies (terms, privacy, etc.)';
COMMENT ON TABLE policy_versions IS 'Stores version history for each policy';
COMMENT ON TABLE user_policy_acceptance IS 'Tracks user acceptance of platform policies';
COMMENT ON TABLE analytics_events IS 'Stores user activity events for analytics';
COMMENT ON TABLE ai_usage_logs IS 'Tracks AI tutor usage for billing and analytics';
