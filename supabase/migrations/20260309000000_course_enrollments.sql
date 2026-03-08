-- Course Enrollments Table Migration
-- Required for Feature 13: Payment System - Course Access after Payment

CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended', 'expired')),
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    progress_percent DECIMAL(5,2) DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    payment_id UUID REFERENCES payments(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- RLS Policies for course_enrollments
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- Users can view their own enrollments
CREATE POLICY "Users can view own enrollments" ON course_enrollments
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own enrollments
CREATE POLICY "Users can create own enrollments" ON course_enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all enrollments
CREATE POLICY "Admins can view all enrollments" ON course_enrollments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);

-- Add course_enrollments to types (manual step required in src/types/supabase.ts)
-- Add the following type definition:

/*
course_enrollments: {
  Row: {
    id: string;
    user_id: string;
    course_id: string;
    status: string;
    enrolled_at: string | null;
    completed_at: string | null;
    progress_percent: number;
    last_accessed_at: string | null;
    payment_id: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    course_id: string;
    status?: string;
    enrolled_at?: string | null;
    completed_at?: string | null;
    progress_percent?: number;
    last_accessed_at?: string | null;
    payment_id?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    course_id?: string;
    status?: string;
    enrolled_at?: string | null;
    completed_at?: string | null;
    progress_percent?: number;
    last_accessed_at?: string | null;
    payment_id?: string | null;
    created_at?: string;
    updated_at?: string;
  };
}
*/

-- Grant necessary permissions
GRANT ALL ON course_enrollments TO authenticated;
GRANT ALL ON course_enrollments TO service_role;
