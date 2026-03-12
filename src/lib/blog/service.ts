import { createAdminSupabaseClient } from '@/lib/supabase';

export type BlogPostStatus = 'draft' | 'published' | 'scheduled';

export interface BlogPostRecord {
    id?: string;
    slug: string;
    title: string;
    excerpt?: string | null;
    content: string;
    cover_image_url?: string | null;
    seo_title?: string | null;
    seo_description?: string | null;
    tags?: string[];
    categories?: string[];
    status?: BlogPostStatus;
    editor_roles?: string[];
    author_id?: string | null;
    published_at?: string | null;
    scheduled_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

function getBlogTable() {
    return (createAdminSupabaseClient() as any).from('blog_posts');
}

export async function getPublishedBlogPosts(): Promise<BlogPostRecord[]> {
    try {
        const { data, error } = await getBlogTable()
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false });

        if (error || !data) {
            return [];
        }

        return data as BlogPostRecord[];
    } catch {
        return [];
    }
}

export async function getAllBlogPosts(): Promise<BlogPostRecord[]> {
    const { data, error } = await getBlogTable()
        .select('*')
        .order('updated_at', { ascending: false });

    if (error || !data) {
        return [];
    }

    return data as BlogPostRecord[];
}

export async function upsertBlogPost(input: BlogPostRecord) {
    const { error } = await getBlogTable().upsert({
        id: input.id,
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt || null,
        content: input.content,
        cover_image_url: input.cover_image_url || null,
        seo_title: input.seo_title || null,
        seo_description: input.seo_description || null,
        tags: input.tags || [],
        categories: input.categories || [],
        status: input.status || 'draft',
        editor_roles: input.editor_roles || ['admin', 'content_manager'],
        author_id: input.author_id || null,
        published_at: input.published_at || (input.status === 'published' ? new Date().toISOString() : null),
        scheduled_at: input.scheduled_at || null,
    });

    if (error) {
        throw error;
    }
}

export async function deleteBlogPost(id: string) {
    const { error } = await getBlogTable().delete().eq('id', id);

    if (error) {
        throw error;
    }
}
