'use client';

import { useEffect, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import {
    Activity,
    Award,
    BookOpen,
    Calendar,
    DollarSign,
    Loader2,
    RefreshCw,
    Target,
    TrendingUp,
    Users,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { getSupabaseBrowserClient } from '@/lib/supabase';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface PlatformStats {
    totalStudents: number;
    activeStudents: number;
    totalTestsTaken: number;
    averageAccuracy: number;
    totalRevenue: number;
    questionsAttempted: number;
}

interface SubjectPerformance {
    subject: string;
    avgAccuracy: number;
    totalAttempts: number;
    color: string;
}

interface DailyTrend {
    date: string;
    tests: number;
    questions: number;
    revenue: number;
}

interface TopPerformer {
    id: string;
    name: string;
    accuracy: number;
    testsTaken: number;
    rank: number;
}

export default function AdminAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
    const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
    const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    useEffect(() => {
        void fetchAnalyticsData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeRange]);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        setError(null);

        try {
            const supabase = getSupabaseBrowserClient();
            if (!supabase) {
                throw new Error('Analytics service is unavailable right now.');
            }

            const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysCount);
            const startDateIso = startDate.toISOString();

            const [
                totalStudentsResult,
                studentProgressResult,
                questionAttemptsResult,
                dppAttemptsResult,
                testAttemptsResult,
                paymentsResult,
                topPerformersResult,
            ] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', 'student'),
                supabase
                    .from('student_progress')
                    .select(`
                        user_id,
                        accuracy_percent,
                        total_questions_attempted,
                        tests_taken,
                        subjects:subject_id (name)
                    `),
                supabase
                    .from('question_attempts')
                    .select('user_id, occurred_at')
                    .gte('occurred_at', startDateIso),
                supabase
                    .from('dpp_attempts')
                    .select('user_id, submitted_at')
                    .eq('status', 'completed')
                    .gte('submitted_at', startDateIso),
                supabase
                    .from('test_attempts')
                    .select(`
                        user_id,
                        started_at,
                        submitted_at,
                        tests:test_id (
                            question_count
                        )
                    `)
                    .in('status', ['completed', 'time_up'])
                    .gte('submitted_at', startDateIso),
                supabase
                    .from('payments')
                    .select('amount, status, created_at, payment_type')
                    .gte('created_at', startDateIso),
                supabase
                    .from('student_progress')
                    .select(`
                        user_id,
                        accuracy_percent,
                        tests_taken,
                        profiles:user_id (
                            full_name
                        )
                    `)
                    .order('accuracy_percent', { ascending: false })
                    .limit(10),
            ]);

            const queryError = [
                totalStudentsResult.error,
                studentProgressResult.error,
                questionAttemptsResult.error,
                dppAttemptsResult.error,
                testAttemptsResult.error,
                paymentsResult.error,
                topPerformersResult.error,
            ].find(Boolean);

            if (queryError) {
                throw queryError;
            }

            const subjectMap = new Map<string, { totalAccuracy: number; count: number; attempts: number }>();
            for (const row of studentProgressResult.data || []) {
                const subjectName = (row as { subjects?: { name?: string | null } | null }).subjects?.name || 'General';
                const existing = subjectMap.get(subjectName) || { totalAccuracy: 0, count: 0, attempts: 0 };
                existing.totalAccuracy += (row as { accuracy_percent?: number | null }).accuracy_percent || 0;
                existing.count += 1;
                existing.attempts += (row as { total_questions_attempted?: number | null }).total_questions_attempted || 0;
                subjectMap.set(subjectName, existing);
            }

            const subjectPerformanceData: SubjectPerformance[] = Array.from(subjectMap.entries()).map(([subject, value], index) => ({
                subject,
                avgAccuracy: value.count > 0 ? Number((value.totalAccuracy / value.count).toFixed(1)) : 0,
                totalAttempts: value.attempts,
                color: COLORS[index % COLORS.length],
            }));

            const uniqueActiveUsers = new Set<string>();
            for (const row of questionAttemptsResult.data || []) {
                if ((row as { user_id?: string | null }).user_id) {
                    uniqueActiveUsers.add((row as { user_id: string }).user_id);
                }
            }
            for (const row of dppAttemptsResult.data || []) {
                if ((row as { user_id?: string | null }).user_id) {
                    uniqueActiveUsers.add((row as { user_id: string }).user_id);
                }
            }
            for (const row of testAttemptsResult.data || []) {
                if ((row as { user_id?: string | null }).user_id) {
                    uniqueActiveUsers.add((row as { user_id: string }).user_id);
                }
            }

            const trendMap = new Map<string, DailyTrend>();
            for (let i = daysCount - 1; i >= 0; i -= 1) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const key = date.toISOString().split('T')[0];
                trendMap.set(key, {
                    date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                    tests: 0,
                    questions: 0,
                    revenue: 0,
                });
            }

            for (const row of questionAttemptsResult.data || []) {
                const occurredAt = (row as { occurred_at?: string | null }).occurred_at;
                if (!occurredAt) continue;
                const key = new Date(occurredAt).toISOString().split('T')[0];
                const trend = trendMap.get(key);
                if (trend) {
                    trend.questions += 1;
                }
            }

            for (const row of dppAttemptsResult.data || []) {
                const submittedAt = (row as { submitted_at?: string | null }).submitted_at;
                if (!submittedAt) continue;
                const key = new Date(submittedAt).toISOString().split('T')[0];
                const trend = trendMap.get(key);
                if (trend) {
                    trend.tests += 1;
                }
            }

            for (const row of testAttemptsResult.data || []) {
                const submittedAt = (row as { submitted_at?: string | null }).submitted_at;
                if (!submittedAt) continue;
                const key = new Date(submittedAt).toISOString().split('T')[0];
                const trend = trendMap.get(key);
                if (trend) {
                    trend.tests += 1;
                    trend.questions += ((row as { tests?: { question_count?: number | null } | null }).tests?.question_count || 0);
                }
            }

            const completedPayments = (paymentsResult.data || []).filter((payment) => (payment as { status: string }).status === 'completed');
            for (const row of completedPayments) {
                const createdAt = (row as { created_at?: string | null }).created_at;
                if (!createdAt) continue;
                const key = new Date(createdAt).toISOString().split('T')[0];
                const trend = trendMap.get(key);
                if (trend) {
                    trend.revenue += (row as { amount?: number | null }).amount || 0;
                }
            }

            const performers = (topPerformersResult.data || []).map((row, index) => ({
                id: (row as { user_id: string }).user_id,
                name: ((row as { profiles?: { full_name?: string | null }[] | { full_name?: string | null } | null }).profiles as { full_name?: string | null } | null)?.full_name
                    || `Student ${index + 1}`,
                accuracy: (row as { accuracy_percent?: number | null }).accuracy_percent || 0,
                testsTaken: (row as { tests_taken?: number | null }).tests_taken || 0,
                rank: index + 1,
            }));

            setStats({
                totalStudents: totalStudentsResult.count || 0,
                activeStudents: uniqueActiveUsers.size,
                totalTestsTaken: testAttemptsResult.data?.length || 0,
                averageAccuracy: subjectPerformanceData.length > 0
                    ? Number((subjectPerformanceData.reduce((sum, item) => sum + item.avgAccuracy, 0) / subjectPerformanceData.length).toFixed(1))
                    : 0,
                totalRevenue: completedPayments.reduce((sum, payment) => sum + ((payment as { amount?: number | null }).amount || 0), 0),
                questionsAttempted: questionAttemptsResult.data?.length || 0,
            });
            setSubjectPerformance(subjectPerformanceData);
            setDailyTrends(Array.from(trendMap.values()));
            setTopPerformers(performers);
        } catch (fetchError) {
            console.error('Error fetching analytics data:', fetchError);
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Platform Analytics</h1>
                    <p className="text-slate-500">Student activity, learning outcomes, and Razorpay revenue.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <select
                            value={timeRange}
                            onChange={(event) => setTimeRange(event.target.value as '7d' | '30d' | '90d')}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="90d">Last 90 Days</option>
                        </select>
                    </div>
                    <a
                        href="/api/admin/reports/export?type=analytics"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        Export PDF
                    </a>
                    <button
                        onClick={() => void fetchAnalyticsData()}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Students" value={stats?.totalStudents.toLocaleString() || '0'} />
                <StatCard icon={Activity} label="Active Students" value={stats?.activeStudents.toLocaleString() || '0'} />
                <StatCard icon={Target} label="Avg Accuracy" value={`${stats?.averageAccuracy.toFixed(1) || '0'}%`} />
                <StatCard icon={DollarSign} label="Revenue" value={`Rs ${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <ChartCard title="Practice and Test Activity">
                    <ResponsiveContainer width="100%" height={288}>
                        <AreaChart data={dailyTrends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                            <Area type="monotone" dataKey="questions" stroke="#10b981" fill="#10b981" fillOpacity={0.18} name="Questions" />
                            <Area type="monotone" dataKey="tests" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} name="Assessments" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Subject Performance">
                    <ResponsiveContainer width="100%" height={288}>
                        <BarChart data={subjectPerformance} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                            <YAxis type="category" dataKey="subject" width={96} tick={{ fontSize: 11 }} />
                            <Tooltip
                                formatter={(value: number) => [`${value}%`, 'Accuracy']}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            />
                            <Bar dataKey="avgAccuracy" radius={[0, 4, 4, 0]}>
                                {subjectPerformance.map((entry, index) => (
                                    <Cell key={entry.subject} fill={entry.color || COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <ChartCard title="Revenue Trend">
                    <ResponsiveContainer width="100%" height={288}>
                        <LineChart data={dailyTrends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={(value) => `Rs ${value}`} tick={{ fontSize: 11 }} />
                            <Tooltip
                                formatter={(value: number) => [`Rs ${value.toLocaleString('en-IN')}`, 'Revenue']}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            />
                            <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <h3 className="font-semibold text-slate-900 mb-6">Top Performers</h3>
                    <div className="space-y-4">
                        {topPerformers.length > 0 ? topPerformers.slice(0, 5).map((performer) => (
                            <div key={performer.id} className="flex items-center gap-4 rounded-xl bg-slate-50 p-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700">
                                    {performer.rank}
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-slate-900">{performer.name}</div>
                                    <div className="text-sm text-slate-500">{performer.testsTaken} tests recorded</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-slate-900">{performer.accuracy.toFixed(1)}%</div>
                                    <div className="text-sm text-slate-500">Accuracy</div>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                                No leaderboard data yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={BookOpen} label="Questions Attempted" value={stats?.questionsAttempted.toLocaleString() || '0'} />
                <StatCard icon={Award} label="Mock Tests" value={stats?.totalTestsTaken.toLocaleString() || '0'} />
                <StatCard icon={TrendingUp} label="Active Subjects" value={subjectPerformance.length.toString()} />
                <StatCard icon={Calendar} label="Window" value={timeRange.toUpperCase()} />
            </div>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-900 mb-6">{title}</h3>
            {children}
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
}: {
    icon: ElementType;
    label: string;
    value: string;
}) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm text-slate-500">{label}</div>
        </div>
    );
}
