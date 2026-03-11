'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BookOpen,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Flame,
    GraduationCap,
    HelpCircle,
    LayoutDashboard,
    LogOut,
    PlayCircle,
    RotateCcw,
    Settings,
    Shield,
    Trophy,
    Users,
    X,
    Clock,
    BarChart3,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { StreakDisplay } from '@/components/gamification';
import { AnimatedLogo } from '@/components/animated-logo';
import { useDashboardSidebar } from '@/components/dashboard/sidebar-context';

const studentNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Lectures', href: '/dashboard/lectures', icon: PlayCircle },
    { name: 'Practice', href: '/dashboard/practice', icon: BookOpen },
    { name: 'Mock Tests', href: '/dashboard/tests', icon: ClipboardList },
    { name: 'Online Exams', href: '/dashboard/online-exams', icon: Shield },
    { name: 'Daily Challenge', href: '/dashboard/challenge', icon: Trophy },
    { name: 'DPP', href: '/dashboard/dpp', icon: Calendar },
    { name: 'Study Planner', href: '/dashboard/planner', icon: Clock },
    { name: 'Ask Faculty', href: '/dashboard/doubts', icon: HelpCircle },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Revision', href: '/dashboard/revision', icon: RotateCcw },
    { name: 'Parent Portal', href: '/dashboard/parent', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const facultyNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Lectures', href: '/dashboard/lectures', icon: PlayCircle },
    { name: 'Doubt Sessions', href: '/dashboard/doubts', icon: HelpCircle },
    { name: 'Tests Management', href: '/dashboard/tests', icon: ClipboardList },
    { name: 'Question Bank', href: '/dashboard/practice', icon: BookOpen },
    { name: 'Online Exams', href: '/dashboard/online-exams', icon: Shield },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const adminNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Student Mgmt', href: '/admin/students', icon: Users },
    { name: 'Faculty Mgmt', href: '/admin/faculty', icon: GraduationCap },
    { name: 'Course Mgmt', href: '/admin/courses', icon: BookOpen },
    { name: 'System Health', href: '/super-admin', icon: Shield },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const parentNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Child Progress', href: '/dashboard/parent', icon: Users },
    { name: 'Attendance', href: '/dashboard/parent/attendance', icon: Calendar },
    { name: 'Reports', href: '/dashboard/parent/reports', icon: BarChart3 },
    { name: 'Account Settings', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
    mode?: 'desktop' | 'mobile';
}

export function Sidebar({ mode = 'desktop' }: SidebarProps) {
    const pathname = usePathname();
    const { user, role, isLoading, signOut } = useAuth();
    const { isCollapsed, isMobileOpen, toggleCollapsed, closeMobile } = useDashboardSidebar();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const getNavItems = () => {
        if (!mounted || !role) return studentNavItems;
        if (role === 'admin' || role === 'super_admin' || role === 'content_manager') return adminNavItems;
        if (role === 'faculty') return facultyNavItems;
        if (role === 'parent') return parentNavItems;
        return studentNavItems;
    };

    const currentNavItems = getNavItems();
    const isDesktop = mode === 'desktop';
    const collapsed = isDesktop && isCollapsed;

    const sidebarClasses = isDesktop
        ? `fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-200 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`
        : `fixed inset-y-0 left-0 z-50 h-screen w-72 max-w-[85vw] border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`;

    const handleNavigation = () => {
        if (!isDesktop) {
            closeMobile();
        }
    };

    return (
        <aside className={sidebarClasses}>
            {isDesktop ? (
                <button
                    onClick={toggleCollapsed}
                    className="absolute -right-3 top-20 z-50 hidden h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-colors hover:bg-primary-700 lg:flex"
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            ) : (
                <button
                    onClick={closeMobile}
                    className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="Close sidebar"
                >
                    <X className="h-5 w-5" />
                </button>
            )}

            <div className={`flex h-16 items-center gap-2 border-b border-slate-100 px-4 ${collapsed ? 'justify-center' : ''}`}>
                {!collapsed && (
                    <span className="font-black text-lg tracking-tight">
                        <span className="text-amber-500">Savi</span>
                        <span className="text-sky-500">EduTech</span>
                    </span>
                )}
            </div>

            <nav className="h-[calc(100vh-11rem)] overflow-y-auto p-4 space-y-1">
                {currentNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={handleNavigation}
                            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${isActive
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                } ${collapsed ? 'justify-center px-3' : ''}`}
                            title={collapsed ? item.name : undefined}
                        >
                            <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                            {!collapsed && <span>{item.name}</span>}
                            {!collapsed && item.name === 'Daily Challenge' && (
                                <span className="ml-auto h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className={`absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white p-4 ${collapsed ? 'px-2' : ''}`}>
                {!isLoading && user && !collapsed && (
                    <Link
                        href="/dashboard/analytics"
                        onClick={handleNavigation}
                        className="mb-3 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50"
                    >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
                            <Flame className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <StreakDisplay userId={user.id} variant="minimal" />
                            <div className="truncate text-xs text-slate-500">Keep it up</div>
                        </div>
                    </Link>
                )}

                <button
                    onClick={() => signOut()}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 ${collapsed ? 'justify-center px-3' : ''}`}
                    title={collapsed ? 'Sign Out' : undefined}
                >
                    <LogOut className="h-5 w-5" />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}
