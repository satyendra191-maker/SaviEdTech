'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Brain,
    User,
    GraduationCap,
    Trophy,
    ClipboardList,
    Crosshair,
} from 'lucide-react';

interface MobileNavProps {
    role?: string;
}

const getStudentNavItems = () => [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Courses', href: '/dashboard/lectures', icon: GraduationCap },
    { name: 'Practice', href: '/dashboard/practice', icon: Crosshair },
    { name: 'AI Tutor', href: '/ai-tutor', icon: Brain },
    { name: 'Profile', href: '/dashboard/settings', icon: User },
];

const getParentNavItems = () => [
    { name: 'Home', href: '/dashboard/parent', icon: LayoutDashboard },
    { name: 'Progress', href: '/dashboard/parent', icon: Trophy },
    { name: 'Tests', href: '/dashboard/tests', icon: ClipboardList },
    { name: 'Reports', href: '/dashboard/analytics', icon: BookOpen },
    { name: 'Settings', href: '/dashboard/settings', icon: User },
];

export function MobileNav({ role }: MobileNavProps) {
    const pathname = usePathname();
    const navItems = role === 'parent' ? getParentNavItems() : getStudentNavItems();

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/60 bg-white/90 backdrop-blur-xl shadow-[0_-2px_24px_rgba(0,0,0,0.06)] safe-area-bottom"
            role="navigation"
            aria-label="Main navigation"
        >
            <div className="flex items-center justify-around h-[4.25rem] px-1 max-w-lg mx-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        item.href === '/dashboard'
                            ? pathname === '/dashboard'
                            : pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex flex-col items-center justify-center flex-1 py-1.5 rounded-2xl transition-all duration-200 touch-manipulation min-w-[56px] group
                                ${isActive ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600 active:scale-95'}`}
                        >
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200
                                    ${isActive
                                        ? 'bg-primary-100 shadow-sm shadow-primary-200/50 scale-105'
                                        : 'group-hover:bg-slate-100'
                                    }`}
                            >
                                <Icon
                                    className={`w-[22px] h-[22px] transition-colors ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                                    strokeWidth={isActive ? 2.4 : 1.8}
                                />
                            </div>
                            <span
                                className={`text-[10px] font-semibold mt-0.5 tracking-wide transition-colors
                                    ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                            >
                                {item.name}
                            </span>
                            {isActive && (
                                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-500" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
