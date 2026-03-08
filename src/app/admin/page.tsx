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
            return 'All Systems Operational';
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

export default function AdminDashboardPage() {
    const supabase = useMemo(() => getSupabaseBrowserClient(), []);
    const initialLoadRef = useRef(true);
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
    const [activity, setActivity] = useState<DashboardActivity>(EMPTY_ACTIVITY);
    const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
    const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboardData = useCallback(async (silent = false) => {
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
            const { iso: todayStartIso, date: todayDate } = getStartOfToday();

            const [
                studentsResult,
                activeUsersResult,
                latestLeadsResult,
                paymentsResult,
                healthResult,
                registrationsTodayResult,
                dailyChallengeResult,
                lectureViewsResult,
                questionAttemptsResult,
                dppAttemptsResult,
                testsCompletedResult,
                careerApplicationsResult,
            ] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
                supabase
                    .from('lead_forms')
                    .select('id, name, phone, exam_target, status, created_at')
                    .order('created_at', { ascending: false })
                    .limit(5),
                supabase
                    .from('payments')
                    .select('amount, status, payment_type'),
                supabase
                    .from('system_health')
                    .select('check_name, status, response_time_ms, checked_at')
                    .order('checked_at', { ascending: false })
                    .limit(50),
                supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('role', 'student')
                    .gte('created_at', todayStartIso),
                supabase
                    .from('daily_challenges')
                    .select('total_participants')
                    .eq('challenge_date', todayDate)
                    .maybeSingle(),
                supabase
                    .from('lecture_progress')
                    .select('id', { count: 'exact', head: true })
                    .gte('last_watched_at', todayStartIso),
                supabase
                    .from('question_attempts')
                    .select('id', { count: 'exact', head: true })
                    .gte('occurred_at', todayStartIso),
                supabase
                    .from('dpp_attempts')
                    .select('id', { count: 'exact', head: true })
                    .gte('started_at', todayStartIso),
                supabase
                    .from('test_attempts')
                    .select('id', { count: 'exact', head: true })
                    .in('status', ['completed', 'time_up'])
                    .gte('submitted_at', todayStartIso),
                supabase
                    .from('career_applications')
                    .select('id', { count: 'exact', head: true }),
            ]);

            const requiredErrors = [
                studentsResult.error,
                activeUsersResult.error,
                latestLeadsResult.error,
                paymentsResult.error,
                healthResult.error,
                registrationsTodayResult.error,
                dailyChallengeResult.error,
            ].filter(Boolean);

            if (requiredErrors.length > 0) {
                throw requiredErrors[0];
            }

            let careerApplicationsCount = careerApplicationsResult.count || 0;
            if (careerApplicationsResult.error) {
                const fallbackCareerResult = await supabase
                    .from('job_applications')
                    .select('id', { count: 'exact', head: true });
                if (!fallbackCareerResult.error) {
                    careerApplicationsCount = fallbackCareerResult.count || 0;
                }
            }

            const payments = (paymentsResult.data || []) as PaymentSummary[];
            const completedPayments = payments.filter((payment) => payment.status === 'completed');
            const completedDonations = completedPayments.filter((payment) => payment.payment_type === 'donation');
            const completedCoursePurchases = completedPayments.filter((payment) => payment.payment_type === 'course_purchase');
            const completedSubscriptions = completedPayments.filter((payment) => payment.payment_type === 'subscription');

            const latestHealthChecks = new Map<string, HealthCheck>();
            for (const row of (healthResult.data || []) as HealthCheck[]) {
                if (!latestHealthChecks.has(row.check_name)) {
                    latestHealthChecks.set(row.check_name, row);
                }
            }

            setStats({
                totalStudents: studentsResult.count || 0,
                activeUsers: activeUsersResult.count || 0,
                totalRevenue: completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
                totalDonationsAmount: completedDonations.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
                completedDonations: completedDonations.length,
                coursePurchases: completedCoursePurchases.length,
                premiumSubscriptions: completedSubscriptions.length,
                careerApplications: careerApplicationsCount,
            });

            setActivity({
                newRegistrations: registrationsTodayResult.count || 0,
                challengeParticipants: (dailyChallengeResult.data as { total_participants?: number } | null)?.total_participants || 0,
                lectureViews: lectureViewsResult.error ? 0 : lectureViewsResult.count || 0,
                practiceAttempts: questionAttemptsResult.error ? 0 : questionAttemptsResult.count || 0,
                dppAttempts: dppAttemptsResult.error ? 0 : dppAttemptsResult.count || 0,
                testsCompleted: testsCompletedResult.error ? 0 : testsCompletedResult.count || 0,
            });

            setRecentLeads((latestLeadsResult.data || []) as RecentLead[]);
            setHealthChecks(Array.from(latestHealthChecks.values()));
            setLastUpdatedAt(new Date().toISOString());
        } catch (fetchError) {
            console.error('Error fetching admin dashboard data:', fetchError);
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load dashboard data');
        } finally {
            initialLoadRef.current = false;
            setLoading(false);
            setRefreshing(false);
        }
    }, [supabase]);

    useEffect(() => {
        void fetchDashboardData();

        if (!supabase) {
            return undefined;
        }

        const scheduleRefresh = () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }

            refreshTimeoutRef.current = setTimeout(() => {
                void fetchDashboardData(true);
            }, 250);
        };

        const channel = supabase
            .channel('admin-dashboard-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_forms' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'career_applications' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_applications' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'lecture_progress' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'question_attempts' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dpp_attempts' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'test_attempts' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'system_health' }, scheduleRefresh)
            .subscribe();

        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
            void channel.unsubscribe();
        };
    }, [fetchDashboardData, supabase]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
                    <p className="font-medium text-slate-600">Loading control center...</p>
                </div>
            </div>
        );
    }

    const overallHealth = getOverallHealthStatus(healthChecks);

    return (
        <div className="space-y-6 text-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
                    <p className="text-sm text-slate-500">Live overview of students, payments, support funnels, and platform operations.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="hidden text-sm text-slate-500 sm:inline">
                        Last updated: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : 'Not synced yet'}
                    </span>
                    <button
                        type="button"
                        onClick={() => void fetchDashboardData()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdminStatCard icon={Users} label="Total Students" value={stats.totalStudents.toLocaleString()} change={`Today +${activity.newRegistrations}`} color="indigo" />
                <AdminStatCard icon={TrendingUp} label="Active Users" value={stats.activeUsers.toLocaleString()} change={`${activity.lectureViews} lecture views today`} color="green" />
                <AdminStatCard icon={HeartHandshake} label="Donation Volume" value={formatCurrency(stats.totalDonationsAmount)} change={`${stats.completedDonations} successful donations`} color="rose" />
                <AdminStatCard icon={CreditCard} label="Course Purchases" value={stats.coursePurchases.toLocaleString()} change={`${stats.premiumSubscriptions} premium activations`} color="cyan" />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Platform Modules</h2>
                            <p className="text-sm text-slate-500">Direct access to the systems admins manage daily.</p>
                        </div>
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {CONTROL_MODULES.map((module) => (
                            <Link
                                key={module.href}
                                href={module.href}
                                className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md"
                            >
                                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${module.accent} text-white`}>
                                    <module.icon className="h-5 w-5" />
                                </div>
                                <h3 className="mb-1 text-sm font-semibold text-slate-900">{module.label}</h3>
                                <p className="text-sm text-slate-500">{module.description}</p>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-lg">
                        <div className="mb-3 flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            <h2 className="text-base font-semibold">Revenue Snapshot</h2>
                        </div>
                        <p className="mb-1 text-4xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                        <p className="text-sm text-white/75">
                            Includes donations, course purchases, and premium subscriptions.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-4 text-base font-semibold text-slate-900">Platform Usage Today</h2>
                        <div className="space-y-1">
                            <ActivityItem icon={Users} label="New Registrations" value={activity.newRegistrations.toString()} color="indigo" />
                            <ActivityItem icon={PlayCircle} label="Lecture Progress Events" value={activity.lectureViews.toLocaleString()} color="sky" />
                            <ActivityItem icon={BookOpen} label="Practice Attempts" value={activity.practiceAttempts.toLocaleString()} color="emerald" />
                            <ActivityItem icon={FileText} label="DPP Attempts" value={activity.dppAttempts.toLocaleString()} color="orange" />
                            <ActivityItem icon={GraduationCap} label="Tests Completed" value={activity.testsCompleted.toLocaleString()} color="purple" />
                            <ActivityItem icon={Target} label="Challenge Participants" value={activity.challengeParticipants.toLocaleString()} color="amber" />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-3 text-base font-semibold text-slate-900">Support Funnel</h2>
                        <div className="space-y-3 text-sm text-slate-600">
                            <div className="flex items-center justify-between">
                                <span>Career applications</span>
                                <span className="font-semibold text-slate-900">{stats.careerApplications.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Completed donations</span>
                                <span className="font-semibold text-slate-900">{stats.completedDonations.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Course purchases</span>
                                <span className="font-semibold text-slate-900">{stats.coursePurchases.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Premium subscriptions</span>
                                <span className="font-semibold text-slate-900">{stats.premiumSubscriptions.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-slate-900">System Health</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(overallHealth)}`}>
                            {getStatusLabel(overallHealth)}
                        </span>
                    </div>

                    {healthChecks.length > 0 ? (
                        <div className="space-y-0">
                            {healthChecks.map((check) => (
                                <HealthStatusItem
                                    key={check.check_name}
                                    name={formatCheckName(check.check_name)}
                                    status={check.status}
                                    latency={check.response_time_ms}
                                    checkedAt={check.checked_at}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                            No system health records available yet.
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-slate-900">Recent Leads</h2>
                        <Link href="/admin/leads" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                            View all
                        </Link>
                    </div>

                    {recentLeads.length > 0 ? (
                        <div className="space-y-3">
                            {recentLeads.map((lead) => (
                                <div key={lead.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-slate-900">{lead.name}</p>
                                            <p className="text-sm text-slate-500">{lead.phone}</p>
                                        </div>
                                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getLeadStatusClasses(lead.status)}`}>
                                            {lead.status}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                        <span>{lead.exam_target || 'No exam selected'}</span>
                                        <span>{new Date(lead.created_at).toLocaleDateString('en-IN')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                            No recent leads found.
                        </div>
                    )}
                </div>
            </div>

            <PlatformHealthMonitor />
        </div>
    );
}

function AdminStatCard({
    icon: Icon,
    label,
    value,
    change,
    color,
}: {
    icon: ElementType;
    label: string;
    value: string;
    change: string;
    color: 'indigo' | 'green' | 'rose' | 'cyan';
}) {
    const gradientColors = {
        indigo: 'from-indigo-500 to-indigo-600',
        green: 'from-emerald-500 to-emerald-600',
        rose: 'from-rose-500 to-pink-500',
        cyan: 'from-cyan-500 to-sky-500',
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-3 flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradientColors[color]} text-white`}>
                    <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{change}</span>
            </div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
    );
}

function HealthStatusItem({
    name,
    status,
    latency,
    checkedAt,
}: {
    name: string;
    status: HealthStatus;
    latency: number | null;
    checkedAt: string;
}) {
    const statusDotColors = {
        healthy: 'bg-emerald-500',
        degraded: 'bg-amber-500',
        critical: 'bg-red-500',
    };

    return (
        <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
            <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${statusDotColors[status]}`} />
                <span className="font-medium text-slate-800">{name}</span>
            </div>
            <div className="flex items-center gap-5 text-sm">
                <span className="text-slate-500">
                    Latency: <span className="font-medium text-slate-700">{latency !== null ? `${Math.round(latency)}ms` : 'N/A'}</span>
                </span>
                <span className="text-slate-500">
                    Checked: <span className="font-medium text-slate-700">{new Date(checkedAt).toLocaleTimeString()}</span>
                </span>
            </div>
        </div>
    );
}

function ActivityItem({
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
        <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorClasses[color]}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-700">{label}</span>
            </div>
            <span className="font-bold text-slate-900">{value}</span>
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
