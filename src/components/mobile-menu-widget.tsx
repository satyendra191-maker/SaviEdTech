'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Menu,
    X,
    Home,
    PlayCircle,
    BookOpen,
    ClipboardList,
    Trophy,
    User,
    Settings,
    Brain,
    HelpCircle,
    FileText,
    Calendar,
    Target,
    Award,
    Users,
    BarChart3,
    CreditCard,
    Landmark,
    BookMarked,
    Sparkles,
    GraduationCap,
    LogOut,
    ChevronRight,
} from 'lucide-react';

interface MobileMenuWidgetProps {
    role?: 'student' | 'parent' | 'admin';
}

const studentMenuItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Lectures', href: '/dashboard/lectures', icon: PlayCircle },
    { name: 'Practice', href: '/dashboard/practice', icon: BookOpen },
    { name: 'DPP', href: '/dashboard/dpp', icon: FileText },
    { name: 'Tests', href: '/dashboard/tests', icon: ClipboardList },
    { name: 'Daily Challenge', href: '/dashboard/challenge', icon: Trophy },
    { name: 'Revision', href: '/dashboard/revision', icon: BookMarked },
    { name: 'Planner', href: '/dashboard/planner', icon: Calendar },
    { name: 'Analytics', href: '/dashboard/analytics', icon: Target },
    { name: 'Doubts', href: '/dashboard/doubts', icon: HelpCircle },
    { name: 'AI Tutor', href: '/ai-tutor', icon: Brain },
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
    { name: 'Students', href: '/admin/students', icon: Users },
    { name: 'Courses', href: '/admin/courses', icon: BookOpen },
    { name: 'Lectures', href: '/admin/lectures', icon: PlayCircle },
    { name: 'Questions', href: '/admin/questions', icon: HelpCircle },
    { name: 'Tests', href: '/admin/tests', icon: GraduationCap },
    { name: 'Online Exams', href: '/admin/online-exams', icon: ClipboardList },
    { name: 'Finance', href: '/admin/finance', icon: Landmark },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Leads', href: '/admin/leads', icon: FileText },
    { name: 'AI Content', href: '/admin/ai-content', icon: Sparkles },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function MobileMenuWidget({ role = 'student' }: MobileMenuWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const menuItems = role === 'admin' ? adminMenuItems : role === 'parent' ? parentMenuItems : studentMenuItems;

    return (
        <>
            {/* Floating Menu Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-4 z-40 lg:hidden w-14 h-14 bg-primary-600 hover:bg-primary-700 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                aria-label="Open menu"
            >
                <Menu className="w-7 h-7 text-white" />
            </button>

            {/* Menu Drawer */}
            {isOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Drawer */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-hidden animate-slide-up">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900">Menu</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-600" />
                            </button>
                        </div>

                        {/* Menu Items Grid */}
                        <div className="p-4 overflow-y-auto max-h-[70vh]">
                            <div className="grid grid-cols-3 gap-3">
                                {menuItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                    
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setIsOpen(false)}
                                            className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 ${
                                                isActive 
                                                    ? 'bg-primary-100 text-primary-700' 
                                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-xl ${isActive ? 'bg-primary-200' : 'bg-slate-200'}`}>
                                                <Icon className={`w-6 h-6 ${isActive ? 'text-primary-600' : 'text-slate-600'}`} />
                                            </div>
                                            <span className="text-xs font-medium mt-2 text-center">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Logout Button */}
                            <button className="w-full mt-6 flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors">
                                <LogOut className="w-5 h-5" />
                                <span className="font-medium">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </>
    );
}
