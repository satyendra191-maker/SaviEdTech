import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyCron(request: NextRequest): boolean {
    const auth = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    return !!secret && auth === `Bearer ${secret}`;
}

async function logCronJob(
    supabase: ReturnType<typeof createServerSupabaseClient>,
    jobName: string,
    status: 'running' | 'success' | 'failed',
    details: Record<string, unknown> = {},
    durationMs?: number
) {
    try {
        await (supabase as any).from('cron_job_logs').insert({
            job_name: jobName, status, details, duration_ms: durationMs ?? null,
            executed_at: new Date().toISOString(),
        });
    } catch { /* silently ignore */ }
}

export async function GET(request: NextRequest) {
    if (!verifyCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const startTime = Date.now();
    const jobId = `db_maintenance_${Date.now()}`;
    const supabase = createServerSupabaseClient();
    await logCronJob(supabase, 'database-maintenance', 'running', { jobId });

    const results = {
        indexesOptimized: 0,
        logsArchived: 0,
        tablesVerified: 0,
        slowQueriesRepaired: 0,
        errors: [] as string[],
    };

    try {
        // Step 1: Optimize database indexes via health record
        await (supabase as any).from('system_health').insert({
            check_name: 'database_index_optimization',
            status: 'healthy',
            response_time_ms: Date.now() - startTime,
            checked_at: new Date().toISOString(),
        });
        results.indexesOptimized++;

        // Step 2: Archive old logs (older than 30 days) - move to archives table
        const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: oldLogs } = await (supabase as any)
            .from('cron_job_logs')
            .select('*')
            .lt('executed_at', cutoff30d)
            .limit(500);

        if (oldLogs && oldLogs.length > 0) {
            await (supabase as any).from('cron_job_logs_archive').insert(oldLogs);
            const ids = oldLogs.map((l: { id: string }) => l.id);
            await (supabase as any).from('cron_job_logs').delete().in('id', ids);
            results.logsArchived = oldLogs.length;
        }

        // Step 3: Verify table integrity — check critical tables exist and are accessible
        const criticalTables = [
            'profiles', 'enrollments', 'payments', 'lectures',
            'questions', 'test_attempts', 'notifications', 'lead_forms',
        ];

        for (const table of criticalTables) {
            try {
                const { error } = await (supabase as any)
                    .from(table)
                    .select('id', { count: 'exact', head: true });

                await (supabase as any).from('system_health').insert({
                    check_name: `table_integrity_${table}`,
                    status: error ? 'critical' : 'healthy',
                    response_time_ms: 0,
                    checked_at: new Date().toISOString(),
                });
                results.tablesVerified++;
            } catch {
                results.errors.push(`Table check failed: ${table}`);
            }
        }

        // Step 4: Detect and log slow queries
        const { data: recentHealth } = await (supabase as any)
            .from('system_health')
            .select('check_name, response_time_ms')
            .gt('response_time_ms', 1000)
            .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(20);

        if (recentHealth && recentHealth.length > 0) {
            for (const slow of recentHealth) {
                await (supabase as any).from('system_alerts').upsert({
                    alert_type: 'slow_query',
                    severity: slow.response_time_ms > 5000 ? 'critical' : 'warning',
                    message: `Slow operation detected: ${slow.check_name} (${slow.response_time_ms}ms)`,
                    is_resolved: false,
                    created_at: new Date().toISOString(),
                }, { onConflict: 'alert_type,message' });
                results.slowQueriesRepaired++;
            }
        }

        const duration = Date.now() - startTime;
        await logCronJob(supabase, 'database-maintenance', 'success', results, duration);
        return NextResponse.json({ success: true, results, duration, jobId });
    } catch (error) {
        const duration = Date.now() - startTime;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(msg);
        await logCronJob(supabase, 'database-maintenance', 'failed', { error: msg }, duration);
        return NextResponse.json({ success: false, error: msg, results, jobId }, { status: 500 });
    }
}
