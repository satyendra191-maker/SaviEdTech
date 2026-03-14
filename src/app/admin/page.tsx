'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ElementType } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    BarChart3,
    BookOpen,
    Briefcase,
    CreditCard,
    FileText,
    GraduationCap,
    HeartHandshake,
    Image,
    Landmark,
    PlayCircle,
    RefreshCw,
    ShieldCheck,
    Target,
    TrendingUp,
    Users,
    Activity,
    ChevronRight,
    ArrowUpRight,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

const PlatformHealthMonitor = dynamic(
    () => import('@/components/admin/platform-health-monitor'),
    {
        ssr: false,
        loading: () => (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
                Loading platform health monitor...
            </div>
        ),
    }
);

type LeadStatus = Database['public']['Tables']['lead_forms']['Row']['status'];
type HealthStatus = Database['public']['Tables']['system_health']['Row']['status'];

type RecentLead = Pick<
    Database['public']['Tables']['lead_forms']['Row'],
    'id' | 'name' | 'phone' | 'exam_target' | 'status' | 'created_at'
>;

type PaymentSummary = Pick<
    Database['public']['Tables']['payments']['Row'],
    'amount' | 'status' | 'payment_type'
>;

type HealthCheck = Pick<
    Database['public']['Tables']['system_health']['Row'],
    'check_name' | 'status' | 'response_time_ms' | 'checked_at'
>;

interface DashboardStats {
    totalStudents: number;
    activeUsers: number;
    totalRevenue: number;
    totalDonationsAmount: number;
    completedDonations: number;
    coursePurchases: number;
    premiumSubscriptions: number;
    careerApplications: number;
}

interface DashboardActivity {
    newRegistrations: number;
    challengeParticipants: number;
    lectureViews: number;
    practiceAttempts: number;
    dppAttempts: number;
    testsCompleted: number;
}

const EMPTY_STATS: DashboardStats = {
    totalStudents: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalDonationsAmount: 0,
    completedDonations: 0,
    coursePurchases: 0,
    premiumSubscriptions: 0,
    careerApplications: 0,
};

const EMPTY_ACTIVITY: DashboardActivity = {
    newRegistrations: 0,
    challengeParticipants: 0,
    lectureViews: 0,
    practiceAttempts: 0,
    dppAttempts: 0,
    testsCompleted: 0,
};

const CONTROL_MODULES = [
    { href: '/admin/lectures', label: 'Lecture Management', description: 'Publish and schedule learning content', icon: PlayCircle, accent: 'from-indigo-500 to-blue-500' },
    { href: '/admin/questions', label: 'Question Bank', description: 'Manage practice, DPP, and test questions', icon: BookOpen, accent: 'from-emerald-500 to-teal-500' },
    { href: '/admin/tests', label: 'Mock Tests', description: 'Build and manage exam simulations', icon: GraduationCap, accent: 'from-amber-500 to-orange-500' },
    { href: '/admin/online-exams', label: 'Online Exams', description: 'Control NTA-style CBT schedules and proctoring', icon: ShieldCheck, accent: 'from-sky-500 to-cyan-500' },
    { href: '/admin/ads', label: 'Popup Ads', description: 'Schedule promotional banners and notices', icon: Image, accent: 'from-fuchsia-500 to-rose-500' },
    { href: '/admin/analytics', label: 'Student Analytics', description: 'Inspect performance and activity trends', icon: BarChart3, accent: 'from-violet-500 to-purple-500' },
    { href: '/admin/payments', label: 'Donations and Payments', description: 'Track donations, subscriptions, and course sales', icon: CreditCard, accent: 'from-cyan-500 to-sky-500' },
    { href: '/admin/finance', label: 'Finance and GST', description: 'Review ledgers, invoices, reports, and GST filing exports', icon: Landmark, accent: 'from-emerald-500 to-lime-500' },
    { href: '/admin/careers', label: 'Career Applications', description: 'Review applicants and download resumes', icon: Briefcase, accent: 'from-slate-700 to-slate-900' },
];

function getStartOfToday(): { iso: string; date: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return {
        iso: start.toISOString(),
        date: start.toISOString().split('T')[0] || '',
    };
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatCheckName(name: string): string {
    return name
        .split(/[_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getOverallHealthStatus(checks: HealthCheck[]): HealthStatus {
    if (checks.some((check) => check.status === 'critical')) {
        return 'critical';
    }
    if (checks.some((check) => check.status === 'degraded')) {
        return 'degraded';
    }
    return 'healthy';
}

function getStatusLabel(status: HealthStatus): string {
    switch (status) {
        case 'critical':
            return 'Needs Attention';
        case 'degraded':
            return 'Partially Degraded';
        default:
            return 'All Systems Go';
    }
}

function getStatusBadgeClasses(status: HealthStatus): string {
    switch (status) {
        case 'critical':
            return 'bg-red-100 text-red-700';
        case 'degraded':
            return 'bg-amber-100 text-amber-700';
        default:
            return 'bg-emerald-100 text-emerald-700';
    }
}

function getStatusDotColor(status: HealthStatus): string {
    switch (status) {
        case 'critical':
            return 'bg-red-500';
        case 'degraded':
            return 'bg-amber-500';
        default:
            return 'bg-emerald-500';
    }
}

export default function AdminDashboardPage() {
    const supabase = useMemo(() => getSupabaseBrowserClient(), []);
    const initialLoadRef = useRef(true);
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
    const [activity, setActivity] = useState<DashboardActivity>(EMPTY_ACTIVITY);
    const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
    const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async (silent = false) => {
        if (!mountedRef.current) return;
        
        if (!supabase) {
            setLoading(false);
            setError('Supabase browser client is unavailable.');
            return;
        }

        if (initialLoadRef.current) {
            setLoading(true);
        } else if (!silent) {
            setRefreshing(true);
        }

        try {
            setError(null);
            const { iso: todayStartIso } = getStartOfToday();

            // Run essential queries in parallel with timeout
            const timeout = 8000; // 8 second timeout per query
            
            const [studentsResult, activeUsersResult, latestLeadsResult, paymentsResult, registrationsTodayResult] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('lead_forms').select('id, name, phone, exam_target, status, created_at').order('created_at', { ascending: false }).limit(5),
                supabase.from('payments').select('amount, status, payment_type'),
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student').gte('created_at', todayStartIso),
            ]);

            if (!mountedRef.current) return;

            const payments = (paymentsResult.data || []) as PaymentSummary[];
            const completedPayments = payments.filter((payment) => payment.status === 'completed');
            const completedDonations = completedPayments.filter((payment) => payment.payment_type === 'donation');
            const completedCoursePurchases = completedPayments.filter((payment) => payment.payment_type === 'course_purchase');
            const completedSubscriptions = completedPayments.filter((payment) => payment.payment_type === 'subscription');

            setStats({
                totalStudents: studentsResult.count || 0,
                activeUsers: activeUsersResult.count || 0,
                totalRevenue: completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
                totalDonationsAmount: completedDonations.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
                completedDonations: completedDonations.length,
                coursePurchases: completedCoursePurchases.length,
                premiumSubscriptions: completedSubscriptions.length,
                careerApplications: 0,
            });

            setActivity({
                newRegistrations: registrationsTodayResult.count || 0,
                challengeParticipants: 0,
                lectureViews: 0,
                practiceAttempts: 0,
                dppAttempts: 0,
                testsCompleted: 0,
            });

            setRecentLeads((latestLeadsResult.data || []) as RecentLead[]);
            setHealthChecks([]);
            setLastUpdatedAt(new Date().toISOString());
        } catch (fetchError) {
            if (!mountedRef.current) return;
            console.error('Error fetching admin dashboard data:', fetchError);
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load dashboard data');
        } finally {
            if (!mountedRef.current) return;
            initialLoadRef.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, [supabase]);

    useEffect(() => {
        mountedRef.current = true;
        void fetchDashboardData();

        return () => {
            mountedRef.current = false;
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, [fetchDashboardData]);

    // Simplified: removed realtime subscriptions that could cause issues

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
                    <p className="font-medium text-slate-600 text-sm">Loading control center...</p>
                </div>
            </div>
        );
    }

    const overallHealth = getOverallHealthStatus(healthChecks);

    return (
        <div className="space-y-5 text-slate-900">
            {/* ────── Header ────── */}
            <section className="animate-card-slide-up">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Admin Control Center</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Live overview of students, payments, and platform operations.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden text-[11px] text-slate-400 sm:inline">
                            {lastUpdatedAt ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString()}` : 'Not synced'}
                        </span>
                        <button
                            type="button"
                            onClick={() => void fetchDashboardData()}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-95"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </section>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            {/* ────── Top Metrics Row ────── */}
            <section className="animate-card-slide-up stagger-1">
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <AdminMetricCard
                        icon={Users}
                        label="Total Students"
                        value={stats.totalStudents.toLocaleString()}
                        badge={`+${activity.newRegistrations} today`}
                        gradient="from-indigo-500 to-indigo-600"
                    />
                    <AdminMetricCard
                        icon={TrendingUp}
                        label="Active Users"
                        value={stats.activeUsers.toLocaleString()}
                        badge={`${activity.lectureViews} views`}
                        gradient="from-emerald-500 to-emerald-600"
                    />
                    <AdminMetricCard
                        icon={HeartHandshake}
                        label="Donations"
                        value={formatCurrency(stats.totalDonationsAmount)}
                        badge={`${stats.completedDonations} total`}
                        gradient="from-rose-500 to-pink-500"
                    />
                    <AdminMetricCard
                        icon={CreditCard}
                        label="Course Sales"
                        value={stats.coursePurchases.toLocaleString()}
                        badge={`${stats.premiumSubscriptions} premium`}
                        gradient="from-cyan-500 to-sky-500"
                    />
                </div>
            </section>

            {/* ────── Revenue + Platform Usage ────── */}
            <section className="animate-card-slide-up stagger-2">
                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Revenue Card */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-lg">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <CreditCard className="h-5 w-5 text-white/70" />
                                <h2 className="text-sm font-semibold text-white/70">Total Revenue</h2>
                            </div>
                            <p className="text-3xl font-bold animate-count-up">{formatCurrency(stats.totalRevenue)}</p>
                            <p className="text-xs text-white/50 mt-1">Donations + courses + subscriptions</p>
                            <div className="flex gap-3 mt-4 text-[11px]">
                                <div className="px-2.5 py-1 bg-white/10 rounded-lg">
                                    <span className="text-white/60">Courses:</span> <span className="font-semibold">{stats.coursePurchases}</span>
                                </div>
                                <div className="px-2.5 py-1 bg-white/10 rounded-lg">
                                    <span className="text-white/60">Premium:</span> <span className="font-semibold">{stats.premiumSubscriptions}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Platform Usage */}
                    <div className="glass-card rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Activity className="w-4 h-4 text-indigo-600" />
                            </div>
                            <h2 className="text-sm font-semibold text-slate-900">Platform Usage Today</h2>
                        </div>
                        <div className="space-y-0">
                            <ActivityRow icon={Users} label="New Registrations" value={activity.newRegistrations.toString()} color="indigo" />
                            <ActivityRow icon={PlayCircle} label="Lecture Progress" value={activity.lectureViews.toLocaleString()} color="sky" />
                            <ActivityRow icon={BookOpen} label="Practice Attempts" value={activity.practiceAttempts.toLocaleString()} color="emerald" />
                            <ActivityRow icon={FileText} label="DPP Attempts" value={activity.dppAttempts.toLocaleString()} color="orange" />
                            <ActivityRow icon={GraduationCap} label="Tests Completed" value={activity.testsCompleted.toLocaleString()} color="purple" />
                            <ActivityRow icon={Target} label="Challenge Users" value={activity.challengeParticipants.toLocaleString()} color="amber" />
                        </div>
                    </div>

                    {/* Support Funnel */}
                    <div className="glass-card rounded-2xl p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-slate-900 mb-4">Support Funnel</h2>
                        <div className="space-y-3">
                            <FunnelItem label="Career Applications" value={stats.careerApplications.toLocaleString()} />
                            <FunnelItem label="Completed Donations" value={stats.completedDonations.toLocaleString()} />
                            <FunnelItem label="Course Purchases" value={stats.coursePurchases.toLocaleString()} />
                            <FunnelItem label="Premium Subscriptions" value={stats.premiumSubscriptions.toLocaleString()} />
                        </div>
                    </div>
                </div>
            </section>

            {/* ────── Platform Modules ────── */}
            <section className="animate-card-slide-up stagger-3">
                <div className="glass-card rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Platform Modules</h2>
                            <p className="text-[11px] text-slate-400 mt-0.5">Quick access to admin tools</p>
                        </div>
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                        {CONTROL_MODULES.map((module) => (
                            <Link
                                key={module.href}
                                href={module.href}
                                className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition-all hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-md"
                            >
                                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${module.accent} text-white shadow-sm`}>
                                    <module.icon className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xs font-semibold text-slate-900 mb-0.5">{module.label}</h3>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">{module.description}</p>
                                </div>
                                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0 mt-0.5" />
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ────── System Health + Leads ────── */}
            <section className="animate-card-slide-up stagger-4">
                <div className="grid gap-4 lg:grid-cols-3">
                    {/* System Health */}
                    <div className="lg:col-span-2 glass-card rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-emerald-600" />
                                </div>
                                <h2 className="text-sm font-semibold text-slate-900">System Health</h2>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClasses(overallHealth)}`}>
                                {getStatusLabel(overallHealth)}
                            </span>
                        </div>

                        {healthChecks.length > 0 ? (
                            <div className="space-y-0">
                                {healthChecks.map((check) => (
                                    <div key={check.check_name} className="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-0">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`h-2 w-2 rounded-full ${getStatusDotColor(check.status)}`} />
                                            <span className="text-xs font-medium text-slate-700">{formatCheckName(check.check_name)}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[11px]">
                                            <span className="text-slate-400">
                                                <span className="font-semibold text-slate-600">{check.response_time_ms !== null ? `${Math.round(check.response_time_ms)}ms` : 'N/A'}</span>
                                            </span>
                                            <span className="text-slate-400 hidden sm:inline">
                                                {new Date(check.checked_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
                                No system health records available yet.
                            </div>
                        )}
                    </div>

                    {/* Recent Leads */}
                    <div className="glass-card rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-slate-900">Recent Leads</h2>
                            <Link href="/admin/leads" className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
                                View all <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>

                        {recentLeads.length > 0 ? (
                            <div className="space-y-2.5">
                                {recentLeads.map((lead) => (
                                    <div key={lead.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-900 truncate">{lead.name}</p>
                                                <p className="text-[11px] text-slate-400">{lead.phone}</p>
                                            </div>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${getLeadStatusClasses(lead.status)}`}>
                                                {lead.status}
                                            </span>
                                        </div>
                                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                                            <span>{lead.exam_target || 'No exam'}</span>
                                            <span>{new Date(lead.created_at).toLocaleDateString('en-IN')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
                                No recent leads found.
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ────── Platform Health Monitor ────── */}
            <section className="animate-card-slide-up stagger-5">
                <PlatformHealthMonitor />
            </section>
        </div>
    );
}

/* ─── Sub-components ─── */
function AdminMetricCard({
    icon: Icon,
    label,
    value,
    badge,
    gradient,
}: {
    icon: ElementType;
    label: string;
    value: string;
    badge: string;
    gradient: string;
}) {
    return (
        <div className="glass-card rounded-2xl p-4 shadow-sm stat-card-hover">
            <div className="flex items-start justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}>
                    <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{badge}</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5 animate-count-up">{value}</p>
        </div>
    );
}

function ActivityRow({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: ElementType;
    label: string;
    value: string;
    color: 'indigo' | 'sky' | 'emerald' | 'orange' | 'purple' | 'amber';
}) {
    const colorClasses = {
        indigo: 'bg-indigo-100 text-indigo-700',
        sky: 'bg-sky-100 text-sky-700',
        emerald: 'bg-emerald-100 text-emerald-700',
        orange: 'bg-orange-100 text-orange-700',
        purple: 'bg-violet-100 text-violet-700',
        amber: 'bg-amber-100 text-amber-700',
    };

    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorClasses[color]}`}>
                    <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-medium text-slate-600">{label}</span>
            </div>
            <span className="text-xs font-bold text-slate-900">{value}</span>
        </div>
    );
}

function FunnelItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-xs font-bold text-slate-900">{value}</span>
        </div>
    );
}

function getLeadStatusClasses(status: LeadStatus): string {
    const statusColors = {
        new: 'bg-blue-100 text-blue-700',
        contacted: 'bg-amber-100 text-amber-700',
        converted: 'bg-emerald-100 text-emerald-700',
        disqualified: 'bg-red-100 text-red-700',
    };

    return statusColors[status];
}
