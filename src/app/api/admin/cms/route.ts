import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';

export async function GET() {
    try {
        const supabase = createAdminSupabaseClient();
        
        const { data, error } = await supabase
            .from('cms_pages')
            .select('*')
            .order('title', { ascending: true });

        if (error) {
            throw error;
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('CMS fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch CMS pages' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const supabase = createAdminSupabaseClient();

        const pageData = {
            slug: body.slug,
            title: body.title,
            hero_badge: body.hero_badge || null,
            hero_title: body.hero_title || null,
            hero_description: body.hero_description || null,
            seo_title: body.seo_title || null,
            seo_description: body.seo_description || null,
            content: body.content || {},
            is_published: body.is_published ?? true,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('cms_pages')
            .upsert(pageData as any, {
                onConflict: 'slug',
            });

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('CMS save error:', error);
        return NextResponse.json({ error: 'Failed to save CMS page' }, { status: 500 });
    }
}
