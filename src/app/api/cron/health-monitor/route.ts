/**
 * CRON Job: Health Monitor
 * Runs every 5 minutes to monitor system health and trigger self-healing
 * Schedule: Every 5 minutes (cron expression: 0,5,10,15,20,25,30,35,40,45,50,55 * * * *)
 * 
 * This cron job:
 * 1. Detects deployment failures
 * 2. Detects server crashes
 * 3. Detects broken builds
 * 4. Detects database outages
 * 5. Runs automatic self-healing if critical issues are found
 * 6. Logs health status and recovery actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';
import {
    getSystemStatus,
    selfHeal,
    detectDeploymentFailure,
    detectServerCrash,
    detectBrokenBuild,
    detectDatabaseOutage,
    type FailureDetection,
} from '@/lib/platform-manager/selfhealing';
import { runPlatformAudit } from '@/lib/platform-manager/auditor';
import { sendAlert } from '@/lib/platform-manager/alerts';
import { recordHealthCheck } from '@/lib/platform-manager/monitor';

interface HealthMonitorResults {
    monitor_id: string;
    timestamp: string;
    detections: FailureDetection[];
    critical_issues: number;
    self_heal_triggered: boolean;
    recovery_actions_count: number;
    overall_status: 'healthy' | 'degraded' | 'critical';
    duration_ms: number;
}

export async function GET(request: NextRequest) {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const monitorId = `health_monitor_${Date.now()}`;
    const supabase = createAdminSupabaseClient();

    try {
        console.log(`[Health Monitor] Starting health check cycle: ${monitorId}`);

        // Step 1: Get overall system status
        const systemStatus = await getSystemStatus();

        // Step 2: Run all failure detectors
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
        const criticalIssues = detections.filter(d => d.detected && (d.severity === 'CRITICAL' || d.severity === 'HIGH'));
        const warningIssues = detections.filter(d => d.detected && d.severity === 'MEDIUM');

        console.log(`[Health Monitor] Detections: ${detections.length}, Critical: ${criticalIssues.length}, Warnings: ${warningIssues.length}`);

        // Step 3: Log health check to database
        await recordHealthCheck(
            'health_monitor_cycle',
            systemStatus.overall_status,
            {
                monitor_id: monitorId,
                detections_count: detections.length,
                critical_issues: criticalIssues.length,
                warning_issues: warningIssues.length,
                system_status: systemStatus,
            },
            Date.now() - startTime
        );

        // Step 4: If critical issues detected, trigger self-healing
        let selfHealResult = {
            triggered: false,
            actions: 0,
            plans: 0,
        };

        if (criticalIssues.length > 0) {
            console.log(`[Health Monitor] Critical issues detected, triggering self-healing`);

            // Send alert about critical issues
            await sendAlert({
                severity: 'CRITICAL',
                title: 'Health Monitor: Critical Issues Detected',
                message: `${criticalIssues.length} critical issue(s) detected. Self-healing initiated.`,
                source: 'health_monitor',
                metadata: {
                    monitor_id: monitorId,
                    issues: criticalIssues.map(i => ({
                        type: i.type,
                        severity: i.severity,
                        details: i.details,
                    })),
                },
            });

            // Trigger self-healing
            const healResult = await selfHeal();
            selfHealResult = {
                triggered: healResult.triggered,
                actions: healResult.actions.length,
                plans: healResult.plans.length,
            };

            // Log self-healing result
            if (healResult.triggered) {
                await recordHealthCheck(
                    'self_heal_triggered',
                    'healthy',
                    {
                        monitor_id: monitorId,
                        detections: healResult.detections.filter(d => d.detected).map(d => d.type),
                        actions_taken: healResult.actions.length,
                        plans_executed: healResult.plans.length,
                    },
                    0
                );
            }
        }

        // Step 5: Send warning alerts for medium severity issues
        if (warningIssues.length > 0 && criticalIssues.length === 0) {
            await sendAlert({
                severity: 'MEDIUM',
                title: 'Health Monitor: Warnings Detected',
                message: `${warningIssues.length} warning(s) detected. Monitoring continues.`,
                source: 'health_monitor',
                metadata: {
                    monitor_id: monitorId,
                    warnings: warningIssues.map(i => ({
                        type: i.type,
                        details: i.details,
                    })),
                },
            });
        }

        // Step 6: Compile results
        const duration = Date.now() - startTime;
        const results: HealthMonitorResults = {
            monitor_id: monitorId,
            timestamp: new Date().toISOString(),
            detections,
            critical_issues: criticalIssues.length,
            self_heal_triggered: selfHealResult.triggered,
            recovery_actions_count: selfHealResult.actions,
            overall_status: systemStatus.overall_status,
            duration_ms: duration,
        };

        // Step 7: Store monitor results in system health
        await supabase.from('system_health').insert({
            check_name: 'health_monitor',
            status: systemStatus.overall_status,
            response_time_ms: duration,
            error_count: criticalIssues.length,
            details: {
                monitor_id: monitorId,
                detections: detections.map(d => ({
                    type: d.type,
                    detected: d.detected,
                    severity: d.severity,
                })),
                self_heal_triggered: selfHealResult.triggered,
                recovery_actions: selfHealResult.actions,
            },
        } as any);

        try {
            await runPlatformAudit({
                includeCodebaseInspection: false,
                eagerChecks: false,
                autoRecover: false,
                sendNotifications: false,
                persist: true,
                initiatedBy: 'cron:health-monitor',
            });
        } catch (auditorError) {
            console.error('[Health Monitor] Platform auditor sync failed:', auditorError);
        }

        console.log(`[Health Monitor] Cycle completed in ${duration}ms`);

        // Return success response
        return NextResponse.json({
            success: true,
            data: results,
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        console.error('[Health Monitor] Error:', error);

        // Log error to database
        await supabase.from('error_logs').insert({
            error_type: 'health_monitor_failure',
            error_message: `Health monitor failed: ${errorMessage}`,
            metadata: {
                monitor_id: monitorId,
                duration_ms: duration,
            },
            occurred_at: new Date().toISOString(),
        } as any);

        // Send alert about monitor failure
        await sendAlert({
            severity: 'CRITICAL',
            title: 'Health Monitor: Execution Failed',
            message: `Health monitor failed with error: ${errorMessage}`,
            source: 'health_monitor',
            metadata: {
                monitor_id: monitorId,
                error: errorMessage,
            },
        });

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                monitor_id: monitorId,
            },
            { status: 500 }
        );
    }
}
