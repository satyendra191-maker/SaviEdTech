'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    PlayCircle,
    BookOpen,
    ClipboardList,
    Trophy,
    User,
    Shield,
    Brain,
    Sparkles,
} from 'lucide-react';

interface MobileNavProps {
    role?: string;
}

const getStudentNavItems = () => [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Learn', href: '/dashboard/lectures', icon: PlayCircle },
    { name: 'Practice', href: '/dashboard/practice', icon: BookOpen },
    { name: 'Tests', href: '/dashboard/tests', icon: ClipboardList },
    { name: 'Profile', href: '/dashboard/settings', icon: User },
];

const getParentNavItems = () => [
    { name: 'Home', href: '/dashboard/parent', icon: LayoutDashboard },
    { name: 'Progress', href: '/dashboard/parent', icon: Trophy },
    { name: 'Child', href: '/dashboard/parent', icon: User },
    { name: 'Tests', href: '/dashboard/tests', icon: ClipboardList },
    { name: 'Settings', href: '/dashboard/settings', icon: User },
];

export function MobileNav({ role }: MobileNavProps) {
    const pathname = usePathname();
    const navItems = role === 'parent' ? getParentNavItems() : getStudentNavItems();
    const isParent = role === 'parent';

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all duration-200 touch-manipulation min-w-[64px]
                                ${isActive ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-primary-100' : ''}`}>
                                <Icon className={`w-6 h-6 ${isActive ? 'text-primary-600' : 'text-slate-500'}`} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[11px] font-medium mt-1">{item.name}</span>
                        </Link>
                    );
                })}
                
                {!isParent && (
                    <Link
                        href="/ai-tutor"
                        className={`flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all duration-200 touch-manipulation min-w-[64px] ${
                            pathname.startsWith('/ai') ? 'text-purple-600' : 'text-slate-500 hover:text-purple-600'
                        }`}
                    >
                        <div className={`p-1.5 rounded-lg transition-colors ${pathname.startsWith('/ai') ? 'bg-purple-100' : ''}`}>
                            <Brain className={`w-6 h-6 ${pathname.startsWith('/ai') ? 'text-purple-600' : 'text-slate-500'}`} strokeWidth={pathname.startsWith('/ai') ? 2.5 : 2} />
                        </div>
                        <span className="text-[11px] font-medium mt-1">AI</span>
                    </Link>
                )}
            </div>
        </nav>
    );
}
