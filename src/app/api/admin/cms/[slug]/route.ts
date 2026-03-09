import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const supabase = createAdminSupabaseClient();
        
        const { data, error } = await supabase
            .from('cms_pages')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return NextResponse.json({ error: 'Page not found' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('CMS fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch CMS page' }, { status: 500 });
    }
}
