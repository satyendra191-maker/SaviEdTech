/**
 * Performance Optimization Engine
 * 
 * Comprehensive performance analysis and optimization infrastructure for the SaviEdTech platform.
 * Provides query optimization, cache management, bundle analysis, and API performance monitoring.
 * 
 * @module platform-manager/performance
 */

import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';

// Type definitions
export type PerformanceScore = number; // 0-100
export type OptimizationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface SlowQuery {
    queryid: string;
    query: string;
    calls: number;
    total_time: number;
    mean_time: number;
    stddev_time: number;
    rows: number;
    shared_blks_hit: number;
    shared_blks_read: number;
    temp_blks_written: number;
}

export interface IndexRecommendation {
    table: string;
    column: string;
    reason: string;
    priority: OptimizationPriority;
    estimatedImprovement: string;
    suggestedIndex: string;
}

export interface TablePerformance {
    tableName: string;
    rowCount: number;
    sizeBytes: number;
    seqScanCount: number;
    idxScanCount: number;
    seqScanRatio: number;
    deadTupleRatio: number;
    bloatRatio: number;
    recommendations: string[];
}

export interface QueryPerformanceReport {
    slowQueries: SlowQuery[];
    indexRecommendations: IndexRecommendation[];
    tablePerformance: TablePerformance[];
    summary: {
        totalSlowQueries: number;
        criticalQueries: number;
        tablesNeedingOptimization: number;
        overallQueryHealth: 'healthy' | 'degraded' | 'critical';
    };
}

export interface CacheStats {
    totalQueries: number;
    cachedQueries: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRatio: number;
    avgCacheResponseTime: number;
    avgDbResponseTime: number;
    cacheEfficiency: number;
}

export interface CacheStrategy {
    queryPattern: string;
    frequency: number;
    avgResponseTime: number;
    recommendedCacheDuration: number; // in seconds
    priority: OptimizationPriority;
    estimatedMemoryUsage: string;
}

export interface CacheEfficiency {
    hitRatio: number;
    missRatio: number;
    evictionRate: number;
    memoryUtilization: number;
    score: number; // 0-100
}

export interface BundleAnalysis {
    totalSize: number;
    gzipSize: number;
    files: BundleFile[];
    dependencies: DependencyInfo[];
    unusedCode: UnusedCodeInfo[];
    duplicateCode: DuplicateCodeInfo[];
}

export interface BundleFile {
    name: string;
    size: number;
    gzipSize: number;
    type: 'js' | 'css' | 'json' | 'other';
    percentage: number;
}

export interface DependencyInfo {
    name: string;
    version: string;
    size: number;
    isDuplicate: boolean;
    isUnused: boolean;
}

export interface UnusedCodeInfo {
    file: string;
    unusedExports: string[];
    unusedImports: string[];
    deadCode: string[];
}

export interface DuplicateCodeInfo {
    modules: string[];
    size: number;
    occurrences: number;
}

export interface CodeSplittingRecommendation {
    route: string;
    currentSize: number;
    suggestedChunks: string[];
    potentialSavings: number;
    priority: OptimizationPriority;
}

export interface BundleReport {
    analysis: BundleAnalysis;
    recommendations: CodeSplittingRecommendation[];
    summary: {
        totalSize: string;
        gzipSize: string;
        unusedCodeSize: string;
        duplicateCodeSize: string;
        potentialSavings: string;
        score: number; // 0-100
    };
}

export interface APIEndpointPerformance {
    endpoint: string;
    method: string;
    totalRequests: number;
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number; // requests per minute
}

export interface APIOptimizationRecommendation {
    endpoint: string;
    issue: string;
    recommendation: string;
    priority: OptimizationPriority;
    estimatedImprovement: string;
}

export interface APIPerformanceReport {
    endpoints: APIEndpointPerformance[];
    recommendations: APIOptimizationRecommendation[];
    summary: {
        totalEndpoints: number;
        slowEndpoints: number;
        highErrorRateEndpoints: number;
        overallAPIHealth: 'healthy' | 'degraded' | 'critical';
    };
}

export interface OptimizationReport {
    timestamp: string;
    queryPerformance: QueryPerformanceReport;
    cacheStats: CacheStats;
    cacheStrategies: CacheStrategy[];
    bundleReport: BundleReport;
    apiPerformance: APIPerformanceReport;
    overallScore: PerformanceScore;
    criticalIssues: number;
    highPriorityIssues: number;
    mediumPriorityIssues: number;
    lowPriorityIssues: number;
}

export interface PerformanceMetrics {
    queryScore: number;
    cacheScore: number;
    bundleScore: number;
    apiScore: number;
    overallScore: number;
}

// Cache implementation
const queryCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
const DEFAULT_CACHE_TTL = 300000; // 5 minutes in milliseconds

// ============================================
// QUERY OPTIMIZER
// ============================================

/**
 * Analyze slow queries from pg_stat_statements
 * Requires pg_stat_statements extension to be enabled
 */
export async function analyzeSlowQueries(minExecutionTime = 100): Promise<SlowQuery[]> {
    const supabase = createAdminSupabaseClient();

    try {
        // Check if pg_stat_statements is available
        const { data: extensionCheck, error: extError } = await supabase
            .rpc('check_extension', { extension_name: 'pg_stat_statements' } as never);

        if (extError || !extensionCheck) {
            // Fallback: Analyze queries from error_logs or query_logs if available
            const { data: slowQueries, error } = await supabase
                .from('error_logs')
                .select('*')
                .eq('error_type', 'slow_query')
                .gte('occurred_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .limit(100);

            if (error) throw error;

            return (slowQueries || []).map((q: Record<string, unknown>) => ({
                queryid: q.id as string,
                query: (q.metadata as Record<string, string>)?.query || 'Unknown',
                calls: 1,
                total_time: (q.metadata as Record<string, number>)?.execution_time || 0,
                mean_time: (q.metadata as Record<string, number>)?.execution_time || 0,
                stddev_time: 0,
                rows: 0,
                shared_blks_hit: 0,
                shared_blks_read: 0,
                temp_blks_written: 0,
            }));
        }

        // Query pg_stat_statements
        const { data, error } = await supabase
            .rpc('get_slow_queries', { min_time: minExecutionTime } as never);

        if (error) throw error;

        return (data || []) as SlowQuery[];
    } catch (error) {
        console.error('Error analyzing slow queries:', error);
        return [];
    }
}

/**
 * Recommend indexes based on query patterns
 */
export async function recommendIndexes(): Promise<IndexRecommendation[]> {
    const supabase = createAdminSupabaseClient();
    const recommendations: IndexRecommendation[] = [];

    try {
        // Analyze table scan patterns
        const { data: tableStats, error } = await supabase
            .rpc('get_table_scan_stats');

        if (error) throw error;

        for (const table of (tableStats || []) as Array<{
            table_name: string;
            seq_scan: number;
            idx_scan: number;
            n_live_tup: number;
        }>) {
            const seqScanRatio = table.seq_scan / (table.seq_scan + table.idx_scan + 1);

            if (seqScanRatio > 0.5 && table.n_live_tup > 1000) {
                // High sequential scan ratio on large table
                recommendations.push({
                    table: table.table_name,
                    column: 'id',
                    reason: `High sequential scan ratio (${(seqScanRatio * 100).toFixed(1)}%) on table with ${table.n_live_tup} rows`,
                    priority: seqScanRatio > 0.8 ? 'critical' : 'high',
                    estimatedImprovement: `${Math.round((seqScanRatio - 0.2) * 100)}% reduction in query time`,
                    suggestedIndex: `CREATE INDEX idx_${table.table_name}_lookup ON ${table.table_name} (id);`,
                });
            }
        }

        // Check for missing foreign key indexes
        const { data: fkData, error: fkError } = await supabase
            .rpc('get_foreign_keys_without_indexes');

        if (!fkError && fkData) {
            for (const fk of (fkData as Array<{ table_name: string; column_name: string }>)) {
                recommendations.push({
                    table: fk.table_name,
                    column: fk.column_name,
                    reason: 'Foreign key without index - causes slow JOINs and cascade operations',
                    priority: 'high',
                    estimatedImprovement: '50-80% improvement in JOIN performance',
                    suggestedIndex: `CREATE INDEX idx_${fk.table_name}_${fk.column_name} ON ${fk.table_name} (${fk.column_name});`,
                });
            }
        }

        return recommendations.sort((a, b) =>
            priorityWeight(b.priority) - priorityWeight(a.priority)
        );
    } catch (error) {
        console.error('Error recommending indexes:', error);
        return recommendations;
    }
}

/**
 * Analyze table performance including scan ratios and bloat
 */
export async function analyzeTablePerformance(): Promise<TablePerformance[]> {
    const supabase = createAdminSupabaseClient();

    try {
        const { data, error } = await supabase
            .rpc('get_table_performance_stats');

        if (error) throw error;

        return ((data || []) as Array<{
            table_name: string;
            n_live_tup: number;
            total_bytes: number;
            seq_scan: number;
            idx_scan: number;
            n_dead_tup: number;
            bloat_ratio: number;
        }>).map((table): TablePerformance => {
            const totalScans = table.seq_scan + table.idx_scan;
            const seqScanRatio = totalScans > 0 ? table.seq_scan / totalScans : 0;
            const deadTupleRatio = table.n_live_tup > 0 ? table.n_dead_tup / table.n_live_tup : 0;
            const recommendations: string[] = [];

            if (seqScanRatio > 0.7) {
                recommendations.push(`Add indexes to reduce ${(seqScanRatio * 100).toFixed(1)}% sequential scans`);
            }
            if (deadTupleRatio > 0.1) {
                recommendations.push('Run VACUUM to remove dead tuples');
            }
            if (table.bloat_ratio > 0.3) {
                recommendations.push('Run VACUUM FULL to reduce table bloat');
            }

            return {
                tableName: table.table_name,
                rowCount: table.n_live_tup,
                sizeBytes: table.total_bytes,
                seqScanCount: table.seq_scan,
                idxScanCount: table.idx_scan,
                seqScanRatio,
                deadTupleRatio,
                bloatRatio: table.bloat_ratio,
                recommendations,
            };
        });
    } catch (error) {
        console.error('Error analyzing table performance:', error);
        return [];
    }
}

/**
 * Generate comprehensive query performance report
 */
export async function getQueryPerformanceReport(): Promise<QueryPerformanceReport> {
    const [slowQueries, indexRecommendations, tablePerformance] = await Promise.all([
        analyzeSlowQueries(),
        recommendIndexes(),
        analyzeTablePerformance(),
    ]);

    const criticalQueries = slowQueries.filter(q => q.mean_time > 1000).length;
    const tablesNeedingOptimization = tablePerformance.filter(
        t => t.recommendations.length > 0
    ).length;

    let overallQueryHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalQueries > 5 || tablesNeedingOptimization > 10) {
        overallQueryHealth = 'critical';
    } else if (criticalQueries > 2 || tablesNeedingOptimization > 5) {
        overallQueryHealth = 'degraded';
    }

    return {
        slowQueries,
        indexRecommendations,
        tablePerformance,
        summary: {
            totalSlowQueries: slowQueries.length,
            criticalQueries,
            tablesNeedingOptimization,
            overallQueryHealth,
        },
    };
}

// ============================================
// CACHE MANAGER
// ============================================

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
    const supabase = createAdminSupabaseClient();

    try {
        // Query cache-related metrics from database
        const { data: dbStats, error } = await supabase
            .rpc('get_cache_stats');

        if (error) throw error;

        // Combine with application cache stats
        const cachedQueries = queryCache.size;
        const stats = dbStats as { cache_hits?: number; cache_misses?: number; avg_cache_time?: number; avg_db_time?: number } | null;
        const cacheHits = stats?.cache_hits ?? 0;
        const cacheMisses = stats?.cache_misses ?? 0;
        const totalQueries = cacheHits + cacheMisses;
        const cacheHitRatio = totalQueries > 0 ? cacheHits / totalQueries : 0;

        return {
            totalQueries,
            cachedQueries,
            cacheHits,
            cacheMisses,
            cacheHitRatio,
            avgCacheResponseTime: stats?.avg_cache_time ?? 0,
            avgDbResponseTime: stats?.avg_db_time ?? 0,
            cacheEfficiency: cacheHitRatio * 100,
        };
    } catch (error) {
        console.error('Error getting cache stats:', error);

        // Return default stats
        return {
            totalQueries: 0,
            cachedQueries: queryCache.size,
            cacheHits: 0,
            cacheMisses: 0,
            cacheHitRatio: 0,
            avgCacheResponseTime: 0,
            avgDbResponseTime: 0,
            cacheEfficiency: 0,
        };
    }
}

/**
 * Recommend cache strategies for hot queries
 */
export async function recommendCacheStrategies(): Promise<CacheStrategy[]> {
    const supabase = createAdminSupabaseClient();

    try {
        const { data, error } = await supabase
            .rpc('get_frequent_queries');

        if (error) throw error;

        const strategies: CacheStrategy[] = [];

        for (const query of (data || []) as Array<{
            query_pattern: string;
            frequency: number;
            avg_time: number;
        }>) {
            if (query.frequency >= 10 && query.avg_time > 50) {
                strategies.push({
                    queryPattern: query.query_pattern,
                    frequency: query.frequency,
                    avgResponseTime: query.avg_time,
                    recommendedCacheDuration: calculateCacheDuration(query.frequency),
                    priority: query.frequency > 100 ? 'high' : 'medium',
                    estimatedMemoryUsage: `${(query.frequency * 0.1).toFixed(2)}MB`,
                });
            }
        }

        return strategies.sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
        console.error('Error recommending cache strategies:', error);
        return [];
    }
}

/**
 * Analyze cache efficiency
 */
export async function analyzeCacheEfficiency(): Promise<CacheEfficiency> {
    const stats = await getCacheStats();

    const hitRatio = stats.cacheHitRatio;
    const missRatio = 1 - hitRatio;
    const evictionRate = calculateEvictionRate();
    const memoryUtilization = calculateMemoryUtilization();

    // Calculate efficiency score (0-100)
    const score = Math.round(
        (hitRatio * 40) + // 40% weight on hit ratio
        ((1 - missRatio) * 30) + // 30% weight on low miss ratio
        ((1 - evictionRate) * 20) + // 20% weight on low eviction
        (memoryUtilization * 10) // 10% weight on memory utilization
    );

    return {
        hitRatio,
        missRatio,
        evictionRate,
        memoryUtilization,
        score,
    };
}

/**
 * Implement query result caching layer
 */
export async function implementQueryCache<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl: number = DEFAULT_CACHE_TTL
): Promise<T> {
    const now = Date.now();
    const cached = queryCache.get(cacheKey);

    // Return cached data if valid
    if (cached && now - cached.timestamp < cached.ttl) {
        return cached.data as T;
    }

    // Execute query and cache result
    const data = await queryFn();

    queryCache.set(cacheKey, {
        data,
        timestamp: now,
        ttl,
    });

    return data;
}

/**
 * Invalidate cache entries
 */
export function invalidateCache(pattern?: string): void {
    if (!pattern) {
        queryCache.clear();
        return;
    }

    for (const key of queryCache.keys()) {
        if (key.includes(pattern)) {
            queryCache.delete(key);
        }
    }
}

/**
 * Get cache size
 */
export function getCacheSize(): number {
    return queryCache.size;
}

// ============================================
// BUNDLE ANALYZER
// ============================================

/**
 * Analyze JavaScript bundle sizes
 */
export async function analyzeBundleSize(): Promise<BundleAnalysis> {
    const analysis: BundleAnalysis = {
        totalSize: 0,
        gzipSize: 0,
        files: [],
        dependencies: [],
        unusedCode: [],
        duplicateCode: [],
    };

    try {
        // Read .next/static directory for bundle analysis
        const staticDir = join(process.cwd(), '.next', 'static');
        const files = await analyzeDirectory(staticDir);

        for (const file of files) {
            const fileSize = (await stat(file)).size;
            const gzipSize = estimateGzipSize(fileSize);
            const relativePath = file.replace(process.cwd(), '');

            analysis.files.push({
                name: relativePath,
                size: fileSize,
                gzipSize,
                type: getFileType(file),
                percentage: 0, // Will calculate after total
            });

            analysis.totalSize += fileSize;
            analysis.gzipSize += gzipSize;
        }

        // Calculate percentages
        for (const file of analysis.files) {
            file.percentage = (file.size / analysis.totalSize) * 100;
        }

        // Sort by size
        analysis.files.sort((a, b) => b.size - a.size);

        // Analyze dependencies from package.json
        analysis.dependencies = await analyzeDependencies();

        // Find unused code
        analysis.unusedCode = await identifyUnusedCode();

        // Find duplicate code
        analysis.duplicateCode = findDuplicateCode(analysis.files);

    } catch (error) {
        console.error('Error analyzing bundle size:', error);
    }

    return analysis;
}

/**
 * Identify unused code paths
 */
export async function identifyUnusedCode(): Promise<UnusedCodeInfo[]> {
    const unusedCode: UnusedCodeInfo[] = [];

    try {
        const srcDir = join(process.cwd(), 'src');
        const files = await analyzeDirectory(srcDir, ['.ts', '.tsx']);

        for (const file of files) {
            const content = await readFile(file, 'utf-8');
            const analysis = analyzeFileForUnusedCode(content, file);

            if (analysis.unusedExports.length > 0 ||
                analysis.unusedImports.length > 0 ||
                analysis.deadCode.length > 0) {
                unusedCode.push({
                    file: file.replace(process.cwd(), ''),
                    ...analysis,
                });
            }
        }
    } catch (error) {
        console.error('Error identifying unused code:', error);
    }

    return unusedCode;
}

/**
 * Recommend code splitting opportunities
 */
export async function recommendCodeSplitting(): Promise<CodeSplittingRecommendation[]> {
    const recommendations: CodeSplittingRecommendation[] = [];

    try {
        const appDir = join(process.cwd(), 'src', 'app');
        const routes = await readdir(appDir, { withFileTypes: true });

        for (const route of routes) {
            if (route.isDirectory()) {
                const routePath = join(appDir, route.name);
                const pageFile = join(routePath, 'page.tsx');

                try {
                    const stats = await stat(pageFile);
                    const size = stats.size;

                    // Recommend code splitting for large pages
                    if (size > 50000) { // 50KB
                        const potentialSavings = Math.floor(size * 0.4);
                        recommendations.push({
                            route: `/${route.name}`,
                            currentSize: size,
                            suggestedChunks: [
                                `components/${route.name}-components`,
                                `lib/${route.name}-utils`,
                            ],
                            potentialSavings,
                            priority: size > 100000 ? 'high' : 'medium',
                        });
                    }
                } catch {
                    // Page file doesn't exist
                }
            }
        }

        return recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
    } catch (error) {
        console.error('Error recommending code splitting:', error);
        return recommendations;
    }
}

/**
 * Generate bundle analysis report
 */
export async function getBundleReport(): Promise<BundleReport> {
    const [analysis, recommendations] = await Promise.all([
        analyzeBundleSize(),
        recommendCodeSplitting(),
    ]);

    // Calculate unused and duplicate code sizes
    const unusedCodeSize = analysis.unusedCode.reduce((sum, item) => {
        // Estimate based on file references
        return sum + (item.unusedExports.length * 500);
    }, 0);

    const duplicateCodeSize = analysis.duplicateCode.reduce((sum, item) =>
        sum + item.size, 0);

    const potentialSavings = recommendations.reduce((sum, rec) =>
        sum + rec.potentialSavings, 0) + unusedCodeSize + duplicateCodeSize;

    // Calculate score (0-100)
    const score = Math.max(0, 100 - Math.floor(
        (analysis.totalSize / 1024 / 1024) * 5 + // Penalty for total size
        (unusedCodeSize / 1024 / 1024) * 10 + // Penalty for unused code
        (duplicateCodeSize / 1024 / 1024) * 10 // Penalty for duplicates
    ));

    return {
        analysis,
        recommendations,
        summary: {
            totalSize: formatBytes(analysis.totalSize),
            gzipSize: formatBytes(analysis.gzipSize),
            unusedCodeSize: formatBytes(unusedCodeSize),
            duplicateCodeSize: formatBytes(duplicateCodeSize),
            potentialSavings: formatBytes(potentialSavings),
            score,
        },
    };
}

// ============================================
// API OPTIMIZER
// ============================================

/**
 * Analyze API response times
 */
export async function analyzeAPIResponseTimes(): Promise<APIEndpointPerformance[]> {
    const supabase = createAdminSupabaseClient();

    try {
        const { data, error } = await supabase
            .rpc('get_api_performance_stats');

        if (error) throw error;

        return ((data || []) as Array<{
            endpoint: string;
            method: string;
            total_requests: number;
            avg_response_time: number;
            p50_response_time: number;
            p95_response_time: number;
            p99_response_time: number;
            error_count: number;
            requests_per_minute: number;
        }>).map((stat): APIEndpointPerformance => ({
            endpoint: stat.endpoint,
            method: stat.method,
            totalRequests: stat.total_requests,
            avgResponseTime: stat.avg_response_time,
            p50ResponseTime: stat.p50_response_time,
            p95ResponseTime: stat.p95_response_time,
            p99ResponseTime: stat.p99_response_time,
            errorRate: stat.total_requests > 0 ? stat.error_count / stat.total_requests : 0,
            throughput: stat.requests_per_minute,
        }));
    } catch (error) {
        console.error('Error analyzing API response times:', error);
        return [];
    }
}

/**
 * Recommend API optimizations
 */
export async function recommendAPIOptimizations(): Promise<APIOptimizationRecommendation[]> {
    const endpoints = await analyzeAPIResponseTimes();
    const recommendations: APIOptimizationRecommendation[] = [];

    for (const endpoint of endpoints) {
        // Check for slow endpoints
        if (endpoint.p95ResponseTime > 1000) {
            recommendations.push({
                endpoint: `${endpoint.method} ${endpoint.endpoint}`,
                issue: `High P95 response time (${endpoint.p95ResponseTime.toFixed(2)}ms)`,
                recommendation: 'Implement query optimization, add database indexes, or implement caching',
                priority: endpoint.p95ResponseTime > 3000 ? 'critical' : 'high',
                estimatedImprovement: `${Math.floor(endpoint.p95ResponseTime * 0.6)}ms reduction expected`,
            });
        }

        // Check for high error rates
        if (endpoint.errorRate > 0.05) {
            recommendations.push({
                endpoint: `${endpoint.method} ${endpoint.endpoint}`,
                issue: `High error rate (${(endpoint.errorRate * 100).toFixed(2)}%)`,
                recommendation: 'Review error logs, add input validation, implement circuit breakers',
                priority: endpoint.errorRate > 0.1 ? 'critical' : 'high',
                estimatedImprovement: 'Reduce error rate to <1%',
            });
        }

        // Check for high throughput without caching
        if (endpoint.throughput > 100 && endpoint.avgResponseTime > 100) {
            recommendations.push({
                endpoint: `${endpoint.method} ${endpoint.endpoint}`,
                issue: `High throughput (${endpoint.throughput.toFixed(0)} req/min) with slow responses`,
                recommendation: 'Implement response caching, consider CDN, or optimize database queries',
                priority: 'medium',
                estimatedImprovement: '60-80% throughput improvement expected',
            });
        }
    }

    return recommendations.sort((a, b) =>
        priorityWeight(b.priority) - priorityWeight(a.priority)
    );
}

/**
 * Generate API performance report
 */
export async function getAPIPerformanceReport(): Promise<APIPerformanceReport> {
    const [endpoints, recommendations] = await Promise.all([
        analyzeAPIResponseTimes(),
        recommendAPIOptimizations(),
    ]);

    const slowEndpoints = endpoints.filter(e => e.p95ResponseTime > 1000).length;
    const highErrorRateEndpoints = endpoints.filter(e => e.errorRate > 0.05).length;

    let overallAPIHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (slowEndpoints > 5 || highErrorRateEndpoints > 3) {
        overallAPIHealth = 'critical';
    } else if (slowEndpoints > 2 || highErrorRateEndpoints > 1) {
        overallAPIHealth = 'degraded';
    }

    return {
        endpoints,
        recommendations,
        summary: {
            totalEndpoints: endpoints.length,
            slowEndpoints,
            highErrorRateEndpoints,
            overallAPIHealth,
        },
    };
}

// ============================================
// AUTO-OPTIMIZATION FEATURES
// ============================================

/**
 * Run all optimization checks
 */
export async function runAutoOptimization(): Promise<{
    queryOptimized: boolean;
    cacheOptimized: boolean;
    bundleOptimized: boolean;
    apiOptimized: boolean;
    issuesFound: number;
    issuesResolved: number;
}> {
    const results = {
        queryOptimized: false,
        cacheOptimized: false,
        bundleOptimized: false,
        apiOptimized: false,
        issuesFound: 0,
        issuesResolved: 0,
    };

    try {
        // Run query optimization
        const queryReport = await getQueryPerformanceReport();
        results.issuesFound += queryReport.summary.criticalQueries +
            queryReport.summary.tablesNeedingOptimization;
        results.queryOptimized = queryReport.summary.overallQueryHealth === 'healthy';

        // Run cache optimization
        const cacheEfficiency = await analyzeCacheEfficiency();
        results.issuesFound += cacheEfficiency.score < 70 ? 1 : 0;
        results.cacheOptimized = cacheEfficiency.score >= 80;

        // Run bundle optimization
        const bundleReport = await getBundleReport();
        results.issuesFound += bundleReport.recommendations.length;
        results.bundleOptimized = bundleReport.summary.score >= 80;

        // Run API optimization
        const apiReport = await getAPIPerformanceReport();
        results.issuesFound += apiReport.summary.slowEndpoints +
            apiReport.summary.highErrorRateEndpoints;
        results.apiOptimized = apiReport.summary.overallAPIHealth === 'healthy';

    } catch (error) {
        console.error('Error running auto-optimization:', error);
    }

    return results;
}

/**
 * Generate comprehensive optimization report
 */
export async function generateOptimizationReport(): Promise<OptimizationReport> {
    const [
        queryPerformance,
        cacheStats,
        cacheStrategies,
        bundleReport,
        apiPerformance,
    ] = await Promise.all([
        getQueryPerformanceReport(),
        getCacheStats(),
        recommendCacheStrategies(),
        getBundleReport(),
        getAPIPerformanceReport(),
    ]);

    const overallScore = await getPerformanceScore();

    const criticalIssues =
        queryPerformance.indexRecommendations.filter(r => r.priority === 'critical').length +
        apiPerformance.recommendations.filter(r => r.priority === 'critical').length;

    const highPriorityIssues =
        queryPerformance.indexRecommendations.filter(r => r.priority === 'high').length +
        apiPerformance.recommendations.filter(r => r.priority === 'high').length +
        bundleReport.recommendations.filter(r => r.priority === 'high').length;

    const mediumPriorityIssues =
        queryPerformance.indexRecommendations.filter(r => r.priority === 'medium').length +
        apiPerformance.recommendations.filter(r => r.priority === 'medium').length +
        bundleReport.recommendations.filter(r => r.priority === 'medium').length;

    const lowPriorityIssues =
        queryPerformance.indexRecommendations.filter(r => r.priority === 'low').length +
        apiPerformance.recommendations.filter(r => r.priority === 'low').length;

    return {
        timestamp: new Date().toISOString(),
        queryPerformance,
        cacheStats,
        cacheStrategies,
        bundleReport,
        apiPerformance,
        overallScore,
        criticalIssues,
        highPriorityIssues,
        mediumPriorityIssues,
        lowPriorityIssues,
    };
}

/**
 * Calculate overall performance score (0-100)
 */
export async function getPerformanceScore(): Promise<PerformanceScore> {
    const [
        queryPerformance,
        cacheEfficiency,
        bundleReport,
        apiPerformance,
    ] = await Promise.all([
        getQueryPerformanceReport(),
        analyzeCacheEfficiency(),
        getBundleReport(),
        getAPIPerformanceReport(),
    ]);

    // Query performance score (0-25 points)
    let queryScore = 25;
    if (queryPerformance.summary.overallQueryHealth === 'critical') {
        queryScore = 5;
    } else if (queryPerformance.summary.overallQueryHealth === 'degraded') {
        queryScore = 15;
    }

    // Cache efficiency score (0-25 points)
    const cacheScore = Math.round((cacheEfficiency.score / 100) * 25);

    // Bundle score (0-25 points)
    const bundleScore = Math.round((bundleReport.summary.score / 100) * 25);

    // API performance score (0-25 points)
    let apiScore = 25;
    if (apiPerformance.summary.overallAPIHealth === 'critical') {
        apiScore = 5;
    } else if (apiPerformance.summary.overallAPIHealth === 'degraded') {
        apiScore = 15;
    }

    // Calculate weighted total
    const totalScore = queryScore + cacheScore + bundleScore + apiScore;

    return Math.max(0, Math.min(100, totalScore));
}

/**
 * Get performance metrics breakdown
 */
export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const [
        queryPerformance,
        cacheEfficiency,
        bundleReport,
        apiPerformance,
    ] = await Promise.all([
        getQueryPerformanceReport(),
        analyzeCacheEfficiency(),
        getBundleReport(),
        getAPIPerformanceReport(),
    ]);

    // Calculate individual scores
    let queryScore = 25;
    if (queryPerformance.summary.overallQueryHealth === 'critical') {
        queryScore = 5;
    } else if (queryPerformance.summary.overallQueryHealth === 'degraded') {
        queryScore = 15;
    }

    const cacheScore = Math.round((cacheEfficiency.score / 100) * 25);
    const bundleScore = Math.round((bundleReport.summary.score / 100) * 25);

    let apiScore = 25;
    if (apiPerformance.summary.overallAPIHealth === 'critical') {
        apiScore = 5;
    } else if (apiPerformance.summary.overallAPIHealth === 'degraded') {
        apiScore = 15;
    }

    return {
        queryScore,
        cacheScore,
        bundleScore,
        apiScore,
        overallScore: queryScore + cacheScore + bundleScore + apiScore,
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function priorityWeight(priority: OptimizationPriority): number {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[priority];
}

function calculateCacheDuration(frequency: number): number {
    // Higher frequency = longer cache duration
    if (frequency > 1000) return 3600; // 1 hour
    if (frequency > 100) return 900; // 15 minutes
    if (frequency > 10) return 300; // 5 minutes
    return 60; // 1 minute
}

function calculateEvictionRate(): number {
    // Simplified calculation - would use actual cache stats in production
    return 0.1;
}

function calculateMemoryUtilization(): number {
    // Simplified calculation - would use actual memory stats in production
    return 0.7;
}

async function analyzeDirectory(
    dir: string,
    extensions?: string[]
): Promise<string[]> {
    const files: string[] = [];

    try {
        const entries = await readdir(dir, { withFileTypes: true, recursive: true });

        for (const entry of entries) {
            if (entry.isFile()) {
                const fullPath = join(dir, entry.parentPath || '', entry.name);

                if (!extensions || extensions.some(ext => entry.name.endsWith(ext))) {
                    files.push(fullPath);
                }
            }
        }
    } catch {
        // Directory doesn't exist
    }

    return files;
}

function estimateGzipSize(originalSize: number): number {
    // Gzip typically reduces size by 60-80% for text files
    return Math.floor(originalSize * 0.3);
}

function getFileType(file: string): 'js' | 'css' | 'json' | 'other' {
    if (file.endsWith('.js')) return 'js';
    if (file.endsWith('.css')) return 'css';
    if (file.endsWith('.json')) return 'json';
    return 'other';
}

async function analyzeDependencies(): Promise<DependencyInfo[]> {
    try {
        const packageJson = await readFile(
            join(process.cwd(), 'package.json'),
            'utf-8'
        );
        const pkg = JSON.parse(packageJson);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        return Object.entries(deps as Record<string, string>).map(([name, version]) => ({
            name,
            version,
            size: 0, // Would need actual size calculation
            isDuplicate: false,
            isUnused: false,
        }));
    } catch {
        return [];
    }
}

function analyzeFileForUnusedCode(
    content: string,
    filePath: string
): { unusedExports: string[]; unusedImports: string[]; deadCode: string[] } {
    const unusedExports: string[] = [];
    const unusedImports: string[] = [];
    const deadCode: string[] = [];

    // Detect unused exports (simplified - would use AST parser in production)
    const exportMatches = content.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/g);
    if (exportMatches) {
        for (const match of exportMatches) {
            const name = match.split(/\s+/).pop() || '';
            // Check if export is imported elsewhere (simplified)
            unusedExports.push(name);
        }
    }

    // Detect unused imports (simplified)
    const importMatches = content.match(/import\s+.*?\s+from\s+['"].*?['"]/g);
    if (importMatches) {
        for (const match of importMatches) {
            // Extract imported names
            const names = match.match(/\{([^}]+)\}/);
            if (names) {
                unusedImports.push(...names[1].split(',').map(s => s.trim()));
            }
        }
    }

    // Detect potential dead code (simplified)
    if (content.includes('console.log')) {
        deadCode.push('console.log statements');
    }
    if (content.includes('debugger')) {
        deadCode.push('debugger statements');
    }

    return { unusedExports, unusedImports, deadCode };
}

function findDuplicateCode(files: BundleFile[]): DuplicateCodeInfo[] {
    const duplicates: DuplicateCodeInfo[] = [];
    const moduleMap = new Map<string, string[]>();

    // Group files by size (potential duplicates)
    for (const file of files) {
        const key = `${file.size}`;
        if (!moduleMap.has(key)) {
            moduleMap.set(key, []);
        }
        moduleMap.get(key)?.push(file.name);
    }

    // Find duplicates
    for (const [size, names] of moduleMap.entries()) {
        if (names.length > 1) {
            duplicates.push({
                modules: names,
                size: parseInt(size),
                occurrences: names.length,
            });
        }
    }

    return duplicates;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// ============================================
// DATABASE RPC FUNCTIONS (for reference)
// ============================================

/*
These PostgreSQL functions should be created in the database:

-- Check if extension is available
CREATE OR REPLACE FUNCTION check_extension(extension_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = extension_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get slow queries from pg_stat_statements
CREATE OR REPLACE FUNCTION get_slow_queries(min_time NUMERIC DEFAULT 100)
RETURNS TABLE (
    queryid TEXT,
    query TEXT,
    calls BIGINT,
    total_time NUMERIC,
    mean_time NUMERIC,
    stddev_time NUMERIC,
    rows BIGINT,
    shared_blks_hit BIGINT,
    shared_blks_read BIGINT,
    temp_blks_written BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pgss.queryid::text,
        pgss.query,
        pgss.calls,
        pgss.total_exec_time,
        pgss.mean_exec_time,
        pgss.stddev_exec_time,
        pgss.rows,
        pgss.shared_blks_hit,
        pgss.shared_blks_read,
        pgss.temp_blks_written
    FROM pg_stat_statements pgss
    WHERE pgss.mean_exec_time > min_time
    ORDER BY pgss.mean_exec_time DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get table scan statistics
CREATE OR REPLACE FUNCTION get_table_scan_stats()
RETURNS TABLE (
    table_name TEXT,
    seq_scan BIGINT,
    idx_scan BIGINT,
    n_live_tup BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || relname,
        seq_scan,
        idx_scan,
        n_live_tup
    FROM pg_stat_user_tables
    WHERE n_live_tup > 0
    ORDER BY seq_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get foreign keys without indexes
CREATE OR REPLACE FUNCTION get_foreign_keys_without_indexes()
RETURNS TABLE (
    table_name TEXT,
    column_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.table_name,
        kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND NOT EXISTS (
        SELECT 1 FROM pg_indexes pi 
        WHERE pi.tablename = tc.table_name
        AND pi.indexdef LIKE '%(' || kcu.column_name || ')%'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get table performance statistics
CREATE OR REPLACE FUNCTION get_table_performance_stats()
RETURNS TABLE (
    table_name TEXT,
    n_live_tup BIGINT,
    total_bytes BIGINT,
    seq_scan BIGINT,
    idx_scan BIGINT,
    n_dead_tup BIGINT,
    bloat_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname || '.' || relname,
        n_live_tup,
        pg_total_relation_size((schemaname || '.' || relname)::regclass),
        seq_scan,
        idx_scan,
        n_dead_tup,
        CASE 
            WHEN n_live_tup + n_dead_tup > 0 
            THEN n_dead_tup::numeric / (n_live_tup + n_dead_tup)
            ELSE 0
        END
    FROM pg_stat_user_tables
    WHERE n_live_tup > 0
    ORDER BY pg_total_relation_size((schemaname || '.' || relname)::regclass) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
    cache_hits BIGINT,
    cache_misses BIGINT,
    avg_cache_time NUMERIC,
    avg_db_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sum(heap_blks_hit),
        sum(heap_blks_read),
        0::numeric, -- Would come from application metrics
        0::numeric  -- Would come from application metrics
    FROM pg_statio_user_tables;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get frequent queries for caching recommendations
CREATE OR REPLACE FUNCTION get_frequent_queries()
RETURNS TABLE (
    query_pattern TEXT,
    frequency BIGINT,
    avg_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        substring(query from 1 for 100),
        calls,
        mean_exec_time
    FROM pg_stat_statements
    WHERE calls > 10
    ORDER BY calls DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get API performance statistics
CREATE OR REPLACE FUNCTION get_api_performance_stats()
RETURNS TABLE (
    endpoint TEXT,
    method TEXT,
    total_requests BIGINT,
    avg_response_time NUMERIC,
    p50_response_time NUMERIC,
    p95_response_time NUMERIC,
    p99_response_time NUMERIC,
    error_count BIGINT,
    requests_per_minute NUMERIC
) AS $$
BEGIN
    -- This would typically come from an API logs table
    -- Placeholder implementation
    RETURN QUERY
    SELECT 
        '/api/example'::text,
        'GET'::text,
        0::bigint,
        0::numeric,
        0::numeric,
        0::numeric,
        0::numeric,
        0::bigint,
        0::numeric;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/