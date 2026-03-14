-- =============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =============================================================================
-- Add these indexes to improve query performance

-- Profile indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at DESC);

-- Enrollment indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_expiry ON enrollments(expiry_date);

-- Quiz indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Lead indexes
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_utm ON leads(utm_source, utm_campaign);

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires ON user_subscriptions(expires_at);

-- Course indexes
CREATE INDEX IF NOT EXISTS idx_courses_category_active ON courses(category, is_active);
CREATE INDEX IF NOT EXISTS idx_courses_created ON courses(created_at DESC);

-- Content indexes
CREATE INDEX IF NOT EXISTS idx_content_type_published ON content(content_type, is_published);
CREATE INDEX IF NOT EXISTS idx_content_created ON content(created_at DESC);

-- Lecture indexes
CREATE INDEX IF NOT EXISTS idx_lectures_published ON lectures(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_lectures_course ON lectures(course_id);

-- Daily challenge indexes
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(challenge_date DESC);

-- Leaderboard indexes  
CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON leaderboard(period_type, period_start);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON gst_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON gst_transactions(transaction_type);

-- Analysis indexes
CREATE INDEX IF NOT EXISTS idx_quiz_analytics_user ON quiz_analytics(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_reports_user ON student_reports(user_id, generated_at DESC);

-- Growth metrics indexes
CREATE INDEX IF NOT EXISTS idx_growth_metrics_date_type ON growth_metrics(metric_date DESC, metric_type);

-- Session cleanup (for expired sessions)
DELETE FROM user_sessions WHERE expires_at < NOW();

COMMENT ON INDEX idx_profiles_role IS 'Improve role-based queries';
COMMENT ON INDEX idx_enrollments_user_course IS 'Improve enrollment lookups';
COMMENT ON INDEX idx_notifications_user_read IS 'Improve notification queries';
