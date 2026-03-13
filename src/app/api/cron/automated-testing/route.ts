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
    const jobId = `automated_testing_${Date.now()}`;
    const supabase = createServerSupabaseClient();
    await logCronJob(supabase, 'automated-testing', 'running', { jobId });

    const results = {
        frontendTests: { passed: 0, failed: 0 },
        backendTests: { passed: 0, failed: 0 },
        dbTests: { passed: 0, failed: 0 },
        aiModuleTests: { passed: 0, failed: 0 },
        errors: [] as string[],
    };

    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
            ? process.env.NEXT_PUBLIC_APP_URL
            : 'https://saviedutech.vercel.app';

        // ── Frontend / page load tests ───────────────────────────────────────
        const frontendPages = ['/', '/about', '/courses', '/leaderboard', '/donate'];
        for (const page of frontendPages) {
            try {
                const res = await fetch(`${baseUrl}${page}`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(8000),
                });
                if (res.ok) results.frontendTests.passed++;
                else results.frontendTests.failed++;
            } catch {
                results.frontendTests.failed++;
                results.errors.push(`Page ${page} unreachable`);
            }
        }

        // ── Backend API health checks ─────────────────────────────────────────
        const apiRoutes = [
            '/api/cron/student-analytics',
            '/api/cron/system-health',
        ];
        for (const route of apiRoutes) {
            try {
                const res = await fetch(`${baseUrl}${route}`, {
                    method: 'GET',
                    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
                    signal: AbortSignal.timeout(10000),
                });
                if (res.status !== 401 && res.status !== 0) results.backendTests.passed++;
                else results.backendTests.failed++;
            } catch {
                results.backendTests.failed++;
                results.errors.push(`API ${route} unreachable`);
            }
        }

        // ── Database query validation ─────────────────────────────────────────
        const dbChecks = [
            async () => {
                const { error } = await (supabase as any).from('profiles').select('id').limit(1);
                return !error;
            },
            async () => {
                const { error } = await (supabase as any).from('payments').select('id').limit(1);
                return !error;
            },
            async () => {
                const { error } = await (supabase as any).from('lectures').select('id').limit(1);
                return !error;
            },
            async () => {
                const { error } = await (supabase as any).from('notifications').select('id').limit(1);
                return !error;
            },
        ];

        for (const check of dbChecks) {
            try {
                const ok = await check();
                if (ok) results.dbTests.passed++;
                else results.dbTests.failed++;
            } catch {
                results.dbTests.failed++;
            }
        }

        // ── AI module tests ───────────────────────────────────────────────────
        const aiTables = ['questions', 'mock_tests', 'lectures', 'student_analytics'];
        for (const table of aiTables) {
            try {
                const { error } = await (supabase as any).from(table).select('id').limit(1);
                if (!error) results.aiModuleTests.passed++;
                else results.aiModuleTests.failed++;
            } catch {
                results.aiModuleTests.failed++;
            }
        }

        // Store test results
        const totalFailed = results.frontendTests.failed + results.backendTests.failed +
            results.dbTests.failed + results.aiModuleTests.failed;

        await (supabase as any).from('system_health').insert({
            check_name: 'automated_testing',
            status: totalFailed > 0 ? (totalFailed > 5 ? 'critical' : 'degraded') : 'healthy',
            response_time_ms: Date.now() - startTime,
            checked_at: new Date().toISOString(),
        });

        if (totalFailed > 0) {
            await (supabase as any).from('system_alerts').insert({
                alert_type: 'test_failures',
                severity: totalFailed > 5 ? 'critical' : 'warning',
                message: `Automated testing found ${totalFailed} failures`,
                is_resolved: false,
                metadata: { results },
                created_at: new Date().toISOString(),
            });
        }

        const duration = Date.now() - startTime;
        await logCronJob(supabase, 'automated-testing', 'success', results, duration);
        return NextResponse.json({ success: true, results, duration, jobId });
    } catch (error) {
        const duration = Date.now() - startTime;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(msg);
        await logCronJob(supabase, 'automated-testing', 'failed', { error: msg }, duration);
        return NextResponse.json({ success: false, error: msg, results, jobId }, { status: 500 });
    }
}
