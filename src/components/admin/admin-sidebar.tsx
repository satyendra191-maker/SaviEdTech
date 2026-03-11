'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    FileText,
    PlayCircle,
    HelpCircle,
    Trophy,
    Image,
    Settings,
    LogOut,
    BookOpen,
    CreditCard,
    Briefcase,
    Database,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    ShieldCheck,
    Landmark,
    Sparkles,
    FileCode,
    Bot,
} from 'lucide-react';
import { AnimatedLogo } from '@/components/animated-logo';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from './sidebar-context';

const adminNavItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'AI Assistant', href: '/admin/ai-assistant', icon: Bot },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Students', href: '/admin/students', icon: Users },
    { name: 'Courses', href: '/admin/courses', icon: BookOpen },
    { name: 'Lectures', href: '/admin/lectures', icon: PlayCircle },
    { name: 'Questions', href: '/admin/questions', icon: HelpCircle },
    { name: 'Tests', href: '/admin/tests', icon: GraduationCap },
    { name: 'Online Exams', href: '/admin/online-exams', icon: ShieldCheck },
    { name: 'Careers', href: '/admin/careers', icon: Briefcase },
    { name: 'Leads', href: '/admin/leads', icon: FileText },
    { name: 'CMS', href: '/admin/cms', icon: FileCode },
    { name: 'AI Content', href: '/admin/ai-content', icon: Sparkles },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Finance', href: '/admin/finance', icon: Landmark },
    { name: 'Daily Challenge', href: '/admin/challenges', icon: Trophy },
    { name: 'Popup Ads', href: '/admin/ads', icon: Image },
    { name: 'Backups', href: '/admin/backups', icon: Database },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const financeNavItems = [
    { name: 'Finance', href: '/admin/finance', icon: Landmark },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const { signOut, role } = useAuth();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const navItems = role === 'finance_manager' ? financeNavItems : adminNavItems;

    return (
        <aside
            className={`fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white transition-all duration-300 ${
                isCollapsed ? 'w-20' : 'w-64'
            }`}
        >
            {/* Toggle Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-20 z-50 w-6 h-6 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center shadow-lg transition-colors"
            >
                {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-white" />
                ) : (
                    <ChevronLeft className="w-4 h-4 text-white" />
                )}
            </button>

            {/* Logo - Updated Brand */}
            <div className={`flex items-center gap-2 px-4 h-20 border-b border-slate-800 ${isCollapsed ? 'justify-center' : ''}`}>
                {!isCollapsed && (
                    <div className="flex flex-col">
                        <span className="font-black text-lg tracking-tight">
                            <span className="text-amber-500">Savi</span>
                            <span className="text-sky-400">EduTech</span>
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Admin Panel</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="p-2 lg:p-4 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                                isActive
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            } ${isCollapsed ? 'justify-center' : ''}`}
                            title={isCollapsed ? item.name : undefined}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            {!isCollapsed && <span>{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className={`absolute bottom-0 left-0 right-0 p-2 lg:p-4 border-t border-slate-800 bg-slate-900 ${isCollapsed ? 'flex justify-center' : ''}`}>
                <button
                    onClick={() => signOut()}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-xl transition-colors ${
                        isCollapsed ? 'justify-center w-full' : ''
                    }`}
                    title={isCollapsed ? 'Sign Out' : undefined}
                >
                    <LogOut className="w-5 h-5" />
                    {!isCollapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}
