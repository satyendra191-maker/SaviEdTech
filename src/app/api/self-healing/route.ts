/**
 * Self-Healing API Endpoint
 * 
 * Provides endpoints to:
 * - GET: View self-healing status and recent recovery actions
 * - POST: Trigger self-healing actions manually
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getSystemStatus,
    selfHeal,
    executeRecoveryPlan,
    getRecentRecoveryActions,
    getRecentRecoveryPlans,
    getActiveMonitoringSessions,
    startFailureMonitoring,
    stopFailureMonitoring,
    initiateRollback,
    restartServices,
    clearCache,
    reconnectDatabase,
    restoreCronJobs,
    detectDeploymentFailure,
    detectServerCrash,
    detectBrokenBuild,
    detectDatabaseOutage,
    type RecoveryActionType,
} from '@/lib/platform-manager/selfhealing';

// API configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Authentication helper
async function verifyAuth(request: NextRequest): Promise<{ authorized: boolean; error?: string }> {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.SELF_HEALING_API_KEY || process.env.CRON_SECRET;

    // Check for bearer token (cron secret or self-healing API key)
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (apiKey && token === apiKey) {
            return { authorized: true };
        }
    }

    // Require valid API key in all environments - no bypass allowed
    return { authorized: false, error: 'Unauthorized - Valid API key required' };
}

/**
 * GET handler - Get self-healing status and history
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        // Verify authentication
        const auth = await verifyAuth(request);
        if (!auth.authorized) {
            return NextResponse.json(
                { success: false, error: auth.error },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'status';

        switch (action) {
            case 'status': {
                // Get overall system status
                const systemStatus = await getSystemStatus();
                const recentActions = getRecentRecoveryActions(10);
                const recentPlans = getRecentRecoveryPlans(5);
                const activeMonitoring = getActiveMonitoringSessions();

                return NextResponse.json({
                    success: true,
                    data: {
                        system_status: systemStatus,
                        recent_actions: recentActions,
                        recent_plans: recentPlans,
                        active_monitoring_sessions: activeMonitoring,
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            case 'detections': {
                // Run all failure detectors
                const [
                    deploymentFailure,
                    serverCrash,
                    brokenBuild,
                    databaseOutage,
                ] = await Promise.all([
                    detectDeploymentFailure(),
                    detectServerCrash(),
                    detectBrokenBuild(),
                    detectDatabaseOutage(),
                ]);

                const detections = [deploymentFailure, serverCrash, brokenBuild, databaseOutage];
                const criticalIssues = detections.filter(d => d.detected);

                return NextResponse.json({
                    success: true,
                    data: {
                        detections,
                        critical_issues_count: criticalIssues.length,
                        requires_action: criticalIssues.length > 0,
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            case 'history': {
                const limit = parseInt(searchParams.get('limit') || '50', 10);
                const actions = getRecentRecoveryActions(limit);
                const plans = getRecentRecoveryPlans(Math.min(limit / 2, 20));

                return NextResponse.json({
                    success: true,
                    data: {
                        actions,
                        plans,
                        total_actions: actions.length,
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            case 'monitoring': {
                const sessions = getActiveMonitoringSessions();
                return NextResponse.json({
                    success: true,
                    data: {
                        active_sessions: sessions,
                        session_count: sessions.length,
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            default:
                return NextResponse.json(
                    { success: false, error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Error in self-healing GET:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * POST handler - Trigger self-healing actions
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Verify authentication
        const auth = await verifyAuth(request);
        if (!auth.authorized) {
            return NextResponse.json(
                { success: false, error: auth.error },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { action, params = {} } = body;

        if (!action) {
            return NextResponse.json(
                { success: false, error: 'Action is required' },
                { status: 400 }
            );
        }

        switch (action) {
            case 'self_heal': {
                // Run automatic self-healing
                const result = await selfHeal();

                return NextResponse.json({
                    success: true,
                    data: {
                        triggered: result.triggered,
                        detections: result.detections,
                        actions_taken: result.actions.length,
                        plans_executed: result.plans.length,
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            case 'recovery_plan': {
                // Execute a specific recovery plan
                const { failure_type, details = {} } = params;
                if (!failure_type) {
                    return NextResponse.json(
                        { success: false, error: 'failure_type is required for recovery_plan' },
                        { status: 400 }
                    );
                }

                const plan = await executeRecoveryPlan(failure_type, details);

                return NextResponse.json({
                    success: true,
                    data: {
                        plan_id: plan.id,
                        status: plan.status,
                        actions: plan.actions,
                        results: plan.results,
                        started_at: plan.started_at,
                        completed_at: plan.completed_at,
                    },
                });
            }

            case 'rollback': {
                const { reason = 'Manual rollback triggered' } = params;
                const recoveryAction = await initiateRollback(reason);

                return NextResponse.json({
                    success: true,
                    data: {
                        action_id: recoveryAction.id,
                        status: recoveryAction.status,
                        result: recoveryAction.result,
                        error: recoveryAction.error_message,
                    },
                });
            }

            case 'restart_services': {
                const { services } = params;
                const recoveryAction = await restartServices(services);

                return NextResponse.json({
                    success: true,
                    data: {
                        action_id: recoveryAction.id,
                        status: recoveryAction.status,
                        result: recoveryAction.result,
                        error: recoveryAction.error_message,
                    },
                });
            }

            case 'clear_cache': {
                const { cache_types } = params;
                const recoveryAction = await clearCache(cache_types);

                return NextResponse.json({
                    success: true,
                    data: {
                        action_id: recoveryAction.id,
                        status: recoveryAction.status,
                        result: recoveryAction.result,
                        error: recoveryAction.error_message,
                    },
                });
            }

            case 'reconnect_database': {
                const recoveryAction = await reconnectDatabase();

                return NextResponse.json({
                    success: true,
                    data: {
                        action_id: recoveryAction.id,
                        status: recoveryAction.status,
                        result: recoveryAction.result,
                        error: recoveryAction.error_message,
                    },
                });
            }

            case 'restore_cron': {
                const recoveryAction = await restoreCronJobs();

                return NextResponse.json({
                    success: true,
                    data: {
                        action_id: recoveryAction.id,
                        status: recoveryAction.status,
                        result: recoveryAction.result,
                        error: recoveryAction.error_message,
                    },
                });
            }

            case 'start_monitoring': {
                const { interval_ms = 30000 } = params;
                const sessionId = startFailureMonitoring(interval_ms);

                return NextResponse.json({
                    success: true,
                    data: {
                        session_id: sessionId,
                        interval_ms,
                        status: 'started',
                    },
                });
            }

            case 'stop_monitoring': {
                const { session_id } = params;
                if (!session_id) {
                    return NextResponse.json(
                        { success: false, error: 'session_id is required to stop monitoring' },
                        { status: 400 }
                    );
                }

                const stopped = stopFailureMonitoring(session_id);

                return NextResponse.json({
                    success: true,
                    data: {
                        session_id,
                        stopped,
                    },
                });
            }

            default:
                return NextResponse.json(
                    { success: false, error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Error in self-healing POST:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
