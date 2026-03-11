import { promises as fs } from 'fs';
import path from 'path';
import { createAdminSupabaseClient } from '@/lib/supabase';
import { getDatabaseMetrics, getErrorSummary, getLatestHealthStatus, type HealthStatus } from './monitor';
import { runFullHealthCheck } from './health';
import { analyzeAPIResponseTimes, recommendAPIOptimizations } from './performance';
import { getAuthStats, detectBruteForce, blockIP } from './security';
import { checkGatewayHealth } from './payments';
import {
    detectBrokenBuild,
    detectDatabaseOutage,
    detectDeploymentFailure,
    detectServerCrash,
    getRecentRecoveryActions,
    selfHeal,
    type FailureDetection,
    type RecoveryAction,
} from './selfhealing';
import { checkAlertConditions } from './alerts';
import {
    getRecentPlatformAuditLogs,
    writePlatformAuditLog,
    type PlatformAuditLogRecord,
    type PlatformAuditStatus,
} from './audit-log';

export interface CodebaseInspectionIssue {
    type: 'broken_import' | 'unused_module' | 'dependency_conflict' | 'outdated_package_check';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    module: string;
    metadata?: Record<string, unknown>;
}

export interface AuditorModuleHealth {
    name: string;
    status: HealthStatus;
    summary: string;
    metric: string;
}

export interface PlatformAuditorSnapshot {
    generatedAt: string;
    overallStatus: HealthStatus;
    uptimePercent: number;
    activeUsers: number;
    apiLatencyMs: number;
    databaseResponseTimeMs: number;
    serverLoadPercent: number;
    errorCount24h: number;
    errorTypes24h: number;
    frontendStatus: HealthStatus;
    apiStatus: HealthStatus;
    databaseStatus: HealthStatus;
    authStatus: HealthStatus;
    paymentStatus: HealthStatus;
    contentGenerationStatus: HealthStatus;
    aiStatus: HealthStatus;
    modules: AuditorModuleHealth[];
    topErrors: { error_type: string; count: number; percentage: number }[];
    performanceRecommendations: string[];
    detections: FailureDetection[];
    recentRecoveryActions: RecoveryAction[];
    autoRecoveryTriggered: boolean;
    suspiciousIpsBlocked: string[];
    codebase: {
        status: PlatformAuditStatus;
        lastRunAt: string | null;
        issueCount: number;
        issues: CodebaseInspectionIssue[];
        note: string;
    };
    alerts: {
        warningCount: number;
        criticalCount: number;
        emailEnabled: boolean;
    };
    recentAuditLogs: PlatformAuditLogRecord[];
}

export interface RunPlatformAuditOptions {
    includeCodebaseInspection?: boolean;
    eagerChecks?: boolean;
    autoRecover?: boolean;
    sendNotifications?: boolean;
    persist?: boolean;
    initiatedBy?: string;
}

const IMPORT_REGEX = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const SOURCE_FILE_REGEX = /\.(ts|tsx|js|jsx)$/;
const ENTRY_FILE_REGEX = /src[\\/](app[\\/].*[\\/](page|layout|route|error|loading|not-found|global-error)|middleware|instrumentation)\.(ts|tsx|js|jsx)$/;
const IGNORED_UNUSED_PATTERNS = [
    /[\\/]__tests__[\\/]/,
    /[\\/]src[\\/]types[\\/]/,
    /\.d\.ts$/,
    /[\\/]src[\\/]app[\\/].*[\\/]opengraph-image\./,
    /[\\/]src[\\/]app[\\/].*[\\/]twitter-image\./,
];

function combineStatuses(statuses: Array<HealthStatus | null | undefined>): HealthStatus {
    if (statuses.some((status) => status === 'critical')) {
        return 'critical';
    }
    if (statuses.some((status) => status === 'degraded')) {
        return 'degraded';
    }
    return 'healthy';
}

function normalizeExternalStatus(status: 'healthy' | 'degraded' | 'critical' | 'unknown'): HealthStatus {
    if (status === 'unknown') {
        return 'degraded';
    }

    return status;
}

function mapIssueSeverityToStatus(severity: CodebaseInspectionIssue['severity']): PlatformAuditStatus {
    if (severity === 'critical' || severity === 'high') {
        return 'critical';
    }
    if (severity === 'medium') {
        return 'warning';
    }
    return 'healthy';
}

function mapHealthToAuditStatus(status: HealthStatus): PlatformAuditStatus {
    if (status === 'critical') {
        return 'critical';
    }
    if (status === 'degraded') {
        return 'warning';
    }
    return 'healthy';
}

function relativeModuleName(targetPath: string): string {
    return path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content) as T;
    } catch {
        return null;
    }
}

async function collectSourceFiles(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            return collectSourceFiles(fullPath);
        }
        if (SOURCE_FILE_REGEX.test(entry.name)) {
            return [fullPath];
        }
        return [];
    }));

    return files.flat();
}

function extractImportSpecifiers(content: string): string[] {
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = IMPORT_REGEX.exec(content)) !== null) {
        const specifier = match[1] || match[2];
        if (specifier) {
            matches.push(specifier);
        }
    }
    return matches;
}

async function pathExists(targetPath: string): Promise<boolean> {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function resolveImportTarget(fromFile: string, specifier: string): Promise<string | null> {
    const fromDir = path.dirname(fromFile);
    const rootDir = process.cwd();

    const rawBase = specifier.startsWith('.')
        ? path.resolve(fromDir, specifier)
        : specifier.startsWith('@/') ? path.resolve(rootDir, 'src', specifier.slice(2)) : null;

    if (!rawBase) {
        return null;
    }

    const candidates = [
        rawBase,
        `${rawBase}.ts`,
        `${rawBase}.tsx`,
        `${rawBase}.js`,
        `${rawBase}.jsx`,
        `${rawBase}.json`,
        path.join(rawBase, 'index.ts'),
        path.join(rawBase, 'index.tsx'),
        path.join(rawBase, 'index.js'),
        path.join(rawBase, 'index.jsx'),
    ];

    for (const candidate of candidates) {
        if (await pathExists(candidate)) {
            return candidate;
        }
    }

    return null;
}

async function inspectCodebase(): Promise<{
    status: PlatformAuditStatus;
    issueCount: number;
    issues: CodebaseInspectionIssue[];
    note: string;
}> {
    const sourceRoot = path.join(process.cwd(), 'src');
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageLockPath = path.join(process.cwd(), 'package-lock.json');
    const issues: CodebaseInspectionIssue[] = [];

    let files: string[] = [];
    try {
        files = await collectSourceFiles(sourceRoot);
    } catch (error) {
        return {
            status: 'critical',
            issueCount: 1,
            issues: [{
                type: 'broken_import',
                severity: 'critical',
                title: 'Codebase scan failed',
                message: error instanceof Error ? error.message : 'Unable to read source tree',
                module: 'src',
            }],
            note: 'Codebase inspection failed before file analysis completed.',
        };
    }

    const dependencyGraph = new Map<string, string[]>();

    for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const specifiers = extractImportSpecifiers(content);
        const resolvedImports: string[] = [];

        for (const specifier of specifiers) {
            if (!specifier.startsWith('.') && !specifier.startsWith('@/')) {
                continue;
            }

            const resolved = await resolveImportTarget(file, specifier);
            if (!resolved) {
                issues.push({
                    type: 'broken_import',
                    severity: 'high',
                    title: 'Broken import reference',
                    message: `Import "${specifier}" cannot be resolved.`,
                    module: relativeModuleName(file),
                    metadata: { specifier },
                });
                continue;
            }

            if (SOURCE_FILE_REGEX.test(resolved)) {
                resolvedImports.push(resolved);
            }
        }

        dependencyGraph.set(file, resolvedImports);
    }

    const entryFiles = files.filter((file) => ENTRY_FILE_REGEX.test(file));
    const visited = new Set<string>();
    const stack = [...entryFiles];

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current || visited.has(current)) {
            continue;
        }

        visited.add(current);
        const dependencies = dependencyGraph.get(current) || [];
        for (const dependency of dependencies) {
            if (!visited.has(dependency)) {
                stack.push(dependency);
            }
        }
    }

    for (const file of files) {
        if (visited.has(file) || IGNORED_UNUSED_PATTERNS.some((pattern) => pattern.test(file))) {
            continue;
        }

        if (file.includes(`${path.sep}src${path.sep}components${path.sep}`) || file.includes(`${path.sep}src${path.sep}lib${path.sep}`)) {
            issues.push({
                type: 'unused_module',
                severity: 'low',
                title: 'Possibly unused module',
                message: 'This module is not reachable from detected app entrypoints and should be reviewed.',
                module: relativeModuleName(file),
            });
        }
    }

    const packageJson = await readJsonFile<{
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
    }>(packageJsonPath);

    const packageLock = await readJsonFile<{
        packages?: Record<string, { version?: string }>;
    }>(packageLockPath);

    const versionsByPackage = new Map<string, Set<string>>();
    if (packageLock?.packages) {
        for (const [packagePath, pkg] of Object.entries(packageLock.packages)) {
            const match = packagePath.match(/node_modules[\\/](.+)$/);
            const packageName = match?.[1];
            const version = pkg.version;
            if (!packageName || !version) {
                continue;
            }
            if (!versionsByPackage.has(packageName)) {
                versionsByPackage.set(packageName, new Set());
            }
            versionsByPackage.get(packageName)?.add(version);
        }
    }

    const keyPackages = ['next', 'react', 'react-dom', '@supabase/ssr', '@supabase/supabase-js', 'recharts'];
    for (const packageName of keyPackages) {
        const versions = Array.from(versionsByPackage.get(packageName) || []);
        if (versions.length > 1) {
            issues.push({
                type: 'dependency_conflict',
                severity: 'medium',
                title: 'Multiple installed versions detected',
                message: `${packageName} is installed in multiple versions: ${versions.join(', ')}`,
                module: 'package-lock.json',
                metadata: { packageName, versions },
            });
        }
    }

    const runtimeReact = packageJson?.dependencies?.react;
    const runtimeReactDom = packageJson?.dependencies?.['react-dom'];
    if (runtimeReact && runtimeReactDom && runtimeReact.split('.')[0] !== runtimeReactDom.split('.')[0]) {
        issues.push({
            type: 'dependency_conflict',
            severity: 'high',
            title: 'React runtime mismatch',
            message: `react (${runtimeReact}) and react-dom (${runtimeReactDom}) should stay on the same major line.`,
            module: 'package.json',
            metadata: { react: runtimeReact, reactDom: runtimeReactDom },
        });
    }

    issues.push({
        type: 'outdated_package_check',
        severity: 'low',
        title: 'Online dependency freshness audit not configured',
        message: 'Package age cannot be verified offline. Run a registry-backed package audit before release.',
        module: 'package.json',
    });

    const status = issues.some((issue) => issue.severity === 'critical' || issue.severity === 'high')
        ? 'critical'
        : issues.some((issue) => issue.severity === 'medium')
            ? 'warning'
            : 'healthy';

    return {
        status,
        issueCount: issues.length,
        issues: issues.slice(0, 12),
        note: issues.length === 0
            ? 'No codebase integrity issues were detected during the offline scan.'
            : 'Results are capped to the highest-signal findings for admin review.',
    };
}

async function getRecentAuditContext(): Promise<PlatformAuditLogRecord[]> {
    try {
        return await getRecentPlatformAuditLogs(20);
    } catch (error) {
        console.error('Failed to load recent platform audit logs:', error);
        return [];
    }
}

async function collectLiveSnapshot(options: {
    includeCodebaseFromHistory: boolean;
    eagerChecks: boolean;
}): Promise<PlatformAuditorSnapshot> {
    const supabase = createAdminSupabaseClient();
    const last24HoursIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
        fullHealthReport,
        latestHealthChecks,
        dbMetrics,
        errorSummary,
        apiMetrics,
        apiRecommendations,
        authStats,
        bruteForceAttempts,
        paymentHealth,
        activeUsersResult,
        recentHealthRows,
        aiRequestMetrics,
        recentAuditLogs,
    ] = await Promise.all([
        options.eagerChecks ? runFullHealthCheck() : Promise.resolve(null),
        getLatestHealthStatus(),
        getDatabaseMetrics(),
        getErrorSummary(24),
        analyzeAPIResponseTimes(),
        recommendAPIOptimizations(),
        getAuthStats(24),
        detectBruteForce(),
        checkGatewayHealth(),
        supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),
        supabase
            .from('system_health')
            .select('status, response_time_ms, check_name, checked_at')
            .order('checked_at', { ascending: false })
            .limit(200),
        supabase
            .from('api_request_metrics')
            .select('endpoint, status_code, duration_ms, request_count, requested_at')
            .gte('requested_at', last24HoursIso),
        options.includeCodebaseFromHistory ? getRecentAuditContext() : Promise.resolve([]),
    ]);

    const healthSource = fullHealthReport
        ? Object.fromEntries(fullHealthReport.checks.map((check) => [check.check_name, {
            check_name: check.check_name,
            status: check.status,
            response_time_ms: check.response_time_ms,
            error_count: 0,
            details: check.details,
            checked_at: check.timestamp,
            id: check.check_name,
        }]))
        : latestHealthChecks;

    const latestHealthEntries = Object.values(healthSource);
    const databaseHealth = latestHealthEntries.find((entry) => entry.check_name.includes('database'))?.status || 'healthy';
    const authHealth = latestHealthEntries.find((entry) => entry.check_name.includes('auth'))?.status || 'healthy';
    const apiHealthChecks = latestHealthEntries.filter((entry) => entry.check_name.startsWith('api_'));
    const apiHealthStatus = apiHealthChecks.length > 0
        ? combineStatuses(apiHealthChecks.map((entry) => entry.status))
        : 'healthy';

    const recentHealthStatuses = ((recentHealthRows.data || []) as Array<{ status: HealthStatus; response_time_ms: number | null; check_name: string; checked_at: string }>);
    const healthyChecks = recentHealthStatuses.filter((row) => row.status === 'healthy').length;
    const uptimePercent = recentHealthStatuses.length > 0
        ? Number(((healthyChecks / recentHealthStatuses.length) * 100).toFixed(1))
        : 100;

    const apiLatencyMs = apiMetrics.length > 0
        ? Math.round(apiMetrics.reduce((sum, metric) => sum + metric.avgResponseTime, 0) / apiMetrics.length)
        : Math.round(apiHealthChecks.reduce((sum, entry) => sum + (entry.response_time_ms || 0), 0) / Math.max(apiHealthChecks.length, 1));

    const databaseResponseTimeMs = dbMetrics.query_stats.avg_query_time_ms > 0
        ? Math.round(dbMetrics.query_stats.avg_query_time_ms)
        : Math.round(recentHealthStatuses.find((row) => row.check_name.includes('database'))?.response_time_ms || 0);

    const serverLoadPercent = dbMetrics.total_connections > 0
        ? Math.min(100, Math.round((dbMetrics.active_connections / dbMetrics.total_connections) * 100))
        : 0;

    const aiMetrics = ((aiRequestMetrics.data || []) as Array<{
        endpoint: string;
        status_code: number;
        duration_ms: number;
        request_count: number;
        requested_at: string;
    }>).filter((metric) => metric.endpoint.startsWith('/api/ai/'));

    const contentGenerationMetrics = aiMetrics.filter((metric) =>
        metric.endpoint.includes('generate') || metric.endpoint.includes('admin-suite')
    );

    const aiErrorRate = aiMetrics.length > 0
        ? aiMetrics.filter((metric) => metric.status_code >= 500).length / aiMetrics.length
        : 0;
    const aiStatus = aiErrorRate > 0.15 ? 'critical' : aiErrorRate > 0.05 ? 'degraded' : 'healthy';

    const contentErrorRate = contentGenerationMetrics.length > 0
        ? contentGenerationMetrics.filter((metric) => metric.status_code >= 500).length / contentGenerationMetrics.length
        : 0;
    const contentStatus = contentErrorRate > 0.15 ? 'critical' : contentErrorRate > 0.05 ? 'degraded' : 'healthy';

    const paymentGateway = paymentHealth[0];
    const paymentStatus = paymentGateway ? normalizeExternalStatus(paymentGateway.status) : 'degraded';

    const frontendStatus = errorSummary.top_errors.some((entry) =>
        entry.error_type.toLowerCase().includes('typeerror') ||
        entry.error_type.toLowerCase().includes('syntaxerror') ||
        entry.error_type.toLowerCase().includes('null')
    ) ? 'degraded' : 'healthy';

    const authStatus = bruteForceAttempts.length > 0 || authStats.failed_logins > 20
        ? 'degraded'
        : authHealth;

    const detections: FailureDetection[] = await Promise.all([
        detectDeploymentFailure(),
        detectServerCrash(),
        detectBrokenBuild(),
        detectDatabaseOutage(),
    ]);

    const recentRecoveryActions = getRecentRecoveryActions(8);
    const recentCodebaseSummary = recentAuditLogs.find((log) => log.audit_type === 'platform_auditor' && log.audit_subtype === 'codebase');
    const historicalCodebaseIssues = Array.isArray(recentCodebaseSummary?.metadata?.issues)
        ? recentCodebaseSummary?.metadata?.issues as CodebaseInspectionIssue[]
        : [];
    const historicalCodebaseStatus = typeof recentCodebaseSummary?.metadata?.status === 'string'
        ? recentCodebaseSummary.metadata.status as PlatformAuditStatus
        : 'healthy';

    const warningCount = recentAuditLogs.filter((log) => log.status === 'warning').length;
    const criticalCount = recentAuditLogs.filter((log) => log.status === 'critical').length;

    const modules: AuditorModuleHealth[] = [
        {
            name: 'Frontend health',
            status: frontendStatus,
            summary: frontendStatus === 'healthy' ? 'No critical client crashes detected recently.' : 'Client-side runtime errors need review.',
            metric: `${errorSummary.total_errors} errors / 24h`,
        },
        {
            name: 'API endpoints',
            status: apiHealthStatus,
            summary: apiHealthStatus === 'healthy' ? 'API response times are within threshold.' : 'Slow or failing endpoints were detected.',
            metric: `${apiLatencyMs}ms average latency`,
        },
        {
            name: 'Database performance',
            status: databaseHealth,
            summary: databaseHealth === 'healthy' ? 'Database checks are passing.' : 'Database latency or outage indicators were detected.',
            metric: `${databaseResponseTimeMs}ms avg query time`,
        },
        {
            name: 'Authentication flows',
            status: authStatus,
            summary: authStatus === 'healthy' ? 'Authentication is stable.' : 'Failed logins or brute-force patterns were detected.',
            metric: `${authStats.failed_logins} failed logins / 24h`,
        },
        {
            name: 'Payment gateway',
            status: paymentStatus,
            summary: paymentStatus === 'healthy' ? 'Razorpay monitoring is healthy.' : paymentGateway?.errorMessage || 'Payment gateway degradation detected.',
            metric: `${Math.round(paymentGateway?.successRate || 0)}% success rate`,
        },
        {
            name: 'Content generation',
            status: contentStatus,
            summary: contentStatus === 'healthy' ? 'Content automation endpoints are stable.' : 'Content generation requests are failing or timing out.',
            metric: `${contentGenerationMetrics.length} tracked requests / 24h`,
        },
        {
            name: 'AI engines',
            status: aiStatus,
            summary: aiStatus === 'healthy' ? 'AI endpoints are responding normally.' : 'AI endpoint failures require inspection.',
            metric: `${Math.round(aiErrorRate * 100)}% server-side error rate`,
        },
    ];

    const overallStatus = combineStatuses([
        frontendStatus,
        apiHealthStatus,
        databaseHealth,
        authStatus,
        paymentStatus,
        contentStatus,
        aiStatus,
        ...detections.filter((detection) => detection.detected).map((detection) =>
            detection.severity === 'CRITICAL'
                ? 'critical'
                : detection.severity === 'HIGH' || detection.severity === 'MEDIUM'
                    ? 'degraded'
                    : 'healthy'
        ),
    ]);

    return {
        generatedAt: new Date().toISOString(),
        overallStatus,
        uptimePercent,
        activeUsers: activeUsersResult.count || 0,
        apiLatencyMs,
        databaseResponseTimeMs,
        serverLoadPercent,
        errorCount24h: errorSummary.total_errors,
        errorTypes24h: errorSummary.unique_error_types,
        frontendStatus,
        apiStatus: apiHealthStatus,
        databaseStatus: databaseHealth,
        authStatus,
        paymentStatus,
        contentGenerationStatus: contentStatus,
        aiStatus,
        modules,
        topErrors: errorSummary.top_errors.slice(0, 5),
        performanceRecommendations: [...new Set(apiRecommendations.slice(0, 3).map((recommendation) => recommendation.recommendation))],
        detections,
        recentRecoveryActions,
        autoRecoveryTriggered: false,
        suspiciousIpsBlocked: [],
        codebase: {
            status: historicalCodebaseStatus,
            lastRunAt: recentCodebaseSummary?.created_at || null,
            issueCount: historicalCodebaseIssues.length,
            issues: historicalCodebaseIssues.slice(0, 5),
            note: recentCodebaseSummary?.summary || 'A full codebase inspection has not been recorded yet.',
        },
        alerts: {
            warningCount,
            criticalCount,
            emailEnabled: Boolean(process.env.PLATFORM_ALERT_EMAILS || process.env.ADMIN_ALERT_EMAILS || process.env.RESEND_API_KEY),
        },
        recentAuditLogs,
    };
}

async function persistAuditSnapshot(snapshot: PlatformAuditorSnapshot, initiatedBy: string | undefined): Promise<void> {
    await writePlatformAuditLog({
        auditType: 'platform_auditor',
        auditSubtype: 'cycle',
        timeRange: '24h',
        status: mapHealthToAuditStatus(snapshot.overallStatus),
        title: 'Platform audit cycle completed',
        summary: `${snapshot.overallStatus.toUpperCase()} | uptime ${snapshot.uptimePercent}% | errors ${snapshot.errorCount24h} in 24h`,
        affectedModule: 'platform',
        metadata: {
            initiatedBy: initiatedBy || 'system',
            overallStatus: snapshot.overallStatus,
            uptimePercent: snapshot.uptimePercent,
            activeUsers: snapshot.activeUsers,
            apiLatencyMs: snapshot.apiLatencyMs,
            databaseResponseTimeMs: snapshot.databaseResponseTimeMs,
            serverLoadPercent: snapshot.serverLoadPercent,
            detections: snapshot.detections,
            topErrors: snapshot.topErrors,
            modules: snapshot.modules,
            autoRecoveryTriggered: snapshot.autoRecoveryTriggered,
            suspiciousIpsBlocked: snapshot.suspiciousIpsBlocked,
        },
        notifiedAdmin: true,
        notifiedEmail: false,
    });
}

async function persistCodebaseSummary(
    inspection: Awaited<ReturnType<typeof inspectCodebase>>,
    initiatedBy: string | undefined
): Promise<void> {
    await writePlatformAuditLog({
        auditType: 'platform_auditor',
        auditSubtype: 'codebase',
        timeRange: 'repository',
        status: inspection.status,
        title: 'Codebase inspection completed',
        summary: inspection.note,
        affectedModule: 'repository',
        metadata: {
            initiatedBy: initiatedBy || 'system',
            status: inspection.status,
            issueCount: inspection.issueCount,
            issues: inspection.issues,
        },
        notifiedAdmin: true,
        notifiedEmail: false,
    });

    for (const issue of inspection.issues.slice(0, 6)) {
        await writePlatformAuditLog({
            auditType: 'platform_auditor',
            auditSubtype: 'codebase_issue',
            timeRange: 'repository',
            status: mapIssueSeverityToStatus(issue.severity),
            title: issue.title,
            summary: issue.message,
            affectedModule: issue.module,
            metadata: issue.metadata || {},
            notifiedAdmin: true,
            notifiedEmail: false,
        });
    }
}

export async function getPlatformAuditorSnapshot(): Promise<PlatformAuditorSnapshot> {
    return collectLiveSnapshot({
        includeCodebaseFromHistory: true,
        eagerChecks: false,
    });
}

export async function runPlatformAudit(options: RunPlatformAuditOptions = {}): Promise<PlatformAuditorSnapshot> {
    const settings = {
        includeCodebaseInspection: options.includeCodebaseInspection ?? true,
        eagerChecks: options.eagerChecks ?? true,
        autoRecover: options.autoRecover ?? true,
        sendNotifications: options.sendNotifications ?? true,
        persist: options.persist ?? true,
        initiatedBy: options.initiatedBy,
    };

    const snapshot = await collectLiveSnapshot({
        includeCodebaseFromHistory: false,
        eagerChecks: settings.eagerChecks,
    });

    const codebaseInspection = settings.includeCodebaseInspection ? await inspectCodebase() : null;
    if (codebaseInspection) {
        snapshot.codebase = {
            status: codebaseInspection.status,
            lastRunAt: new Date().toISOString(),
            issueCount: codebaseInspection.issueCount,
            issues: codebaseInspection.issues.slice(0, 5),
            note: codebaseInspection.note,
        };
    }

    const suspiciousIpsBlocked: string[] = [];
    const bruteForceAttempts = await detectBruteForce();
    if (settings.autoRecover) {
        for (const attempt of bruteForceAttempts.filter((entry) => !entry.is_blocked).slice(0, 3)) {
            await blockIP(attempt.ip_address, 'Platform auditor automatic temporary restriction', 60);
            suspiciousIpsBlocked.push(attempt.ip_address);
            await writePlatformAuditLog({
                auditType: 'platform_auditor',
                auditSubtype: 'security_recovery',
                timeRange: '24h',
                status: 'warning',
                title: 'Suspicious login source temporarily blocked',
                summary: `${attempt.failure_count} failed login attempts detected for ${attempt.ip_address}`,
                affectedModule: 'authentication',
                recoveryAction: 'block_ip',
                recoveryStatus: 'success',
                metadata: {
                    ipAddress: attempt.ip_address,
                    failureCount: attempt.failure_count,
                    firstAttempt: attempt.first_attempt,
                    lastAttempt: attempt.last_attempt,
                },
                notifiedAdmin: true,
                notifiedEmail: false,
            });
        }
    }
    snapshot.suspiciousIpsBlocked = suspiciousIpsBlocked;

    if (settings.autoRecover && snapshot.detections.some((detection) => detection.detected && (detection.severity === 'CRITICAL' || detection.severity === 'HIGH'))) {
        const healResult = await selfHeal();
        snapshot.autoRecoveryTriggered = healResult.triggered;
        snapshot.recentRecoveryActions = getRecentRecoveryActions(8);
    }

    if (settings.sendNotifications) {
        await checkAlertConditions();

        if (snapshot.overallStatus !== 'healthy') {
            await writePlatformAuditLog({
                auditType: 'platform_auditor',
                auditSubtype: 'alert',
                timeRange: '24h',
                status: mapHealthToAuditStatus(snapshot.overallStatus),
                title: 'Platform auditor raised an administrative alert',
                summary: `Overall status is ${snapshot.overallStatus}. Admin attention is required.`,
                affectedModule: 'platform',
                recoveryAction: snapshot.autoRecoveryTriggered ? 'self_heal' : null,
                recoveryStatus: snapshot.autoRecoveryTriggered ? 'success' : null,
                metadata: {
                    overallStatus: snapshot.overallStatus,
                    detections: snapshot.detections.filter((detection) => detection.detected),
                    suspiciousIpsBlocked: snapshot.suspiciousIpsBlocked,
                },
                notifiedAdmin: true,
                notifiedEmail: false,
            });
        }
    }

    if (settings.persist) {
        await persistAuditSnapshot(snapshot, settings.initiatedBy);
        if (codebaseInspection) {
            await persistCodebaseSummary(codebaseInspection, settings.initiatedBy);
        }
    }

    return {
        ...snapshot,
        recentAuditLogs: await getRecentAuditContext(),
    };
}
