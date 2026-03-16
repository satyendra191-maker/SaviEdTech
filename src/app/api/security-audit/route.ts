/**
 * Security Audit API Endpoint
 *
 * Returns comprehensive security audit reports for the SaviEdTech platform.
 * Requires admin authentication.
 *
 * Endpoints:
 * - GET /api/security-audit - Full security audit report
 * - GET /api/security-audit?type=rls - RLS policy audit only
 * - GET /api/security-audit?type=auth - Authentication audit only
 * - GET /api/security-audit?type=queries - Query analysis only
 * - GET /api/security-audit?type=score - Security score only
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { SUPPORT_ROLES } from '@/lib/auth/roles';
import {
    generateSecurityReport,
    auditRLSPolicies,
    getTablesWithoutRLS,
    validatePolicyEffectiveness,
    monitorAuthEvents,
    detectBruteForce,
    getAuthStats,
    monitorPasswordResets,
    analyzeQueryPatterns,
    detectSQLInjection,
    getSuspiciousQueries,
    monitorAdminEscalation,
    calculateSecurityScore,
    getVulnerabilityList,
    getSecurityRecommendations,
} from '@/lib/platform-manager/security';

// Cache duration in seconds
const CACHE_DURATION = 300; // 5 minutes

const hasRole = (roles: readonly string[], role: string | null | undefined) =>
    !!role && roles.includes(role);

/**
 * Check if user has security audit access
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

    return hasRole(SUPPORT_ROLES, profile.role);
}

/**
 * GET handler for security audit
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        // Check authentication and authorization
        const isAuthorized = await checkAdminAccess(request);

        if (!isAuthorized) {
            return NextResponse.json(
                {
                    error: 'Unauthorized',
                    message: 'Admin or support access required for security audit',
                },
                { status: 403 }
            );
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const auditType = searchParams.get('type') || 'full';
        const timeWindowHours = parseInt(searchParams.get('hours') || '24', 10);

        // Set cache headers
        const headers = new Headers();
        headers.set('Cache-Control', `private, max-age=${CACHE_DURATION}`);
        headers.set('Content-Type', 'application/json');

        // Route to appropriate audit function
        switch (auditType) {
            case 'full':
                return await getFullAudit(timeWindowHours, headers);

            case 'rls':
                return await getRLSAudit(headers);

            case 'auth':
                return await getAuthAudit(timeWindowHours, headers);

            case 'queries':
                return await getQueryAudit(timeWindowHours, headers);

            case 'score':
                return await getSecurityScore(timeWindowHours, headers);

            case 'vulnerabilities':
                return await getVulnerabilities(timeWindowHours, headers);

            case 'recommendations':
                return await getRecommendations(timeWindowHours, headers);

            default:
                return NextResponse.json(
                    {
                        error: 'Invalid audit type',
                        valid_types: ['full', 'rls', 'auth', 'queries', 'score', 'vulnerabilities', 'recommendations'],
                    },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Security audit error:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}

/**
 * Get full security audit report
 */
async function getFullAudit(timeWindowHours: number, headers: Headers): Promise<NextResponse> {
    const report = await generateSecurityReport({ timeWindowHours });

    return NextResponse.json({
        success: true,
        audit_type: 'full',
        generated_at: report.generated_at,
        data: report,
    }, { headers });
}

/**
 * Get RLS-specific audit
 */
async function getRLSAudit(headers: Headers): Promise<NextResponse> {
    const [auditResults, tablesWithoutRLS, effectiveness] = await Promise.all([
        auditRLSPolicies(),
        getTablesWithoutRLS(),
        validatePolicyEffectiveness(),
    ]);

    return NextResponse.json({
        success: true,
        audit_type: 'rls',
        generated_at: new Date().toISOString(),
        data: {
            summary: {
                total_tables: auditResults.length,
                rls_enabled_count: auditResults.filter(t => t.rls_enabled).length,
                rls_disabled_count: tablesWithoutRLS.length,
                tables_without_rls: tablesWithoutRLS,
                effectiveness: effectiveness.effective,
            },
            table_details: auditResults,
            test_results: effectiveness.test_results,
        },
    }, { headers });
}

/**
 * Get authentication audit
 */
async function getAuthAudit(timeWindowHours: number, headers: Headers): Promise<NextResponse> {
    const [
        authEvents,
        bruteForceAttempts,
        authStats,
        passwordResetData,
    ] = await Promise.all([
        monitorAuthEvents(timeWindowHours * 60),
        detectBruteForce(5, 10),
        getAuthStats(timeWindowHours),
        monitorPasswordResets(timeWindowHours),
    ]);

    // Get suspicious IPs
    const suspiciousIps = new Set<string>();
    bruteForceAttempts.forEach(a => suspiciousIps.add(a.ip_address));

    return NextResponse.json({
        success: true,
        audit_type: 'auth',
        generated_at: new Date().toISOString(),
        time_window_hours: timeWindowHours,
        data: {
            summary: {
                total_events: authEvents.length,
                failed_logins: authStats.failed_logins,
                successful_logins: authStats.successful_logins,
                brute_force_attempts: bruteForceAttempts.length,
                password_reset_attempts: passwordResetData.total_attempts,
                suspicious_ips: Array.from(suspiciousIps),
            },
            statistics: authStats,
            recent_events: authEvents.slice(0, 100),
            brute_force_attempts: bruteForceAttempts,
            password_resets: passwordResetData,
        },
    }, { headers });
}

/**
 * Get query analysis audit
 */
async function getQueryAudit(timeWindowHours: number, headers: Headers): Promise<NextResponse> {
    const [
        queries,
        sqlInjectionAttempts,
        suspiciousQueries,
        adminEscalations,
    ] = await Promise.all([
        analyzeQueryPatterns(timeWindowHours * 60),
        detectSQLInjection(timeWindowHours * 60),
        getSuspiciousQueries(timeWindowHours * 60),
        monitorAdminEscalation(timeWindowHours),
    ]);

    return NextResponse.json({
        success: true,
        audit_type: 'queries',
        generated_at: new Date().toISOString(),
        time_window_hours: timeWindowHours,
        data: {
            summary: {
                total_queries_analyzed: queries.length,
                sql_injection_attempts: sqlInjectionAttempts.length,
                suspicious_queries: suspiciousQueries.length,
                admin_escalation_attempts: adminEscalations.length,
                critical_threats: sqlInjectionAttempts.filter(a => a.severity === 'critical').length +
                    suspiciousQueries.filter(q => q.severity === 'critical').length,
            },
            sql_injection_attempts: sqlInjectionAttempts,
            suspicious_queries: suspiciousQueries,
            admin_escalations: adminEscalations,
            recent_queries: queries.slice(0, 100),
        },
    }, { headers });
}

/**
 * Get security score only
 */
async function getSecurityScore(timeWindowHours: number, headers: Headers): Promise<NextResponse> {
    const [
        rlsAudit,
        authStats,
        suspiciousQueries,
        bruteForceAttempts,
    ] = await Promise.all([
        auditRLSPolicies(),
        getAuthStats(timeWindowHours),
        getSuspiciousQueries(60),
        detectBruteForce(5, 10),
    ]);

    const { overall_score, breakdown } = calculateSecurityScore(
        rlsAudit,
        authStats,
        [],
        suspiciousQueries,
        bruteForceAttempts
    );

    // Determine grade
    let grade: string;
    let status: string;
    if (overall_score >= 90) {
        grade = 'A';
        status = 'excellent';
    } else if (overall_score >= 80) {
        grade = 'B';
        status = 'good';
    } else if (overall_score >= 70) {
        grade = 'C';
        status = 'fair';
    } else if (overall_score >= 60) {
        grade = 'D';
        status = 'poor';
    } else {
        grade = 'F';
        status = 'critical';
    }

    return NextResponse.json({
        success: true,
        audit_type: 'score',
        generated_at: new Date().toISOString(),
        data: {
            overall_score,
            grade,
            status,
            breakdown,
            recommendations: overall_score < 80 ? [
                'Review RLS policies on tables without protection',
                'Implement rate limiting for authentication',
                'Enable MFA for admin accounts',
                'Review and block suspicious IP addresses',
            ] : [],
        },
    }, { headers });
}

/**
 * Get vulnerabilities list
 */
async function getVulnerabilities(timeWindowHours: number, headers: Headers): Promise<NextResponse> {
    const [
        rlsAudit,
        sqlInjectionAttempts,
        adminEscalations,
    ] = await Promise.all([
        auditRLSPolicies(),
        detectSQLInjection(timeWindowHours * 60),
        monitorAdminEscalation(timeWindowHours),
    ]);

    const vulnerabilities = await getVulnerabilityList(
        rlsAudit,
        sqlInjectionAttempts,
        adminEscalations
    );

    return NextResponse.json({
        success: true,
        audit_type: 'vulnerabilities',
        generated_at: new Date().toISOString(),
        data: {
            summary: {
                total: vulnerabilities.length,
                critical: vulnerabilities.filter(v => v.severity === 'critical').length,
                high: vulnerabilities.filter(v => v.severity === 'high').length,
                medium: vulnerabilities.filter(v => v.severity === 'medium').length,
                low: vulnerabilities.filter(v => v.severity === 'low').length,
            },
            vulnerabilities: vulnerabilities,
        },
    }, { headers });
}

/**
 * Get security recommendations
 */
async function getRecommendations(timeWindowHours: number, headers: Headers): Promise<NextResponse> {
    const [
        rlsAudit,
        authStats,
        sqlInjectionAttempts,
        adminEscalations,
    ] = await Promise.all([
        auditRLSPolicies(),
        getAuthStats(timeWindowHours),
        detectSQLInjection(timeWindowHours * 60),
        monitorAdminEscalation(timeWindowHours),
    ]);

    const vulnerabilities = await getVulnerabilityList(
        rlsAudit,
        sqlInjectionAttempts,
        adminEscalations
    );

    const recommendations = getSecurityRecommendations(
        rlsAudit,
        vulnerabilities,
        authStats
    );

    return NextResponse.json({
        success: true,
        audit_type: 'recommendations',
        generated_at: new Date().toISOString(),
        data: {
            summary: {
                total: recommendations.length,
                urgent: recommendations.filter(r => r.priority === 'urgent').length,
                high: recommendations.filter(r => r.priority === 'high').length,
                medium: recommendations.filter(r => r.priority === 'medium').length,
                low: recommendations.filter(r => r.priority === 'low').length,
            },
            recommendations: recommendations,
        },
    }, { headers });
}

/**
 * POST handler for triggering security actions
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Check authentication and authorization
        const isAuthorized = await checkAdminAccess(request);

        if (!isAuthorized) {
            return NextResponse.json(
                {
                    error: 'Unauthorized',
                    message: 'Admin or support access required',
                },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { action, params } = body;

        switch (action) {
            case 'block_ip': {
                const { ip_address, reason, duration_minutes } = params;
                const { blockIP } = await import('@/lib/platform-manager/security');
                await blockIP(ip_address, reason, duration_minutes);
                return NextResponse.json({
                    success: true,
                    message: `IP ${ip_address} blocked for ${duration_minutes} minutes`,
                });
            }

            case 'record_auth_event': {
                const { event } = params;
                const { recordAuthEvent } = await import('@/lib/platform-manager/security');
                await recordAuthEvent(event);
                return NextResponse.json({
                    success: true,
                    message: 'Auth event recorded',
                });
            }

            default:
                return NextResponse.json(
                    {
                        error: 'Invalid action',
                        valid_actions: ['block_ip', 'record_auth_event'],
                    },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Security action error:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}
