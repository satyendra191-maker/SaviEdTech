import { createAdminSupabaseClient } from '@/lib/supabase';

export interface CmsPageContent {
    slug: string;
    title: string;
    hero_badge?: string | null;
    hero_title?: string | null;
    hero_description?: string | null;
    seo_title?: string | null;
    seo_description?: string | null;
    content?: Record<string, unknown>;
    is_published?: boolean;
}

function getCmsTable() {
    return (createAdminSupabaseClient() as any).from('cms_pages');
}

export async function getCmsPage(slug: string): Promise<CmsPageContent | null> {
    try {
        const { data, error } = await getCmsTable()
            .select('*')
            .eq('slug', slug)
            .eq('is_published', true)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        return data as CmsPageContent;
    } catch {
        return null;
    }
}

export async function getCmsPages(): Promise<CmsPageContent[]> {
    const { data, error } = await getCmsTable()
        .select('*')
        .order('slug', { ascending: true });

    if (error || !data) {
        return [];
    }

    return data as CmsPageContent[];
}

export async function upsertCmsPage(input: CmsPageContent & { updated_by?: string | null }) {
    const { error } = await getCmsTable().upsert({
        slug: input.slug,
        title: input.title,
        hero_badge: input.hero_badge || null,
        hero_title: input.hero_title || null,
        hero_description: input.hero_description || null,
        seo_title: input.seo_title || null,
        seo_description: input.seo_description || null,
        content: input.content || {},
        is_published: input.is_published ?? true,
        updated_by: input.updated_by || null,
    }, {
        onConflict: 'slug',
    });

    if (error) {
        throw error;
    }
}

export function mergeCmsContent<T extends Record<string, unknown>>(fallback: T, page: CmsPageContent | null): T {
    return {
        ...fallback,
        ...(page?.content || {}),
    };
}
