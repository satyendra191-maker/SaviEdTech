-- Add fields for AI Doubt Solver video generation tracking
ALTER TABLE IF EXISTS public.video_generation_queue 
    ADD COLUMN IF NOT EXISTS request_source VARCHAR(100),
    ADD COLUMN IF NOT EXISTS request_metadata JSONB DEFAULT '{}';

-- Create index for faster queries on request_source
CREATE INDEX IF NOT EXISTS idx_video_generation_source 
    ON public.video_generation_queue(request_source) 
    WHERE request_source IS NOT NULL;
