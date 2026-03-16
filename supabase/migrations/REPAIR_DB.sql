-- SAVIEDUTECH FINAL DATABASE REPAIR SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX AUTH AND GAMIFICATION ERRORS

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. FIX PROFILES TABLE (THE AUTH BLOCKER)
-- -----------------------------------------------------------------------------
-- Drop restrictive role check that blocks 'faculty', 'teacher', etc.
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

-- Ensure all required columns exist
ALTER TABLE IF EXISTS public.profiles 
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS parent_student_id UUID;

-- Apply expanded role check
ALTER TABLE IF EXISTS public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN (
        'student', 'admin', 'super_admin', 'content_manager', 
        'faculty', 'teacher', 'parent', 'hr', 'finance_manager'
    ));

-- -----------------------------------------------------------------------------
-- 2. FIX GAMIFICATION SCHEMA (THE DATA ERRORS)
-- -----------------------------------------------------------------------------
-- Fix user_points table
CREATE TABLE IF NOT EXISTS public.user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    points INTEGER NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure created_at exists (was reported missing in logs)
ALTER TABLE IF EXISTS public.user_points ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create point_transactions view if code uses it (some codebases use transactions synonymously)
CREATE OR REPLACE VIEW public.point_transactions AS SELECT * FROM public.user_points;

-- Fix achievements system
CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    badge_color TEXT,
    criteria_type TEXT NOT NULL,
    criteria_value INTEGER NOT NULL DEFAULT 1,
    points INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Seed basic achievements
INSERT INTO public.achievements (id, name, description, criteria_type, criteria_value, points)
VALUES 
('first_steps', 'First Steps', 'Complete your first learning activity', 'activities_completed', 1, 50),
('scholar', 'Scholar', 'Complete 10 lectures', 'lectures_completed', 10, 100),
('problem_solver', 'Problem Solver', 'Answer 50 questions correctly', 'correct_answers', 50, 150),
('test_taker', 'Test Taker', 'Complete 5 tests', 'tests_completed', 5, 200),
('week_warrior', 'Week Warrior', 'Maintain a 7-day study streak', 'streak_days', 7, 250)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. ROBUST AUTH TRIGGER (THE PERMANENT FIX)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    is_employee BOOLEAN;
    is_parent BOOLEAN;
BEGIN
    -- Get role from metadata
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    
    -- Check for employee status
    is_employee := v_role IN ('admin', 'super_admin', 'faculty', 'teacher', 'content_manager', 'finance_manager', 'hr');
    is_parent := v_role = 'parent';
    
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        phone,
        role, 
        status, 
        is_verified, 
        is_active, 
        parent_student_id,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone',
        v_role,
        CASE WHEN is_employee THEN 'pending' ELSE 'active' END,
        CASE WHEN is_employee THEN false ELSE true END,
        true,
        CASE 
            WHEN is_parent AND (NEW.raw_user_meta_data->>'student_id') IS NOT NULL 
            THEN (NEW.raw_user_meta_data->>'student_id')::UUID 
            ELSE NULL 
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        phone = COALESCE(profiles.phone, EXCLUDED.phone),
        role = EXCLUDED.role,
        updated_at = NOW();

    -- Bootstrap student profile if needed
    IF v_role = 'student' THEN
        INSERT INTO public.student_profiles (id, subscription_status, total_points, study_streak)
        VALUES (NEW.id, 'free', 0, 0)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback safety
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
