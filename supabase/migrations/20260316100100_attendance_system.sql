-- Attendance System
BEGIN;

-- Live Class Attendees with enhanced tracking
ALTER TABLE public.live_class_attendees
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    ADD COLUMN IF NOT EXISTS join_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS leave_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Attendance Sessions (for bulk attendance)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id UUID REFERENCES public.live_classes(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    subject TEXT,
    class_level TEXT,
    session_date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    total_students INTEGER DEFAULT 0,
    present_count INTEGER DEFAULT 0,
    absent_count INTEGER DEFAULT 0,
    late_count INTEGER DEFAULT 0,
    marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_finalized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(live_class_id, session_date)
);

-- Individual Attendance Records
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    remarks TEXT,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class ON attendance_sessions(class_level, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course ON attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(created_at DESC);

-- RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Attendance Sessions Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'attendance_sessions_select' AND tablename = 'attendance_sessions') THEN
        CREATE POLICY attendance_sessions_select ON public.attendance_sessions
            FOR SELECT TO authenticated
            USING (TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'attendance_sessions_manage' AND tablename = 'attendance_sessions') THEN
        CREATE POLICY attendance_sessions_manage ON public.attendance_sessions
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'teacher', 'hr')));
    END IF;
END $$;

-- Attendance Records Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'attendance_records_select' AND tablename = 'attendance_records') THEN
        CREATE POLICY attendance_records_select ON public.attendance_records
            FOR SELECT TO authenticated
            USING (
                student_id = auth.uid() 
                OR marked_by = auth.uid()
                OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'teacher', 'hr', 'parent'))
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'attendance_records_insert' AND tablename = 'attendance_records') THEN
        CREATE POLICY attendance_records_insert ON public.attendance_records
            FOR INSERT TO authenticated
            WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'teacher', 'hr')));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'attendance_records_update' AND tablename = 'attendance_records') THEN
        CREATE POLICY attendance_records_update ON public.attendance_records
            FOR UPDATE TO authenticated
            USING (
                marked_by = auth.uid()
                OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'teacher', 'hr'))
            );
    END IF;
END $$;

-- Realtime for attendance
ALTER TABLE public.attendance_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_sessions;

ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;

COMMIT;
