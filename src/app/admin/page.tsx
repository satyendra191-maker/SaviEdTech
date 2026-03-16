'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Users, TrendingUp, HeartHandshake, CreditCard, 
    RefreshCw, Clock, Zap, Settings, FileText, BookOpen,
    PlayCircle, GraduationCap, ShieldCheck, Briefcase,
    BarChart3, Image, Database, Youtube, ChevronRight, 
    Sparkles, LayoutDashboard, Cpu
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

    useEffect(() => { fetchData(); }, []);

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Oversight</h1>
                    <p className="text-sm text-slate-500 font-medium">Real-time platform metrics and departmental control.</p>
                </div>
                <button 
                    onClick={fetchData} 
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 active:scale-95"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-bold">Sync Data</span>
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatMetric label="Total Students" value={stats.totalStudents.toLocaleString()} sub="Registered" color="indigo" />
                <StatMetric label="Active Sessions" value={stats.activeUsers.toLocaleString()} sub="Online Now" color="emerald" />
                <StatMetric label="Platform Revenue" value={`₹${(stats.totalRevenue/1000).toFixed(1)}K`} sub="Monthly" color="rose" />
                <StatMetric label="Course Velocity" value={String(stats.courses)} sub="Purchases" color="amber" />
            </div>

            {/* Departmental Command Center */}
            <section>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-indigo-600" />
                        Departmental Portals
                    </h2>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-full tracking-widest">Role Based Access</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <PortalLink href="/admin/finance" label="Finance" role="Finance Manager" icon={CreditCard} color="emerald" />
                    <PortalLink href="/admin/hr" label="HR Portal" role="HR Manager" icon={Briefcase} color="rose" />
                    <PortalLink href="/admin/content" label="Content Hub" role="Content Manager" icon={Sparkles} color="amber" />
                    <PortalLink href="/admin/faculty" label="Faculty Portal" role="Academic Head" icon={GraduationCap} color="violet" />
                    <PortalLink href="/admin/analytics" label="Insights" role="Data Analyst" icon={BarChart3} color="blue" />
                    <PortalLink href="/admin/cron-jobs" label="Automation" role="System Admin" icon={Cpu} color="indigo" />
                </div>
            </section>

            {/* User Audit Section */}
            <section className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <Users className="w-6 h-6 text-slate-400" />
                        User Experience Audit
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <AuditCard 
                            href="/dashboard" 
                            title="Student View" 
                            desc="Audit the learning environment and course journey" 
                            icon={BookOpen} 
                            color="indigo" 
                        />
                        <AuditCard 
                            href="/dashboard/parent" 
                            title="Parent View" 
                            desc="Review student progress reports and sibling monitoring" 
                            icon={HeartHandshake} 
                            color="emerald" 
                        />
                    </div>

                    {/* Recent Leads */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-900">New Enrollment Inquiries</h2>
                            <Link href="/admin/leads" className="text-xs font-bold text-indigo-600 hover:underline">View All Leads</Link>
                        </div>
                        {leads.length > 0 ? (
                            <div className="space-y-3">
                                {leads.map((lead) => (
                                    <div key={lead.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm font-bold text-sm">
                                                {lead.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{lead.name}</p>
                                                <p className="text-xs text-slate-500 font-medium">{lead.phone}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-xl ${
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
                            <div className="py-10 text-center">
                                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 text-sm font-medium">No pending leads currently.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-900">System Tools</h2>
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full" />
                        <h3 className="font-bold mb-4 relative z-10 flex items-center gap-2">
                            <Settings className="w-5 h-5 animate-spin-slow" />
                            Core Settings
                        </h3>
                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <QuickTool icon={ShieldCheck} label="Security" />
                            <QuickTool icon={Users} label="Auth" />
                            <QuickTool icon={Database} label="Backups" />
                            <QuickTool icon={Zap} label="Performance" />
                        </div>
                        <button className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold transition-all border border-white/10">
                            Global Platform Settings
                        </button>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white shadow-lg">
                        <h3 className="font-bold mb-2">Internal Announcements</h3>
                        <p className="text-xs text-indigo-100 leading-relaxed mb-6">Staff meeting scheduled for tomorrow at 10 AM to discuss the upcoming NEET 2026 course launch.</p>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60">
                            <Clock className="w-3 h-3" /> Updated 2h ago
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function StatMetric({ label, value, sub, color }: { label: string, value: string, sub: string, color: string }) {
    const colors = {
        indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-100',
        emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-100',
        rose: 'from-rose-500 to-pink-500 shadow-rose-100',
        amber: 'from-amber-500 to-orange-500 shadow-amber-100',
        blue: 'from-blue-500 to-cyan-500 shadow-blue-100',
    } as any;

    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-[2rem] p-6 text-white shadow-xl transition-transform hover:scale-[1.02] cursor-default`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
            <div className="flex items-end justify-between mt-2">
                <p className="text-3xl font-black">{value}</p>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-lg mb-1">{sub}</span>
            </div>
        </div>
    );
}

function PortalLink({ href, label, role, icon: Icon, color }: any) {
    const colors = {
        indigo: 'text-indigo-600 bg-indigo-50/50 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50',
        emerald: 'text-emerald-600 bg-emerald-50/50 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50',
        rose: 'text-rose-600 bg-rose-50/50 border-rose-100 hover:border-rose-500 hover:bg-rose-50',
        amber: 'text-amber-600 bg-amber-50/50 border-amber-100 hover:border-amber-500 hover:bg-amber-50',
        blue: 'text-blue-600 bg-blue-50/50 border-blue-100 hover:border-blue-500 hover:bg-blue-50',
        violet: 'text-violet-600 bg-violet-50/50 border-violet-100 hover:border-violet-500 hover:bg-violet-50',
    } as any;

    return (
        <Link href={href} className={`flex flex-col items-center justify-center p-5 rounded-[2rem] border transition-all ${colors[color]} group`}>
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-900 text-xs">{label}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">{role}</p>
        </Link>
    );
}

function AuditCard({ href, title, desc, icon: Icon, color }: any) {
    const colors = {
        indigo: 'hover:border-indigo-500 bg-indigo-50/20',
        emerald: 'hover:border-emerald-500 bg-emerald-50/20',
    } as any;

    const iconColors = {
        indigo: 'bg-indigo-100 text-indigo-600',
        emerald: 'bg-emerald-100 text-emerald-600',
    } as any;

    return (
        <Link href={href} className={`relative overflow-hidden group bg-white border border-slate-200 rounded-[2rem] p-6 transition-all shadow-sm ${colors[color]}`}>
            <div className="relative flex items-center gap-4">
                <div className={`w-14 h-14 ${iconColors[color]} rounded-2xl flex items-center justify-center transition-colors shadow-inner`}>
                    <Icon className="w-7 h-7" />
                </div>
                <div>
                    <h3 className="font-black text-slate-900 text-lg leading-tight">{title}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">{desc}</p>
                </div>
                <ChevronRight className="ml-auto w-6 h-6 text-slate-300 group-hover:text-indigo-600 transition-all" />
            </div>
        </Link>
    );
}

function QuickTool({ icon: Icon, label }: any) {
    return (
        <div className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl hover:bg-white/10 cursor-pointer transition-all border border-white/5">
            <Icon className="w-5 h-5 text-white/70" />
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{label}</span>
        </div>
    );
}
