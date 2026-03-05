'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    FileText,
    PlayCircle,
    HelpCircle,
    Trophy,
    Image,
    Settings,
    LogOut,
    Shield,
    BookOpen,
    CreditCard,
    Briefcase,
} from 'lucide-react';

const adminNavItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Students', href: '/admin/students', icon: Users },
    { name: 'Courses', href: '/admin/courses', icon: BookOpen },
    { name: 'Lectures', href: '/admin/lectures', icon: PlayCircle },
    { name: 'Questions', href: '/admin/questions', icon: HelpCircle },
    { name: 'Tests', href: '/admin/tests', icon: GraduationCap },
    { name: 'Careers', href: '/admin/careers', icon: Briefcase },
    { name: 'Leads', href: '/admin/leads', icon: FileText },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Daily Challenge', href: '/admin/challenges', icon: Trophy },
    { name: 'Popup Ads', href: '/admin/ads', icon: Image },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 text-white">
            {/* Logo */}
            <div className="flex items-center gap-2 px-6 h-16 border-b border-slate-800">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                    <span className="font-bold text-white">Admin</span>
                    <span className="font-bold text-primary-400">Panel</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
                {adminNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${isActive
                                    ? 'bg-primary-600 text-white'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-900">
                <button className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-xl transition-colors">
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
