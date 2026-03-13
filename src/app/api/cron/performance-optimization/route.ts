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
    const jobId = `perf_opt_${Date.now()}`;
    const supabase = createServerSupabaseClient();
    await logCronJob(supabase, 'performance-optimization', 'running', { jobId });

    const results = {
        apiEndpointsChecked: 0,
        cacheOptimizations: 0,
        performanceIssues: 0,
        alertsCreated: 0,
        errors: [] as string[],
    };

    try {
        // Step 1: Monitor API latency by testing key endpoints
        const endpointsToCheck = [
            { path: '/api/cron/health-monitor', label: 'Health Monitor' },
            { path: '/api/superbrain', label: 'Superbrain API' },
        ];

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://saviedutech.vercel.app';

        for (const endpoint of endpointsToCheck) {
            const t0 = Date.now();
            try {
                await fetch(`${baseUrl}${endpoint.path}`, {
                    method: 'GET',
                    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
                    signal: AbortSignal.timeout(5000),
                });
                const latency = Date.now() - t0;

                await (supabase as any).from('system_health').insert({
                    check_name: `api_latency_${endpoint.label.toLowerCase().replace(/\s/g, '_')}`,
                    status: latency > 3000 ? 'degraded' : 'healthy',
                    response_time_ms: latency,
                    checked_at: new Date().toISOString(),
                });

                if (latency > 3000) {
                    results.performanceIssues++;
                    results.alertsCreated++;
                    await (supabase as any).from('system_alerts').insert({
                        alert_type: 'high_api_latency',
                        severity: latency > 5000 ? 'critical' : 'warning',
                        message: `High latency detected: ${endpoint.label} responded in ${latency}ms`,
                        is_resolved: false,
                        created_at: new Date().toISOString(),
                    });
                }
                results.apiEndpointsChecked++;
            } catch (e) {
                results.errors.push(`Endpoint check failed: ${endpoint.path}`);
            }
        }

        // Step 2: Optimize caching — check for stale cache entries
        const { count: staleNotifications } = await (supabase as any)
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('is_read', true)
            .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        if ((staleNotifications ?? 0) > 1000) {
            // Delete old read notifications in batches
            await (supabase as any)
                .from('notifications')
                .delete()
                .eq('is_read', true)
                .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
            results.cacheOptimizations++;
        }

        // Step 3: Record resource usage snapshot
        await (supabase as any).from('system_health').insert({
            check_name: 'performance_optimization',
            status: results.performanceIssues > 0 ? 'degraded' : 'healthy',
            response_time_ms: Date.now() - startTime,
            checked_at: new Date().toISOString(),
        });

        const duration = Date.now() - startTime;
        await logCronJob(supabase, 'performance-optimization', 'success', results, duration);
        return NextResponse.json({ success: true, results, duration, jobId });
    } catch (error) {
        const duration = Date.now() - startTime;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(msg);
        await logCronJob(supabase, 'performance-optimization', 'failed', { error: msg }, duration);
        return NextResponse.json({ success: false, error: msg, results, jobId }, { status: 500 });
    }
}
