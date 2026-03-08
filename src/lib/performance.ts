/**
 * Performance Optimization System
 * Part of Feature 23: Performance Optimization System
 * 
 * Features:
 * - API Response Caching
 * - Performance Monitoring
 * - Query Optimization
 * - Lazy Loading Utilities
 */

import React from 'react';

// In-memory cache for API responses (Feature 23: Caching Strategy)
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const apiCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes default

/**
 * Get cached value if not expired
 */
export function getCachedApiResponse<T>(key: string): T | null {
    const entry = apiCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
        apiCache.delete(key);
        return null;
    }

    return entry.data as T;
}

/**
 * Set cached API response with TTL
 */
export function setCachedApiResponse<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    apiCache.set(key, {
        data,
        expiresAt: Date.now() + ttlMs,
    });
}

/**
 * Invalidate cache entry
 */
export function invalidateCache(key: string): void {
    apiCache.delete(key);
}

/**
 * Invalidate cache by pattern
 */
export function invalidateCachePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of apiCache.keys()) {
        if (regex.test(key)) {
            apiCache.delete(key);
        }
    }
}

/**
 * Clear all cache
 */
export function clearCache(): void {
    apiCache.clear();
}

// Performance monitoring utilities
interface PerformanceMetrics {
    apiResponseTime: number[];
    databaseLatency: number[];
    errorCount: number;
    requestCount: number;
}

export interface ApiRequestMetricInput {
    endpoint: string;
    method: string;
    statusCode: number;
    durationMs: number;
    errorType?: string | null;
    userId?: string | null;
    cacheStatus?: string | null;
    metadata?: Record<string, unknown>;
}

interface EndpointMetricSample {
    durationMs: number;
    statusCode: number;
    errorType?: string | null;
    timestamp: number;
}

export interface EndpointPerformanceSummary {
    endpoint: string;
    method: string;
    totalRequests: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    latestStatusCode: number;
    lastSeenAt: string;
}

const metrics: PerformanceMetrics = {
    apiResponseTime: [],
    databaseLatency: [],
    errorCount: 0,
    requestCount: 0,
};

const endpointMetrics = new Map<string, EndpointMetricSample[]>();
const MAX_ENDPOINT_SAMPLES = 250;

function getAverage(values: number[]): number {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function getPercentile(values: number[], percentile: number): number {
    if (values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * percentile))] || 0;
}

async function persistApiRequestMetric(metric: ApiRequestMetricInput): Promise<void> {
    if (typeof window !== 'undefined') {
        return;
    }

    try {
        const { createAdminSupabaseClient } = await import('@/lib/supabase');
        const supabase = createAdminSupabaseClient();

        const metricsTable = supabase.from('api_request_metrics' as never) as unknown as {
            insert: (payload: Record<string, unknown>) => Promise<unknown>;
        };

        await metricsTable.insert({
            endpoint: metric.endpoint,
            method: metric.method,
            status_code: metric.statusCode,
            duration_ms: Math.max(0, Math.round(metric.durationMs)),
            error_type: metric.errorType || null,
            user_id: metric.userId || null,
            cache_status: metric.cacheStatus || 'bypass',
            metadata: metric.metadata || {},
        });
    } catch (error) {
        console.warn('[Performance] Failed to persist API request metric:', error);
    }
}

/**
 * Record API response time
 */
export function recordApiResponseTime(durationMs: number): void {
    metrics.apiResponseTime.push(durationMs);
    metrics.requestCount++;

    // Keep only last 1000 entries
    if (metrics.apiResponseTime.length > 1000) {
        metrics.apiResponseTime.shift();
    }
}

/**
 * Record database latency
 */
export function recordDatabaseLatency(durationMs: number): void {
    metrics.databaseLatency.push(durationMs);

    if (metrics.databaseLatency.length > 1000) {
        metrics.databaseLatency.shift();
    }
}

/**
 * Record error occurrence
 */
export function recordError(): void {
    metrics.errorCount++;
}

export function recordApiRequestMetric(metric: ApiRequestMetricInput): Promise<void> {
    recordApiResponseTime(metric.durationMs);

    const endpointKey = `${metric.method.toUpperCase()} ${metric.endpoint}`;
    const samples = endpointMetrics.get(endpointKey) || [];

    samples.push({
        durationMs: metric.durationMs,
        statusCode: metric.statusCode,
        errorType: metric.errorType,
        timestamp: Date.now(),
    });

    if (samples.length > MAX_ENDPOINT_SAMPLES) {
        samples.splice(0, samples.length - MAX_ENDPOINT_SAMPLES);
    }

    endpointMetrics.set(endpointKey, samples);

    return persistApiRequestMetric(metric);
}

export function getEndpointPerformanceStats(limit: number = 20): EndpointPerformanceSummary[] {
    return [...endpointMetrics.entries()]
        .map(([key, samples]) => {
            const [method, ...endpointParts] = key.split(' ');
            const durations = samples.map((sample) => sample.durationMs);
            const errorCount = samples.filter((sample) => sample.statusCode >= 400 || Boolean(sample.errorType)).length;
            const latest = samples[samples.length - 1];

            return {
                endpoint: endpointParts.join(' '),
                method,
                totalRequests: samples.length,
                avgResponseTime: getAverage(durations),
                p95ResponseTime: getPercentile(durations, 0.95),
                errorRate: samples.length > 0 ? errorCount / samples.length : 0,
                latestStatusCode: latest?.statusCode || 0,
                lastSeenAt: latest ? new Date(latest.timestamp).toISOString() : '',
            };
        })
        .sort((left, right) => (
            right.p95ResponseTime - left.p95ResponseTime || right.totalRequests - left.totalRequests
        ))
        .slice(0, limit);
}

/**
 * Get performance statistics
 */
export function getPerformanceStats(): {
    avgApiResponseTime: number;
    p95ApiResponseTime: number;
    avgDatabaseLatency: number;
    p95DatabaseLatency: number;
    errorRate: number;
    requestCount: number;
} {
    const apiTimes = [...metrics.apiResponseTime];
    const dbTimes = [...metrics.databaseLatency];

    return {
        avgApiResponseTime: getAverage(apiTimes),
        p95ApiResponseTime: getPercentile(apiTimes, 0.95),
        avgDatabaseLatency: getAverage(dbTimes),
        p95DatabaseLatency: getPercentile(dbTimes, 0.95),
        errorRate: metrics.requestCount > 0 ? metrics.errorCount / metrics.requestCount : 0,
        requestCount: metrics.requestCount,
    };
}

// Lazy loading utilities
type LazyComponent<T> = () => Promise<{ default: React.ComponentType<T> }>;

/**
 * Create lazy loading wrapper for components
 */
export function createLazyComponent<T>(
    loader: LazyComponent<T>,
    _fallback?: React.ReactNode
): React.LazyExoticComponent<React.ComponentType<T>> {
    return React.lazy(() =>
        loader().then(module => ({ default: module.default }))
    );
}

// Query builder helpers for optimization
export interface QueryOptions {
    select?: string;
    eq?: Record<string, unknown>;
    order?: { column: string; ascending?: boolean };
    range?: [number, number];
    limit?: number;
}

/**
 * Build optimized query string
 */
export function buildQueryString(options: QueryOptions): string {
    const params = new URLSearchParams();

    if (options.select) {
        params.set('select', options.select);
    }

    if (options.eq) {
        for (const [key, value] of Object.entries(options.eq)) {
            params.set(key, String(value));
        }
    }

    if (options.order) {
        params.set('order', `${options.order.column}.${options.order.ascending ? 'asc' : 'desc'}`);
    }

    if (options.range) {
        params.set('range', `${options.range[0]},${options.range[1]}`);
    }

    if (options.limit) {
        params.set('limit', String(options.limit));
    }

    return params.toString();
}

// Throttle and debounce utilities
/**
 * Throttle function execution
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limitMs: number
): T {
    let inThrottle = false;

    return function (this: unknown, ...args: Parameters<T>) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limitMs);
        }
    } as T;
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    waitMs: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;

    return function (this: unknown, ...args: Parameters<T>) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, waitMs);
    };
}
