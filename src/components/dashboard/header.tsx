'use client';

import Link from 'next/link';
import { Bell, Flame, Menu, Search } from 'lucide-react';
import { useDashboardSidebar } from '@/components/dashboard/sidebar-context';

export function Header() {
    const { toggleMobile } = useDashboardSidebar();

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white lg:hidden">
            <div className="flex h-16 items-center justify-between px-4">
                <button
                    onClick={toggleMobile}
                    className="rounded-xl p-2 transition-colors hover:bg-slate-100"
                    aria-label="Open dashboard sidebar"
                >
                    <Menu className="h-6 w-6 text-slate-600" />
                </button>

                <Link href="/dashboard" className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">Savi</span>
                    <span className="font-bold text-primary-600">EduTech</span>
                </Link>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1">
                        <Flame className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-semibold text-amber-600">Streak</span>
                    </div>
                    <button className="relative rounded-xl p-2 transition-colors hover:bg-slate-100">
                        <Bell className="h-5 w-5 text-slate-600" />
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                    </button>
                </div>
            </div>

            <div className="px-4 pb-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search lectures, tests, DPP..."
                        className="w-full rounded-xl bg-slate-100 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                </div>
            </div>
        </header>
    );
}
