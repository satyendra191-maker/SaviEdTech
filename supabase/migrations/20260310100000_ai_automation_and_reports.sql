-- AI AUTOMATION + REPORTING SUPPORT
-- Adds storage support for doubt image uploads and tightens lookup performance

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'doubt-images',
    'doubt-images',
    true,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE INDEX IF NOT EXISTS idx_doubt_responses_created_at
    ON public.doubt_responses (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_plan_items_plan_date
    ON public.study_plan_items (plan_id, scheduled_date);

COMMIT;
