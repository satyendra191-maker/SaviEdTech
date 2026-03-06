'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    PlayCircle,
    BookOpen,
    ClipboardList,
    Trophy,
    Calendar,
    BarChart3,
    RotateCcw,
    Settings,
    LogOut,
    GraduationCap,
    Flame,
    Clock,
    Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { StreakDisplay } from '@/components/gamification';
import { AnimatedLogo } from '@/components/AnimatedLogo';

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Lectures', href: '/dashboard/lectures', icon: PlayCircle },
    { name: 'Practice', href: '/dashboard/practice', icon: BookOpen },
    { name: 'Mock Tests', href: '/dashboard/tests', icon: ClipboardList },
    { name: 'Daily Challenge', href: '/dashboard/challenge', icon: Trophy },
    { name: 'DPP', href: '/dashboard/dpp', icon: Calendar },
    { name: 'Study Planner', href: '/dashboard/planner', icon: Clock },
    { name: 'Ask Faculty', href: '/dashboard/doubts', icon: Trophy },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Revision', href: '/dashboard/revision', icon: RotateCcw },
    { name: 'Parent Portal', href: '/dashboard/parent', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, isLoading, signOut } = useAuth();

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-slate-200">
            {/* Logo */}
            <div className="flex items-center gap-2 px-4 h-16 border-b border-slate-100">
                <AnimatedLogo size="sm" showText={true} />
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-11rem)]">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${isActive
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                            {item.name}
                            {item.name === 'Daily Challenge' && (
                                <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User & Logout */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white">
                {/* Streak Display */}
                {!isLoading && user && (
                    <Link
                        href="/dashboard/analytics"
                        className="flex items-center gap-3 mb-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                            <Flame className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <StreakDisplay userId={user.id} variant="minimal" />
                            <div className="text-xs text-slate-500 truncate">Keep it up!</div>
                        </div>
                    </Link>
                )}
                {isLoading && (
                    <div className="flex items-center gap-3 mb-3 px-2 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 rounded w-20" />
                            <div className="h-3 bg-slate-200 rounded w-16" />
                        </div>
                    </div>
                )}
                <button 
                    onClick={() => signOut()}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}