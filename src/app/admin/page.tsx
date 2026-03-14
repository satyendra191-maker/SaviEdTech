'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Users, TrendingUp, HeartHandshake, CreditCard, 
    RefreshCw, Clock, Zap, Settings, FileText, BookOpen,
    PlayCircle, GraduationCap, ShieldCheck, Briefcase,
    BarChart3, Image, Database, Youtube
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';

interface QuickStats {
    totalStudents: number;
    activeUsers: number;
    totalRevenue: number;
    donations: number;
    courses: number;
}

interface Lead {
    id: string;
    name: string;
    phone: string;
    status: string;
    created_at: string;
}

export default function AdminDashboardPage() {
    const supabase = getSupabaseBrowserClient();
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<QuickStats>({ totalStudents: 0, activeUsers: 0, totalRevenue: 0, donations: 0, courses: 0 });
    const [leads, setLeads] = useState<Lead[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [studentsRes, activeRes, paymentsRes, leadsRes] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
                supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('payments').select('amount, status, payment_type'),
                supabase.from('lead_forms').select('id, name, phone, status, created_at').order('created_at', { ascending: false }).limit(5),
            ]);

            const payments = paymentsRes.data || [];
            const completed = payments.filter((p: any) => p.status === 'completed');
            const revenue = completed.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

            setStats({
                totalStudents: studentsRes.count || 0,
                activeUsers: activeRes.count || 0,
                totalRevenue: revenue,
                donations: completed.filter((p: any) => p.payment_type === 'donation').length,
                courses: completed.filter((p: any) => p.payment_type === 'course_purchase').length,
            });
            setLeads(leadsRes.data || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    // Fetch on mount only
    useEffect(() => { fetchData(); }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
                    <p className="text-sm text-slate-500">Quick overview of your platform</p>
                </div>
                <button 
                    onClick={fetchData} 
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white">
                    <p className="text-xs text-white/70">Total Students</p>
                    <p className="text-3xl font-bold">{stats.totalStudents.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
                    <p className="text-xs text-white/70">Active Users</p>
                    <p className="text-3xl font-bold">{stats.activeUsers.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl p-5 text-white">
                    <p className="text-xs text-white/70">Total Revenue</p>
                    <p className="text-3xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-500 to-sky-500 rounded-2xl p-5 text-white">
                    <p className="text-xs text-white/70">Course Sales</p>
                    <p className="text-3xl font-bold">{stats.courses}</p>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/admin/cron-jobs" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-500 transition-colors">
                    <Clock className="w-5 h-5 text-indigo-600 mb-2" />
                    <p className="font-semibold text-slate-900">Cron Jobs</p>
                    <p className="text-xs text-slate-500">Automated tasks</p>
                </Link>
                <Link href="/admin/youtube" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-500 transition-colors">
                    <Youtube className="w-5 h-5 text-red-500 mb-2" />
                    <p className="font-semibold text-slate-900">YouTube</p>
                    <p className="text-xs text-slate-500">Video content</p>
                </Link>
                <Link href="/admin/students" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-500 transition-colors">
                    <Users className="w-5 h-5 text-emerald-600 mb-2" />
                    <p className="font-semibold text-slate-900">Students</p>
                    <p className="text-xs text-slate-500">Manage students</p>
                </Link>
                <Link href="/admin/courses" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-500 transition-colors">
                    <BookOpen className="w-5 h-5 text-amber-600 mb-2" />
                    <p className="font-semibold text-slate-900">Courses</p>
                    <p className="text-xs text-slate-500">Manage courses</p>
                </Link>
            </div>

            {/* Recent Leads */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Leads</h2>
                {leads.length > 0 ? (
                    <div className="space-y-2">
                        {leads.map((lead) => (
                            <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <div>
                                    <p className="font-medium text-slate-900">{lead.name}</p>
                                    <p className="text-xs text-slate-500">{lead.phone}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                    lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                                    lead.status === 'contacted' ? 'bg-amber-100 text-amber-700' :
                                    lead.status === 'converted' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-slate-100 text-slate-700'
                                }`}>
                                    {lead.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-400 text-sm">No leads yet. Click refresh to load.</p>
                )}
            </div>

            {/* More Links */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Link href="/admin/analytics" className="bg-slate-50 p-3 rounded-xl text-center hover:bg-slate-100">
                    <BarChart3 className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                    <span className="text-xs text-slate-600">Analytics</span>
                </Link>
                <Link href="/admin/tests" className="bg-slate-50 p-3 rounded-xl text-center hover:bg-slate-100">
                    <GraduationCap className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                    <span className="text-xs text-slate-600">Tests</span>
                </Link>
                <Link href="/admin/lectures" className="bg-slate-50 p-3 rounded-xl text-center hover:bg-slate-100">
                    <PlayCircle className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                    <span className="text-xs text-slate-600">Lectures</span>
                </Link>
                <Link href="/admin/payments" className="bg-slate-50 p-3 rounded-xl text-center hover:bg-slate-100">
                    <CreditCard className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                    <span className="text-xs text-slate-600">Payments</span>
                </Link>
                <Link href="/admin/leads" className="bg-slate-50 p-3 rounded-xl text-center hover:bg-slate-100">
                    <FileText className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                    <span className="text-xs text-slate-600">Leads</span>
                </Link>
                <Link href="/admin/settings" className="bg-slate-50 p-3 rounded-xl text-center hover:bg-slate-100">
                    <Settings className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                    <span className="text-xs text-slate-600">Settings</span>
                </Link>
            </div>
        </div>
    );
}
