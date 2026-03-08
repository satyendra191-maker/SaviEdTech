/**
 * SaviEduTech Team Autonomous Platform Manager - Monitoring Client
 * 
 * Connects to Supabase and provides monitoring capabilities for:
 * - Error logs tracking
 * - System health metrics
 * - Cron job execution status
 * - Database performance metrics
 */

import { getSupabaseBrowserClient, createAdminSupabaseClient, isBrowser } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type definitions from Supabase schema
type ErrorLogRow = Database['public']['Tables']['error_logs']['Row'];
type SystemHealthRow = Database['public']['Tables']['system_health']['Row'];
export type HealthStatus = 'healthy' | 'degraded' | 'critical';

export interface ErrorLog {
    id: string;
    error_type: string;
    error_message: string | null;
    stack_trace: string | null;
    user_id: string | null;
    request_path: string | null;
    request_method: string | null;
    user_agent: string | null;
    ip_address: string | null;
    metadata: Record<string, unknown>;
    occurred_at: string;
}

export interface SystemHealth {
    id: string;
    check_name: string;
    status: HealthStatus;
    response_time_ms: number | null;
    error_count: number;
    details: Record<string, unknown>;
    checked_at: string;
}

export interface CronJobStatus {
    job_name: string;
    last_run: string | null;
    status: HealthStatus;
    execution_time_ms: number | null;
    error_count: number;
    success_count: number;
    last_error: string | null;
}

export interface DatabaseMetrics {
    total_connections: number;
    active_connections: number;
    idle_connections: number;
    waiting_connections: number;
    cache_hit_ratio: number;
    query_stats: {
        total_queries: number;
        slow_queries: number;
        avg_query_time_ms: number;
    };
    table_stats: {
        table_name: string;
        row_count: number;
        size_bytes: number;
    }[];
}

export interface MonitoringConfig {
    errorLimit?: number;
    timeWindowMinutes?: number;
    includeResolved?: boolean;
    client?: SupabaseClient<Database>;
}

const DEFAULT_CONFIG: Required<Omit<MonitoringConfig, 'client'>> = {
    errorLimit: 100,
    timeWindowMinutes: 60,
    includeResolved: false,
};

/**
 * Get recent errors from the error_logs table
 */
export async function getRecentErrors(
    config: MonitoringConfig = {}
): Promise<ErrorLog[]> {
    const supabase = config.client || (isBrowser() ? getSupabaseBrowserClient() : createAdminSupabaseClient());
    const { errorLimit, timeWindowMinutes } = { ...DEFAULT_CONFIG, ...config };

    const timeWindow = new Date();
    timeWindow.setMinutes(timeWindow.getMinutes() - timeWindowMinutes);

    const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .gte('occurred_at', timeWindow.toISOString())
        .order('occurred_at', { ascending: false })
        .limit(errorLimit) as { data: ErrorLogRow[] | null; error: Error | null };

    if (error) {
        console.error('Error fetching recent errors:', error);
        throw new Error(`Failed to fetch recent errors: ${error.message}`);
    }

    return (data || []).map(log => ({
        id: log.id,
        error_type: log.error_type,
        error_message: log.error_message,
        stack_trace: log.stack_trace,
        user_id: log.user_id,
        request_path: log.request_path,
        request_method: log.request_method,
        user_agent: log.user_agent,
        ip_address: log.ip_address,
        metadata: (log.metadata as Record<string, unknown>) || {},
        occurred_at: log.occurred_at,
    }));
}

/**
 * Get errors grouped by type
 */
export async function getErrorsByType(
    config: MonitoringConfig = {}
): Promise<{ error_type: string; count: number; latest: string }[]> {
    const supabase = config.client || (isBrowser() ? getSupabaseBrowserClient() : createAdminSupabaseClient());
    const { timeWindowMinutes } = { ...DEFAULT_CONFIG, ...config };

    const timeWindow = new Date();
    timeWindow.setMinutes(timeWindow.getMinutes() - timeWindowMinutes);

    const { data, error } = await supabase
        .from('error_logs')
        .select('error_type, occurred_at')
        .gte('occurred_at', timeWindow.toISOString()) as { data: Pick<ErrorLogRow, 'error_type' | 'occurred_at'>[] | null; error: Error | null };

    if (error) {
        console.error('Error fetching errors by type:', error);
        throw new Error(`Failed to fetch errors by type: ${error.message}`);
    }

    const grouped = (data || []).reduce((acc, log) => {
        if (!acc[log.error_type]) {
            acc[log.error_type] = { count: 0, latest: log.occurred_at };
        }
        acc[log.error_type].count++;
        if (new Date(log.occurred_at) > new Date(acc[log.error_type].latest)) {
            acc[log.error_type].latest = log.occurred_at;
        }
        return acc;
    }, {} as Record<string, { count: number; latest: string }>);

    return Object.entries(grouped).map(([error_type, stats]) => ({
        error_type,
        count: stats.count,
        latest: stats.latest,
    })).sort((a, b) => b.count - a.count);
}

/**
 * Get system health metrics from the system_health table
 */
export async function getSystemHealth(
    checkName?: string,
    config: MonitoringConfig = {}
): Promise<SystemHealth[]> {
    const supabase = config.client || (isBrowser() ? getSupabaseBrowserClient() : createAdminSupabaseClient());

    let query = supabase
        .from('system_health')
        .select('*')
        .order('checked_at', { ascending: false });

    if (checkName) {
        query = query.eq('check_name', checkName);
    }

    const { data, error } = await query.limit(100) as { data: SystemHealthRow[] | null; error: Error | null };

    if (error) {
        console.error('Error fetching system health:', error);
        throw new Error(`Failed to fetch system health: ${error.message}`);
    }

    return (data || []).map(health => ({
        id: health.id,
        check_name: health.check_name,
        status: health.status,
        response_time_ms: health.response_time_ms,
        error_count: health.error_count,
        details: (health.details as Record<string, unknown>) || {},
        checked_at: health.checked_at,
    }));
}

/**
 * Get latest health status for each check type
 */
export async function getLatestHealthStatus(
    config: MonitoringConfig = {}
): Promise<Record<string, SystemHealth>> {
    const supabase = config.client || (isBrowser() ? getSupabaseBrowserClient() : createAdminSupabaseClient());

    const { data, error } = await supabase
        .from('system_health')
        .select('*')
        .order('checked_at', { ascending: false }) as { data: SystemHealthRow[] | null; error: Error | null };

    if (error) {
        console.error('Error fetching latest health status:', error);
        throw new Error(`Failed to fetch latest health status: ${error.message}`);
    }

    const latestByName: Record<string, SystemHealth> = {};
    (data || []).forEach(health => {
        if (!latestByName[health.check_name]) {
            latestByName[health.check_name] = {
                id: health.id,
                check_name: health.check_name,
                status: health.status,
                response_time_ms: health.response_time_ms,
                error_count: health.error_count,
                details: (health.details as Record<string, unknown>) || {},
                checked_at: health.checked_at,
            };
        }
    });

    return latestByName;
}

/**
 * Get cron job execution status
 * Analyzes system_health entries with cron job check names
 */
export async function getCronStatus(
    config: MonitoringConfig = {}
): Promise<CronJobStatus[]> {
    const supabase = config.client || (isBrowser() ? getSupabaseBrowserClient() : createAdminSupabaseClient());

    // Get all cron job related health checks
    const { data, error } = await supabase
        .from('system_health')
        .select('*')
        .like('check_name', 'cron_%')
        .order('checked_at', { ascending: false }) as { data: SystemHealthRow[] | null; error: Error | null };

    if (error) {
        console.error('Error fetching cron status:', error);
        throw new Error(`Failed to fetch cron status: ${error.message}`);
    }

    const jobsByName: Record<string, SystemHealthRow[]> = {};
    (data || []).forEach(check => {
        if (!jobsByName[check.check_name]) {
            jobsByName[check.check_name] = [];
        }
        jobsByName[check.check_name].push(check);
    });

    return Object.entries(jobsByName).map(([job_name, checks]) => {
        const latest = checks[0];
        const details = (latest.details as Record<string, unknown>) || {};

        // Calculate stats from all checks
        const totalErrors = checks.reduce((sum, c) => sum + (c.error_count || 0), 0);
        const healthyRuns = checks.filter(c => c.status === 'healthy').length;

        const errors = details.errors;
        const lastError = errors && Array.isArray(errors) && errors.length > 0
            ? String(errors[0])
            : null;

        return {
            job_name,
            last_run: latest.checked_at,
            status: latest.status,
            execution_time_ms: latest.response_time_ms,
            error_count: totalErrors,
            success_count: healthyRuns,
            last_error: lastError,
        };
    });
}

/**
 * Get database performance metrics
 * Uses Supabase's built-in statistics functions
 */
export async function getDatabaseMetrics(
    config: MonitoringConfig = {}
): Promise<DatabaseMetrics> {
    const supabase = config.client || (isBrowser() ? getSupabaseBrowserClient() : createAdminSupabaseClient());

    try {
        // Get connection stats (requires pg_stat_activity access)
        const { data: connectionData, error: connectionError } = await supabase
            .rpc('get_connection_stats') as {
                data: {
                    total_connections?: number;
                    active_connections?: number;
                    idle_connections?: number;
                    waiting_connections?: number;
                } | null; error: Error | null
            };

        if (connectionError) {
            console.warn('Could not fetch connection stats:', connectionError);
        }

        // Get query statistics (requires pg_stat_statements)
        const { data: queryData, error: queryError } = await supabase
            .rpc('get_query_stats') as {
                data: {
                    total_queries?: number;
                    slow_queries?: number;
                    avg_query_time_ms?: number;
                } | null; error: Error | null
            };

        if (queryError) {
            console.warn('Could not fetch query stats:', queryError);
        }

        // Get table statistics
        const { data: tableData, error: tableError } = await supabase
            .rpc('get_table_stats') as {
                data: {
                    table_name?: string;
                    row_count?: number;
                    size_bytes?: number;
                }[] | null; error: Error | null
            };

        if (tableError) {
            console.warn('Could not fetch table stats:', tableError);
        }

        // Calculate cache hit ratio from system_health if available
        const { data: healthData } = await supabase
            .from('system_health')
            .select('*')
            .eq('check_name', 'database_performance')
            .order('checked_at', { ascending: false })
            .limit(1)
            .single() as { data: SystemHealthRow | null };

        const healthDetails = healthData?.details as Record<string, unknown> || {};

        return {
            total_connections: connectionData?.total_connections ?? 0,
            active_connections: connectionData?.active_connections ?? 0,
            idle_connections: connectionData?.idle_connections ?? 0,
            waiting_connections: connectionData?.waiting_connections ?? 0,
            cache_hit_ratio: (healthDetails.cache_hit_ratio as number) ?? 0,
            query_stats: {
                total_queries: queryData?.total_queries ?? 0,
                slow_queries: queryData?.slow_queries ?? 0,
                avg_query_time_ms: queryData?.avg_query_time_ms ?? 0,
            },
            table_stats: (tableData || []).map((t) => ({
                table_name: String(t.table_name ?? ''),
                row_count: Number(t.row_count ?? 0),
                size_bytes: Number(t.size_bytes ?? 0),
            })),
        };
    } catch (err) {
        console.error('Error fetching database metrics:', err);

        // Return default metrics on error
        return {
            total_connections: 0,
            active_connections: 0,
            idle_connections: 0,
            waiting_connections: 0,
            cache_hit_ratio: 0,
            query_stats: {
                total_queries: 0,
                slow_queries: 0,
                avg_query_time_ms: 0,
            },
            table_stats: [],
        };
    }
}

/**
 * Log a custom error to the error_logs table
 */
export async function logError(
    errorType: string,
    errorMessage: string,
    metadata: Record<string, unknown> = {},
    requestInfo?: {
        path?: string;
        method?: string;
        userAgent?: string;
        ipAddress?: string;
    },
    config: MonitoringConfig = {}
): Promise<void> {
    const supabase = config.client || (isBrowser() ? getSupabaseBrowserClient() : createAdminSupabaseClient());

    const { error } = await supabase.from('error_logs').insert({
        error_type: errorType,
        error_message: errorMessage,
        metadata: metadata as Record<string, unknown>,
        request_path: requestInfo?.path ?? null,
        request_method: requestInfo?.method ?? null,
        user_agent: requestInfo?.userAgent ?? null,
        ip_address: requestInfo?.ipAddress ?? null,
    } as any);

    if (error) {
        console.error('Failed to log error:', error);
        throw new Error(`Failed to log error: ${error.message}`);
    }
}

/**
 * Record a system health check
 */
export async function recordHealthCheck(
    checkName: string,
    status: HealthStatus,
    details: Record<string, unknown> = {},
    responseTimeMs?: number,
    errorCount: number = 0,
    config: MonitoringConfig = {}
): Promise<void> {
    const supabase = config.client || (isBrowser() ? getSupabaseBrowserClient() : createAdminSupabaseClient());

    const { error } = await supabase.from('system_health').insert({
        check_name: checkName,
        status,
        details: details as Record<string, unknown>,
        response_time_ms: responseTimeMs ?? null,
        error_count: errorCount,
    } as any);

    if (error) {
        console.error('Failed to record health check:', error);
        throw new Error(`Failed to record health check: ${error.message}`);
    }
}

/**
 * Get error summary statistics
 */
export async function getErrorSummary(
    hours: number = 24,
    config: MonitoringConfig = {}
): Promise<{
    total_errors: number;
    unique_error_types: number;
    error_trend: { hour: string; count: number }[];
    top_errors: { error_type: string; count: number; percentage: number }[];
}> {
    const supabase = config.client || (isBrowser() ? getSupabaseBrowserClient() : createAdminSupabaseClient());

    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    const { data, error } = await supabase
        .from('error_logs')
        .select('error_type, occurred_at')
        .gte('occurred_at', startTime.toISOString()) as { data: Pick<ErrorLogRow, 'error_type' | 'occurred_at'>[] | null; error: Error | null };

    if (error) {
        console.error('Error fetching error summary:', error);
        throw new Error(`Failed to fetch error summary: ${error.message}`);
    }

    const errors = data || [];
    const totalErrors = errors.length;

    // Group by error type
    const typeCounts = errors.reduce((acc, log) => {
        acc[log.error_type] = (acc[log.error_type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Group by hour
    const hourlyCounts: Record<string, number> = {};
    for (let i = 0; i < hours; i++) {
        const hour = new Date();
        hour.setHours(hour.getHours() - i);
        hour.setMinutes(0, 0, 0);
        hourlyCounts[hour.toISOString()] = 0;
    }

    errors.forEach(log => {
        const hour = new Date(log.occurred_at);
        hour.setMinutes(0, 0, 0);
        const hourKey = hour.toISOString();
        if (hourlyCounts[hourKey] !== undefined) {
            hourlyCounts[hourKey]++;
        }
    });

    const topErrors = Object.entries(typeCounts)
        .map(([error_type, count]) => ({
            error_type,
            count,
            percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const errorTrend = Object.entries(hourlyCounts)
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => new Date(a.hour).getTime() - new Date(b.hour).getTime());

    return {
        total_errors: totalErrors,
        unique_error_types: Object.keys(typeCounts).length,
        error_trend: errorTrend,
        top_errors: topErrors,
    };
}
