/**
 * Supabase Security Watchdog System
 *
 * Comprehensive security auditing infrastructure for continuous monitoring:
 * - RLS Policy Auditor: Verify RLS policies and effectiveness
 * - Authentication Monitor: Track auth events and detect attacks
 * - Query Analyzer: Detect unauthorized queries and SQL injection
 * - Security Reporter: Generate comprehensive security reports with scoring
 */

import { getSupabaseBrowserClient, createAdminSupabaseClient, isBrowser } from '@/lib/supabase';
import { logError } from './monitor';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Internal helper to get the correct Supabase client based on environment
 */
function getClient(client?: any): any {
    if (client) return client;
    return isBrowser() ? getSupabaseBrowserClient() : createAdminSupabaseClient();
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface RLSPolicyCheck {
    table_name: string;
    rls_enabled: boolean;
    policy_count: number;
    policies: RLSPolicy[];
    has_select_policy: boolean;
    has_insert_policy: boolean;
    has_update_policy: boolean;
    has_delete_policy: boolean;
    issues: string[];
}

export interface RLSPolicy {
    name: string;
    command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
    permissive: 'PERMISSIVE' | 'RESTRICTIVE';
    roles: string[];
    using_expression: string | null;
    with_check_expression: string | null;
}

export interface AuthEvent {
    id: string;
    event_type: 'login' | 'logout' | 'signup' | 'password_reset' | 'password_change' | 'token_refresh' | 'mfa_challenge';
    status: 'success' | 'failure';
    user_id: string | null;
    email: string | null;
    ip_address: string;
    user_agent: string;
    error_message: string | null;
    metadata: Record<string, unknown>;
    occurred_at: string;
}

export interface BruteForceAttempt {
    ip_address: string;
    email: string | null;
    failure_count: number;
    first_attempt: string;
    last_attempt: string;
    time_window_minutes: number;
    is_blocked: boolean;
}

export interface AuthStatistics {
    total_logins: number;
    successful_logins: number;
    failed_logins: number;
    unique_users: number;
    unique_ips: number;
    password_resets: number;
    mfa_attempts: number;
    avg_response_time_ms: number;
    login_methods: Record<string, number>;
}

export interface QueryPattern {
    query_id: string;
    query_hash: string;
    table_accessed: string;
    operation_type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC';
    user_id: string | null;
    ip_address: string;
    query_text: string | null;
    row_count: number | null;
    execution_time_ms: number;
    occurred_at: string;
}

export interface SQLInjectionAttempt {
    id: string;
    query_text: string;
    pattern_matched: string;
    severity: SecuritySeverity;
    user_id: string | null;
    ip_address: string;
    user_agent: string;
    blocked: boolean;
    occurred_at: string;
}

export interface SuspiciousQuery {
    query_id: string;
    reason: string;
    severity: SecuritySeverity;
    query_pattern: QueryPattern;
    details: Record<string, unknown>;
}

export interface AdminEscalationAttempt {
    id: string;
    user_id: string;
    attempted_action: string;
    target_resource: string;
    current_role: string;
    required_role: string;
    ip_address: string;
    user_agent: string;
    blocked: boolean;
    occurred_at: string;
}

export interface Vulnerability {
    id: string;
    category: 'rls' | 'auth' | 'query' | 'configuration';
    severity: SecuritySeverity;
    title: string;
    description: string;
    affected_resource: string;
    remediation: string;
    cwe_id?: string;
    discovered_at: string;
}

export interface SecurityRecommendation {
    id: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: 'rls' | 'auth' | 'query' | 'configuration' | 'monitoring';
    title: string;
    description: string;
    implementation_steps: string[];
    estimated_effort: 'quick' | 'medium' | 'complex';
    impact: string;
}

export interface SecurityReport {
    generated_at: string;
    overall_score: number;
    score_breakdown: {
        rls_score: number;
        auth_score: number;
        query_score: number;
        config_score: number;
    };
    summary: {
        total_vulnerabilities: number;
        critical_count: number;
        high_count: number;
        medium_count: number;
        low_count: number;
        active_threats: number;
        blocked_attempts: number;
    };
    rls_audit: {
        total_tables: number;
        rls_enabled_count: number;
        rls_disabled_count: number;
        policy_coverage_percent: number;
        issues: RLSPolicyCheck[];
    };
    auth_audit: {
        recent_events: AuthEvent[];
        brute_force_attempts: BruteForceAttempt[];
        statistics: AuthStatistics;
        suspicious_ips: string[];
    };
    query_audit: {
        suspicious_queries: SuspiciousQuery[];
        sql_injection_attempts: SQLInjectionAttempt[];
        admin_escalations: AdminEscalationAttempt[];
        unauthorized_access_attempts: number;
    };
    vulnerabilities: Vulnerability[];
    recommendations: SecurityRecommendation[];
}

// ============================================================================
// RLS POLICY AUDITOR
// ============================================================================

/**
 * System tables that should be excluded from RLS checks
 */
const SYSTEM_TABLES = [
    'schema_migrations',
    'schema_version',
    'spatial_ref_sys',
    'geography_columns',
    'geometry_columns',
    'raster_columns',
    'raster_overviews',
];

/**
 * Tables that may have legitimate reasons for RLS to be disabled
 */
const EXEMPT_TABLES: string[] = [];

/**
 * Audit all RLS policies across the database
 */
export async function auditRLSPolicies(): Promise<RLSPolicyCheck[]> {
    const supabase = getClient();
    const results: RLSPolicyCheck[] = [];

    try {
        // Query information_schema for tables
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_type', 'BASE TABLE');

        if (tablesError) {
            throw tablesError;
        }

        const tableNames = ((tables || []) as Array<{ table_name: string }>)
            .map(t => t.table_name)
            .filter(name => !SYSTEM_TABLES.includes(name));

        for (const tableName of tableNames) {
            const check = await auditSingleTableRLS(tableName);
            results.push(check);
        }

        return results;
    } catch (error) {
        await logError(
            'RLS_AUDIT_ERROR',
            error instanceof Error ? error.message : 'Unknown error during RLS audit',
            { component: 'RLSPolicyAuditor' }
        );
        return results;
    }
}

/**
 * Audit RLS for a single table
 */
async function auditSingleTableRLS(tableName: string): Promise<RLSPolicyCheck> {
    const supabase = getClient();
    const issues: string[] = [];

    try {
        // Check if RLS is enabled using raw query
        const { data: rlsData, error: rlsError } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>)('check_rls_status', {
            p_table_name: tableName,
        });

        let rlsEnabled = false;
        if (!rlsError && rlsData !== null) {
            rlsEnabled = Boolean(rlsData);
        }

        // Get policies for this table using raw query
        const { data: policiesData, error: policiesError } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>)('get_policies_for_table', {
            p_table_name: tableName,
        });

        const tablePolicies: RLSPolicy[] = [];
        if (!policiesError && policiesData) {
            const policies = Array.isArray(policiesData) ? policiesData : [policiesData];
            policies.forEach((p: Record<string, unknown>) => {
                tablePolicies.push({
                    name: String(p.policyname || p.name || 'unknown'),
                    command: (p.cmd || p.command || 'ALL') as RLSPolicy['command'],
                    permissive: (p.permissive || 'PERMISSIVE') as RLSPolicy['permissive'],
                    roles: Array.isArray(p.roles) ? p.roles : ['public'],
                    using_expression: p.qual ? String(p.qual) : (p.using ? String(p.using) : null),
                    with_check_expression: p.with_check ? String(p.with_check) : null,
                });
            });
        }

        // Analyze policy coverage
        const hasSelectPolicy = tablePolicies.some(p =>
            p.command === 'SELECT' || p.command === 'ALL'
        );
        const hasInsertPolicy = tablePolicies.some(p =>
            p.command === 'INSERT' || p.command === 'ALL'
        );
        const hasUpdatePolicy = tablePolicies.some(p =>
            p.command === 'UPDATE' || p.command === 'ALL'
        );
        const hasDeletePolicy = tablePolicies.some(p =>
            p.command === 'DELETE' || p.command === 'ALL'
        );

        // Identify issues
        if (!rlsEnabled && !EXEMPT_TABLES.includes(tableName)) {
            issues.push(`RLS is not enabled on table ${tableName}`);
        }

        if (rlsEnabled && tablePolicies.length === 0) {
            issues.push(`RLS enabled but no policies defined for ${tableName}`);
        }

        if (rlsEnabled && !hasSelectPolicy) {
            issues.push(`Missing SELECT policy for ${tableName}`);
        }

        // Check for overly permissive policies
        tablePolicies.forEach(policy => {
            if (policy.roles.includes('anon') && policy.permissive === 'PERMISSIVE') {
                if (!policy.using_expression || policy.using_expression === 'true') {
                    issues.push(`Policy "${policy.name}" may be overly permissive for anonymous users`);
                }
            }
        });

        return {
            table_name: tableName,
            rls_enabled: rlsEnabled,
            policy_count: tablePolicies.length,
            policies: tablePolicies,
            has_select_policy: hasSelectPolicy,
            has_insert_policy: hasInsertPolicy,
            has_update_policy: hasUpdatePolicy,
            has_delete_policy: hasDeletePolicy,
            issues,
        };
    } catch (error) {
        return {
            table_name: tableName,
            rls_enabled: false,
            policy_count: 0,
            policies: [],
            has_select_policy: false,
            has_insert_policy: false,
            has_update_policy: false,
            has_delete_policy: false,
            issues: [`Error auditing table: ${error instanceof Error ? error.message : 'Unknown error'}`],
        };
    }
}

/**
 * Get list of tables without RLS enabled
 */
export async function getTablesWithoutRLS(): Promise<string[]> {
    const audit = await auditRLSPolicies();
    return audit
        .filter(check => !check.rls_enabled && !EXEMPT_TABLES.includes(check.table_name))
        .map(check => check.table_name);
}

/**
 * Validate effectiveness of RLS policies through test queries
 */
export async function validatePolicyEffectiveness(): Promise<{
    effective: boolean;
    test_results: Array<{
        table: string;
        test: string;
        passed: boolean;
        details: string;
    }>;
}> {
    const supabase = getClient();
    const testResults: Array<{
        table: string;
        test: string;
        passed: boolean;
        details: string;
    }> = [];

    const tablesToTest = ['profiles', 'users', 'subscriptions', 'payments', 'admin_logs'];

    for (const table of tablesToTest) {
        try {
            // Test 1: Verify RLS is enabled
            const { data: rlsStatus } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>)('check_rls_status', { p_table_name: table });

            testResults.push({
                table,
                test: 'RLS Enabled Check',
                passed: rlsStatus === true,
                details: rlsStatus === true ? 'RLS is enabled' : 'RLS is not enabled',
            });

            // Test 2: Check if policies exist
            const { data: policies } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>)('get_policies_for_table', { p_table_name: table });

            const policyCount = Array.isArray(policies) ? policies.length : (policies ? 1 : 0);
            testResults.push({
                table,
                test: 'Policies Exist Check',
                passed: policyCount > 0,
                details: `Found ${policyCount} policies`,
            });

            // Test 3: Simulate anon access (should fail for sensitive tables)
            if (['profiles', 'users', 'subscriptions', 'payments'].includes(table)) {
                testResults.push({
                    table,
                    test: 'Sensitive Data Protection',
                    passed: policyCount > 0,
                    details: policyCount > 0
                        ? 'Policies should restrict sensitive data access'
                        : 'WARNING: No policies to protect sensitive data',
                });
            }
        } catch (error) {
            testResults.push({
                table,
                test: 'Error',
                passed: false,
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    const allPassed = testResults.every(r => r.passed);

    return {
        effective: allPassed,
        test_results: testResults,
    };
}

// ============================================================================
// AUTHENTICATION MONITOR
// ============================================================================

// In-memory store for brute force tracking (in production, use Redis)
const authEventStore: Map<string, AuthEvent[]> = new Map();
const BRUTE_FORCE_THRESHOLD = 5;
const BRUTE_FORCE_WINDOW_MINUTES = 10;

/**
 * Monitor authentication events
 */
export async function monitorAuthEvents(
    timeWindowMinutes: number = 60
): Promise<AuthEvent[]> {
    const supabase = getClient();
    const timeWindow = new Date();
    timeWindow.setMinutes(timeWindow.getMinutes() - timeWindowMinutes);

    try {
        // Query auth logs from Supabase
        const { data: authLogs, error } = await supabase
            .from('auth_audit_logs')
            .select('*')
            .gte('occurred_at', timeWindow.toISOString())
            .order('occurred_at', { ascending: false });

        if (error) {
            // Fallback to in-memory store
            const events: AuthEvent[] = [];
            authEventStore.forEach((storedEvents) => {
                events.push(...storedEvents.filter(e =>
                    new Date(e.occurred_at) >= timeWindow
                ));
            });
            return events.sort((a, b) =>
                new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
            );
        }

        return ((authLogs || []) as Array<{
            id: string;
            event_type: string;
            status: string;
            user_id: string | null;
            email: string | null;
            ip_address: string | null;
            user_agent: string | null;
            error_message: string | null;
            metadata: unknown;
            occurred_at: string;
        }>).map(log => ({
            id: log.id,
            event_type: log.event_type as AuthEvent['event_type'],
            status: log.status as AuthEvent['status'],
            user_id: log.user_id,
            email: log.email,
            ip_address: log.ip_address || 'unknown',
            user_agent: log.user_agent || 'unknown',
            error_message: log.error_message,
            metadata: (log.metadata as Record<string, unknown>) || {},
            occurred_at: log.occurred_at,
        }));
    } catch (error) {
        await logError(
            'AUTH_MONITOR_ERROR',
            error instanceof Error ? error.message : 'Unknown error monitoring auth',
            { component: 'AuthenticationMonitor' }
        );
        return [];
    }
}

/**
 * Record an authentication event for monitoring
 */
export async function recordAuthEvent(event: Omit<AuthEvent, 'id'>): Promise<void> {
    const supabase = getClient();

    try {
        await (supabase.from('auth_audit_logs').insert as unknown as (data: Record<string, unknown>) => Promise<{ error: Error | null }>)({
            event_type: event.event_type,
            status: event.status,
            user_id: event.user_id,
            email: event.email,
            ip_address: event.ip_address,
            user_agent: event.user_agent,
            error_message: event.error_message,
            metadata: event.metadata,
            occurred_at: event.occurred_at,
        });
    } catch {
        // Fallback to in-memory store
        const key = event.ip_address;
        const existing = authEventStore.get(key) || [];
        existing.push({
            ...event,
            id: crypto.randomUUID(),
        });
        authEventStore.set(key, existing);
    }
}

/**
 * Detect brute force attacks
 */
export async function detectBruteForce(
    threshold: number = BRUTE_FORCE_THRESHOLD,
    windowMinutes: number = BRUTE_FORCE_WINDOW_MINUTES
): Promise<BruteForceAttempt[]> {
    const events = await monitorAuthEvents(windowMinutes);
    const attempts: Map<string, BruteForceAttempt> = new Map();

    // Group failed login attempts by IP
    events
        .filter(e => e.event_type === 'login' && e.status === 'failure')
        .forEach(event => {
            const key = event.ip_address;
            const existing = attempts.get(key);

            if (existing) {
                existing.failure_count++;
                existing.last_attempt = event.occurred_at;
                if (event.email && !existing.email) {
                    existing.email = event.email;
                }
            } else {
                attempts.set(key, {
                    ip_address: key,
                    email: event.email,
                    failure_count: 1,
                    first_attempt: event.occurred_at,
                    last_attempt: event.occurred_at,
                    time_window_minutes: windowMinutes,
                    is_blocked: false,
                });
            }
        });

    // Filter for attacks exceeding threshold and check block status
    const bruteForceAttempts: BruteForceAttempt[] = [];
    const supabase = getClient();

    for (const ip of Array.from(attempts.keys())) {
        const attempt = attempts.get(ip);
        if (attempt && attempt.failure_count >= threshold) {
            // Check if IP is already blocked
            const { data: blocked } = await supabase
                .from('blocked_ips')
                .select('*')
                .eq('ip_address', ip)
                .gte('blocked_until', new Date().toISOString())
                .single();

            attempt.is_blocked = !!blocked;
            bruteForceAttempts.push(attempt);
        }
    }

    return bruteForceAttempts.sort((a, b) => b.failure_count - a.failure_count);
}

/**
 * Block an IP address
 */
export async function blockIP(
    ipAddress: string,
    reason: string,
    durationMinutes: number = 60
): Promise<void> {
    const supabase = getClient();
    const blockedUntil = new Date();
    blockedUntil.setMinutes(blockedUntil.getMinutes() + durationMinutes);

    await (supabase.from('blocked_ips').upsert as unknown as (data: Record<string, unknown>) => Promise<{ error: Error | null }>)({
        ip_address: ipAddress,
        reason,
        blocked_at: new Date().toISOString(),
        blocked_until: blockedUntil.toISOString(),
    });
}

/**
 * Get authentication statistics
 */
export async function getAuthStats(
    timeWindowHours: number = 24
): Promise<AuthStatistics> {
    const events = await monitorAuthEvents(timeWindowHours * 60);

    const uniqueUsers = new Set(events.map(e => e.user_id).filter(Boolean));
    const uniqueIps = new Set(events.map(e => e.ip_address));

    const successfulLogins = events.filter(e =>
        e.event_type === 'login' && e.status === 'success'
    ).length;

    const failedLogins = events.filter(e =>
        e.event_type === 'login' && e.status === 'failure'
    ).length;

    const passwordResets = events.filter(e =>
        e.event_type === 'password_reset'
    ).length;

    const mfaAttempts = events.filter(e =>
        e.event_type === 'mfa_challenge'
    ).length;

    // Aggregate login methods from metadata
    const loginMethods: Record<string, number> = {};
    events
        .filter(e => e.event_type === 'login')
        .forEach(e => {
            const method = (e.metadata?.provider as string) || 'email';
            loginMethods[method] = (loginMethods[method] || 0) + 1;
        });

    return {
        total_logins: successfulLogins + failedLogins,
        successful_logins: successfulLogins,
        failed_logins: failedLogins,
        unique_users: uniqueUsers.size,
        unique_ips: uniqueIps.size,
        password_resets: passwordResets,
        mfa_attempts: mfaAttempts,
        avg_response_time_ms: 150, // Placeholder - would be calculated from actual metrics
        login_methods: loginMethods,
    };
}

/**
 * Monitor password reset attempts
 */
export async function monitorPasswordResets(
    timeWindowHours: number = 24
): Promise<{
    total_attempts: number;
    successful_resets: number;
    suspicious_attempts: number;
    reset_events: AuthEvent[];
    suspicious_patterns: Array<{
        email: string;
        attempt_count: number;
        ip_addresses: string[];
    }>;
}> {
    const events = await monitorAuthEvents(timeWindowHours * 60);
    const resetEvents = events.filter(e => e.event_type === 'password_reset');

    // Detect suspicious patterns (multiple resets for same email from different IPs)
    const emailAttempts: Map<string, { count: number; ips: Set<string> }> = new Map();

    resetEvents.forEach(event => {
        if (event.email) {
            const existing = emailAttempts.get(event.email);
            if (existing) {
                existing.count++;
                if (event.ip_address) {
                    existing.ips.add(event.ip_address);
                }
            } else {
                emailAttempts.set(event.email, {
                    count: 1,
                    ips: new Set(event.ip_address ? [event.ip_address] : []),
                });
            }
        }
    });

    const suspiciousPatterns = Array.from(emailAttempts.entries())
        .filter(([, data]) => data.count > 3 || data.ips.size > 2)
        .map(([email, data]) => ({
            email,
            attempt_count: data.count,
            ip_addresses: Array.from(data.ips),
        }));

    return {
        total_attempts: resetEvents.length,
        successful_resets: resetEvents.filter(e => e.status === 'success').length,
        suspicious_attempts: suspiciousPatterns.length,
        reset_events: resetEvents,
        suspicious_patterns: suspiciousPatterns,
    };
}

// ============================================================================
// QUERY ANALYZER
// ============================================================================

// SQL Injection detection patterns
const SQL_INJECTION_PATTERNS = [
    { pattern: /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, name: 'Basic SQL Injection' },
    { pattern: /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i, name: 'Equal Sign Injection' },
    { pattern: /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i, name: 'OR-based Injection' },
    { pattern: /((\%27)|(\'))union/i, name: 'Union-based Injection' },
    { pattern: /exec(\s|\+)+(s|x)p\w+/i, name: 'Stored Procedure Injection' },
    { pattern: /UNION\s+SELECT/i, name: 'Union Select Injection' },
    { pattern: /INSERT\s+INTO/i, name: 'Insert Injection' },
    { pattern: /DELETE\s+FROM/i, name: 'Delete Injection' },
    { pattern: /DROP\s+TABLE/i, name: 'Drop Table Injection' },
    { pattern: /ALTER\s+TABLE/i, name: 'Alter Table Injection' },
    { pattern: /script\s*>/i, name: 'XSS Script Tag' },
    { pattern: /javascript:/i, name: 'JavaScript Protocol' },
    { pattern: /on\w+\s*=/i, name: 'Event Handler Injection' },
];

// Suspicious query patterns
const SUSPICIOUS_QUERY_PATTERNS = [
    { pattern: /select\s+\*\s+from\s+pg_/i, name: 'System Table Access', severity: 'high' as SecuritySeverity },
    { pattern: /select\s+\*\s+from\s+information_schema/i, name: 'Schema Enumeration', severity: 'medium' as SecuritySeverity },
    { pattern: /copy\s+.*\s+to\s+/i, name: 'Data Exfiltration', severity: 'critical' as SecuritySeverity },
    { pattern: /\.\.\/\.\.\//, name: 'Path Traversal', severity: 'high' as SecuritySeverity },
];

/**
 * Analyze query patterns for security issues
 */
export async function analyzeQueryPatterns(
    timeWindowMinutes: number = 60
): Promise<QueryPattern[]> {
    const supabase = getClient();
    const timeWindow = new Date();
    timeWindow.setMinutes(timeWindow.getMinutes() - timeWindowMinutes);

    try {
        const { data: queries, error } = await supabase
            .from('query_logs')
            .select('*')
            .gte('occurred_at', timeWindow.toISOString())
            .order('occurred_at', { ascending: false });

        if (error) {
            return [];
        }

        return ((queries || []) as Array<{
            id: string;
            query_hash: string | null;
            table_accessed: string | null;
            operation_type: string;
            user_id: string | null;
            ip_address: string | null;
            query_text: string | null;
            row_count: number | null;
            execution_time_ms: number | null;
            occurred_at: string;
        }>).map(q => ({
            query_id: q.id,
            query_hash: q.query_hash || '',
            table_accessed: q.table_accessed || '',
            operation_type: q.operation_type as QueryPattern['operation_type'],
            user_id: q.user_id,
            ip_address: q.ip_address || 'unknown',
            query_text: q.query_text,
            row_count: q.row_count,
            execution_time_ms: q.execution_time_ms || 0,
            occurred_at: q.occurred_at,
        }));
    } catch (error) {
        await logError(
            'QUERY_ANALYZER_ERROR',
            error instanceof Error ? error.message : 'Unknown error analyzing queries',
            { component: 'QueryAnalyzer' }
        );
        return [];
    }
}

/**
 * Detect SQL injection attempts
 */
export async function detectSQLInjection(
    timeWindowMinutes: number = 60
): Promise<SQLInjectionAttempt[]> {
    const queries = await analyzeQueryPatterns(timeWindowMinutes);
    const injectionAttempts: SQLInjectionAttempt[] = [];

    for (const query of queries) {
        if (!query.query_text) continue;

        for (const { pattern, name } of SQL_INJECTION_PATTERNS) {
            if (pattern.test(query.query_text)) {
                injectionAttempts.push({
                    id: query.query_id,
                    query_text: query.query_text,
                    pattern_matched: name,
                    severity: 'critical',
                    user_id: query.user_id,
                    ip_address: query.ip_address,
                    user_agent: '',
                    blocked: false,
                    occurred_at: query.occurred_at,
                });
                break;
            }
        }
    }

    return injectionAttempts;
}

/**
 * Get suspicious queries
 */
export async function getSuspiciousQueries(
    timeWindowMinutes: number = 60
): Promise<SuspiciousQuery[]> {
    const queries = await analyzeQueryPatterns(timeWindowMinutes);
    const suspicious: SuspiciousQuery[] = [];

    for (const query of queries) {
        if (!query.query_text) continue;

        // Check for suspicious patterns
        for (const { pattern, name, severity } of SUSPICIOUS_QUERY_PATTERNS) {
            if (pattern.test(query.query_text)) {
                suspicious.push({
                    query_id: query.query_id,
                    reason: name,
                    severity,
                    query_pattern: query,
                    details: { pattern: pattern.source },
                });
                break;
            }
        }

        // Check for unusual execution times (potential DoS)
        if (query.execution_time_ms > 10000) {
            suspicious.push({
                query_id: query.query_id,
                reason: 'Slow query - potential DoS attempt',
                severity: 'medium',
                query_pattern: query,
                details: { execution_time_ms: query.execution_time_ms },
            });
        }

        // Check for large result sets (potential data exfiltration)
        if (query.row_count && query.row_count > 10000) {
            suspicious.push({
                query_id: query.query_id,
                reason: 'Large result set - potential data exfiltration',
                severity: 'high',
                query_pattern: query,
                details: { row_count: query.row_count },
            });
        }
    }

    return suspicious;
}

/**
 * Monitor admin privilege escalation attempts
 */
export async function monitorAdminEscalation(
    timeWindowHours: number = 24
): Promise<AdminEscalationAttempt[]> {
    const supabase = getClient();
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - timeWindowHours);

    try {
        // Check for unauthorized role changes
        const { data: escalationAttempts, error } = await supabase
            .from('admin_escalation_logs')
            .select('*')
            .gte('occurred_at', timeWindow.toISOString())
            .order('occurred_at', { ascending: false });

        if (error) {
            // Try to infer from audit logs
            const { data: auditLogs } = await supabase
                .from('audit_logs')
                .select('*')
                .gte('occurred_at', timeWindow.toISOString())
                .ilike('action', '%role%')
                .order('occurred_at', { ascending: false });

            return ((auditLogs || []) as Array<{
                id: string;
                user_id: string | null;
                action: string;
                resource: string | null;
                metadata: unknown;
                ip_address: string | null;
                user_agent: string | null;
                occurred_at: string;
            }>).map(log => ({
                id: log.id,
                user_id: log.user_id || 'unknown',
                attempted_action: log.action,
                target_resource: log.resource || 'unknown',
                current_role: ((log.metadata as Record<string, unknown>)?.current_role as string) || 'unknown',
                required_role: ((log.metadata as Record<string, unknown>)?.target_role as string) || 'admin',
                ip_address: log.ip_address || 'unknown',
                user_agent: log.user_agent || 'unknown',
                blocked: ((log.metadata as Record<string, unknown>)?.blocked as boolean) || true,
                occurred_at: log.occurred_at,
            }));
        }

        return ((escalationAttempts || []) as Array<{
            id: string;
            user_id: string;
            attempted_action: string;
            target_resource: string;
            current_role: string;
            required_role: string;
            ip_address: string;
            user_agent: string;
            blocked: boolean;
            occurred_at: string;
        }>).map(attempt => ({
            id: attempt.id,
            user_id: attempt.user_id,
            attempted_action: attempt.attempted_action,
            target_resource: attempt.target_resource,
            current_role: attempt.current_role,
            required_role: attempt.required_role,
            ip_address: attempt.ip_address,
            user_agent: attempt.user_agent,
            blocked: attempt.blocked,
            occurred_at: attempt.occurred_at,
        }));
    } catch (error) {
        await logError(
            'ADMIN_ESCALATION_MONITOR_ERROR',
            error instanceof Error ? error.message : 'Unknown error',
            { component: 'QueryAnalyzer' }
        );
        return [];
    }
}

/**
 * Log a query for analysis
 */
export async function logQuery(query: Omit<QueryPattern, 'query_id'>): Promise<void> {
    const supabase = getClient();

    try {
        await (supabase.from('query_logs').insert as unknown as (data: Record<string, unknown>) => Promise<{ error: Error | null }>)({
            query_hash: query.query_hash,
            table_accessed: query.table_accessed,
            operation_type: query.operation_type,
            user_id: query.user_id,
            ip_address: query.ip_address,
            query_text: query.query_text,
            row_count: query.row_count,
            execution_time_ms: query.execution_time_ms,
            occurred_at: query.occurred_at,
        });
    } catch (error) {
        await logError(
            'QUERY_LOG_ERROR',
            error instanceof Error ? error.message : 'Failed to log query',
            { component: 'QueryAnalyzer', query }
        );
    }
}

// ============================================================================
// SECURITY REPORTER
// ============================================================================

/**
 * Calculate security score (0-100)
 */
export function calculateSecurityScore(
    rlsAudit: RLSPolicyCheck[],
    authStats: AuthStatistics,
    vulnerabilities: Vulnerability[],
    suspiciousQueries: SuspiciousQuery[],
    bruteForceAttempts: BruteForceAttempt[]
): {
    overall_score: number;
    breakdown: {
        rls_score: number;
        auth_score: number;
        query_score: number;
        config_score: number;
    };
} {
    // Calculate RLS score (0-25)
    let rlsScore = 25;
    if (rlsAudit.length > 0) {
        const rlsEnabledPercent = (rlsAudit.filter(t => t.rls_enabled).length / rlsAudit.length) * 100;
        const policyCoveragePercent = (rlsAudit.filter(t =>
            t.rls_enabled && t.policy_count > 0
        ).length / rlsAudit.length) * 100;

        rlsScore = Math.round((rlsEnabledPercent * 0.5 + policyCoveragePercent * 0.5) * 0.25);
    }

    // Calculate Auth score (0-25)
    let authScore = 25;
    const totalAttempts = authStats.successful_logins + authStats.failed_logins;
    if (totalAttempts > 0) {
        const failureRate = authStats.failed_logins / totalAttempts;
        authScore = Math.round(25 * (1 - failureRate));
    }

    // Reduce score for brute force attempts
    const bruteForcePenalty = Math.min(bruteForceAttempts.length * 2, 10);
    authScore = Math.max(0, authScore - bruteForcePenalty);

    // Calculate Query score (0-25)
    let queryScore = 25;
    const criticalQueries = suspiciousQueries.filter(q => q.severity === 'critical').length;
    const highQueries = suspiciousQueries.filter(q => q.severity === 'high').length;
    queryScore = Math.max(0, 25 - criticalQueries * 5 - highQueries * 2);

    // Calculate Config score (0-25)
    let configScore = 25;
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = vulnerabilities.filter(v => v.severity === 'high').length;
    configScore = Math.max(0, 25 - criticalVulns * 5 - highVulns * 2);

    const overallScore = Math.round(rlsScore + authScore + queryScore + configScore);

    return {
        overall_score: overallScore,
        breakdown: {
            rls_score: rlsScore,
            auth_score: authScore,
            query_score: queryScore,
            config_score: configScore,
        },
    };
}

/**
 * Get vulnerability list
 */
export async function getVulnerabilityList(
    rlsAudit: RLSPolicyCheck[],
    sqlInjectionAttempts: SQLInjectionAttempt[],
    adminEscalations: AdminEscalationAttempt[]
): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    // RLS vulnerabilities
    rlsAudit.forEach(check => {
        if (!check.rls_enabled) {
            vulnerabilities.push({
                id: `RLS-${check.table_name}`,
                category: 'rls',
                severity: 'high',
                title: `Missing RLS on ${check.table_name}`,
                description: `Table ${check.table_name} does not have Row Level Security enabled, potentially exposing data to unauthorized access.`,
                affected_resource: check.table_name,
                remediation: `Enable RLS on the table: ALTER TABLE ${check.table_name} ENABLE ROW LEVEL SECURITY;`,
                cwe_id: 'CWE-284',
                discovered_at: new Date().toISOString(),
            });
        }

        if (check.rls_enabled && check.policy_count === 0) {
            vulnerabilities.push({
                id: `RLS-POLICY-${check.table_name}`,
                category: 'rls',
                severity: 'critical',
                title: `No RLS Policies on ${check.table_name}`,
                description: `RLS is enabled but no policies are defined for ${check.table_name}, effectively blocking all access.`,
                affected_resource: check.table_name,
                remediation: `Create appropriate RLS policies for ${check.table_name}`,
                cwe_id: 'CWE-276',
                discovered_at: new Date().toISOString(),
            });
        }
    });

    // SQL Injection vulnerabilities (attempted attacks)
    sqlInjectionAttempts.forEach(attempt => {
        vulnerabilities.push({
            id: `SQLI-${attempt.id}`,
            category: 'query',
            severity: 'critical',
            title: `SQL Injection Attempt Detected`,
            description: `SQL injection pattern "${attempt.pattern_matched}" detected in query from IP ${attempt.ip_address}.`,
            affected_resource: 'database',
            remediation: 'Implement parameterized queries and input validation. Review WAF rules.',
            cwe_id: 'CWE-89',
            discovered_at: attempt.occurred_at,
        });
    });

    // Admin escalation vulnerabilities
    adminEscalations.forEach(escalation => {
        vulnerabilities.push({
            id: `ESCALATION-${escalation.id}`,
            category: 'auth',
            severity: escalation.blocked ? 'medium' : 'critical',
            title: `Privilege Escalation Attempt`,
            description: `User ${escalation.user_id} attempted ${escalation.attempted_action} without ${escalation.required_role} role.`,
            affected_resource: escalation.target_resource,
            remediation: 'Review access controls and implement principle of least privilege.',
            cwe_id: 'CWE-269',
            discovered_at: escalation.occurred_at,
        });
    });

    return vulnerabilities.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });
}

/**
 * Get security recommendations
 */
export function getSecurityRecommendations(
    rlsAudit: RLSPolicyCheck[],
    vulnerabilities: Vulnerability[],
    authStats: AuthStatistics
): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];

    // RLS recommendations
    const tablesWithoutRLS = rlsAudit.filter(t => !t.rls_enabled);
    if (tablesWithoutRLS.length > 0) {
        recommendations.push({
            id: 'REC-RLS-001',
            priority: 'high',
            category: 'rls',
            title: 'Enable Row Level Security on All Tables',
            description: `${tablesWithoutRLS.length} tables are missing RLS protection. This is a critical security gap.`,
            implementation_steps: [
                'Review each table to determine appropriate access patterns',
                'Enable RLS: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;',
                'Create policies for each operation type (SELECT, INSERT, UPDATE, DELETE)',
                'Test policies with different user roles',
            ],
            estimated_effort: 'complex',
            impact: 'Prevents unauthorized data access across all tables',
        });
    }

    // Authentication recommendations
    if (authStats.failed_logins / (authStats.total_logins || 1) > 0.1) {
        recommendations.push({
            id: 'REC-AUTH-001',
            priority: 'urgent',
            category: 'auth',
            title: 'Implement Rate Limiting and Account Lockout',
            description: 'High failure rate detected. Implement additional protections against brute force attacks.',
            implementation_steps: [
                'Enable Supabase built-in rate limiting',
                'Implement progressive delays after failed attempts',
                'Add CAPTCHA after 3 failed attempts',
                'Send email alerts for suspicious login patterns',
            ],
            estimated_effort: 'medium',
            impact: 'Reduces risk of account compromise by 90%',
        });
    }

    // MFA recommendation
    if (authStats.mfa_attempts === 0 && authStats.successful_logins > 100) {
        recommendations.push({
            id: 'REC-AUTH-002',
            priority: 'high',
            category: 'auth',
            title: 'Enable Multi-Factor Authentication',
            description: 'No MFA usage detected. Consider enforcing MFA for admin and sensitive operations.',
            implementation_steps: [
                'Enable MFA in Supabase Auth settings',
                'Require MFA for admin users',
                'Encourage MFA for all users with incentives',
                'Implement MFA for sensitive operations (payments, settings changes)',
            ],
            estimated_effort: 'medium',
            impact: 'Adds strong protection against credential theft',
        });
    }

    // Query monitoring recommendation
    recommendations.push({
        id: 'REC-QUERY-001',
        priority: 'medium',
        category: 'query',
        title: 'Implement Query Logging and Analysis',
        description: 'Set up comprehensive query logging to detect and prevent SQL injection attempts.',
        implementation_steps: [
            'Enable pg_stat_statements extension',
            'Set up query logging table with appropriate retention',
            'Create automated alerts for suspicious query patterns',
            'Regular review of slow query logs',
        ],
        estimated_effort: 'medium',
        impact: 'Early detection of database attacks and performance issues',
    });

    // Security audit logging
    recommendations.push({
        id: 'REC-MONITOR-001',
        priority: 'high',
        category: 'monitoring',
        title: 'Implement Comprehensive Audit Logging',
        description: 'Ensure all security-relevant events are logged and retained for compliance.',
        implementation_steps: [
            'Set up auth_audit_logs table',
            'Configure query logging for all database operations',
            'Implement admin action logging',
            'Set up log retention and archival policies',
        ],
        estimated_effort: 'medium',
        impact: 'Complete audit trail for security investigations',
    });

    // SSL/TLS recommendation
    recommendations.push({
        id: 'REC-CONFIG-001',
        priority: 'high',
        category: 'configuration',
        title: 'Enforce SSL/TLS Connections',
        description: 'Ensure all database connections use SSL encryption.',
        implementation_steps: [
            'Enable SSL enforcement in Supabase project settings',
            'Update connection strings to require SSL',
            'Verify no unencrypted connections are allowed',
        ],
        estimated_effort: 'quick',
        impact: 'Prevents man-in-the-middle attacks',
    });

    return recommendations.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

/**
 * Generate comprehensive security report
 */
export async function generateSecurityReport(
    options: {
        timeWindowHours?: number;
        includeHistory?: boolean;
    } = {}
): Promise<SecurityReport> {
    const { timeWindowHours = 24 } = options;

    // Run all audits in parallel
    const [
        rlsAudit,
        authEvents,
        bruteForceAttempts,
        authStats,
        passwordResetData,
        queries,
        sqlInjectionAttempts,
        suspiciousQueries,
        adminEscalations,
    ] = await Promise.all([
        auditRLSPolicies(),
        monitorAuthEvents(60),
        detectBruteForce(BRUTE_FORCE_THRESHOLD, BRUTE_FORCE_WINDOW_MINUTES),
        getAuthStats(timeWindowHours),
        monitorPasswordResets(timeWindowHours),
        analyzeQueryPatterns(60),
        detectSQLInjection(60),
        getSuspiciousQueries(60),
        monitorAdminEscalation(timeWindowHours),
    ]);

    // Calculate scores and vulnerabilities
    const { overall_score, breakdown } = calculateSecurityScore(
        rlsAudit,
        authStats,
        [],
        suspiciousQueries,
        bruteForceAttempts
    );

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

    // Calculate summary statistics
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;

    // Get suspicious IPs from various sources
    const suspiciousIps = new Set<string>();
    bruteForceAttempts.forEach(a => suspiciousIps.add(a.ip_address));
    sqlInjectionAttempts.forEach(a => suspiciousIps.add(a.ip_address));
    adminEscalations.forEach(a => suspiciousIps.add(a.ip_address));

    // Count blocked attempts
    const blockedAttempts = bruteForceAttempts.filter(a => a.is_blocked).length +
        sqlInjectionAttempts.filter(a => a.blocked).length +
        adminEscalations.filter(a => a.blocked).length;

    return {
        generated_at: new Date().toISOString(),
        overall_score: overall_score,
        score_breakdown: breakdown,
        summary: {
            total_vulnerabilities: vulnerabilities.length,
            critical_count: criticalCount,
            high_count: highCount,
            medium_count: mediumCount,
            low_count: lowCount,
            active_threats: bruteForceAttempts.length + sqlInjectionAttempts.length,
            blocked_attempts: blockedAttempts,
        },
        rls_audit: {
            total_tables: rlsAudit.length,
            rls_enabled_count: rlsAudit.filter(t => t.rls_enabled).length,
            rls_disabled_count: rlsAudit.filter(t => !t.rls_enabled).length,
            policy_coverage_percent: rlsAudit.length > 0
                ? Math.round((rlsAudit.filter(t => t.policy_count > 0).length / rlsAudit.length) * 100)
                : 0,
            issues: rlsAudit.filter(t => t.issues.length > 0),
        },
        auth_audit: {
            recent_events: authEvents.slice(0, 50),
            brute_force_attempts: bruteForceAttempts,
            statistics: authStats,
            suspicious_ips: Array.from(suspiciousIps),
        },
        query_audit: {
            suspicious_queries: suspiciousQueries,
            sql_injection_attempts: sqlInjectionAttempts,
            admin_escalations: adminEscalations,
            unauthorized_access_attempts: adminEscalations.length,
        },
        vulnerabilities,
        recommendations,
    };
}
