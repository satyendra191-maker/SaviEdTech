/**
 * Performance Audit API
 * 
 * Provides endpoints for comprehensive performance analysis and optimization.
 * Supports both real-time audits and historical trend analysis.
 * 
 * @module api/performance-audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import {
    // Query Optimizer
    analyzeSlowQueries,
    recommendIndexes,
    analyzeTablePerformance,
    getQueryPerformanceReport,

    // Cache Manager
    getCacheStats,
    recommendCacheStrategies,
    analyzeCacheEfficiency,
    implementQueryCache,
    invalidateCache,
    getCacheSize,

    // Bundle Analyzer
    analyzeBundleSize,
    identifyUnusedCode,
    recommendCodeSplitting,
    getBundleReport,

    // API Optimizer
    analyzeAPIResponseTimes,
    recommendAPIOptimizations,
    getAPIPerformanceReport,

    // Auto-Optimization
    runAutoOptimization,
    generateOptimizationReport,
    getPerformanceScore,
    getPerformanceMetrics,

    // Types
    type QueryPerformanceReport,
    type CacheStats,
    type CacheStrategy,
    type CacheEfficiency,
    type BundleReport,
    type APIPerformanceReport,
    type OptimizationReport,
    type PerformanceMetrics,
} from '@/lib/platform-manager/performance';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Check if user has admin access
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

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    });
}

/**
 * Main GET handler - Returns comprehensive performance data
 * 
 * Query Parameters:
 * - type: 'full' | 'query' | 'cache' | 'bundle' | 'api' | 'score' | 'metrics'
 * - includeRecommendations: boolean (default: true)
 * - timeRange: '1h' | '24h' | '7d' | '30d' (default: '24h')
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        // Verify admin authentication
        const isAdmin = await checkAdminAccess(request);

        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required', success: false },
                { status: 403, headers: corsHeaders }
            );
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const auditType = searchParams.get('type') || 'full';
        const includeRecommendations = searchParams.get('includeRecommendations') !== 'false';
        const timeRange = searchParams.get('timeRange') || '24h';

        // Convert time range to milliseconds
        const timeRangeMap: Record<string, number> = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
        };
        const timeRangeMs = timeRangeMap[timeRange] || timeRangeMap['24h'];

        let responseData: unknown;

        switch (auditType) {
            case 'full':
                responseData = await generateOptimizationReport();
                break;

            case 'query':
                responseData = await getQueryPerformanceReport();
                break;

            case 'cache':
                responseData = await getCacheAuditData(includeRecommendations);
                break;

            case 'bundle':
                responseData = await getBundleReport();
                break;

            case 'api':
                responseData = await getAPIPerformanceReport();
                break;

            case 'score':
                responseData = {
                    score: await getPerformanceScore(),
                    timestamp: new Date().toISOString(),
                };
                break;

            case 'metrics':
                responseData = await getPerformanceMetrics();
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid audit type', success: false },
                    { status: 400, headers: corsHeaders }
                );
        }

        // Log audit request
        await logPerformanceAudit(auditType, timeRange);

        return NextResponse.json(
            {
                data: responseData,
                success: true,
                meta: {
                    auditType,
                    timeRange,
                    timestamp: new Date().toISOString(),
                },
            },
            { headers: corsHeaders }
        );

    } catch (error) {
        console.error('Performance audit error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
                success: false,
            },
            { status: 500, headers: corsHeaders }
        );
    }
}

/**
 * POST handler - Execute optimization actions
 * 
 * Actions:
 * - run-optimization: Run auto-optimization checks
 * - invalidate-cache: Clear cache entries
 * - generate-report: Generate and save optimization report
 * - analyze-query: Analyze specific query
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Verify admin authentication
        const isAdmin = await checkAdminAccess(request);

        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required', success: false },
                { status: 403, headers: corsHeaders }
            );
        }

        const body = await request.json();
        const { action, params = {} } = body;

        let result: unknown;

        switch (action) {
            case 'run-optimization':
                result = await runAutoOptimization();
                break;

            case 'invalidate-cache':
                invalidateCache(params.pattern);
                result = {
                    success: true,
                    message: params.pattern
                        ? `Cache entries matching '${params.pattern}' invalidated`
                        : 'All cache entries invalidated',
                    cacheSize: getCacheSize(),
                };
                break;

            case 'generate-report':
                const report = await generateOptimizationReport();
                // Save report to database if requested
                if (params.saveToDatabase) {
                    await saveOptimizationReport(report);
                }
                result = report;
                break;

            case 'analyze-query':
                if (!params.query) {
                    return NextResponse.json(
                        { error: 'Query parameter required', success: false },
                        { status: 400, headers: corsHeaders }
                    );
                }
                result = await analyzeQuery(params.query);
                break;

            case 'optimize-tables':
                result = await optimizeTables(params.tables || []);
                break;

            case 'get-recommendations':
                result = await getAllRecommendations();
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid action', success: false },
                    { status: 400, headers: corsHeaders }
                );
        }

        return NextResponse.json(
            {
                data: result,
                success: true,
                timestamp: new Date().toISOString(),
            },
            { headers: corsHeaders }
        );

    } catch (error) {
        console.error('Performance audit POST error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
                success: false,
            },
            { status: 500, headers: corsHeaders }
        );
    }
}

/**
 * Get cache audit data
 */
async function getCacheAuditData(includeRecommendations: boolean): Promise<{
    stats: CacheStats;
    efficiency: CacheEfficiency;
    strategies?: CacheStrategy[];
}> {
    const [stats, efficiency, strategies] = await Promise.all([
        getCacheStats(),
        analyzeCacheEfficiency(),
        includeRecommendations ? recommendCacheStrategies() : Promise.resolve([]),
    ]);

    return {
        stats,
        efficiency,
        ...(includeRecommendations && { strategies }),
    };
}

/**
 * Analyze a specific query for optimization opportunities
 */
async function analyzeQuery(query: string): Promise<{
    query: string;
    analysis: {
        hasIndex: boolean;
        estimatedCost: number;
        warnings: string[];
        recommendations: string[];
    };
}> {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check for common anti-patterns
    if (query.includes('SELECT *')) {
        warnings.push('Query uses SELECT *, consider selecting specific columns');
    }

    if (query.includes('LIKE \'%')) {
        warnings.push('Leading wildcard in LIKE prevents index usage');
    }

    if (!query.toLowerCase().includes('limit')) {
        recommendations.push('Consider adding LIMIT clause for large result sets');
    }

    if (query.includes('OFFSET')) {
        const offsetMatch = query.match(/OFFSET\s+(\d+)/i);
        if (offsetMatch && parseInt(offsetMatch[1]) > 10000) {
            warnings.push('Large OFFSET values can cause performance issues');
            recommendations.push('Consider using keyset pagination instead');
        }
    }

    // Check for missing WHERE clause on large tables
    const largeTables = ['users', 'lectures', 'questions', 'test_attempts'];
    for (const table of largeTables) {
        if (query.toLowerCase().includes(`from ${table}`) &&
            !query.toLowerCase().includes('where')) {
            warnings.push(`Query on large table '${table}' without WHERE clause`);
        }
    }

    return {
        query,
        analysis: {
            hasIndex: !warnings.some(w => w.includes('index') || w.includes('wildcard')),
            estimatedCost: warnings.length * 10 + recommendations.length * 5,
            warnings,
            recommendations,
        },
    };
}

/**
 * Optimize specified tables
 */
async function optimizeTables(tables: string[]): Promise<{
    optimized: string[];
    failed: string[];
    results: Array<{
        table: string;
        before: { size: number; deadTuples: number };
        after: { size: number; deadTuples: number };
    }>;
}> {
    const supabase = createAdminSupabaseClient();
    const results: Array<{
        table: string;
        before: { size: number; deadTuples: number };
        after: { size: number; deadTuples: number };
    }> = [];
    const failed: string[] = [];

    for (const table of tables) {
        try {
            // Get before stats
            const { data: beforeStats } = await supabase
                .rpc('get_table_stats', { table_name: table } as never);

            // Run VACUUM ANALYZE
            await supabase.rpc('vacuum_analyze_table', { table_name: table } as never);

            // Get after stats
            const { data: afterStats } = await supabase
                .rpc('get_table_stats', { table_name: table } as never);

            results.push({
                table,
                before: {
                    size: (beforeStats as { size_bytes?: number })?.size_bytes ?? 0,
                    deadTuples: (beforeStats as { n_dead_tup?: number })?.n_dead_tup ?? 0,
                },
                after: {
                    size: (afterStats as { size_bytes?: number })?.size_bytes ?? 0,
                    deadTuples: (afterStats as { n_dead_tup?: number })?.n_dead_tup ?? 0,
                },
            });
        } catch (error) {
            console.error(`Failed to optimize table ${table}:`, error);
            failed.push(table);
        }
    }

    return {
        optimized: results.map(r => r.table),
        failed,
        results,
    };
}

/**
 * Get all optimization recommendations
 */
async function getAllRecommendations(): Promise<{
    queries: Awaited<ReturnType<typeof recommendIndexes>>;
    cache: Awaited<ReturnType<typeof recommendCacheStrategies>>;
    api: Awaited<ReturnType<typeof recommendAPIOptimizations>>;
    bundle: Awaited<ReturnType<typeof recommendCodeSplitting>>;
}> {
    const [queries, cache, api, bundle] = await Promise.all([
        recommendIndexes(),
        recommendCacheStrategies(),
        recommendAPIOptimizations(),
        recommendCodeSplitting(),
    ]);

    return {
        queries,
        cache,
        api,
        bundle,
    };
}

/**
 * Log performance audit request
 */
async function logPerformanceAudit(auditType: string, timeRange: string): Promise<void> {
    try {
        const supabase = createAdminSupabaseClient();
        await supabase
            .from('platform_audit_logs')
            .insert({
                audit_type: 'performance',
                audit_subtype: auditType,
                time_range: timeRange,
                created_at: new Date().toISOString(),
            } as never);
    } catch (error) {
        console.error('Failed to log performance audit:', error);
    }
}

/**
 * Save optimization report to database
 */
async function saveOptimizationReport(report: OptimizationReport): Promise<void> {
    try {
        const supabase = createAdminSupabaseClient();
        await supabase
            .from('performance_reports')
            .insert({
                report: report as unknown as Record<string, unknown>,
                overall_score: report.overallScore,
                critical_issues: report.criticalIssues,
                high_priority_issues: report.highPriorityIssues,
                created_at: report.timestamp,
            } as never);
    } catch (error) {
        console.error('Failed to save optimization report:', error);
    }
}

// Additional RPC functions for database (for reference)
/*
CREATE TABLE IF NOT EXISTS platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_type TEXT NOT NULL,
    audit_subtype TEXT,
    time_range TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report JSONB NOT NULL,
    overall_score INTEGER,
    critical_issues INTEGER DEFAULT 0,
    high_priority_issues INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION get_table_stats(table_name TEXT)
RETURNS TABLE (
    size_bytes BIGINT,
    n_dead_tup BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_total_relation_size((schemaname || '.' || relname)::regclass),
        n_dead_tup
    FROM pg_stat_user_tables
    WHERE schemaname || '.' || relname = table_name
    OR relname = table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION vacuum_analyze_table(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE 'VACUUM ANALYZE ' || quote_ident(table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/