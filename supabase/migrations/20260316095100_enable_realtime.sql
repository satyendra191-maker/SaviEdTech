-- =============================================================================
-- REALTIME ENABLING FOR KEY TABLES
-- =============================================================================
-- This migration enables Supabase Realtime subscriptions for critical tables
-- that require live updates across dashboards and clients

BEGIN;

-- Enable realtime for notifications (real-time alerts)
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for announcements (instant announcements)
ALTER TABLE announcements REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;

-- Enable realtime for live_classes (live class updates)
ALTER TABLE live_classes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE live_classes;

-- Enable realtime for live_class_attendees (attendance tracking)
ALTER TABLE live_class_attendees REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE live_class_attendees;

-- Enable realtime for assignments (assignment updates)
ALTER TABLE assignments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;

-- Enable realtime for submissions (submission tracking)
ALTER TABLE submissions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;

-- Enable realtime for quiz_submissions (quiz progress)
ALTER TABLE quiz_submissions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_submissions;

-- Enable realtime for payments (payment notifications)
ALTER TABLE payments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- Enable realtime for donations (donation alerts)
ALTER TABLE donations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE donations;

-- Enable realtime for system_events (system-wide events)
ALTER TABLE system_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE system_events;

-- Enable realtime for student_progress (progress tracking)
ALTER TABLE student_progress REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE student_progress;

-- Enable realtime for ai_interactions (AI response updates)
ALTER TABLE ai_interactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_interactions;

-- Enable realtime for social_posts (social media status)
ALTER TABLE social_posts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE social_posts;

-- Enable realtime for marketing_metrics (analytics updates)
ALTER TABLE marketing_metrics REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE marketing_metrics;

-- Enable realtime for leads (lead updates)
ALTER TABLE leads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- Enable realtime for cron_tasks (task status monitoring)
ALTER TABLE cron_tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE cron_tasks;

-- Enable realtime for system_logs (log streaming)
ALTER TABLE system_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE system_logs;

-- Enable realtime for analytics_events (event streaming)
ALTER TABLE analytics_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE analytics_events;

-- Enable realtime for refunds (refund status)
ALTER TABLE refunds REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE refunds;

-- Enable realtime for subscriptions (subscription status)
ALTER TABLE subscriptions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;

COMMIT;
