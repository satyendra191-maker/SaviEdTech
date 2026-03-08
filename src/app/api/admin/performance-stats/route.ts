/**
 * Performance Statistics API
 * Part of Feature 23: Performance Optimization System
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/api/admin-auth';
import { clampInteger, monitoredRoute } from '@/lib/api/route-utils';
import { createApiError, ErrorType, errorResponse, handleSupabaseError } from '@/lib/error-handler';
import { getEndpointPerformanceStats, getPerformanceStats } from '@/lib/performance';
import { createAdminSupabaseClient } from '@/lib/supabase';

interface PlatformPerformanceSnapshot {
    generated_at?: string;
    window_hours?: number;
    connections?: {
        total_connections?: number;
        active_connections?: number;
        idle_connections?: number;
        waiting_connections?: number;
    };
    queries?: {
        total_queries?: number;
        slow_queries?: number;
        avg_query_time_ms?: number;
    };
    api?: Array<{
        endpoint: string;
        method: string;
        total_requests: number;
        avg_response_time: number;
        p50_response_time: number;
        p95_response_time: number;
        p99_response_time: number;
        error_count: number;
        requests_per_minute: number;
    }>;
    errors?: {
        total?: number;
        top_types?: Array<{ error_type: string; count: number }>;
    };
    health?: {
        recent_checks?: Array<{
            check_name: string;
            status: 'healthy' | 'degraded' | 'critical';
            response_time_ms: number | null;
            error_count: number;
            checked_at: string;
        }>;
    };
    tables?: {
        largest?: Array<{
            table_name: string;
            row_count: number;
            size_bytes: number;
        }>;
    };
}

export async function GET(request: NextRequest) {
    return monitoredRoute(request, async () => {
        const adminContext = await requireAdminRequest(request);
        if (!adminContext) {
            return errorResponse(
                createApiError(ErrorType.AUTHORIZATION, 'Admin access required.', { statusCode: 403 }),
                { path: '/api/admin/performance-stats', method: request.method }
            );
        }

        const { searchParams } = new URL(request.url);
        const hours = clampInteger(searchParams.get('hours'), 24, 1, 168);
        const endpointLimit = clampInteger(searchParams.get('limit'), 10, 1, 50);

        const supabase = createAdminSupabaseClient();
        const { data, error } = await supabase.rpc('get_platform_performance_snapshot' as never, {
            p_hours: hours,
        } as never);

        if (error) {
            throw handleSupabaseError(error);
        }

        const runtimeStats = getPerformanceStats();
        const endpointStats = getEndpointPerformanceStats(endpointLimit);
        const snapshot = (data || {}) as PlatformPerformanceSnapshot;

        return NextResponse.json(
            {
                success: true,
                timestamp: snapshot.generated_at || new Date().toISOString(),
                windowHours: snapshot.window_hours || hours,
                metrics: {
                    runtime: {
                        avgApiResponseTimeMs: Math.round(runtimeStats.avgApiResponseTime),
                        p95ApiResponseTimeMs: Math.round(runtimeStats.p95ApiResponseTime),
                        avgDatabaseLatencyMs: Math.round(runtimeStats.avgDatabaseLatency),
                        p95DatabaseLatencyMs: Math.round(runtimeStats.p95DatabaseLatency),
                        errorRatePercent: Math.round(runtimeStats.errorRate * 10000) / 100,
                        totalRequests: runtimeStats.requestCount,
                    },
                    database: {
                        connections: snapshot.connections || {},
                        queries: snapshot.queries || {},
                        largestTables: (snapshot.tables?.largest || []).slice(0, endpointLimit),
                    },
                    api: {
                        inMemoryEndpoints: endpointStats,
                        persistedEndpoints: (snapshot.api || []).slice(0, endpointLimit),
                    },
                    reliability: {
                        recentErrors: snapshot.errors || { total: 0, top_types: [] },
                        healthChecks: (snapshot.health?.recent_checks || []).slice(0, endpointLimit),
                    },
                },
            },
            {
                headers: {
                    'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
                },
            }
        );
    }, {
        routeLabel: '/api/admin/performance-stats',
        defaultCacheControl: 'private, max-age=60, stale-while-revalidate=120',
        metadata: { feature: 'performance-optimization' },
    });
}
