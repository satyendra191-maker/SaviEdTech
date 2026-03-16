'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, User, LogOut, ChevronDown, LayoutDashboard } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/hooks/useAuth';

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
    const { signOut } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    return (
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80">
            <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 lg:px-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="inline-flex shrink-0 rounded-xl p-2" aria-label="SaviEduTech admin">
                        <Logo size="sm" className="shrink-0 md:hidden" />
                        <Logo size="md" className="hidden shrink-0 md:inline-flex" />
                    </Link>

                    <div className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 group relative">
                        <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-700">Admin</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                        
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2 space-y-1">
                            <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Switch View</p>
                            <Link href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                Admin Panel
                            </Link>
                            <Link href="/admin/finance" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                Finance Dashboard
                            </Link>
                            <Link href="/admin/hr" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                HR Portal
                            </Link>
                            <Link href="/admin/content" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                Content Hub
                            </Link>
                            <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors group/sub cursor-pointer relative">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    <span>Faculty Portal</span>
                                </div>
                                <ChevronDown className="w-3 h-3 text-slate-300 group-hover/sub:text-indigo-400 group-hover/sub:rotate-[-90deg] transition-all" />
                                
                                {/* Subject-wise Hover Sub-menu */}
                                <div className="absolute left-full top-[-10px] ml-1 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all p-2 space-y-1 z-50">
                                    <p className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase">Subjects</p>
                                    <Link href="/admin/faculty" className="block px-3 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-[11px] font-bold border-b border-slate-50 mb-1">Main Dashboard</Link>
                                    <Link href="/admin/faculty?subject=physics" className="block px-3 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-[11px]">Physics Dept</Link>
                                    <Link href="/admin/faculty?subject=chemistry" className="block px-3 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-[11px]">Chemistry Dept</Link>
                                    <Link href="/admin/faculty?subject=maths" className="block px-3 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-[11px]">Mathematics Dept</Link>
                                    <Link href="/admin/faculty?subject=biology" className="block px-3 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-[11px]">Biology Dept</Link>
                                </div>
                            </div>
                            <div className="h-px bg-slate-100 my-1" />
                            <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                Student View
                            </Link>
                            <Link href="/dashboard/parent" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                Parent View
                            </Link>
                        </div>
                    </div>
                </div>

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
        </header>
    );
}
