/**
 * Admin Control Center - Unified Dashboard
 * 
 * Mobile-first, ultra-fast admin interface
 * Loads all modules lazily for maximum performance
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
    LayoutDashboard, 
    Bot, 
    Brain, 
    Users, 
    BookOpen, 
    PlayCircle,
    HelpCircle,
    GraduationCap,
    CreditCard,
    Landmark,
    FileText,
    Sparkles,
    Shield,
    Clock,
    BarChart3,
    Settings,
    Database,
    Youtube,
    Image,
    Trophy,
    Briefcase,
    Server,
    Lock,
    Bell,
    Link2,
    RefreshCw,
    ChevronRight,
    Activity,
    Zap,
    AlertTriangle
} from 'lucide-react';

interface Stats {
    totalStudents: number;
    totalCourses: number;
    totalRevenue: number;
    totalLeads: number;
    totalTests: number;
}

function ControlCenterContent() {
    const searchParams = useSearchParams();
    const [stats, setStats] = useState<Stats>({ totalStudents: 0, totalCourses: 0, totalRevenue: 0, totalLeads: 0, totalTests: 0 });
    const [loading, setLoading] = useState(true);
    const [systemStatus, setSystemStatus] = useState({ healthy: true, latency: 0 });

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/admin/control-center?module=dashboard');
                const data = await res.json();
                if (data.stats) {
                    setStats(data.stats);
                }
            } catch (e) {
                console.error('Failed to fetch stats:', e);
            }
            setLoading(false);
        }
        fetchData();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof LayoutDashboard; color: string }) => (
        <div className={`p-4 rounded-xl ${color} border border-slate-100`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color.replace('bg-', 'bg-opacity-20 ')}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );

    const MenuSection = ({ title, items }: { title: string; items: Array<{ name: string; href: string; icon: typeof LayoutDashboard; color?: string }> }) => (
        <div className="bg-white rounded-xl border border-slate-100 p-4">
            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">{title}</h3>
            <div className="grid grid-cols-4 gap-2">
                {items.map((item) => (
                    <Link 
                        key={item.name} 
                        href={item.href}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color || 'bg-slate-100'}`}>
                            <item.icon className="w-5 h-5 text-slate-700" />
                        </div>
                        <span className="text-[10px] text-center text-slate-600 font-medium">{item.name}</span>
                    </Link>
                ))}
            </div>
        </div>
    );

    const MenuGrid = ({ items }: { items: Array<{ name: string; href: string; icon: typeof LayoutDashboard; color?: string; count?: number }> }) => (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {items.map((item) => (
                <Link 
                    key={item.name} 
                    href={item.href}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all"
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color || 'bg-indigo-50'}`}>
                        <item.icon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <span className="text-xs text-center text-slate-700 font-medium">{item.name}</span>
                    {item.count !== undefined && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{item.count}</span>
                    )}
                </Link>
            ))}
        </div>
    );

    return (
        <div className="space-y-6 pb-8">
            {/* Header Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard 
                    label="Total Students" 
                    value={loading ? '...' : stats.totalStudents.toLocaleString()} 
                    icon={Users} 
                    color="bg-blue-50"
                />
                <StatCard 
                    label="Total Revenue" 
                    value={loading ? '...' : formatCurrency(stats.totalRevenue)} 
                    icon={Landmark} 
                    color="bg-green-50"
                />
                <StatCard 
                    label="Total Courses" 
                    value={loading ? '...' : stats.totalCourses} 
                    icon={BookOpen} 
                    color="bg-purple-50"
                />
                <StatCard 
                    label="Active Leads" 
                    value={loading ? '...' : stats.totalLeads.toLocaleString()} 
                    icon={FileText} 
                    color="bg-orange-50"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link href="/admin/cron-jobs" className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600 transition-all">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-semibold">Run Cron Jobs</span>
                </Link>
                <Link href="/admin/ai-content" className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-700 hover:to-purple-600 transition-all">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-sm font-semibold">AI Content</span>
                </Link>
                <Link href="/admin/analytics" className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 transition-all">
                    <BarChart3 className="w-5 h-5" />
                    <span className="text-sm font-semibold">Analytics</span>
                </Link>
                <Link href="/admin/backups" className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 transition-all">
                    <Database className="w-5 h-5" />
                    <span className="text-sm font-semibold">Backups</span>
                </Link>
            </div>

            {/* Main Menu Grid */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Control Center</h2>
                <MenuGrid items={[
                    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, color: 'bg-indigo-50' },
                    { name: 'Students', href: '/admin/students', icon: Users, color: 'bg-blue-50' },
                    { name: 'Courses', href: '/admin/courses', icon: BookOpen, color: 'bg-purple-50' },
                    { name: 'Lectures', href: '/admin/lectures', icon: PlayCircle, color: 'bg-red-50' },
                    { name: 'Questions', href: '/admin/questions', icon: HelpCircle, color: 'bg-yellow-50' },
                    { name: 'Tests', href: '/admin/tests', icon: GraduationCap, color: 'bg-green-50' },
                    { name: 'Online Exams', href: '/admin/online-exams', icon: Shield, color: 'bg-slate-50' },
                    { name: 'AI Tutor', href: '/admin/ai-assistant', icon: Bot, color: 'bg-violet-50' },
                    { name: 'SuperBrain', href: '/admin/superbrain', icon: Brain, color: 'bg-fuchsia-50' },
                    { name: 'AI Content', href: '/admin/ai-content', icon: Sparkles, color: 'bg-purple-50' },
                ]} />
            </div>

            {/* Finance & Marketing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <MenuSection 
                    title="Finance & Revenue" 
                    items={[
                        { name: 'Payments', href: '/admin/payments', icon: CreditCard },
                        { name: 'Finance', href: '/admin/finance', icon: Landmark },
                    ]} 
                />
                <MenuSection 
                    title="Growth & Marketing" 
                    items={[
                        { name: 'Leads', href: '/admin/leads', icon: FileText },
                        { name: 'Challenges', href: '/admin/challenges', icon: Trophy },
                        { name: 'Ads', href: '/admin/ads', icon: Image },
                        { name: 'Careers', href: '/admin/careers', icon: Briefcase },
                    ]} 
                />
            </div>

            {/* System & Settings */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900">System & Operations</h2>
                <MenuGrid items={[
                    { name: 'Cron Jobs', href: '/admin/cron-jobs', icon: Clock, color: 'bg-amber-50' },
                    { name: 'YouTube', href: '/admin/youtube', icon: Youtube, color: 'bg-red-50' },
                    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, color: 'bg-cyan-50' },
                    { name: 'CMS', href: '/admin/cms', icon: FileText, color: 'bg-teal-50' },
                    { name: 'Settings', href: '/admin/settings', icon: Settings, color: 'bg-slate-50' },
                    { name: 'Backups', href: '/admin/backups', icon: Database, color: 'bg-emerald-50' },
                ]} />
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${systemStatus.healthy ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                        <span className="font-semibold text-slate-900">System Status</span>
                    </div>
                    <span className="text-sm text-slate-500">{systemStatus.healthy ? 'All Systems Operational' : 'Issues Detected'}</span>
                </div>
            </div>
        </div>
    );
}

export default function AdminControlCenter() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
            <ControlCenterContent />
        </Suspense>
    );
}
