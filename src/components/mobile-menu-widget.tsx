'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    X,
    Home,
    PlayCircle,
    BookOpen,
    ClipboardList,
    Trophy,
    Settings,
    HelpCircle,
    FileText,
    Calendar,
    Target,
    Users,
    BarChart3,
    CreditCard,
    Landmark,
    BookMarked,
    Sparkles,
    GraduationCap,
    LogOut,
    Bot,
    Briefcase,
    FileCode,
    Database,
    Image,
    ShieldCheck,
    Menu,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface MobileMenuWidgetProps {
    role?: 'student' | 'parent' | 'admin';
}

const studentMenuItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Lectures', href: '/dashboard/lectures', icon: PlayCircle },
    { name: 'Practice', href: '/dashboard/practice', icon: BookOpen },
    { name: 'DPP', href: '/dashboard/dpp', icon: FileText },
    { name: 'Tests', href: '/dashboard/tests', icon: ClipboardList },
    { name: 'Challenge', href: '/dashboard/challenge', icon: Trophy },
    { name: 'Revision', href: '/dashboard/revision', icon: BookMarked },
    { name: 'Planner', href: '/dashboard/planner', icon: Calendar },
    { name: 'Analytics', href: '/dashboard/analytics', icon: Target },
    { name: 'Doubts', href: '/dashboard/doubts', icon: HelpCircle },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const parentMenuItems = [
    { name: 'Home', href: '/dashboard/parent', icon: Home },
    { name: 'Progress', href: '/dashboard/parent', icon: Trophy },
    { name: 'Tests', href: '/dashboard/tests', icon: ClipboardList },
    { name: 'Analytics', href: '/dashboard/analytics', icon: Target },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const adminMenuItems = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Students', href: '/admin/students', icon: Users },
    { name: 'Courses', href: '/admin/courses', icon: BookOpen },
    { name: 'Lectures', href: '/admin/lectures', icon: PlayCircle },
    { name: 'Questions', href: '/admin/questions', icon: HelpCircle },
    { name: 'Tests', href: '/admin/tests', icon: GraduationCap },
    { name: 'Online Exams', href: '/admin/online-exams', icon: ShieldCheck },
    { name: 'Careers', href: '/admin/careers', icon: Briefcase },
    { name: 'Leads', href: '/admin/leads', icon: FileText },
    { name: 'CMS', href: '/admin/cms', icon: FileCode },
    { name: 'AI Content', href: '/admin/ai-content', icon: Sparkles },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Finance', href: '/admin/finance', icon: Landmark },
    { name: 'Daily Challenge', href: '/admin/challenges', icon: Trophy },
    { name: 'Popup Ads', href: '/admin/ads', icon: Image },
    { name: 'Backups', href: '/admin/backups', icon: Database },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function MobileMenuWidget({ role = 'student' }: MobileMenuWidgetProps) {
    const { signOut } = useAuth();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);

    const menuItems = role === 'admin' ? adminMenuItems : role === 'parent' ? parentMenuItems : studentMenuItems;

    return (
        <>
            {/* ── Floating Menu Button ── */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed z-50 lg:hidden w-14 h-14 rounded-full shadow-2xl bg-gradient-to-br from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 flex items-center justify-center transition-all active:scale-95"
                style={{
                    bottom: '80px',
                    right: '16px',
                }}
                aria-label="Open menu"
            >
                <Menu className="w-6 h-6 text-white" />
            </button>

            {/* ── Menu Drawer ── */}
            {isOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-hidden animate-card-slide-up">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <h2 className="text-base font-bold text-slate-900">Quick Navigation</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto max-h-[65vh]">
                            <div className="grid grid-cols-3 gap-2.5">
                                {menuItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setIsOpen(false)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 ${
                                                isActive
                                                    ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-xl ${isActive ? 'bg-primary-100' : 'bg-slate-200'}`}>
                                                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-slate-600'}`} />
                                            </div>
                                            <span className="text-[11px] font-medium mt-1.5 text-center leading-tight">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => { signOut(); setIsOpen(false); }}
                                className="w-full mt-5 flex items-center justify-center gap-2 p-3.5 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="text-sm font-semibold">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
