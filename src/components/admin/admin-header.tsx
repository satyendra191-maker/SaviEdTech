'use client';

import Link from 'next/link';
import { Bell, Search, User } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

interface AdminHeaderProps {
    role?: string;
}

function formatRole(role?: string) {
    if (!role) {
        return 'Admin';
    }

    return role
        .split(/[_-]+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}

export function AdminHeader({ role }: AdminHeaderProps) {
    return (
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80">
            <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 lg:px-6">
                {/* Logo — same as homepage navbar */}
                <Link href="/admin" className="shrink-0" aria-label="SaviEduTech admin">
                    <BrandLogo size="xs" showText={true} showTagline={true} />
                </Link>

                {/* Search (desktop) */}
                <div className="hidden lg:block flex-1 max-w-lg mx-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search students, leads, content..."
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-slate-50"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Link
                        href="/admin/search"
                        className="lg:hidden rounded-xl p-2 transition-colors hover:bg-slate-100 active:scale-95"
                        aria-label="Search"
                    >
                        <Search className="h-5 w-5 text-slate-500" />
                    </Link>
                    <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                        </span>
                    </button>
                    <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-slate-900">SaviEduTech</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{formatRole(role)}</p>
                        </div>
                        <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-sm">
                            <User className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
