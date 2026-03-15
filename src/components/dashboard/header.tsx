'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, User, LogOut } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/hooks/useAuth';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export function Header() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    const greeting = useMemo(() => getGreeting(), []);
    const firstName = (user as any)?.full_name?.split(' ')[0] || '';

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80">
            <div className="max-w-6xl mx-auto">
                <div className="flex h-16 items-center justify-between px-4">
                    {/* Logo — same as homepage navbar */}
                    <Link href="/dashboard" className="flex items-center gap-[12px]" aria-label="SaviEduTech dashboard">
                        {/* Desktop Version */}
                        <Logo size="md" variant="full" className="hidden lg:block" height={32} />
                        {/* Mobile Version (Icon Only) */}
                        <Logo size="sm" variant="icon" className="lg:hidden" height={28} />
                    </Link>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                            href="/dashboard/search"
                            className="rounded-xl p-2 transition-colors hover:bg-slate-100 active:scale-95"
                            aria-label="Search"
                        >
                            <Search className="h-5 w-5 text-slate-500" />
                        </Link>
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
                        <Link
                            href="/dashboard/settings"
                            className="rounded-xl p-2 transition-colors hover:bg-slate-100 active:scale-95"
                            aria-label="Profile"
                        >
                            <User className="h-5 w-5 text-slate-500" />
                        </Link>
                        <button
                            onClick={handleSignOut}
                            className="rounded-xl p-2 transition-colors hover:bg-red-50 active:scale-95"
                            aria-label="Logout"
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5 text-slate-500 hover:text-red-600" />
                        </button>
                    </div>
                </div>

                {/* Search bar below header */}
                <div className="px-4 pb-3 lg:hidden">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                        <input
                            type="text"
                            placeholder="Search lectures, tests, DPP..."
                            className="w-full rounded-xl bg-slate-50 border border-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}
