-- Quick Fix for RLS Policies
-- Run this in Supabase SQL Editor to fix access issues

-- Make popup_ads publicly readable without authentication
DROP POLICY IF EXISTS "popup_ads_select_policy" ON popup_ads;
CREATE POLICY "popup_ads_select_policy" ON popup_ads
    FOR SELECT USING (true);

-- Make job_listings publicly readable
DROP POLICY IF EXISTS "job_listings_select_policy" ON job_listings;
CREATE POLICY "job_listings_select_policy" ON job_listings
    FOR SELECT USING (is_active = true);

-- Allow anonymous inserts for job applications
DROP POLICY IF EXISTS "job_applications_insert_policy" ON job_applications;
CREATE POLICY "job_applications_insert_policy" ON job_applications
    FOR INSERT WITH CHECK (true);

-- Make donations readable by authenticated users
DROP POLICY IF EXISTS "donations_select_policy" ON donations;
CREATE POLICY "donations_select_policy" ON donations
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- Allow service role to manage donations
DROP POLICY IF EXISTS "donations_all_policy" ON donations;
CREATE POLICY "donations_all_policy" ON donations
    FOR ALL USING (auth.role() = 'service_role');

-- Make profiles readable (for public display)
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (true);

-- Make student_profiles readable
DROP POLICY IF EXISTS "student_profiles_select_policy" ON student_profiles;
CREATE POLICY "student_profiles_select_policy" ON student_profiles
    FOR SELECT USING (true);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Make notifications readable by authenticated users
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
CREATE POLICY "notifications_select_policy" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Make lecture_progress readable by authenticated users
DROP POLICY IF EXISTS "lecture_progress_select_policy" ON lecture_progress;
CREATE POLICY "lecture_progress_select_policy" ON lecture_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own progress
DROP POLICY IF EXISTS "lecture_progress_update_policy" ON lecture_progress;
CREATE POLICY "lecture_progress_update_policy" ON lecture_progress
    FOR ALL USING (auth.uid() = user_id);

-- Make questions readable
DROP POLICY IF EXISTS "questions_select_policy" ON questions;
CREATE POLICY "questions_select_policy" ON questions
    FOR SELECT USING (is_published = true);

-- Make lectures readable
DROP POLICY IF EXISTS "lectures_select_policy" ON lectures;
CREATE POLICY "lectures_select_policy" ON lectures
    FOR SELECT USING (is_published = true);

-- Make tests readable
DROP POLICY IF EXISTS "tests_select_policy" ON tests;
CREATE POLICY "tests_select_policy" ON tests
    FOR SELECT USING (is_published = true);

-- Make test_attempts readable by users
DROP POLICY IF EXISTS "test_attempts_select_policy" ON test_attempts;
CREATE POLICY "test_attempts_select_policy" ON test_attempts
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert test attempts
DROP POLICY IF EXISTS "test_attempts_insert_policy" ON test_attempts;
CREATE POLICY "test_attempts_insert_policy" ON test_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Make dpp_attempts readable by users
DROP POLICY IF EXISTS "dpp_attempts_select_policy" ON dpp_attempts;
CREATE POLICY "dpp_attempts_select_policy" ON dpp_attempts
    FOR SELECT USING (auth.uid() = user_id);

-- Make daily_challenges readable
DROP POLICY IF EXISTS "daily_challenges_select_policy" ON daily_challenges;
CREATE POLICY "daily_challenges_select_policy" ON daily_challenges
    FOR SELECT USING (true);

-- Make challenge_attempts readable by users
DROP POLICY IF EXISTS "challenge_attempts_select_policy" ON challenge_attempts;
CREATE POLICY "challenge_attempts_select_policy" ON challenge_attempts
    FOR SELECT USING (auth.uid() = user_id);

-- Make leaderboards readable
DROP POLICY IF EXISTS "leaderboards_select_policy" ON leaderboards;
CREATE POLICY "leaderboards_select_policy" ON leaderboards
    FOR SELECT USING (true);

-- Make courses readable
DROP POLICY IF EXISTS "courses_select_policy" ON courses;
CREATE POLICY "courses_select_policy" ON courses
    FOR SELECT USING (is_published = true);

-- Make faculties readable
DROP POLICY IF EXISTS "faculties_select_policy" ON faculties;
CREATE POLICY "faculties_select_policy" ON faculties
    FOR SELECT USING (is_active = true);

-- Make subjects readable
DROP POLICY IF EXISTS "subjects_select_policy" ON subjects;
CREATE POLICY "subjects_select_policy" ON subjects
    FOR SELECT USING (is_active = true);

-- Make chapters readable
DROP POLICY IF EXISTS "chapters_select_policy" ON chapters;
CREATE POLICY "chapters_select_policy" ON chapters
    FOR SELECT USING (is_active = true);

-- Make topics readable
DROP POLICY IF EXISTS "topics_select_policy" ON topics;
CREATE POLICY "topics_select_policy" ON topics
    FOR SELECT USING (is_active = true);

-- Make achievements readable
DROP POLICY IF EXISTS "achievements_select_policy" ON achievements;
CREATE POLICY "achievements_select_policy" ON achievements
    FOR SELECT USING (is_active = true);

-- Make user_achievements readable by users
DROP POLICY IF EXISTS "user_achievements_select_policy" ON user_achievements;
CREATE POLICY "user_achievements_select_policy" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- Make study_streaks readable by users
DROP POLICY IF EXISTS "study_streaks_select_policy" ON study_streaks;
CREATE POLICY "study_streaks_select_policy" ON study_streaks
    FOR SELECT USING (auth.uid() = user_id);

-- Make user_points readable by users
DROP POLICY IF EXISTS "user_points_select_policy" ON user_points;
CREATE POLICY "user_points_select_policy" ON user_points
    FOR SELECT USING (auth.uid() = user_id);

-- Make mistake_logs readable by users
DROP POLICY IF EXISTS "mistake_logs_select_policy" ON mistake_logs;
CREATE POLICY "mistake_logs_select_policy" ON mistake_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Make revision_tasks readable by users
DROP POLICY IF EXISTS "revision_tasks_select_policy" ON revision_tasks;
CREATE POLICY "revision_tasks_select_policy" ON revision_tasks
    FOR SELECT USING (auth.uid() = user_id);

-- Make question_attempts readable by users
DROP POLICY IF EXISTS "question_attempts_select_policy" ON question_attempts;
CREATE POLICY "question_attempts_select_policy" ON question_attempts
    FOR SELECT USING (auth.uid() = user_id);

-- Make student_progress readable by users
DROP POLICY IF EXISTS "student_progress_select_policy" ON student_progress;
CREATE POLICY "student_progress_select_policy" ON student_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Make topic_mastery readable by users
DROP POLICY IF EXISTS "topic_mastery_select_policy" ON topic_mastery;
CREATE POLICY "topic_mastery_select_policy" ON topic_mastery
    FOR SELECT USING (auth.uid() = user_id);

-- Make user_stats readable by users
DROP POLICY IF EXISTS "user_stats_select_policy" ON user_stats;
CREATE POLICY "user_stats_select_policy" ON user_stats
    FOR SELECT USING (auth.uid() = user_id);

SELECT 'RLS policies fixed successfully!' AS status;
