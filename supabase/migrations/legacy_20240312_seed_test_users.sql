-- =============================================================================
-- TEST USERS SEED DATA
-- =============================================================================
-- Run this in Supabase SQL Editor to create test users
-- =============================================================================

-- First check if users exist and delete them if needed
DELETE FROM auth.users WHERE email IN (
  'student@saviedutech.com',
  'neet@saviedutech.com', 
  'student2@saviedutech.com',
  'admin@saviedutech.com',
  'faculty@saviedutech.com'
);

-- Create test students
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES 
  (gen_random_uuid(), 'student@saviedutech.com', crypt('student123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"role": "student", "exam_target": "JEE"}', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'neet@saviedutech.com', crypt('student123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"role": "student", "exam_target": "NEET"}', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'student2@saviedutech.com', crypt('student123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"role": "student", "exam_target": "JEE"}', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'admin@saviedutech.com', crypt('admin123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"role": "admin"}', 'authenticated', 'authenticated'),
  (gen_random_uuid(), 'faculty@saviedutech.com', crypt('faculty123', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"role": "content_manager"}', 'authenticated', 'authenticated');
