-- =============================================================================
-- Parent Monitoring and Backup System Migration
-- Created: March 2026
-- =============================================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS parent_links CASCADE;
DROP TABLE IF EXISTS backups CASCADE;

-- =============================================================================
-- PARENT LINKS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS parent_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    student_phone VARCHAR(20) NOT NULL,
    student_name VARCHAR(255),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- Index for faster lookups
CREATE INDEX idx_parent_links_parent ON parent_links(parent_id);
CREATE INDEX idx_parent_links_student ON parent_links(student_id);
CREATE INDEX idx_parent_links_status ON parent_links(verification_status);

-- =============================================================================
-- BACKUPS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(20) DEFAULT 'full' CHECK (backup_type IN ('full', 'incremental', 'schema')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    file_path TEXT,
    file_name TEXT,
    file_size_bytes BIGINT,
    row_count INTEGER,
    storage_bucket VARCHAR(50) DEFAULT 'backups',
    download_url TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_backups_status ON backups(status);
CREATE INDEX idx_backups_created ON backups(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE parent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- Parent Links Policies
CREATE POLICY "Parents can view own links" ON parent_links 
    FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own links" ON parent_links 
    FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Admins can manage all parent_links" ON parent_links 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Backup Policies
CREATE POLICY "Admins can view backups" ON backups 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Admins can insert backups" ON backups 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Admins can update backups" ON backups 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Admins can delete backups" ON backups 
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- =============================================================================
-- STORAGE BUCKET FOR BACKUPS
-- =============================================================================

-- Create backups storage bucket (will be created via Supabase dashboard or CLI)
-- Run this separately if needed:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
-- VALUES ('backups', 'backups', false, 524288000, ARRAY['application/zip', 'application/json']);

-- Storage policies (run after bucket creation)
-- CREATE POLICY "Allow authenticated users to upload backups" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'backups' AND auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated users to view backups" ON storage.objects
--     FOR SELECT USING (bucket_id = 'backups');

-- CREATE POLICY "Allow authenticated users to delete backups" ON storage.objects
--     FOR DELETE USING (bucket_id = 'backups');

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to link parent to student
CREATE OR REPLACE FUNCTION link_parent_to_student(
    p_parent_id UUID,
    p_student_phone VARCHAR,
    p_student_name VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_student_id UUID;
    v_link_id UUID;
BEGIN
    -- Find student by phone
    SELECT id INTO v_student_id 
    FROM profiles 
    WHERE phone = p_student_phone 
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'No student found with phone number: %', p_student_phone;
    END IF;

    -- Check if already linked
    IF EXISTS (SELECT 1 FROM parent_links WHERE parent_id = p_parent_id AND student_id = v_student_id) THEN
        RAISE EXCEPTION 'Already linked to this student';
    END IF;

    -- Create link
    INSERT INTO parent_links (parent_id, student_id, student_phone, student_name, verification_status)
    VALUES (p_parent_id, v_student_id, p_student_phone, p_student_name, 'pending')
    RETURNING id INTO v_link_id;

    RETURN v_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve parent link
CREATE OR REPLACE FUNCTION approve_parent_link(
    p_link_id UUID,
    p_approver_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE parent_links 
    SET verification_status = 'approved',
        approved_by = p_approver_id,
        approved_at = NOW()
    WHERE id = p_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION link_parent_to_student TO authenticated;
GRANT EXECUTE ON FUNCTION approve_parent_link TO authenticated;
