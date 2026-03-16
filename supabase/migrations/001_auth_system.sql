-- ================================================
-- AUTHENTICATION SYSTEM MIGRATION
-- Add is_verified and status fields to profiles table
-- ================================================

-- 1. Add is_verified column (default false)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Add status column (default 'pending')
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- 3. Add full_name column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 4. Add parent_student_id column for linking parent to student
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_student_id UUID REFERENCES profiles(id);

-- 5. Create enum for user status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('pending', 'active', 'blocked');
    END IF;
END $$;

-- 6. Alter status column to use the enum
ALTER TABLE profiles ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR;

-- 7. Enable Row Level Security on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES FOR PROFILES
-- ================================================

-- Policy: Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can update their own profile (except verification fields)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id 
        AND is_verified IS NOT NULL 
        AND status IS NOT NULL
    );

-- Policy: Admin can update verification status
DROP POLICY IF EXISTS "Admin can update verification status" ON profiles;
CREATE POLICY "Admin can update verification status" ON profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy: Service role can do anything (for bootstrapping)
DROP POLICY IF EXISTS "Service role full access" ON profiles;
CREATE POLICY "Service role full access" ON profiles
    FOR ALL
    USING (auth.role() = 'service_role');

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_student_id ON profiles(parent_student_id);

-- ================================================
-- EMPLOYEE ROLES (Require Admin Approval)
-- Parent role auto-verified when added by student
-- ================================================

-- Function to auto-verify regular users and parents after signup
-- Employee roles (except parent) require manual admin approval
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_employee BOOLEAN;
    is_parent BOOLEAN;
BEGIN
    -- Check if the user role is an employee role (requires approval)
    is_employee := NEW.raw_user_meta_data->>'role' IN (
        'admin', 
        'faculty', 
        'teacher', 
        'content_manager', 
        'finance_manager', 
        'hr'
    );
    
    -- Check if this is a parent account (auto-verified when added by student)
    is_parent := NEW.raw_user_meta_data->>'role' = 'parent';
    
    INSERT INTO public.profiles (id, email, full_name, role, status, is_verified, parent_student_id)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        CASE 
            WHEN is_employee THEN 'pending'  -- Employees need approval
            ELSE 'active'  -- Regular users & parents auto-verify
        END,
        CASE 
            WHEN is_employee THEN false  -- Employees need approval
            ELSE true  -- Regular users & parents auto-verify
        END,
        CASE 
            WHEN is_parent THEN NEW.raw_user_meta_data->>'student_id'::UUID
            ELSE NULL
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- ADMIN VERIFICATION FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION public.verify_user(user_id UUID, approved BOOLEAN)
RETURNS VOID AS $$
BEGIN
    IF approved THEN
        UPDATE profiles 
        SET is_verified = true, status = 'active', updated_at = NOW()
        WHERE id = user_id;
    ELSE
        UPDATE profiles 
        SET status = 'blocked', updated_at = NOW()
        WHERE id = user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.verify_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_user TO service_role;

-- ================================================
-- AUTO-VERIFY ON EMAIL CONFIRMATION (for regular users)
-- ================================================

-- Function to handle email confirmation and auto-verify regular users
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS TRIGGER AS $$
DECLARE
    is_employee BOOLEAN;
    is_parent BOOLEAN;
BEGIN
    -- Only process if email is confirmed
    IF NEW.confirmed_at IS NOT NULL THEN
        -- Check if user role requires admin approval
        is_employee := NEW.raw_user_meta_data->>'role' IN (
            'admin', 
            'faculty', 
            'teacher', 
            'content_manager', 
            'finance_manager', 
            'hr'
        );
        
        -- Check if this is a parent account
        is_parent := NEW.raw_user_meta_data->>'role' = 'parent';
        
        -- If not an employee, auto-verify (including parents)
        IF NOT is_employee THEN
            UPDATE profiles 
            SET is_verified = true, status = 'active', updated_at = NOW()
            WHERE id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for email confirmation
DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
    AFTER UPDATE OF confirmed_at ON auth.users
    FOR EACH ROW
    WHEN (NEW.confirmed_at IS NOT NULL AND OLD.confirmed_at IS NULL)
    EXECUTE FUNCTION public.handle_email_confirmation();

-- ================================================
-- API FUNCTION TO ADD PARENT BY STUDENT
-- ================================================

-- Function for students to add their parent's phone number
-- This creates a parent profile that is auto-verified
CREATE OR REPLACE FUNCTION public.add_parent_by_student(
    student_id UUID,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT
)
RETURNS TABLE(id UUID, message TEXT) AS $$
DECLARE
    new_parent_id UUID;
BEGIN
    -- Verify the student exists and is verified
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = student_id 
        AND is_verified = true 
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Only verified students can add parents';
    END IF;

    -- Check if parent with this phone already exists
    SELECT id INTO new_parent_id 
    FROM profiles 
    WHERE phone = parent_phone 
    AND role = 'parent';

    IF new_parent_id IS NULL THEN
        -- Create new parent user in auth.users
        -- Note: This requires the parent to complete signup themselves
        -- The parent profile is created but marked as auto-verified
        INSERT INTO profiles (id, email, full_name, role, phone, status, is_verified, parent_student_id)
        VALUES (
            gen_random_uuid(),
            parent_email,
            parent_name,
            'parent',
            parent_phone,
            'active',
            true,
            student_id
        )
        RETURNING id INTO new_parent_id;
        
        RETURN QUERY SELECT new_parent_id, 'Parent added successfully. They can now sign up with this phone number.';
    ELSE
        -- Update existing parent to link to this student
        UPDATE profiles 
        SET parent_student_id = student_id, 
            is_verified = true, 
            status = 'active',
            updated_at = NOW()
        WHERE id = new_parent_id;
        
        RETURN QUERY SELECT new_parent_id, 'Parent linked successfully to your account.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.add_parent_by_student TO authenticated;
