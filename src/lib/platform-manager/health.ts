/**
 * SaviEduTech Team Autonomous Platform Manager - Health Checker
 * 
 * Provides comprehensive health checking capabilities:
 * - API endpoint health checks
 * - Database connectivity verification
 * - Authentication system testing
 * - Cron job endpoint validation
 */

import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase';
import { recordHealthCheck, type HealthStatus } from './monitor';
import type { Database } from '@/types/supabase';
import { APP_URL } from '@/config';

// Health check result types
export interface HealthCheckResult {
    check_name: string;
    status: HealthStatus;
    response_time_ms: number;
    message: string;
    details: Record<string, unknown>;
    timestamp: string;
}

export interface FullHealthReport {
    overall_status: HealthStatus;
    checks: HealthCheckResult[];
    summary: {
        total: number;
        healthy: number;
        degraded: number;
        critical: number;
    };
    generated_at: string;
}

// API endpoint configuration for health checks
const API_ENDPOINTS = {
    auth: [
        { path: '/api/auth/callback', method: 'GET', name: 'Auth Callback' },
        { path: '/api/auth/reset-password', method: 'POST', name: 'Password Reset' },
    ],
    cron: [
        { path: '/api/cron/daily-challenge', method: 'GET', name: 'Daily Challenge Cron' },
        { path: '/api/cron/dpp-generator', method: 'GET', name: 'DPP Generator Cron' },
        { path: '/api/cron/lecture-publisher', method: 'GET', name: 'Lecture Publisher Cron' },
        { path: '/api/cron/rank-prediction', method: 'GET', name: 'Rank Prediction Cron' },
        { path: '/api/cron/revision-updater', method: 'GET', name: 'Revision Updater Cron' },
    ],
};

// Response time thresholds in milliseconds
const THRESHOLDS = {
    healthy: 500,     // < 500ms is healthy
    degraded: 2000,   // 500ms - 2000ms is degraded
    critical: 2000,   // > 2000ms is critical
};

/**
 * Determine health status based on response time
 */
function getStatusFromResponseTime(responseTimeMs: number): HealthStatus {
    if (responseTimeMs < THRESHOLDS.healthy) return 'healthy';
    if (responseTimeMs < THRESHOLDS.degraded) return 'degraded';
    return 'critical';
}

/**
 * Check API endpoint health
 */
export async function checkAPIHealth(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    expectedStatus: number = 200
): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const baseUrl = APP_URL;

    try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            // Short timeout for health checks
            signal: AbortSignal.timeout(10000),
        });

        const responseTimeMs = Date.now() - startTime;
        const status = response.status === expectedStatus
            ? getStatusFromResponseTime(responseTimeMs)
            : 'critical';

        const result: HealthCheckResult = {
            check_name: `api_${endpoint.replace(/\//g, '_')}`,
            status,
            response_time_ms: responseTimeMs,
            message: response.status === expectedStatus
                ? `Endpoint responded with ${response.status}`
                : `Unexpected status: ${response.status}`,
            details: {
                endpoint,
                method,
                status_code: response.status,
                expected_status: expectedStatus,
            },
            timestamp: new Date().toISOString(),
        };

        // Record to system_health table
        await recordHealthCheck(
            result.check_name,
            result.status,
            result.details,
            responseTimeMs
        );

        return result;
    } catch (err) {
        const responseTimeMs = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        const result: HealthCheckResult = {
            check_name: `api_${endpoint.replace(/\//g, '_')}`,
            status: 'critical',
            response_time_ms: responseTimeMs,
            message: `Health check failed: ${errorMessage}`,
            details: {
                endpoint,
                method,
                error: errorMessage,
            },
            timestamp: new Date().toISOString(),
        };

        await recordHealthCheck(
            result.check_name,
            result.status,
            result.details,
            responseTimeMs
        );

        return result;
    }
}

/**
 * Check database connectivity and performance
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const supabase = createAdminSupabaseClient();

    try {
        // Test basic connectivity with a simple query
        const { data, error } = await supabase
            .from('system_health')
            .select('id')
            .limit(1)
            .single();

        if (error) throw error;

        // Test write capability
        const { error: writeError } = await supabase
            .from('system_health')
            .insert({
                check_name: 'db_health_check',
                status: 'healthy',
                details: { check_type: 'connectivity' },
            } as any);

        if (writeError) throw writeError;

        // Get connection count estimate (may not work on all Supabase tiers)
        let connectionCount = 0;
        try {
            const { data: connData } = await supabase.rpc('get_connection_stats');
            if (connData && typeof connData === 'object') {
                connectionCount = (connData as { total_connections?: number }).total_connections || 0;
            }
        } catch {
            // Connection stats may not be available
        }

        const responseTimeMs = Date.now() - startTime;
        const status = getStatusFromResponseTime(responseTimeMs);

        const result: HealthCheckResult = {
            check_name: 'database_connectivity',
            status,
            response_time_ms: responseTimeMs,
            message: 'Database connectivity check passed',
            details: {
                read_test: 'passed',
                write_test: 'passed',
                connection_count: connectionCount,
            },
            timestamp: new Date().toISOString(),
        };

        await recordHealthCheck(
            result.check_name,
            result.status,
            result.details,
            responseTimeMs
        );

        return result;
    } catch (err) {
        const responseTimeMs = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        const result: HealthCheckResult = {
            check_name: 'database_connectivity',
            status: 'critical',
            response_time_ms: responseTimeMs,
            message: `Database health check failed: ${errorMessage}`,
            details: {
                error: errorMessage,
            },
            timestamp: new Date().toISOString(),
        };

        await recordHealthCheck(
            result.check_name,
            result.status,
            result.details,
            responseTimeMs
        );

        return result;
    }
}

/**
 * Test authentication system health
 */
export async function checkAuthHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const supabase = createServerSupabaseClient();

    try {
        // Check if auth service is responsive by checking session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        // Verify auth configuration by checking if auth.users table is accessible
        const { data: authConfig, error: configError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);

        if (configError && configError.message.includes('auth')) {
            throw configError;
        }

        const responseTimeMs = Date.now() - startTime;
        const status = getStatusFromResponseTime(responseTimeMs);

        const result: HealthCheckResult = {
            check_name: 'authentication_system',
            status,
            response_time_ms: responseTimeMs,
            message: 'Authentication system is operational',
            details: {
                session_service: 'available',
                profiles_table: configError ? 'limited_access' : 'accessible',
            },
            timestamp: new Date().toISOString(),
        };

        await recordHealthCheck(
            result.check_name,
            result.status,
            result.details,
            responseTimeMs
        );

        return result;
    } catch (err) {
        const responseTimeMs = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        const result: HealthCheckResult = {
            check_name: 'authentication_system',
            status: 'critical',
            response_time_ms: responseTimeMs,
            message: `Auth health check failed: ${errorMessage}`,
            details: {
                error: errorMessage,
            },
            timestamp: new Date().toISOString(),
        };

        await recordHealthCheck(
            result.check_name,
            result.status,
            result.details,
            responseTimeMs
        );

        return result;
    }
}

/**
 * Check all cron job endpoints
 */
export async function checkCronHealth(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        const result: HealthCheckResult = {
            check_name: 'cron_configuration',
            status: 'critical',
            response_time_ms: 0,
            message: 'CRON_SECRET environment variable not set',
            details: {},
            timestamp: new Date().toISOString(),
        };
        results.push(result);
        await recordHealthCheck(result.check_name, result.status, result.details);
        return results;
    }

    const baseUrl = APP_URL;

    for (const endpoint of API_ENDPOINTS.cron) {
        const startTime = Date.now();

        try {
            // Cron endpoints require authorization
            const response = await fetch(`${baseUrl}${endpoint.path}`, {
                method: endpoint.method,
                headers: {
                    'Authorization': `Bearer ${cronSecret}`,
                },
                signal: AbortSignal.timeout(30000), // 30s timeout for cron jobs
            });

            const responseTimeMs = Date.now() - startTime;

            // Cron endpoints return 200 for success, 401 for unauthorized (which is expected behavior)
            const isHealthy = response.status === 200 || response.status === 401;
            const status: HealthStatus = isHealthy
                ? response.status === 200 ? 'healthy' : 'degraded'
                : 'critical';

            const result: HealthCheckResult = {
                check_name: `cron_${endpoint.name.toLowerCase().replace(/\s+/g, '_')}`,
                status,
                response_time_ms: responseTimeMs,
                message: isHealthy
                    ? `Cron endpoint ${endpoint.name} is accessible`
                    : `Cron endpoint returned status ${response.status}`,
                details: {
                    endpoint: endpoint.path,
                    method: endpoint.method,
                    status_code: response.status,
                },
                timestamp: new Date().toISOString(),
            };

            results.push(result);
            await recordHealthCheck(
                result.check_name,
                result.status,
                result.details,
                responseTimeMs
            );
        } catch (err) {
            const responseTimeMs = Date.now() - startTime;
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';

            const result: HealthCheckResult = {
                check_name: `cron_${endpoint.name.toLowerCase().replace(/\s+/g, '_')}`,
                status: 'critical',
                response_time_ms: responseTimeMs,
                message: `Cron endpoint check failed: ${errorMessage}`,
                details: {
                    endpoint: endpoint.path,
                    method: endpoint.method,
                    error: errorMessage,
                },
                timestamp: new Date().toISOString(),
            };

            results.push(result);
            await recordHealthCheck(
                result.check_name,
                result.status,
                result.details,
                responseTimeMs
            );
        }
    }

    return results;
}

/**
 * Run a comprehensive health check on all systems
 */
export async function runFullHealthCheck(): Promise<FullHealthReport> {
    const startTime = Date.now();
    const checks: HealthCheckResult[] = [];

    // Run all health checks
    try {
        const [dbHealth, authHealth, cronHealth] = await Promise.all([
            checkDatabaseHealth(),
            checkAuthHealth(),
            checkCronHealth(),
        ]);

        checks.push(dbHealth, authHealth, ...cronHealth);

        // Check critical API endpoints
        const criticalEndpoints = [
            { path: '/', name: 'home_page' },
            { path: '/dashboard', name: 'dashboard_page' },
        ];

        for (const endpoint of criticalEndpoints) {
            const result = await checkAPIHealth(endpoint.path);
            checks.push(result);
        }
    } catch (err) {
        console.error('Error during full health check:', err);
    }

    // Calculate overall status
    const hasCritical = checks.some(c => c.status === 'critical');
    const hasDegraded = checks.some(c => c.status === 'degraded');
    const overallStatus: HealthStatus = hasCritical ? 'critical' : hasDegraded ? 'degraded' : 'healthy';

    // Calculate summary
    const summary = {
        total: checks.length,
        healthy: checks.filter(c => c.status === 'healthy').length,
        degraded: checks.filter(c => c.status === 'degraded').length,
        critical: checks.filter(c => c.status === 'critical').length,
    };

    const report: FullHealthReport = {
        overall_status: overallStatus,
        checks,
        summary,
        generated_at: new Date().toISOString(),
    };

    // Record overall health status
    await recordHealthCheck(
        'full_health_check',
        overallStatus,
        {
            summary,
            execution_time_ms: Date.now() - startTime,
        },
        Date.now() - startTime
    );

    return report;
}

/**
 * Check specific service health by name
 */
export async function checkServiceHealth(serviceName: string): Promise<HealthCheckResult | null> {
    switch (serviceName) {
        case 'database':
            return checkDatabaseHealth();
        case 'auth':
            return checkAuthHealth();
        case 'cron':
            const cronResults = await checkCronHealth();
            // Return overall cron health
            const hasCritical = cronResults.some(r => r.status === 'critical');
            const hasDegraded = cronResults.some(r => r.status === 'degraded');
            return {
                check_name: 'cron_jobs_overall',
                status: hasCritical ? 'critical' : hasDegraded ? 'degraded' : 'healthy',
                response_time_ms: cronResults.reduce((sum, r) => sum + r.response_time_ms, 0) / cronResults.length,
                message: `Checked ${cronResults.length} cron job endpoints`,
                details: { individual_checks: cronResults.length },
                timestamp: new Date().toISOString(),
            };
        default:
            return null;
    }
}

/**
 * Get health check history from system_health table
 */
export async function getHealthCheckHistory(
    checkName?: string,
    limit: number = 100
): Promise<HealthCheckResult[]> {
    const supabase = createAdminSupabaseClient();

    let query = supabase
        .from('system_health')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(limit);

    if (checkName) {
        query = query.eq('check_name', checkName);
    }

    const { data, error } = await query as {
        data: Database['public']['Tables']['system_health']['Row'][] | null;
        error: Error | null
    };

    if (error) {
        console.error('Error fetching health check history:', error);
        throw new Error(`Failed to fetch health check history: ${error.message}`);
    }

    return (data || []).map(row => ({
        check_name: row.check_name,
        status: row.status,
        response_time_ms: row.response_time_ms ?? 0,
        message: `Health check recorded at ${row.checked_at}`,
        details: (row.details as Record<string, unknown>) || {},
        timestamp: row.checked_at,
    }));
}

/**
 * Schedule periodic health checks
 */
export function scheduleHealthChecks(
    intervalMinutes: number = 5,
    onCheckComplete?: (report: FullHealthReport) => void
): () => void {
    const intervalMs = intervalMinutes * 60 * 1000;

    // Run initial check
    runFullHealthCheck().then(onCheckComplete);

    // Schedule periodic checks
    const intervalId = setInterval(() => {
        runFullHealthCheck().then(onCheckComplete);
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(intervalId);
}
