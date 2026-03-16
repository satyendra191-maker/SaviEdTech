'use client';

import { useState, useEffect } from 'react';
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
    MoreHorizontal,
    Bot,
    ShieldCheck,
    Briefcase,
    FileCode,
    Image,
    Database,
    X,
    LogOut,
    ChevronRight,
    Brain,
    Youtube,
    Clock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
    ADMIN_PRIVILEGED_ROLES,
    CONTENT_ROLES,
    FINANCE_ROLES,
    HR_ROLES,
    MARKETING_ROLES,
    TEACHING_ROLES,
} from '@/lib/auth/roles';

interface AdminMobileNavProps {
    role?: string;
}

const adminMenuItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'AI Superbrain', href: '/admin/superbrain', icon: Brain },
    { name: 'AI Assistant', href: '/admin/ai-assistant', icon: Bot },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Students', href: '/admin/students', icon: Users },
    { name: 'Faculty', href: '/admin/faculty', icon: GraduationCap },
    { name: 'Courses', href: '/admin/courses', icon: BookOpen },
    { name: 'Lectures', href: '/admin/lectures', icon: PlayCircle },
    { name: 'Questions', href: '/admin/questions', icon: HelpCircle },
    { name: 'Tests', href: '/admin/tests', icon: GraduationCap },
    { name: 'Online Exams', href: '/admin/online-exams', icon: ShieldCheck },
    { name: 'Careers', href: '/admin/careers', icon: Briefcase },
    { name: 'HR', href: '/admin/hr', icon: Users },
    { name: 'Leads', href: '/admin/leads', icon: FileText },
    { name: 'CMS', href: '/admin/cms', icon: FileCode },
    { name: 'AI Content', href: '/admin/ai-content', icon: Sparkles },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Finance', href: '/admin/finance', icon: Landmark },
    { name: 'Daily Challenge', href: '/admin/challenges', icon: Trophy },
    { name: 'Popup Ads', href: '/admin/ads', icon: Image },
    { name: 'Cron Jobs', href: '/admin/cron-jobs', icon: Clock },
    { name: 'YouTube Videos', href: '/admin/youtube', icon: Youtube },
    { name: 'Backups', href: '/admin/backups', icon: Database },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const getNavItems = (role?: string) => {
    const allItems = [
        { name: 'Home', href: '/admin', icon: LayoutDashboard },
        { name: 'Students', href: '/admin/students', icon: Users },
        { name: 'Faculty', href: '/admin/faculty', icon: GraduationCap },
        { name: 'Courses', href: '/admin/courses', icon: BookOpen },
        { name: 'Lectures', href: '/admin/lectures', icon: PlayCircle },
        { name: 'Tests', href: '/admin/tests', icon: GraduationCap },
        { name: 'HR', href: '/admin/hr', icon: Users },
        { name: 'Finance', href: '/admin/finance', icon: Landmark },
        { name: 'Payments', href: '/admin/payments', icon: CreditCard },
        { name: 'Leads', href: '/admin/leads', icon: FileText },
        { name: 'CMS', href: '/admin/cms', icon: FileCode },
        { name: 'AI Content', href: '/admin/ai-content', icon: Sparkles },
        { name: 'More', isAction: true, icon: MoreHorizontal },
    ];

    const isAdminPrivileged = role ? ADMIN_PRIVILEGED_ROLES.includes(role as (typeof ADMIN_PRIVILEGED_ROLES)[number]) : false;
    const isFinanceRole = role ? FINANCE_ROLES.includes(role as (typeof FINANCE_ROLES)[number]) : false;
    const isHrRole = role ? HR_ROLES.includes(role as (typeof HR_ROLES)[number]) : false;
    const isMarketingRole = role ? MARKETING_ROLES.includes(role as (typeof MARKETING_ROLES)[number]) : false;
    const isContentRole = role ? CONTENT_ROLES.includes(role as (typeof CONTENT_ROLES)[number]) : false;
    const isTeachingRole = role ? TEACHING_ROLES.includes(role as (typeof TEACHING_ROLES)[number]) : false;

    if (isFinanceRole && !isAdminPrivileged) {
        return [
            allItems[0], // Home
            allItems[7], // Finance
            allItems[8], // Payments
            allItems[12], // More
        ];
    }

    if (isHrRole && !isAdminPrivileged) {
        return [
            allItems[0], // Home
            allItems[6], // HR
            allItems[9], // Leads
            allItems[12], // More
        ];
    }

    if (isMarketingRole && !isAdminPrivileged) {
        return [
            allItems[0], // Home
            allItems[9], // Leads
            allItems[11], // AI Content
            allItems[12], // More
        ];
    }

    if (isContentRole && !isAdminPrivileged) {
        return [
            allItems[0], // Home
            allItems[3], // Courses
            allItems[4], // Lectures
            allItems[10], // CMS
            allItems[12], // More
        ];
    }

    if (isTeachingRole && !isAdminPrivileged) {
        return [
            allItems[0], // Home
            allItems[2], // Faculty
            allItems[4], // Lectures
            allItems[12], // More
        ];
    }

    return [
        allItems[0], // Home
        allItems[1], // Students
        allItems[3], // Courses
        allItems[5], // Tests
        allItems[12], // More
    ];
};

export function AdminMobileNav({ role }: AdminMobileNavProps) {
    const pathname = usePathname();
    const { signOut } = useAuth();
    const navItems = getNavItems(role);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    // Close menu on route change
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden safe-area-bottom">
                <div className="flex items-center justify-around h-16 px-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isMore = item.name === 'More';
                        const isActive = isMore ? isMenuOpen : (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)));

                        const buttonContent = (
                            <>
                                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-indigo-100' : ''}`}>
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={`text-[10px] font-medium mt-1 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>{item.name}</span>
                            </>
                        );

                        if (isMore) {
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all duration-200 touch-manipulation min-w-[64px]"
                                >
                                    {buttonContent}
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={item.name}
                                href={item.href || '#'}
                                className="flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all duration-200 touch-manipulation min-w-[64px] hover:text-slate-700"
                            >
                                {buttonContent}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Slide-up Menu Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-30 lg:hidden flex flex-col justify-end">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMenuOpen(false)}
                    />
                    
                    {/* Drawer Content */}
                    <div className="relative bg-white rounded-t-3xl shadow-2xl h-[85vh] flex flex-col overflow-hidden animate-slide-up pb-16">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">Menu</h3>
                                <p className="text-xs text-slate-500">Admin Control Center</p>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrolling Grid */}
                        <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-6 bg-slate-50/50">
                            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                                {adminMenuItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className="flex flex-col items-center gap-2 group"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                                                isActive 
                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                                    : 'bg-white border border-slate-100 text-slate-600 shadow-sm group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-600 group-active:scale-95'
                                            }`}>
                                                <Icon className="w-6 h-6" strokeWidth={isActive ? 2 : 1.5} />
                                            </div>
                                            <span className={`text-[10px] text-center font-medium leading-tight ${
                                                isActive ? 'text-indigo-700' : 'text-slate-600'
                                            }`}>
                                                {item.name}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Sign Out Button inside Menu */}
                            <div className="pt-4 border-t border-slate-200/60 flex justify-center">
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        signOut();
                                    }}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-sm transition-colors w-full justify-center"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Secure Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
