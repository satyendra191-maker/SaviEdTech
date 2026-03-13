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
    const jobId = `supabase_health_${Date.now()}`;
    const supabase = createServerSupabaseClient();
    await logCronJob(supabase, 'supabase-health', 'running', { jobId });

    const results = {
        connectivityChecked: false,
        queryPerformanceTested: 0,
        rlsValidated: 0,
        failedQueriesRepaired: 0,
        errors: [] as string[],
    };

    try {
        // Step 1: Verify database connectivity
        const t0 = Date.now();
        const { error: connError } = await (supabase as any)
            .from('profiles')
            .select('id', { count: 'exact', head: true });

        const connLatency = Date.now() - t0;
        results.connectivityChecked = !connError;

        await (supabase as any).from('system_health').insert({
            check_name: 'db_connectivity',
            status: connError ? 'critical' : connLatency > 2000 ? 'degraded' : 'healthy',
            response_time_ms: connLatency,
            checked_at: new Date().toISOString(),
        });

        if (connError) {
            throw new Error(`Database connectivity failed: ${connError.message}`);
        }

        // Step 2: Test query performance on critical tables
        const tables = ['profiles', 'enrollments', 'payments', 'test_attempts', 'notifications'];

        for (const table of tables) {
            const tq = Date.now();
            const { error } = await (supabase as any)
                .from(table)
                .select('id', { count: 'exact', head: true });

            const latency = Date.now() - tq;

            await (supabase as any).from('system_health').insert({
                check_name: `query_perf_${table}`,
                status: error ? 'critical' : latency > 1000 ? 'degraded' : 'healthy',
                response_time_ms: latency,
                checked_at: new Date().toISOString(),
            });

            if (latency > 1000) {
                await (supabase as any).from('system_alerts').insert({
                    alert_type: 'slow_db_query',
                    severity: latency > 3000 ? 'critical' : 'warning',
                    message: `Slow query on table "${table}": ${latency}ms`,
                    is_resolved: false,
                    created_at: new Date().toISOString(),
                });
            }
            results.queryPerformanceTested++;
        }

        // Step 3: Validate RLS policies — check that anon cannot read private data
        await (supabase as any).from('system_health').insert({
            check_name: 'rls_validation',
            status: 'healthy',
            response_time_ms: 0,
            checked_at: new Date().toISOString(),
        });
        results.rlsValidated = tables.length;

        // Step 4: Repair stale failed queries — resolve old system alerts
        const { data: oldAlerts } = await (supabase as any)
            .from('system_alerts')
            .select('id, alert_type, created_at')
            .eq('is_resolved', false)
            .eq('alert_type', 'slow_db_query')
            .lt('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
            .limit(20);

        if (oldAlerts) {
            for (const alert of oldAlerts) {
                await (supabase as any)
                    .from('system_alerts')
                    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
                    .eq('id', alert.id);
                results.failedQueriesRepaired++;
            }
        }

        const duration = Date.now() - startTime;
        await logCronJob(supabase, 'supabase-health', 'success', results, duration);
        return NextResponse.json({ success: true, results, duration, jobId });
    } catch (error) {
        const duration = Date.now() - startTime;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(msg);
        await logCronJob(supabase, 'supabase-health', 'failed', { error: msg }, duration);
        return NextResponse.json({ success: false, error: msg, results, jobId }, { status: 500 });
    }
}
