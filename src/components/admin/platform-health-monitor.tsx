'use client';

import { useEffect, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    Bot,
    CheckCircle2,
    Database,
    Gauge,
    RefreshCw,
    ShieldAlert,
    Sparkles,
    Users,
    Wrench,
} from 'lucide-react';

type HealthStatus = 'healthy' | 'degraded' | 'critical';
type AuditStatus = 'healthy' | 'warning' | 'critical';

interface AuditorModuleHealth {
    name: string;
    status: HealthStatus;
    summary: string;
    metric: string;
}

interface CodebaseInspectionIssue {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    module: string;
}

interface PlatformAuditLogRecord {
    id: string;
    status: AuditStatus;
    title: string | null;
    summary: string | null;
    affected_module: string | null;
    recovery_action: string | null;
    created_at: string;
}

interface PlatformAuditorSnapshot {
    generatedAt: string;
    overallStatus: HealthStatus;
    uptimePercent: number;
    activeUsers: number;
    apiLatencyMs: number;
    databaseResponseTimeMs: number;
    serverLoadPercent: number;
    errorCount24h: number;
    frontendStatus: HealthStatus;
    apiStatus: HealthStatus;
    databaseStatus: HealthStatus;
    authStatus: HealthStatus;
    paymentStatus: HealthStatus;
    contentGenerationStatus: HealthStatus;
    aiStatus: HealthStatus;
    modules: AuditorModuleHealth[];
    performanceRecommendations: string[];
    autoRecoveryTriggered: boolean;
    suspiciousIpsBlocked: string[];
    codebase: {
        status: AuditStatus;
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
    recentRecoveryActions: Array<{
        id: string;
        action_type: string;
        status: string;
        failure_type: string;
        started_at: string;
        result: string | null;
        error_message: string | null;
    }>;
    recentAuditLogs: PlatformAuditLogRecord[];
}

function getStatusClasses(status: HealthStatus | AuditStatus): string {
    if (status === 'critical') {
        return 'bg-red-100 text-red-700 border-red-200';
    }

    if (status === 'degraded' || status === 'warning') {
        return 'bg-amber-100 text-amber-700 border-amber-200';
    }

    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

function getStatusDot(status: HealthStatus | AuditStatus): string {
    if (status === 'critical') {
        return 'bg-red-500';
    }

    if (status === 'degraded' || status === 'warning') {
        return 'bg-amber-500';
    }

    return 'bg-emerald-500';
}

function formatTimestamp(value: string | null): string {
    if (!value) {
        return 'Not run yet';
    }

    return new Date(value).toLocaleString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
    });
}

export default function PlatformHealthMonitor() {
    const [data, setData] = useState<PlatformAuditorSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [runningAudit, setRunningAudit] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSnapshot = async (silent = false) => {
        if (!silent) {
            setLoading(true);
        }

        try {
            const response = await fetch('/api/admin/platform-auditor', {
                method: 'GET',
                cache: 'no-store',
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to load platform health monitor');
            }

            setData(result.data as PlatformAuditorSnapshot);
            setError(null);
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load platform health monitor');
        } finally {
            setLoading(false);
        }
    };

    const runAudit = async () => {
        setRunningAudit(true);
        try {
            const response = await fetch('/api/admin/platform-auditor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    includeCodebaseInspection: true,
                    autoRecover: true,
                }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to run platform audit');
            }

            setData(result.data as PlatformAuditorSnapshot);
            setError(null);
        } catch (runError) {
            setError(runError instanceof Error ? runError.message : 'Failed to run platform audit');
        } finally {
            setRunningAudit(false);
        }
    };

    useEffect(() => {
        void fetchSnapshot();

        const interval = setInterval(() => {
            void fetchSnapshot(true);
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 text-slate-500">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Loading platform health monitor...</span>
                </div>
            </div>
        );
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-slate-700" />
                        <h2 className="text-base font-semibold text-slate-900">Platform Health Monitor</h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Continuous auditing for runtime health, recovery actions, codebase integrity, and admin alerts.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(data?.overallStatus || 'healthy')}`}>
                        {(data?.overallStatus || 'healthy').toUpperCase()}
                    </span>
                    <button
                        type="button"
                        onClick={() => void fetchSnapshot()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={() => void runAudit()}
                        disabled={runningAudit}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                    >
                        <Sparkles className={`h-4 w-4 ${runningAudit ? 'animate-spin' : ''}`} />
                        Run Full Audit
                    </button>
                </div>
            </div>

            {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            {data ? (
                <div className="mt-5 space-y-5">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <MonitorCard icon={Activity} label="Uptime" value={`${data.uptimePercent}%`} detail={`Generated ${formatTimestamp(data.generatedAt)}`} tone={data.overallStatus} />
                        <MonitorCard icon={Gauge} label="API Latency" value={`${data.apiLatencyMs}ms`} detail={`${data.errorCount24h} errors / 24h`} tone={data.apiStatus} />
                        <MonitorCard icon={Database} label="Database" value={`${data.databaseResponseTimeMs}ms`} detail={`Load ${data.serverLoadPercent}%`} tone={data.databaseStatus} />
                        <MonitorCard icon={Users} label="Active Users" value={data.activeUsers.toLocaleString()} detail={`${data.alerts.criticalCount} critical alerts`} tone="healthy" />
                        <MonitorCard icon={Bot} label="AI + Content" value={`${data.aiStatus === 'healthy' && data.contentGenerationStatus === 'healthy' ? 'Stable' : 'Watch'}`} detail={`${data.performanceRecommendations.length} optimization hints`} tone={data.aiStatus === 'critical' || data.contentGenerationStatus === 'critical' ? 'critical' : data.aiStatus === 'degraded' || data.contentGenerationStatus === 'degraded' ? 'degraded' : 'healthy'} />
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
                        <div className="space-y-5">
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-900">Live Module Status</h3>
                                    <span className="text-xs text-slate-500">Real-time admin snapshot</span>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {data.modules.map((module) => (
                                        <div key={module.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2.5 w-2.5 rounded-full ${getStatusDot(module.status)}`} />
                                                    <p className="text-sm font-semibold text-slate-900">{module.name}</p>
                                                </div>
                                                <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getStatusClasses(module.status)}`}>
                                                    {module.status}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm text-slate-600">{module.summary}</p>
                                            <p className="mt-2 text-xs font-medium text-slate-500">{module.metric}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-semibold text-slate-900">Codebase Inspection</h3>
                                        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getStatusClasses(data.codebase.status)}`}>
                                            {data.codebase.status}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">{data.codebase.note}</p>
                                    <div className="mt-3 text-xs text-slate-500">
                                        Last run: <span className="font-medium text-slate-700">{formatTimestamp(data.codebase.lastRunAt)}</span>
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {data.codebase.issues.length > 0 ? data.codebase.issues.map((issue) => (
                                            <div key={`${issue.module}-${issue.title}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-medium text-slate-900">{issue.title}</p>
                                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(issue.severity === 'critical' || issue.severity === 'high' ? 'critical' : issue.severity === 'medium' ? 'warning' : 'healthy')}`}>
                                                        {issue.severity}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-600">{issue.message}</p>
                                                <p className="mt-1 text-[11px] font-medium text-slate-500">{issue.module}</p>
                                            </div>
                                        )) : (
                                            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                                                No codebase issues have been recorded yet.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-sm font-semibold text-slate-900">Recovery + Security</h3>
                                        <Wrench className="h-4 w-4 text-slate-500" />
                                    </div>
                                    <div className="mt-3 space-y-3 text-sm text-slate-600">
                                        <div className="flex items-center justify-between">
                                            <span>Auto recovery this cycle</span>
                                            <span className="font-semibold text-slate-900">{data.autoRecoveryTriggered ? 'Triggered' : 'Standby'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Alert email configured</span>
                                            <span className="font-semibold text-slate-900">{data.alerts.emailEnabled ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Suspicious IPs blocked</span>
                                            <span className="font-semibold text-slate-900">{data.suspiciousIpsBlocked.length}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        {data.recentRecoveryActions.length > 0 ? data.recentRecoveryActions.slice(0, 4).map((action) => (
                                            <div key={action.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-medium text-slate-900">{action.action_type.replace(/_/g, ' ')}</p>
                                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(action.status === 'failed' ? 'critical' : action.status === 'success' ? 'healthy' : 'warning')}`}>
                                                        {action.status}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-600">{action.result || action.error_message || action.failure_type}</p>
                                            </div>
                                        )) : (
                                            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                                                No recent recovery actions recorded.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-semibold text-slate-900">Admin Alerts</h3>
                                    <AlertTriangle className="h-4 w-4 text-slate-500" />
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <SmallMetric label="Critical" value={data.alerts.criticalCount.toString()} tone="critical" />
                                    <SmallMetric label="Warnings" value={data.alerts.warningCount.toString()} tone="warning" />
                                </div>
                                <div className="mt-4 space-y-2">
                                    {data.recentAuditLogs.slice(0, 6).map((log) => (
                                        <div key={log.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{log.title || 'Audit event'}</p>
                                                    <p className="mt-1 text-xs text-slate-600">{log.summary || 'No summary available'}</p>
                                                </div>
                                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(log.status)}`}>
                                                    {log.status}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                                <span>{log.affected_module || 'platform'}</span>
                                                <span>{formatTimestamp(log.created_at)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-semibold text-slate-900">Optimization Guidance</h3>
                                    <CheckCircle2 className="h-4 w-4 text-slate-500" />
                                </div>
                                <div className="mt-3 space-y-2">
                                    {data.performanceRecommendations.length > 0 ? data.performanceRecommendations.map((recommendation) => (
                                        <div key={recommendation} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                            {recommendation}
                                        </div>
                                    )) : (
                                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                                            No urgent optimization recommendations right now.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

function MonitorCard({
    icon: Icon,
    label,
    value,
    detail,
    tone,
}: {
    icon: typeof Activity;
    label: string;
    value: string;
    detail: string;
    tone: HealthStatus;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'critical' ? 'bg-red-100 text-red-700' : tone === 'degraded' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getStatusClasses(tone)}`}>
                    {tone}
                </span>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
    );
}

function SmallMetric({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: AuditStatus;
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className={`mt-1 text-xl font-bold ${tone === 'critical' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : 'text-emerald-600'}`}>
                {value}
            </p>
        </div>
    );
}
