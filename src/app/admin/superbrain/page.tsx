'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    Brain,
    CheckCircle2,
    ChevronRight,
    Clock,
    Cpu,
    Database,
    DollarSign,
    Eye,
    FlaskConical,
    Gauge,
    Globe,
    Lock,
    Megaphone,
    Play,
    RefreshCw,
    Server,
    Shield,
    ShieldCheck,
    Sparkles,
    Target,
    Timer,
    TrendingUp,
    Users,
    Video,
    Wifi,
    XCircle,
    Zap,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

type CronStatus = 'success' | 'failed' | 'running' | 'idle';
type AlertSeverity = 'info' | 'warning' | 'critical';

interface CronJob {
    id: string;
    name: string;
    displayName: string;
    icon: React.ElementType;
    schedule: string;
    isEnabled: boolean;
    lastStatus: CronStatus;
    lastRun: string | null;
    lastDuration: number | null;
    description: string;
}

interface SystemAlert {
    id: string;
    alert_type: string;
    severity: AlertSeverity;
    message: string;
    is_resolved: boolean;
    created_at: string;
}

interface PlatformStats {
    totalStudents: number;
    activeUsers: number;
    totalRevenue: number;
    systemHealthStatus: 'healthy' | 'degraded' | 'critical';
    cronJobsRunning: number;
    cronJobsFailed: number;
    unresolvedAlerts: number;
    dbLatencyMs: number;
    totalCourses: number;
    liveClassesToday: number;
    activeEnrollments: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CRON_CATALOG: Omit<CronJob, 'lastStatus' | 'lastRun' | 'lastDuration' | 'isEnabled'>[] = [
    { id: 'ai-content',               name: 'ai-content',               displayName: 'AI Content Generation',     icon: Sparkles,   schedule: '02:00',  description: 'Lecture scripts, slides, narration, videos, publish' },
    { id: 'exam-engine',              name: 'exam-engine',              displayName: 'Exam Engine',               icon: FlaskConical, schedule: '03:00', description: 'Mock exams, question bank, adaptive quizzes, rebalance' },
    { id: 'student-analytics',        name: 'student-analytics',        displayName: 'Student Analytics',         icon: TrendingUp, schedule: '04:00',  description: 'Progress, mastery heatmaps, rank predictions' },
    { id: 'engagement',               name: 'engagement',               displayName: 'Student Engagement',        icon: Megaphone,  schedule: '05:00',  description: 'Study reminders, lecture alerts, test & leaderboard' },
    { id: 'marketing-automation',     name: 'marketing-automation',     displayName: 'Marketing Automation',      icon: Globe,      schedule: '06:00',  description: 'SEO content, YouTube scripts, promo videos' },
    { id: 'financial-automation',     name: 'financial-automation',     displayName: 'Financial Automation',      icon: DollarSign, schedule: '07:00',  description: 'Payments, invoices, donation receipts, analytics' },
    { id: 'database-maintenance',     name: 'database-maintenance',     displayName: 'Database Maintenance',      icon: Database,   schedule: '08:00',  description: 'Index optimization, archiving, integrity, slow queries' },
    { id: 'security-monitoring',      name: 'security-monitoring',      displayName: 'Security Monitoring',       icon: Shield,     schedule: '09:00',  description: 'Auth audit, suspicious activity, RLS verification' },
    { id: 'performance-optimization', name: 'performance-optimization', displayName: 'Performance Optimization',  icon: Gauge,      schedule: '10:00',  description: 'API latency, page speed, caching, resources' },
    { id: 'automated-testing',        name: 'automated-testing',        displayName: 'Automated Testing',         icon: Target,     schedule: '11:00',  description: 'Frontend, backend, DB queries, AI modules' },
    { id: 'live-class-automation',    name: 'live-class-automation',    displayName: 'Live Class Automation',     icon: Video,      schedule: '12:00',  description: 'Schedule, reminders, attendance, recordings' },
    { id: 'lead-management',          name: 'lead-management',          displayName: 'Lead Management',           icon: Users,      schedule: '13:00',  description: 'CRM capture, follow-ups, lead analytics' },
    { id: 'supabase-health',          name: 'supabase-health',          displayName: 'Supabase Health Check',     icon: Wifi,       schedule: '14:00',  description: 'Connectivity, query performance, RLS, repair' },
    { id: 'auth-check',               name: 'auth-check',               displayName: 'Authentication Check',      icon: Lock,       schedule: '15:00',  description: 'Login, Google OAuth, branding, tokens' },
    { id: 'health-monitor',           name: 'health-monitor',           displayName: 'Health Monitor',            icon: Activity,   schedule: '*/5m',   description: 'Continuous monitoring & self-healing (every 5 min)' },
    { id: 'platform-auditor',         name: 'platform-auditor',         displayName: 'Platform Auditor',          icon: Eye,        schedule: '16:00',  description: 'Global audit: pages, links, dashboards, RLS' },
    { id: 'rank-prediction',          name: 'rank-prediction',          displayName: 'Rank Prediction',           icon: Cpu,        schedule: '04:30',  description: 'AI rank calculations & national leaderboard' },
    { id: 'gamification',             name: 'gamification',             displayName: 'Gamification Engine',       icon: Zap,        schedule: '00:00',  description: 'XP, streaks, badges, leaderboard updates' },
    { id: 'database-backup',          name: 'database-backup',          displayName: 'Database Backup',           icon: Server,     schedule: '01:00',  description: 'Nightly full database backup' },
    { id: 'seo-automation',           name: 'seo-automation',           displayName: 'SEO Automation',            icon: Globe,      schedule: 'Mon 06', description: 'Weekly SEO content and sitemap updates' },
    { id: 'email-notifications',      name: 'email-notifications',      displayName: 'Email Notifications',       icon: Megaphone,  schedule: 'Mon 07', description: 'Weekly email digest to all students' },
];

const EMPTY_STATS: PlatformStats = {
    totalStudents: 0,
    activeUsers: 0,
    totalRevenue: 0,
    systemHealthStatus: 'healthy',
    cronJobsRunning: 0,
    cronJobsFailed: 0,
    unresolvedAlerts: 0,
    dbLatencyMs: 0,
    totalCourses: 0,
    liveClassesToday: 0,
    activeEnrollments: 0,
};

// ── Helper Functions ──────────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimeAgo(iso: string | null): string {
    if (!iso) return 'Never';
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return 'Just now';
    if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
    if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
    return `${Math.floor(ms / 86_400_000)}d ago`;
}

function getStatusColor(status: CronStatus) {
    switch (status) {
        case 'success': return 'text-emerald-600 bg-emerald-50';
        case 'failed':  return 'text-red-600 bg-red-50';
        case 'running': return 'text-blue-600 bg-blue-50';
        default:        return 'text-slate-400 bg-slate-50';
    }
}

function getStatusIcon(status: CronStatus) {
    switch (status) {
        case 'success': return CheckCircle2;
        case 'failed':  return XCircle;
        case 'running': return RefreshCw;
        default:        return Clock;
    }
}

function getSeverityColor(severity: AlertSeverity) {
    switch (severity) {
        case 'critical': return 'border-red-300 bg-red-50 text-red-800';
        case 'warning':  return 'border-amber-300 bg-amber-50 text-amber-800';
        default:         return 'border-blue-300 bg-blue-50 text-blue-800';
    }
}

function getHealthBadge(status: 'healthy' | 'degraded' | 'critical') {
    switch (status) {
        case 'critical': return 'bg-red-100 text-red-700';
        case 'degraded': return 'bg-amber-100 text-amber-700';
        default:         return 'bg-emerald-100 text-emerald-700';
    }
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SuperbrainPage() {
    const supabase = useMemo(() => getSupabaseBrowserClient(), []);
    const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initialLoadRef = useRef(true);

    const [stats, setStats] = useState<PlatformStats>(EMPTY_STATS);
    const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [logs, setLogs] = useState<{ job_name: string; status: string; executed_at: string; duration_ms: number | null }[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [togglingJob, setTogglingJob] = useState<string | null>(null);

    const fetchData = useCallback(async (silent = false) => {
        if (!supabase) return;
        if (initialLoadRef.current) setLoading(true);
        else if (!silent) setRefreshing(true);

        try {
            const today = new Date().toISOString().split('T')[0];
            const [
                studentsRes,
                activeRes,
                revenueRes,
                healthRes,
                cronLogsRes,
                cronConfigsRes,
                alertsRes,
                coursesRes,
                liveClassesRes,
                enrollmentsRes,
            ] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
                (supabase as any).from('payments').select('amount').eq('status', 'completed'),
                (supabase as any).from('system_health').select('check_name, status, response_time_ms, checked_at').order('checked_at', { ascending: false }).limit(50),
                (supabase as any).from('cron_job_logs').select('job_name, status, executed_at, duration_ms').order('executed_at', { ascending: false }).limit(100),
                (supabase as any).from('cron_job_configs').select('job_name, is_enabled, schedule, description'),
                (supabase as any).from('system_alerts').select('id, alert_type, severity, message, is_resolved, created_at').eq('is_resolved', false).order('created_at', { ascending: false }).limit(20),
                supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_active', true),
                (supabase as any).from('live_classes').select('id', { count: 'exact', head: true }).gte('start_time', today).lt('start_time', today + 'T23:59:59'),
                supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
            ]);

            // Build cron job state from catalog + DB configs + last logs
            const configMap: Record<string, { is_enabled: boolean; schedule: string; description: string }> = {};
            if (cronConfigsRes.data) {
                for (const cfg of cronConfigsRes.data) {
                    configMap[cfg.job_name] = cfg;
                }
            }

            const lastLogByJob: Record<string, { status: string; executed_at: string; duration_ms: number | null }> = {};
            if (cronLogsRes.data) {
                for (const log of cronLogsRes.data) {
                    if (!lastLogByJob[log.job_name]) {
                        lastLogByJob[log.job_name] = log;
                    }
                }
            }

            const jobs: CronJob[] = CRON_CATALOG.map((j) => {
                const log = lastLogByJob[j.id];
                const cfg = configMap[j.id];
                return {
                    ...j,
                    isEnabled: cfg?.is_enabled ?? true,
                    lastStatus: (log?.status as CronStatus) ?? 'idle',
                    lastRun: log?.executed_at ?? null,
                    lastDuration: log?.duration_ms ?? null,
                };
            });

            // Platform stats
            const revenue = (revenueRes.data as { amount: number }[] | null ?? []);
            const totalRevenue = revenue.reduce((s, p) => s + Number(p.amount || 0), 0);

            const health = (healthRes.data as { check_name: string; status: string }[] | null ?? []);
            const hasCritical = health.some(h => h.status === 'critical');
            const hasDegraded = health.some(h => h.status === 'degraded');

            const latestDbCheck = (healthRes.data as { check_name: string; response_time_ms: number }[] | null ?? [])
                .find(h => h.check_name === 'db_connectivity');

            const failedJobs = jobs.filter(j => j.lastStatus === 'failed').length;
            const runningJobs = jobs.filter(j => j.lastStatus === 'running').length;

            setStats({
                totalStudents: studentsRes.count ?? 0,
                activeUsers: activeRes.count ?? 0,
                totalRevenue,
                systemHealthStatus: hasCritical ? 'critical' : hasDegraded ? 'degraded' : 'healthy',
                cronJobsRunning: runningJobs,
                cronJobsFailed: failedJobs,
                unresolvedAlerts: alertsRes.data?.length ?? 0,
                dbLatencyMs: latestDbCheck?.response_time_ms ?? 0,
                totalCourses: coursesRes.count ?? 0,
                liveClassesToday: liveClassesRes.count ?? 0,
                activeEnrollments: enrollmentsRes.count ?? 0,
            });

            setCronJobs(jobs);
            setAlerts((alertsRes.data ?? []) as SystemAlert[]);
            setLogs((cronLogsRes.data ?? []).slice(0, 20) as typeof logs);
            setLastUpdated(new Date().toISOString());
        } catch (err) {
            console.error('Superbrain fetch error:', err);
        } finally {
            initialLoadRef.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, [supabase]);

    useEffect(() => {
        void fetchData();

        if (!supabase) return;

        const scheduleRefresh = () => {
            if (refreshTimer.current) clearTimeout(refreshTimer.current);
            refreshTimer.current = setTimeout(() => void fetchData(true), 300);
        };

        const channel = supabase
            .channel('superbrain-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'system_health' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'system_alerts' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cron_job_logs' }, scheduleRefresh)
            .subscribe();

        return () => {
            if (refreshTimer.current) clearTimeout(refreshTimer.current);
            void channel.unsubscribe();
        };
    }, [fetchData, supabase]);

    const triggerCronJob = useCallback(async (jobName: string) => {
        if (!supabase) return;
        setTriggeringJob(jobName);
        try {
            const res = await fetch(`/api/superbrain?action=trigger`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.CRON_SECRET ?? process.env.ADMIN_API_KEY ?? ''}` 
                },
                body: JSON.stringify({ jobId: jobName }),
            });
            if (res.ok) {
                await fetchData(true);
            }
        } catch (err) {
            console.error(`Failed to trigger ${jobName}:`, err);
        } finally {
            setTriggeringJob(null);
        }
    }, [supabase, fetchData]);

    const toggleCronJob = useCallback(async (jobName: string, currentState: boolean) => {
        if (!supabase) return;
        setTogglingJob(jobName);
        try {
            await (supabase as any)
                .from('cron_job_configs')
                .upsert({ job_name: jobName, is_enabled: !currentState, updated_at: new Date().toISOString() }, { onConflict: 'job_name' });
            await fetchData(true);
        } catch (err) {
            console.error(`Failed to toggle ${jobName}:`, err);
        } finally {
            setTogglingJob(null);
        }
    }, [supabase, fetchData]);

    const resolveAlert = useCallback(async (alertId: string) => {
        if (!supabase) return;
        await (supabase as any)
            .from('system_alerts')
            .update({ is_resolved: true, resolved_at: new Date().toISOString() })
            .eq('id', alertId);
        await fetchData(true);
    }, [supabase, fetchData]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
                    <p className="text-sm font-semibold text-slate-600">Initializing AI Superbrain...</p>
                    <p className="text-xs text-slate-400 mt-1">Connecting to all systems</p>
                </div>
            </div>
        );
    }

    const failedJobs = cronJobs.filter(j => j.lastStatus === 'failed');
    const successJobs = cronJobs.filter(j => j.lastStatus === 'success');

    return (
        <div className="space-y-6 text-slate-900">

            {/* ── Header ── */}
            <section>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200">
                            <Brain className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">SaviTech AI Superbrain</h1>
                            <p className="text-xs text-slate-500 mt-0.5">Autonomous platform orchestration & mission control</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* System status pill */}
                        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${getHealthBadge(stats.systemHealthStatus)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${stats.systemHealthStatus === 'healthy' ? 'bg-emerald-500 animate-pulse' : stats.systemHealthStatus === 'degraded' ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`} />
                            {stats.systemHealthStatus === 'healthy' ? 'All Systems Go' : stats.systemHealthStatus === 'degraded' ? 'Partially Degraded' : 'Critical Alert'}
                        </span>
                        <span className="hidden text-[11px] text-slate-400 sm:inline">
                            {lastUpdated ? `Synced ${new Date(lastUpdated).toLocaleTimeString()}` : 'Not synced'}
                        </span>
                        <button
                            onClick={() => void fetchData()}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-95"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <button
                            onClick={async () => {
                                if (!confirm('Run all enabled cron jobs?')) return;
                                setRefreshing(true);
                                try {
                                    await fetch(`/api/superbrain?action=runAll`, {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET ?? process.env.ADMIN_API_KEY ?? ''}` },
                                    });
                                    await fetchData(true);
                                } catch (err) {
                                    console.error('Run all failed:', err);
                                }
                            }}
                            disabled={refreshing}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 active:scale-95 disabled:opacity-50"
                        >
                            <Zap className="h-3.5 w-3.5" />
                            Run All
                        </button>
                        <button
                            onClick={async () => {
                                if (!confirm('Trigger self-healing process?')) return;
                                setRefreshing(true);
                                try {
                                    await fetch(`/api/superbrain?action=heal`, {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET ?? process.env.ADMIN_API_KEY ?? ''}` },
                                    });
                                    await fetchData(true);
                                } catch (err) {
                                    console.error('Self-heal failed:', err);
                                }
                            }}
                            disabled={refreshing}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 active:scale-95 disabled:opacity-50"
                        >
                            <Shield className="h-3.5 w-3.5" />
                            Self-Heal
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Platform KPI Metrics ── */}
            <section>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <MetricCard icon={Users} label="Students" value={stats.totalStudents.toLocaleString()} gradient="from-indigo-500 to-blue-500" />
                    <MetricCard icon={Activity} label="Active Users" value={stats.activeUsers.toLocaleString()} gradient="from-emerald-500 to-teal-500" />
                    <MetricCard icon={DollarSign} label="Revenue" value={formatCurrency(stats.totalRevenue)} gradient="from-amber-500 to-orange-500" />
                    <MetricCard icon={Video} label="Live Classes" value={stats.liveClassesToday.toString()} gradient="from-violet-500 to-purple-500" />
                    <MetricCard icon={Database} label="DB Latency" value={`${stats.dbLatencyMs}ms`} gradient="from-cyan-500 to-blue-500" />
                    <MetricCard
                        icon={ShieldCheck}
                        label="System Health"
                        value={stats.systemHealthStatus === 'healthy' ? '✓ OK' : stats.systemHealthStatus === 'degraded' ? '⚠' : '✗'}
                        gradient={stats.systemHealthStatus === 'healthy' ? 'from-emerald-500 to-green-500' : stats.systemHealthStatus === 'degraded' ? 'from-amber-500 to-yellow-500' : 'from-red-500 to-rose-500'}
                    />
                </div>
            </section>

            {/* ── Cron Status Row ── */}
            <section>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatBox label="Total Cron Jobs" value={cronJobs.length.toString()} icon={Timer} color="violet" />
                    <StatBox label="Jobs Succeeded" value={successJobs.length.toString()} icon={CheckCircle2} color="emerald" />
                    <StatBox label="Jobs Failed" value={failedJobs.length.toString()} icon={XCircle} color={failedJobs.length > 0 ? 'red' : 'slate'} />
                    <StatBox label="Unresolved Alerts" value={stats.unresolvedAlerts.toString()} icon={AlertTriangle} color={stats.unresolvedAlerts > 0 ? 'amber' : 'slate'} />
                </div>
            </section>

            {/* ── Cron Jobs Control Panel ── */}
            <section>
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                                <Timer className="h-4 w-4 text-violet-600" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Cron Orchestrator</h2>
                                <p className="text-[10px] text-slate-400">Monitor, trigger, and control all automation jobs</p>
                            </div>
                        </div>
                        <span className="text-[11px] text-slate-400">{cronJobs.filter(j => j.isEnabled).length} / {cronJobs.length} enabled</span>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {cronJobs.map((job) => {
                            const StatusIcon = getStatusIcon(job.lastStatus);
                            const JobIcon = job.icon;
                            const isTriggering = triggeringJob === job.name;
                            const isToggling = togglingJob === job.name;

                            return (
                                <div key={job.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                                    {/* Job icon */}
                                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${job.isEnabled ? 'bg-violet-100' : 'bg-slate-100'}`}>
                                        <JobIcon className={`h-4 w-4 ${job.isEnabled ? 'text-violet-600' : 'text-slate-400'}`} />
                                    </div>

                                    {/* Job info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-xs font-semibold ${job.isEnabled ? 'text-slate-900' : 'text-slate-400'}`}>{job.displayName}</p>
                                            <span className="text-[10px] text-slate-400 hidden md:inline">{job.schedule}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 truncate">{job.description}</p>
                                    </div>

                                    {/* Last run info */}
                                    <div className="hidden sm:flex flex-col items-end gap-0.5 flex-shrink-0">
                                        <span className="text-[10px] text-slate-400">{formatTimeAgo(job.lastRun)}</span>
                                        <span className="text-[10px] text-slate-300">{formatDuration(job.lastDuration)}</span>
                                    </div>

                                    {/* Status badge */}
                                    <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${getStatusColor(job.lastStatus)} flex-shrink-0`}>
                                        <StatusIcon className={`h-3 w-3 ${job.lastStatus === 'running' ? 'animate-spin' : ''}`} />
                                        <span className="hidden sm:inline">{job.lastStatus}</span>
                                    </div>

                                    {/* Toggle enable/disable */}
                                    <button
                                        onClick={() => void toggleCronJob(job.name, job.isEnabled)}
                                        disabled={isToggling}
                                        title={job.isEnabled ? 'Disable job' : 'Enable job'}
                                        className={`relative flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 transition-colors ${job.isEnabled ? 'border-emerald-400 bg-emerald-400' : 'border-slate-300 bg-slate-200'} ${isToggling ? 'opacity-50' : ''}`}
                                    >
                                        <span className={`absolute h-3 w-3 rounded-full bg-white shadow transition-transform ${job.isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </button>

                                    {/* Manual trigger */}
                                    <button
                                        onClick={() => void triggerCronJob(job.name)}
                                        disabled={isTriggering || !job.isEnabled}
                                        title="Trigger manually"
                                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 disabled:opacity-40"
                                    >
                                        {isTriggering
                                            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            : <Play className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── Alerts + Execution Logs ── */}
            <section>
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* System Alerts */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className={`h-4 w-4 ${alerts.length > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
                                <h2 className="text-sm font-bold text-slate-900">System Alerts</h2>
                            </div>
                            <span className="text-[11px] text-slate-400">{alerts.length} unresolved</span>
                        </div>

                        <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                            {alerts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                                    <p className="text-xs text-slate-400">No active alerts — all systems nominal</p>
                                </div>
                            ) : alerts.map((alert) => (
                                <div key={alert.id} className={`flex items-start gap-3 px-5 py-3 border-l-4 ${getSeverityColor(alert.severity)} border-l-${alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'amber' : 'blue'}-400`}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold">{alert.alert_type.replace(/_/g, ' ')}</p>
                                        <p className="text-[11px] mt-0.5 line-clamp-2">{alert.message}</p>
                                        <p className="text-[10px] mt-1 opacity-60">{formatTimeAgo(alert.created_at)}</p>
                                    </div>
                                    <button
                                        onClick={() => void resolveAlert(alert.id)}
                                        className="flex-shrink-0 text-[10px] font-semibold underline underline-offset-2 opacity-70 hover:opacity-100"
                                    >
                                        Resolve
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Execution Logs */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                            <Clock className="h-4 w-4 text-indigo-500" />
                            <h2 className="text-sm font-bold text-slate-900">Execution Log</h2>
                        </div>

                        <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto font-mono">
                            {logs.length === 0 ? (
                                <div className="py-8 text-center text-xs text-slate-400">No execution logs yet</div>
                            ) : logs.map((log, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 px-5 py-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : log.status === 'failed' ? 'bg-red-500 animate-pulse' : 'bg-blue-500 animate-pulse'}`} />
                                        <span className="text-[11px] text-slate-700 truncate">{log.job_name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`text-[10px] font-bold ${log.status === 'success' ? 'text-emerald-600' : log.status === 'failed' ? 'text-red-600' : 'text-blue-600'}`}>{log.status}</span>
                                        <span className="text-[10px] text-slate-300">{formatDuration(log.duration_ms)}</span>
                                        <span className="text-[10px] text-slate-400">{formatTimeAgo(log.executed_at)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Quick Navigation ── */}
            <section>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-900 mb-4">Platform Modules</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                        {[
                            { href: '/admin', label: 'Admin Dashboard' },
                            { href: '/admin/analytics', label: 'Analytics' },
                            { href: '/admin/students', label: 'Students' },
                            { href: '/admin/payments', label: 'Payments' },
                            { href: '/admin/lectures', label: 'Lectures' },
                            { href: '/admin/tests', label: 'Mock Tests' },
                            { href: '/admin/finance', label: 'Finance & GST' },
                            { href: '/admin/leads', label: 'Lead CRM' },
                            { href: '/admin/courses', label: 'Courses' },
                            { href: '/admin/ai-content', label: 'AI Content' },
                            { href: '/admin/careers', label: 'Careers' },
                            { href: '/admin/settings', label: 'Settings' },
                        ].map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="flex items-center justify-between gap-1.5 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-xs font-medium text-slate-700 transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                            >
                                {link.label}
                                <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── DB Latency Footer ── */}
            <section>
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>DB Latency: <span className={`font-bold ${stats.dbLatencyMs > 1000 ? 'text-red-500' : stats.dbLatencyMs > 500 ? 'text-amber-500' : 'text-emerald-500'}`}>{stats.dbLatencyMs ? `${Math.round(stats.dbLatencyMs)}ms` : '—'}</span></span>
                    <span>SaviTech AI Superbrain v2.0 — Real-Time Autonomous Platform</span>
                </div>
            </section>
        </div>
    );
}

/* ── Sub-components ── */

function MetricCard({ icon: Icon, label, value, gradient }: {
    icon: React.ElementType; label: string; value: string; gradient: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>
                    <Icon className="h-4.5 w-4.5" />
                </div>
            </div>
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
        </div>
    );
}

function StatBox({ label, value, icon: Icon, color }: {
    label: string; value: string; icon: React.ElementType;
    color: 'violet' | 'emerald' | 'red' | 'amber' | 'slate';
}) {
    const colors = {
        violet: 'bg-violet-50 text-violet-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        red: 'bg-red-50 text-red-700',
        amber: 'bg-amber-50 text-amber-700',
        slate: 'bg-slate-50 text-slate-500',
    };

    return (
        <div className={`flex items-center gap-3 rounded-xl p-3 ${colors[color]}`}>
            <Icon className="h-5 w-5 flex-shrink-0 opacity-70" />
            <div>
                <p className="text-[10px] font-medium opacity-70">{label}</p>
                <p className="text-lg font-bold leading-tight">{value}</p>
            </div>
        </div>
    );
}
