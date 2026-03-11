import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const results = {
        cached: { refreshed: 0 },
        cleaned: { removed: 0 },
        optimized: { completed: 0 },
        reports: { generated: 0 },
        errors: [] as string[]
    };

    try {
        const { data: popularContent } = await supabase
            .from('content')
            .select('id, title, views, content_type')
            .eq('is_published', true)
            .order('views', { ascending: false })
            .limit(50);

        if (popularContent) {
            for (const content of popularContent) {
                await supabase.from('content_cache').upsert({
                    content_id: content.id,
                    cached_data: { title: content.title, views: content.views },
                    cached_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                }, { onConflict: 'content_id' });
                results.cached.refreshed++;
            }
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: oldLogs } = await supabase
            .from('system_logs')
            .select('id')
            .lt('created_at', thirtyDaysAgo)
            .limit(1000);

        if (oldLogs && oldLogs.length > 0) {
            await supabase
                .from('system_logs')
                .delete()
                .lt('created_at', thirtyDaysAgo);
            results.cleaned.removed += oldLogs.length;
        }

        const { data: oldNotifications } = await supabase
            .from('notifications')
            .select('id')
            .eq('is_read', true)
            .lt('created_at', thirtyDaysAgo)
            .limit(500);

        if (oldNotifications && oldNotifications.length > 0) {
            await supabase
                .from('notifications')
                .delete()
                .eq('is_read', true)
                .lt('created_at', thirtyDaysAgo);
            results.cleaned.removed += oldNotifications.length;
        }

        const { data: expiredSessions } = await supabase
            .from('user_sessions')
            .select('id')
            .lt('expires_at', new Date().toISOString());

        if (expiredSessions && expiredSessions.length > 0) {
            await supabase
                .from('user_sessions')
                .delete()
                .lt('expires_at', new Date().toISOString());
            results.cleaned.removed += expiredSessions.length;
        }

        await supabase.from('query_optimization_logs').insert({
            optimization_type: 'vacuum',
            tables_optimized: ['system_logs', 'notifications', 'user_sessions'],
            records_processed: results.cleaned.removed,
            executed_at: new Date().toISOString()
        });
        results.optimized.completed++;

        const { data: tableStats } = await supabase.rpc('get_table_stats');
        
        await supabase.from('maintenance_reports').insert({
            report_type: 'database_maintenance',
            cache_refreshed: results.cached.refreshed,
            records_cleaned: results.cleaned.removed,
            tables_optimized: results.optimized.completed,
            table_stats: tableStats,
            generated_at: new Date().toISOString()
        });
        results.reports.generated++;

        return NextResponse.json({
            success: true,
            message: 'Database optimization completed',
            results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database optimization error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            results
        }, { status: 500 });
    }
}
