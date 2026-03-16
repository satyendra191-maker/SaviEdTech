BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.current_profile_role(COALESCE(p_user_id, auth.uid())) = ANY(
        ARRAY['admin', 'super_admin', 'platform_admin', 'academic_director']
    );
$$;

CREATE OR REPLACE FUNCTION public.is_content_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.current_profile_role(COALESCE(p_user_id, auth.uid())) = ANY(
        ARRAY[
            'admin',
            'super_admin',
            'platform_admin',
            'academic_director',
            'content_manager',
            'video_production_manager',
            'ai_content_trainer',
            'ai_trainer'
        ]
    );
$$;

CREATE OR REPLACE FUNCTION public.is_careers_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.current_profile_role(COALESCE(p_user_id, auth.uid())) = ANY(
        ARRAY[
            'admin',
            'super_admin',
            'platform_admin',
            'academic_director',
            'content_manager',
            'hr',
            'hr_manager'
        ]
    );
$$;

COMMIT;
