'use client';

import { Bell, Search, Menu, Flame } from 'lucide-react';
import Link from 'next/link';

export function Header() {
    return (
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 lg:hidden">
            <div className="flex items-center justify-between h-16 px-4">
                {/* Menu Button */}
                <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <Menu className="w-6 h-6 text-slate-600" />
                </button>

                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">Savi</span>
                    <span className="font-bold text-primary-600">EduTech</span>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Streak */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-semibold text-amber-600">12</span>
                    </div>

                    {/* Notifications */}
                    <button className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <Bell className="w-5 h-5 text-slate-600" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 pb-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search lectures, topics..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                </div>
            </div>
        </header>
    );
}