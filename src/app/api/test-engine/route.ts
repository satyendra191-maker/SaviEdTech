import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import {
    runTests,
    getRecentTestResults,
    getTestResultsByRunId,
    getTestRunHistory,
    getTestStatistics,
    generateTestReport,
    type TestCategory,
} from '@/lib/platform-manager/testing';
import { sendAlert } from '@/lib/platform-manager/alerts';

/**
 * Test Engine API
 * 
 * GET: Retrieve test results and reports
 * POST: Trigger test execution
 */

/**
 * Check if request is from an admin user via session
 */
async function checkAdminAccess(request: NextRequest): Promise<boolean> {
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set() { /* no-op */ },
                remove() { /* no-op */ },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return false;
    }

    // Check if user has admin role
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string } | null; error: Error | null };

    if (error || !profile) {
        return false;
    }

    return profile.role === 'admin' || profile.role === 'super_admin';
}

// Authentication helper - checks API keys or admin session
async function isAuthorized(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');

    // Check for cron secret (for cron job calls)
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
        return true;
    }

    // Check for admin API key
    if (apiKey === process.env.ADMIN_API_KEY) {
        return true;
    }

    // Check for admin session
    const isAdmin = await checkAdminAccess(request);
    if (isAdmin) {
        return true;
    }

    return false;
}

/**
 * GET /api/test-engine
 * 
 * Query parameters:
 * - runId: Get results for a specific test run
 * - category: Filter by test category (authentication, core_features, payment, admin)
 * - limit: Number of results to return (default: 50)
 * - history: Get test run history (true/false)
 * - stats: Get test statistics (true/false)
 * - report: Generate comprehensive report (true/false)
 */
export async function GET(request: NextRequest) {
    if (!(await isAuthorized(request))) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const runId = searchParams.get('runId');
        const category = searchParams.get('category') as TestCategory | null;
        const limit = parseInt(searchParams.get('limit') ?? '50', 10);
        const getHistory = searchParams.get('history') === 'true';
        const getStats = searchParams.get('stats') === 'true';
        const getReport = searchParams.get('report') === 'true';

        // Generate comprehensive report
        if (getReport) {
            const report = await generateTestReport(runId ?? undefined);
            return NextResponse.json({
                success: true,
                data: report,
            });
        }

        // Get test statistics
        if (getStats) {
            const timeWindow = parseInt(searchParams.get('hours') ?? '24', 10);
            const stats = await getTestStatistics(timeWindow);
            return NextResponse.json({
                success: true,
                data: stats,
            });
        }

        // Get test run history
        if (getHistory) {
            const historyLimit = parseInt(searchParams.get('historyLimit') ?? '20', 10);
            const history = await getTestRunHistory(historyLimit);
            return NextResponse.json({
                success: true,
                data: history,
            });
        }

        // Get results by run ID
        if (runId) {
            const results = await getTestResultsByRunId(runId);
            return NextResponse.json({
                success: true,
                data: {
                    runId,
                    results,
                    total: results.length,
                },
            });
        }

        // Get recent test results
        const results = await getRecentTestResults(limit, category ?? undefined);
        return NextResponse.json({
            success: true,
            data: {
                results,
                total: results.length,
                category: category ?? 'all',
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log error
        const supabase = createAdminSupabaseClient();
        await supabase.from('error_logs').insert({
            error_type: 'test_engine_api_error',
            error_message: `Test engine GET failed: ${errorMessage}`,
            request_path: '/api/test-engine',
            request_method: 'GET',
        } as any);

        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}

/**
 * POST /api/test-engine
 * 
 * Body parameters:
 * - category: Test category to run (authentication, core_features, payment, admin, all)
 * - alertOnFailure: Whether to send alerts on test failures (default: true)
 * - timeoutMs: Test timeout in milliseconds
 * - retries: Number of retries for failed tests
 * 
 * Response includes:
 * - runId: Unique identifier for the test run
 * - summary: Test run summary with pass/fail counts
 * - results: Detailed test results
 * - executionTime: Total execution time
 */
export async function POST(request: NextRequest) {
    if (!(await isAuthorized(request))) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    const startTime = Date.now();

    try {
        const body = await request.json();
        const category = body.category ?? 'all';
        const alertOnFailure = body.alertOnFailure ?? true;
        const timeoutMs = body.timeoutMs ?? 30000;
        const retries = body.retries ?? 2;

        // Validate category
        const validCategories: (TestCategory | 'all')[] = [
            'authentication',
            'core_features',
            'payment',
            'admin',
            'all',
        ];

        if (!validCategories.includes(category)) {
            return NextResponse.json(
                { success: false, error: `Invalid category: ${category}` },
                { status: 400 }
            );
        }

        // Run tests
        const summary = await runTests(category as TestCategory | 'all', {
            timeoutMs,
            retries,
            alertOnFailure,
        });

        const executionTime = Date.now() - startTime;

        // Log test run to system health
        const supabase = createAdminSupabaseClient();
        await supabase.from('system_health').insert({
            check_name: 'test_engine_execution',
            status: summary.failed > 0 ? (summary.failed > summary.passed ? 'critical' : 'degraded') : 'healthy',
            response_time_ms: executionTime,
            details: {
                run_id: summary.run_id,
                category,
                total_tests: summary.total_tests,
                passed: summary.passed,
                failed: summary.failed,
                skipped: summary.skipped,
            },
        } as any);

        // Send alert if critical failures
        if (summary.failed > summary.passed && alertOnFailure) {
            await sendAlert({
                severity: 'CRITICAL',
                title: `Critical Test Failures: ${summary.failed}/${summary.total_tests} tests failed`,
                message: `Test run ${summary.run_id} for category '${category}' completed with critical failures. More tests failed than passed.`,
                source: 'test-engine',
                metadata: { summary, executionTime },
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                summary,
                executionTime,
                results: summary.failed === 0 ? 'All tests passed' : `${summary.failed} tests failed`,
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log error
        const supabase = createAdminSupabaseClient();
        await supabase.from('error_logs').insert({
            error_type: 'test_engine_execution_error',
            error_message: `Test engine execution failed: ${errorMessage}`,
            request_path: '/api/test-engine',
            request_method: 'POST',
        } as any);

        // Send alert for execution failure
        await sendAlert({
            severity: 'CRITICAL',
            title: 'Test Engine Execution Failed',
            message: `Test engine failed to execute: ${errorMessage}`,
            source: 'test-engine',
            metadata: { error: errorMessage },
        });

        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
