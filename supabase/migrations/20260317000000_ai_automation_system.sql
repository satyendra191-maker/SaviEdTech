-- AI Content Processing System Tables
-- Handles PDF, eBook, Audio, Video content extraction and processing

-- Processed Content Table
CREATE TABLE IF NOT EXISTS ai_processed_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    topics TEXT[] DEFAULT '{}',
    key_concepts JSONB DEFAULT '{}',
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'ebook', 'audio', 'video', 'document', 'url')),
    source_url TEXT,
    metadata JSONB DEFAULT '{}',
    processed_by UUID REFERENCES auth.users(id),
    parent_content_id UUID REFERENCES ai_processed_content(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Video Generation Table
CREATE TABLE IF NOT EXISTS ai_video_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id UUID REFERENCES lectures(id),
    content_id UUID REFERENCES ai_processed_content(id),
    narration_script TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    video_url TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'published', 'failed')),
    youtube_video_id TEXT,
    youtube_url TEXT,
    style TEXT DEFAULT 'classroom',
    language TEXT DEFAULT 'english',
    generation_params JSONB DEFAULT '{}',
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Avatar Configurations
CREATE TABLE IF NOT EXISTS ai_avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    avatar_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('heygen', 'd-id', 'synthesia', 'custom')),
    style TEXT NOT NULL,
    preview_url TEXT,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role Performance Tracking
CREATE TABLE IF NOT EXISTS ai_role_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_type TEXT NOT NULL CHECK (role_type IN ('faculty', 'student', 'parent', 'admin', 'ai_tutor')),
    entity_id UUID NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}',
    ai_generated_content_count INTEGER DEFAULT 0,
    ai_video_minutes INTEGER DEFAULT 0,
    dpp_generated_count INTEGER DEFAULT 0,
    lectures_delivered INTEGER DEFAULT 0,
    students_engaged INTEGER DEFAULT 0,
    avg_engagement_score DECIMAL(5,2),
    performance_score DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Automation Jobs
CREATE TABLE IF NOT EXISTS ai_automation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL CHECK (job_type IN ('content_processing', 'video_generation', 'dpp_generation', 'youtube_upload', 'batch_processing')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 5,
    input_data JSONB NOT NULL DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    progress_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    triggered_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ai_processed_content;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_video_generations;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_role_performance;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_automation_jobs;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_processed_content_source_type ON ai_processed_content(source_type);
CREATE INDEX IF NOT EXISTS idx_ai_processed_content_processed_by ON ai_processed_content(processed_by);
CREATE INDEX IF NOT EXISTS idx_ai_video_generations_status ON ai_video_generations(status);
CREATE INDEX IF NOT EXISTS idx_ai_video_generations_lecture_id ON ai_video_generations(lecture_id);
CREATE INDEX IF NOT EXISTS idx_ai_role_performance_entity ON ai_role_performance(role_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_role_performance_period ON ai_role_performance(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_ai_automation_jobs_status ON ai_automation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_automation_jobs_type ON ai_automation_jobs(job_type);

-- RLS Policies
ALTER TABLE ai_processed_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_video_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_role_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_automation_jobs ENABLE ROW LEVEL SECURITY;

-- Processed Content Policies
CREATE POLICY "Processed content read access" ON ai_processed_content
    FOR SELECT USING (true);

CREATE POLICY "Processed content insert access" ON ai_processed_content
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Processed content update access" ON ai_processed_content
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Video Generation Policies
CREATE POLICY "Video generation read access" ON ai_video_generations
    FOR SELECT USING (true);

CREATE POLICY "Video generation insert access" ON ai_video_generations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Avatars Policies
CREATE POLICY "Avatars read access" ON ai_avatars
    FOR SELECT USING (is_active = true);

CREATE POLICY "Avatars admin access" ON ai_avatars
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Role Performance Policies
CREATE POLICY "Role performance read access" ON ai_role_performance
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Role performance insert access" ON ai_role_performance
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'hr'));

-- Automation Jobs Policies
CREATE POLICY "Automation jobs read access" ON ai_automation_jobs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Automation jobs insert access" ON ai_automation_jobs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert default AI Avatars
INSERT INTO ai_avatars (name, avatar_id, provider, style, is_active) VALUES
    ('Dr. Amit Sharma', 'amit_sharma_avatar', 'heygen', 'professor', true),
    ('Prof. Priya Menon', 'priya_menon_avatar', 'heygen', 'professor', true),
    ('Dr. Rajesh Kumar', 'rajesh_kumar_avatar', 'd-id', 'tutor', true),
    ('Ms. Anjali Singh', 'anjali_singh_avatar', 'synthesia', 'instructor', true)
ON CONFLICT DO NOTHING;
