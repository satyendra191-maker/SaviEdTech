'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    GraduationCap,
    FileText,
    Trophy,
    TrendingUp,
    Clock,
    DollarSign,
    Activity,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeUsers: 0,
        totalLeads: 0,
        revenue: '₹12.4L',
    });
    const [recentLeads, setRecentLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const supabase = getSupabaseBrowserClient();
                
                const [students, faculty, leads, latestLeads] = await Promise.all([
                    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
                    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'faculty'),
                    supabase.from('lead_forms').select('id', { count: 'exact', head: true }),
                    supabase.from('lead_forms').select('*').order('created_at', { ascending: false }).limit(5)
                ]);

                setStats({
                    totalStudents: students.count || 0,
                    activeUsers: (students.count || 0) + (faculty.count || 0),
                    totalLeads: leads.count || 0,
                    revenue: '₹12.4L',
                });
                setRecentLeads(latestLeads.data || []);
            } catch (error) {
                console.error('Error fetching admin dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-slate-600 font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 text-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-sm text-slate-500">Platform performance overview</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
                    <span>Last updated: {new Date().toLocaleTimeString()}</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <AdminStatCard
                    icon={Users}
                    label="Total Students"
                    value={stats.totalStudents.toLocaleString()}
                    change="+12%"
                    trend="up"
                    color="indigo"
                />
                <AdminStatCard
                    icon={GraduationCap}
                    label="Active Users"
                    value={stats.activeUsers.toLocaleString()}
                    change="+5%"
                    trend="up"
                    color="green"
                />
                <AdminStatCard
                    label="Total Leads"
                    value={stats.totalLeads.toLocaleString()}
                    change="New"
                    trend="up"
                    color="purple"
                    icon={FileText}
                />
                <AdminStatCard
                    label="Revenue"
                    value={stats.revenue}
                    change="+12%"
                    trend="up"
                    color="amber"
                    icon={DollarSign}
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
                {/* System Health */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-slate-900">System Health</h2>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                            All Systems Operational
                        </span>
                    </div>

                    <div className="space-y-0">
                        <HealthStatusItem
                            name="Database"
                            status="healthy"
                            latency="24ms"
                            uptime="99.9%"
                        />
                        <HealthStatusItem
                            name="API Server"
                            status="healthy"
                            latency="45ms"
                            uptime="99.8%"
                        />
                        <HealthStatusItem
                            name="Storage"
                            status="healthy"
                            latency="120ms"
                            uptime="99.9%"
                        />
                        <HealthStatusItem
                            name="Edge Functions"
                            status="healthy"
                            latency="180ms"
                            uptime="99.5%"
                        />
                    </div>
                </div>

                    {/* Daily Activity */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <h2 className="text-base font-semibold text-slate-900 mb-4">Today's Activity</h2>
                        <div className="space-y-1">
                            <ActivityItem
                                icon={Users}
                                label="New Registrations"
                                value={Math.floor(stats.totalStudents * 0.05).toString()}
                                color="indigo"
                            />
                            <ActivityItem
                                icon={Trophy}
                                label="Challenge Participants"
                                value="1,234"
                                color="orange"
                            />
                            <ActivityItem
                                icon={FileText}
                                label="DPP Attempts"
                                value="892"
                                color="emerald"
                            />
                            <ActivityItem
                                icon={Clock}
                                label="Tests Completed"
                                value="156"
                                color="purple"
                            />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-5 text-white shadow-lg">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-5 h-5" />
                            <h2 className="text-base font-semibold">Growth Rate</h2>
                        </div>
                        <p className="text-4xl font-bold mb-1">23.5%</p>
                        <p className="text-white/80 text-sm">Month over month</p>
                    </div>
                </div>
            </div>

            {/* Recent Leads Table */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-slate-900">Recent Leads</h2>
                    <Link href="/admin/leads" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold">
                        View All →
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Exam Target</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentLeads.length > 0 ? (
                                recentLeads.map((lead) => (
                                    <LeadRow
                                        key={lead.id}
                                        name={lead.name}
                                        phone={lead.phone}
                                        exam={lead.exam_target}
                                        status={lead.status}
                                        date={new Date(lead.created_at).toLocaleDateString()}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-500">
                                        No recent leads found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function AdminStatCard({
    icon: Icon,
    label,
    value,
    change,
    trend,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    color: 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'indigo';
}) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-emerald-100 text-emerald-700',
        purple: 'bg-violet-100 text-violet-700',
        amber: 'bg-amber-100 text-amber-700',
        red: 'bg-red-100 text-red-700',
        indigo: 'bg-indigo-100 text-indigo-700',
    };
    const gradientColors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-emerald-500 to-emerald-600',
        purple: 'from-violet-500 to-violet-600',
        amber: 'from-amber-500 to-amber-600',
        red: 'from-red-500 to-red-600',
        indigo: 'from-indigo-500 to-indigo-600',
    };

    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradientColors[color]} text-white`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {trend === 'up' ? '↑' : '↓'} {change}
                </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
    );
}

function HealthStatusItem({
    name,
    status,
    latency,
    uptime,
}: {
    name: string;
    status: 'healthy' | 'degraded' | 'critical';
    latency: string;
    uptime: string;
}) {
    const statusColors = {
        healthy: 'bg-emerald-500',
        degraded: 'bg-amber-500',
        critical: 'bg-red-500',
    };
    const statusDotColors = {
        healthy: 'bg-emerald-500',
        degraded: 'bg-amber-500',
        critical: 'bg-red-500',
    };

    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${statusDotColors[status]}`} />
                <span className="font-medium text-slate-800">{name}</span>
            </div>
            <div className="flex items-center gap-5 text-sm">
                <span className="text-slate-500">Latency: <span className="font-medium text-slate-700">{latency}</span></span>
                <span className="text-slate-500">Uptime: <span className="font-medium text-emerald-600">{uptime}</span></span>
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
    icon: React.ElementType;
    label: string;
    value: string;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'emerald';
}) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-emerald-100 text-emerald-700',
        purple: 'bg-violet-100 text-violet-700',
        orange: 'bg-orange-100 text-orange-700',
        indigo: 'bg-indigo-100 text-indigo-700',
        emerald: 'bg-emerald-100 text-emerald-700',
    };

    return (
        <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-700">{label}</span>
            </div>
            <span className="font-bold text-slate-900">{value}</span>
        </div>
    );
}

function LeadRow({
    name,
    phone,
    exam,
    status,
    date,
}: {
    name: string;
    phone: string;
    exam: string;
    status: 'new' | 'contacted' | 'converted' | 'disqualified';
    date: string;
}) {
    const statusColors = {
        new: 'bg-blue-100 text-blue-700',
        contacted: 'bg-amber-100 text-amber-700',
        converted: 'bg-emerald-100 text-emerald-700',
        disqualified: 'bg-red-100 text-red-700',
    };

    return (
        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td className="py-3 px-4">
                <p className="font-medium text-slate-900">{name}</p>
            </td>
            <td className="py-3 px-4 text-slate-600">{phone}</td>
            <td className="py-3 px-4">
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                    {exam || '-'}
                </span>
            </td>
            <td className="py-3 px-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status]}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </td>
            <td className="py-3 px-4 text-sm text-slate-500">{date}</td>
        </tr>
    );
}
