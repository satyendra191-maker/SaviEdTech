ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'admin', 'content_manager', 'super_admin', 'parent', 'hr', 'finance_manager', 'accounts_manager'));

INSERT INTO public.roles (name, slug, description, is_system)
VALUES ('Accounts Manager', 'accounts_manager', 'Accounting operations and role-based reporting exports.', TRUE)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.cms_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    hero_badge TEXT,
    hero_title TEXT,
    hero_description TEXT,
    seo_title TEXT,
    seo_description TEXT,
    content JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL DEFAULT '',
    cover_image_url TEXT,
    seo_title TEXT,
    seo_description TEXT,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'scheduled')),
    editor_roles TEXT[] NOT NULL DEFAULT ARRAY['admin', 'super_admin', 'content_manager']::TEXT[],
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_report_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_slug TEXT NOT NULL UNIQUE,
    can_generate BOOLEAN NOT NULL DEFAULT FALSE,
    available_formats TEXT[] NOT NULL DEFAULT ARRAY['pdf', 'xlsx', 'json', 'docx']::TEXT[],
    custom_fields JSONB NOT NULL DEFAULT '[]'::JSONB,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.internal_chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    thread_type TEXT NOT NULL
        CHECK (thread_type IN ('direct', 'role', 'group', 'announcement')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_role TEXT,
    latest_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.internal_chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.internal_chat_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_at_join TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    UNIQUE (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.internal_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.internal_chat_threads(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL DEFAULT '',
    attachment_name TEXT,
    attachment_path TEXT,
    attachment_mime TEXT,
    attachment_size BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_slug
    ON public.cms_pages(slug);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status
    ON public.blog_posts(status);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at
    ON public.blog_posts(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_role_report_permissions_role_slug
    ON public.role_report_permissions(role_slug);

CREATE INDEX IF NOT EXISTS idx_internal_chat_threads_latest_message_at
    ON public.internal_chat_threads(latest_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_internal_chat_threads_target_role
    ON public.internal_chat_threads(target_role);

CREATE INDEX IF NOT EXISTS idx_internal_chat_participants_user_id
    ON public.internal_chat_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_internal_chat_messages_thread_id_created_at
    ON public.internal_chat_messages(thread_id, created_at DESC);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'update_updated_at_column'
          AND pg_function_is_visible(oid)
    ) THEN
        DROP TRIGGER IF EXISTS update_cms_pages_updated_at ON public.cms_pages;
        CREATE TRIGGER update_cms_pages_updated_at
        BEFORE UPDATE ON public.cms_pages
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
        CREATE TRIGGER update_blog_posts_updated_at
        BEFORE UPDATE ON public.blog_posts
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_role_report_permissions_updated_at ON public.role_report_permissions;
        CREATE TRIGGER update_role_report_permissions_updated_at
        BEFORE UPDATE ON public.role_report_permissions
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_internal_chat_threads_updated_at ON public.internal_chat_threads;
        CREATE TRIGGER update_internal_chat_threads_updated_at
        BEFORE UPDATE ON public.internal_chat_threads
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

INSERT INTO public.cms_pages (slug, title, hero_badge, hero_title, hero_description, seo_title, seo_description, content)
VALUES
    (
        'home',
        'Homepage',
        'SaviEduTech Driven Learning Platform',
        'Learn JEE, NEET, and Board Concepts with clarity and speed',
        'Explore guided video lectures, practice, exams, AI support, and a cleaner public experience.',
        'Homepage - SaviEduTech',
        'AI-powered digital coaching for JEE, NEET, Board, and Foundation preparation.',
        jsonb_build_object(
            'motivational_messages', jsonb_build_array(
                'Consistency beats talent.',
                'Dream big, work daily.',
                'Success is built one concept at a time.',
                'Your future is created by what you learn today.'
            ),
            'achievements', jsonb_build_array(
                jsonb_build_object('name', 'Aarav Sharma', 'exam', 'JEE Advanced', 'title', 'AIR Rank 42', 'year', '2025', 'image', ''),
                jsonb_build_object('name', 'Diya Patel', 'exam', 'NEET', 'title', 'NEET Qualified', 'year', '2025', 'image', ''),
                jsonb_build_object('name', 'Vivaan Mehta', 'exam', 'Gujarat Board', 'title', 'State Topper', 'year', '2025', 'image', ''),
                jsonb_build_object('name', 'Ananya Desai', 'exam', 'JEE Main', 'title', '99.8 Percentile', 'year', '2025', 'image', ''),
                jsonb_build_object('name', 'Krish Verma', 'exam', 'Foundation', 'title', 'National Olympiad Finalist', 'year', '2025', 'image', '')
            )
        )
    ),
    (
        'courses',
        'Courses',
        'Preparation Tracks',
        'Courses, mock practice, analytics, and premium access',
        'Choose your exam path and move directly into lectures, practice, tests, and AI-guided support.',
        'Courses - SaviEduTech',
        'Explore JEE, NEET, Board, and Foundation learning tracks on SaviEduTech.',
        '{}'::JSONB
    ),
    (
        'faculty',
        'Faculty',
        'Meet the Team',
        'Expert teachers and AI-backed academic guidance',
        'Meet the SaviEduTech faculty guiding Physics, Chemistry, Mathematics, and Biology preparation.',
        'Faculty - SaviEduTech',
        'Meet the expert faculty members of SaviEduTech.',
        '{}'::JSONB
    ),
    (
        'careers',
        'Careers',
        'Join Our Mission',
        'Build the future of education with SaviEduTech',
        'Open positions across engineering, content, growth, and support for a national learning platform.',
        'Careers - SaviEduTech',
        'Explore jobs and opportunities at SaviEduTech.',
        '{}'::JSONB
    ),
    (
        'contact',
        'Contact',
        'Get in Touch',
        'Talk to the SaviEduTech team',
        'Reach out for admissions, content guidance, support, partnerships, or general questions.',
        'Contact - SaviEduTech',
        'Contact the SaviEduTech support and admissions team.',
        '{}'::JSONB
    ),
    (
        'dashboard-student',
        'Student Dashboard',
        'Student Dashboard',
        'Daily momentum matters',
        'Use today''s dashboard to continue lectures, practice, analytics, and revision without friction.',
        'Student Dashboard - SaviEduTech',
        'Personalized student dashboard content.',
        '{}'::JSONB
    )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.role_report_permissions (role_slug, can_generate, available_formats, custom_fields)
VALUES
    ('student', TRUE, ARRAY['pdf', 'xlsx', 'json', 'docx']::TEXT[], '[]'::JSONB),
    ('parent', TRUE, ARRAY['pdf', 'xlsx', 'json', 'docx']::TEXT[], '[]'::JSONB),
    ('content_manager', TRUE, ARRAY['pdf', 'xlsx', 'json', 'docx']::TEXT[], '[]'::JSONB),
    ('hr', TRUE, ARRAY['pdf', 'xlsx', 'json', 'docx']::TEXT[], '[]'::JSONB),
    ('finance_manager', TRUE, ARRAY['pdf', 'xlsx', 'json', 'docx']::TEXT[], '[]'::JSONB),
    ('accounts_manager', TRUE, ARRAY['pdf', 'xlsx', 'json', 'docx']::TEXT[], '[]'::JSONB),
    ('admin', TRUE, ARRAY['pdf', 'xlsx', 'json', 'docx']::TEXT[], '[]'::JSONB),
    ('super_admin', TRUE, ARRAY['pdf', 'xlsx', 'json', 'docx']::TEXT[], '[]'::JSONB)
ON CONFLICT (role_slug) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('internal-communications', 'internal-communications', FALSE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_report_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cms_pages_public_read ON public.cms_pages;
CREATE POLICY cms_pages_public_read ON public.cms_pages
FOR SELECT
USING (is_published = TRUE);

DROP POLICY IF EXISTS cms_pages_admin_manage ON public.cms_pages;
CREATE POLICY cms_pages_admin_manage ON public.cms_pages
FOR ALL
USING (public.has_any_role(ARRAY['admin', 'super_admin', 'content_manager']))
WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'content_manager']));

DROP POLICY IF EXISTS blog_posts_public_read ON public.blog_posts;
CREATE POLICY blog_posts_public_read ON public.blog_posts
FOR SELECT
USING (status = 'published' OR public.has_any_role(ARRAY['admin', 'super_admin', 'content_manager']));

DROP POLICY IF EXISTS blog_posts_manage ON public.blog_posts;
CREATE POLICY blog_posts_manage ON public.blog_posts
FOR ALL
USING (public.has_any_role(ARRAY['admin', 'super_admin', 'content_manager']))
WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'content_manager']));

DROP POLICY IF EXISTS role_report_permissions_read ON public.role_report_permissions;
CREATE POLICY role_report_permissions_read ON public.role_report_permissions
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS role_report_permissions_manage ON public.role_report_permissions;
CREATE POLICY role_report_permissions_manage ON public.role_report_permissions
FOR ALL
USING (public.has_any_role(ARRAY['admin', 'super_admin']))
WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin']));

DROP POLICY IF EXISTS internal_chat_threads_participant_read ON public.internal_chat_threads;
CREATE POLICY internal_chat_threads_participant_read ON public.internal_chat_threads
FOR SELECT
USING (
    public.has_any_role(ARRAY['admin', 'super_admin'])
    OR EXISTS (
        SELECT 1
        FROM public.internal_chat_participants p
        WHERE p.thread_id = internal_chat_threads.id
          AND p.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS internal_chat_threads_admin_manage ON public.internal_chat_threads;
CREATE POLICY internal_chat_threads_admin_manage ON public.internal_chat_threads
FOR ALL
USING (public.has_any_role(ARRAY['admin', 'super_admin', 'content_manager', 'hr', 'finance_manager', 'accounts_manager']))
WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'content_manager', 'hr', 'finance_manager', 'accounts_manager']));

DROP POLICY IF EXISTS internal_chat_participants_read ON public.internal_chat_participants;
CREATE POLICY internal_chat_participants_read ON public.internal_chat_participants
FOR SELECT
USING (
    user_id = auth.uid()
    OR public.has_any_role(ARRAY['admin', 'super_admin'])
    OR EXISTS (
        SELECT 1
        FROM public.internal_chat_threads t
        WHERE t.id = internal_chat_participants.thread_id
          AND t.created_by = auth.uid()
    )
);

DROP POLICY IF EXISTS internal_chat_participants_manage ON public.internal_chat_participants;
CREATE POLICY internal_chat_participants_manage ON public.internal_chat_participants
FOR ALL
USING (public.has_any_role(ARRAY['admin', 'super_admin', 'content_manager', 'hr', 'finance_manager', 'accounts_manager']))
WITH CHECK (public.has_any_role(ARRAY['admin', 'super_admin', 'content_manager', 'hr', 'finance_manager', 'accounts_manager']));

DROP POLICY IF EXISTS internal_chat_messages_participant_read ON public.internal_chat_messages;
CREATE POLICY internal_chat_messages_participant_read ON public.internal_chat_messages
FOR SELECT
USING (
    public.has_any_role(ARRAY['admin', 'super_admin'])
    OR EXISTS (
        SELECT 1
        FROM public.internal_chat_participants p
        WHERE p.thread_id = internal_chat_messages.thread_id
          AND p.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS internal_chat_messages_participant_write ON public.internal_chat_messages;
CREATE POLICY internal_chat_messages_participant_write ON public.internal_chat_messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.internal_chat_participants p
        WHERE p.thread_id = internal_chat_messages.thread_id
          AND p.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS internal_chat_messages_sender_update ON public.internal_chat_messages;
CREATE POLICY internal_chat_messages_sender_update ON public.internal_chat_messages
FOR UPDATE
USING (
    sender_id = auth.uid()
    OR public.has_any_role(ARRAY['admin', 'super_admin'])
)
WITH CHECK (
    sender_id = auth.uid()
    OR public.has_any_role(ARRAY['admin', 'super_admin'])
);
