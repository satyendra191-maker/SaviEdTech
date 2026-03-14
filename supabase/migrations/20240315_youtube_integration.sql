-- YouTube Videos Integration Table
-- Run this migration to enable YouTube video sync

CREATE TABLE IF NOT EXISTS youtube_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    video_url TEXT NOT NULL,
    duration INTEGER DEFAULT 0,
    lecture_id UUID,
    course_id UUID,
    is_published BOOLEAN DEFAULT false,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_youtube_videos_youtube_id ON youtube_videos(youtube_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_synced_at ON youtube_videos(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_lecture_id ON youtube_videos(lecture_id);

-- Enable RLS
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "youtube_videos_read_access" ON youtube_videos
    FOR SELECT TO authenticated USING (true);

-- Allow insert/update for service role
CREATE POLICY "youtube_videos_admin_access" ON youtube_videos
    FOR ALL TO service_role USING (true);

COMMENT ON TABLE youtube_videos IS 'Stores YouTube videos synced from your channel for use as lecture content';
