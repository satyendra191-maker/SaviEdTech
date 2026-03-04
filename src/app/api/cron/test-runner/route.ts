import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';
import {
    runTests,
    getTestStatistics,
    type TestCategory,
} from '@/lib/platform-manager/testing';
import { sendAlert } from '@/lib/platform-manager/alerts';

/**
 * CRON Job: Automated Test Runner
 * Runs hourly to execute critical platform tests
 * Schedule: 0 * * * * (every hour)
 * 
 * This cron job:
 * 1. Runs all test categories (authentication, core_features, payment, admin)
 * 2. Logs results to database
 * 3. Sends alerts on test failures
 * 4. Tracks test history and trends
 */

interface TestRunResults {
    run_id: string;
    category: TestCategory | 'all';
    total_tests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration_ms: number;
    status: 'success' | 'partial' | 'failed';
}

export async function GET(request: NextRequest) {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();
    const results: TestRunResults[] = [];
    const startTime = Date.now();

    try {
        // Run tests by category
        const categories: TestCategory[] = [
            'authentication',
            'core_features',
            'payment',
            'admin',
        ];

        for (const category of categories) {
            const categoryStartTime = Date.now();

            try {
                const summary = await runTests(category, {
                    timeoutMs: 30000,
                    retries: 2,
                    alertOnFailure: false, // We'll handle alerts at the end
                });

                const duration = Date.now() - categoryStartTime;
                const status: TestRunResults['status'] =
                    summary.failed === 0 ? 'success' :
                        summary.failed < summary.passed ? 'partial' : 'failed';

                results.push({
                    run_id: summary.run_id,
                    category,
                    total_tests: summary.total_tests,
                    passed: summary.passed,
                    failed: summary.failed,
                    skipped: summary.skipped,
                    duration_ms: duration,
                    status,
                });

                // Log individual category results
                await supabase.from('system_health').insert({
                    check_name: `test_runner_${category}`,
                    status: status === 'success' ? 'healthy' : status === 'partial' ? 'degraded' : 'critical',
                    response_time_ms: duration,
                    details: {
                        run_id: summary.run_id,
                        category,
                        total_tests: summary.total_tests,
                        passed: summary.passed,
                        failed: summary.failed,
                        skipped: summary.skipped,
                    },
                } as any);

            } catch (categoryError) {
                const errorMessage = categoryError instanceof Error
                    ? categoryError.message
                    : 'Unknown error';

                results.push({
                    run_id: `error-${Date.now()}`,
                    category,
                    total_tests: 0,
                    passed: 0,
                    failed: 0,
                    skipped: 0,
                    duration_ms: Date.now() - categoryStartTime,
                    status: 'failed',
                });

                // Log error
                await supabase.from('error_logs').insert({
                    error_type: 'test_runner_category_error',
                    error_message: `Test runner failed for category ${category}: ${errorMessage}`,
                    metadata: { category },
                } as any);
            }
        }

        const totalDuration = Date.now() - startTime;
        const totalTests = results.reduce((sum, r) => sum + r.total_tests, 0);
        const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
        const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
        const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

        const overallStatus: TestRunResults['status'] =
            totalFailed === 0 ? 'success' :
                totalFailed < totalPassed ? 'partial' : 'failed';

        // Log overall test run
        await supabase.from('system_health').insert({
            check_name: 'test_runner_hourly',
            status: overallStatus === 'success' ? 'healthy' : overallStatus === 'partial' ? 'degraded' : 'critical',
            response_time_ms: totalDuration,
            error_count: totalFailed,
            details: {
                timestamp: new Date().toISOString(),
                total_tests: totalTests,
                passed: totalPassed,
                failed: totalFailed,
                skipped: totalSkipped,
                categories: results.map(r => ({
                    category: r.category,
                    status: r.status,
                    tests: r.total_tests,
                })),
            },
        } as any);

        // Send alerts for failures
        const failedCategories = results.filter(r => r.status === 'failed');
        const partialCategories = results.filter(r => r.status === 'partial');

        if (failedCategories.length > 0) {
            await sendAlert({
                severity: 'CRITICAL',
                title: `Test Runner: ${failedCategories.length} categories failed`,
                message: `Hourly test run completed with ${totalFailed} total failures. Failed categories: ${failedCategories.map(c => c.category).join(', ')}`,
                source: 'test-runner-cron',
                metadata: {
                    failedCategories: failedCategories.map(c => ({
                        category: c.category,
                        failed: c.failed,
                        passed: c.passed,
                    })),
                    timestamp: new Date().toISOString(),
                },
            });
        } else if (partialCategories.length > 0) {
            await sendAlert({
                severity: 'MEDIUM',
                title: `Test Runner: ${partialCategories.length} categories partially failed`,
                message: `Hourly test run completed with some test failures. Categories with issues: ${partialCategories.map(c => c.category).join(', ')}`,
                source: 'test-runner-cron',
                metadata: {
                    partialCategories: partialCategories.map(c => ({
                        category: c.category,
                        failed: c.failed,
                        passed: c.passed,
                    })),
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Get trend statistics
        const stats = await getTestStatistics(24);

        return NextResponse.json({
            success: true,
            message: `Test runner completed: ${totalPassed}/${totalTests} tests passed`,
            data: {
                overall_status: overallStatus,
                summary: {
                    total_tests: totalTests,
                    passed: totalPassed,
                    failed: totalFailed,
                    skipped: totalSkipped,
                    duration_ms: totalDuration,
                },
                categories: results,
                statistics: stats,
                timestamp: new Date().toISOString(),
            },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log critical error
        await supabase.from('error_logs').insert({
            error_type: 'test_runner_critical_error',
            error_message: `Test runner cron job failed: ${errorMessage}`,
            metadata: { results },
        } as any);

        // Send critical alert
        await sendAlert({
            severity: 'CRITICAL',
            title: 'Test Runner Cron Job Failed',
            message: `The hourly test runner encountered a critical error: ${errorMessage}`,
            source: 'test-runner-cron',
            metadata: { error: errorMessage },
        });

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                data: { results },
            },
            { status: 500 }
        );
    }
}

/**
 * POST handler for manual trigger (admin only)
 */
export async function POST(request: NextRequest) {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && apiKey !== process.env.ADMIN_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const category = (body.category ?? 'all') as TestCategory | 'all';

        const startTime = Date.now();
        const summary = await runTests(category, {
            timeoutMs: body.timeoutMs ?? 30000,
            retries: body.retries ?? 2,
            alertOnFailure: body.alertOnFailure ?? true,
        });

        const duration = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            data: {
                summary,
                duration_ms: duration,
                triggered_by: 'manual',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
