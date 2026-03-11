'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    PlayCircle,
    Settings,
    BarChart3,
    CreditCard,
    Landmark,
    BookOpen,
    FileText,
    Sparkles,
    HelpCircle,
    Trophy,
} from 'lucide-react';

interface AdminMobileNavProps {
    role?: string;
}

const getNavItems = (role?: string) => {
    const baseItems = [
        { name: 'Home', href: '/admin', icon: LayoutDashboard },
        { name: 'Students', href: '/admin/students', icon: Users },
        { name: 'Courses', href: '/admin/courses', icon: BookOpen },
    ];

    const adminItems = [
        { name: 'Tests', href: '/admin/tests', icon: GraduationCap },
        { name: 'Finance', href: '/admin/finance', icon: Landmark },
        { name: 'More', href: '/admin/analytics', icon: BarChart3 },
    ];

    const financeItems = [
        { name: 'Payments', href: '/admin/payments', icon: CreditCard },
        { name: 'Finance', href: '/admin/finance', icon: Landmark },
        { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ];

    if (role === 'finance_manager') {
        return [...baseItems.slice(0, 2), ...financeItems];
    }

    return [...baseItems, ...adminItems.slice(0, 3)];
};

export function AdminMobileNav({ role }: AdminMobileNavProps) {
    const pathname = usePathname();
    const navItems = getNavItems(role);

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all duration-200 touch-manipulation min-w-[64px]
                                ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-indigo-100' : ''}`}>
                                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[10px] font-medium mt-1">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
