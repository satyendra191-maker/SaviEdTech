import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';

/**
 * CRON Job: Lecture Publisher
 * Runs at 2:00 AM daily
 * Publishes scheduled lectures
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();
    const results = {
        published: 0,
        errors: [] as string[],
        timestamp: new Date().toISOString(),
    };

    try {
        // Find lectures scheduled for today or earlier that aren't published
        const { data: lectures, error: fetchError } = await supabase
            .from('lectures')
            .select('id, title, scheduled_at')
            .eq('is_published', false)
            .lte('scheduled_at', new Date().toISOString()) as any;

        if (fetchError) throw fetchError;

        for (const lecture of (lectures as any[]) ?? []) {
            const updateData: Record<string, unknown> = {
                is_published: true,
                published_at: new Date().toISOString(),
            };
            // @ts-expect-error - Supabase type inference issue
            const { error: updateError } = await supabase.from('lectures').update(updateData).eq('id', lecture.id);

            if (updateError) {
                results.errors.push(`Failed to publish ${lecture.title}: ${updateError.message}`);
            } else {
                results.published++;
            }
        }

        // Log success
        await supabase.from('system_health').insert({
            check_name: 'lecture_publisher',
            status: results.errors.length > 0 ? 'degraded' : 'healthy',
            details: results,
        } as any);

        return NextResponse.json({
            success: true,
            message: `Published ${results.published} lectures`,
            results,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await supabase.from('error_logs').insert({
            error_type: 'cron_job_failed',
            error_message: `Lecture Publisher failed: ${errorMessage}`,
            metadata: { results },
        } as any);

        return NextResponse.json(
            { success: false, error: errorMessage, results },
            { status: 500 }
        );
    }
}
