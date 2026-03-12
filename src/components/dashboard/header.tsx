'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Bell, Menu, Search } from 'lucide-react';
import { useDashboardSidebar } from '@/components/dashboard/sidebar-context';
import { useAuth } from '@/hooks/useAuth';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export function Header() {
    const { toggleMobile } = useDashboardSidebar();
    const { user } = useAuth();

    const greeting = useMemo(() => getGreeting(), []);
    const firstName = (user as any)?.full_name?.split(' ')[0] || '';

    return (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                        onClick={toggleMobile}
                        className="rounded-xl p-2 transition-colors hover:bg-slate-100 active:scale-95 flex-shrink-0"
                        aria-label="Open dashboard sidebar"
                    >
                        <Menu className="h-5 w-5 text-slate-600" />
                    </button>

                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-slate-900 truncate">
                            {greeting}{firstName ? `, ${firstName}` : ''} 👋
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium">Let's keep learning</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Link
                        href="/notifications"
                        className="relative rounded-xl p-2 transition-colors hover:bg-slate-100 active:scale-95"
                        aria-label="Notifications"
                    >
                        <Bell className="h-5 w-5 text-slate-500" />
                        <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                        </span>
                    </Link>
                </div>
            </div>

            <div className="px-4 pb-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Search lectures, tests, DPP..."
                        className="w-full rounded-xl bg-slate-50 border border-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
                    />
                </div>
            </div>
        </header>
    );
}
