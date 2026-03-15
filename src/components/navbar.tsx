'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, LayoutDashboard, LogOut, Menu, X, Sparkles } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/hooks/useAuth';

const courseLinks = [
    { name: 'Foundation', href: '/foundation' },
    { name: 'CBSE Board', href: '/cbse' },
    { name: 'JEE Preparation', href: '/jee' },
    { name: 'NEET Preparation', href: '/neet' },
];

const primaryLinks = [
    { name: 'Home', href: '/' },
    { name: 'Faculty', href: '/faculty' },
    { name: 'Career', href: '/careers' },
    { name: 'Blog', href: '/blog' },
    { name: 'SaviTech AI', href: '/savitech-ai', icon: Sparkles },
    { name: 'Donate', href: '/donate' },
];

export function Navbar() {
    const { isAuthenticated, signOut, user, role } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCoursesOpen, setIsCoursesOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const isDashboardRoute = pathname?.startsWith('/dashboard')
        || pathname?.startsWith('/admin')
        || pathname?.startsWith('/super-admin')
        || pathname?.startsWith('/faculty-dashboard')
        || pathname?.startsWith('/auth/callback');

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = isMobileOpen ? 'hidden' : previousOverflow;
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobileOpen]);

    if (isDashboardRoute) {
        return null;
    }

    const getDashboardLink = () => {
        switch (role) {
            case 'admin':
                return '/admin';
            case 'content_manager':
                return '/admin/courses';
            case 'finance_manager':
                return '/admin/finance';
            case 'parent':
                return '/dashboard/parent';
            default:
                return '/dashboard';
        }
    };

    const handleLogout = async () => {
        await signOut();
        setIsUserMenuOpen(false);
        setIsMobileOpen(false);
        router.push('/');
    };

    return (
        <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl h-[64px] flex items-center">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-[24px]" aria-label="SaviEduTech home">
                    {/* Desktop Version */}
                    <Logo size="md" variant="full" className="hidden lg:block" height={36} />
                    {/* Mobile Version (Icon Only) */}
                    <Logo size="sm" variant="icon" className="lg:hidden" height={28} />
                </Link>

                <div className="hidden items-center gap-1 lg:flex">
                    <Link href="/" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950">
                        Home
                    </Link>

                    <div
                        className="relative"
                        onMouseEnter={() => setIsCoursesOpen(true)}
                        onMouseLeave={() => setIsCoursesOpen(false)}
                    >
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                            aria-expanded={isCoursesOpen}
                        >
                            Courses
                            <ChevronDown className={`h-4 w-4 transition-transform ${isCoursesOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <div className={`absolute left-1/2 top-full mt-2 w-60 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl transition-all ${isCoursesOpen ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-2 opacity-0'}`}>
                            {courseLinks.map((course) => (
                                <Link
                                    key={course.name}
                                    href={course.href}
                                    className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                                    onClick={() => setIsCoursesOpen(false)}
                                >
                                    {course.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {primaryLinks.slice(1).map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                <div className="hidden items-center gap-3 lg:flex">
                    {isAuthenticated ? (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsUserMenuOpen((current) => !current)}
                                className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 transition-colors hover:border-slate-300"
                            >
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-900">{user?.full_name || 'User'}</p>
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{role || 'member'}</p>
                                </div>
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                                    {user?.full_name?.charAt(0) || 'U'}
                                </div>
                            </button>

                            {isUserMenuOpen ? (
                                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                                    <Link
                                        href={getDashboardLink()}
                                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                                        onClick={() => setIsUserMenuOpen(false)}
                                    >
                                        <LayoutDashboard className="h-4 w-4 text-sky-600" />
                                        Dashboard
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                        >
                            Login
                        </Link>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setIsMobileOpen((current) => !current)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 lg:hidden"
                    aria-label={isMobileOpen ? 'Close mobile menu' : 'Open mobile menu'}
                    aria-expanded={isMobileOpen}
                >
                    {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {isMobileOpen ? (
                <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
                    <div className="space-y-2">
                        <Link href="/" className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100" onClick={() => setIsMobileOpen(false)}>
                            Home
                        </Link>

                        <div className="rounded-2xl border border-slate-200 p-2">
                            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Courses</p>
                            <div className="space-y-1">
                                {courseLinks.map((course) => (
                                    <Link
                                        key={course.name}
                                        href={course.href}
                                        className="block rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                        onClick={() => setIsMobileOpen(false)}
                                    >
                                        {course.name}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {primaryLinks.slice(1).map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                                onClick={() => setIsMobileOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}

                        <div className="pt-2">
                            {isAuthenticated ? (
                                <div className="space-y-2">
                                    <Link
                                        href={getDashboardLink()}
                                        className="block rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white"
                                        onClick={() => setIsMobileOpen(false)}
                                    >
                                        Dashboard
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="block w-full rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-600"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    href="/login"
                                    className="block rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white"
                                    onClick={() => setIsMobileOpen(false)}
                                >
                                    Login
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </nav>
    );
}
