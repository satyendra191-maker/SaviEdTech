'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Home,
    BookOpen,
    Users,
    FileText,
    Video,
    FlaskConical,
    Award,
    BarChart3,
    Brain,
    MessageSquare,
    Calendar,
    Settings,
    GraduationCap,
    Microscope,
    Calculator,
    Atom,
    Beaker,
    Target,
    TrendingUp,
    Lightbulb,
    Clock,
    CheckCircle,
    AlertCircle
} from 'lucide-react';

interface FacultySidebarProps {
    subject?: string;
}

const SUBJECTS = [
    { 
        id: 'physics', 
        name: 'Physics', 
        icon: Atom,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 hover:bg-blue-100',
        gradient: 'from-blue-500 to-cyan-400'
    },
    { 
        id: 'chemistry', 
        name: 'Chemistry', 
        icon: FlaskConical,
        color: 'text-green-500',
        bgColor: 'bg-green-50 hover:bg-green-100',
        gradient: 'from-green-500 to-emerald-400'
    },
    { 
        id: 'mathematics', 
        name: 'Mathematics', 
        icon: Calculator,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50 hover:bg-purple-100',
        gradient: 'from-purple-500 to-pink-400'
    },
    { 
        id: 'biology', 
        name: 'Biology', 
        icon: Microscope,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50 hover:bg-amber-100',
        gradient: 'from-amber-500 to-orange-400'
    }
];

const ALL_MENU_ITEMS = [
    { 
        section: 'Main',
        items: [
            { name: 'Dashboard', href: '/faculty/dashboard', icon: Home },
            { name: 'My Courses', href: '/faculty/courses', icon: BookOpen },
            { name: 'Students', href: '/faculty/students', icon: Users },
        ]
    },
    {
        section: 'Content',
        items: [
            { name: 'Assignments', href: '/faculty/assignments', icon: FileText },
            { name: 'Live Classes', href: '/faculty/live-classes', icon: Video },
            { name: 'Experiments', href: '/faculty/experiments', icon: FlaskConical },
            { name: 'Notes & Materials', href: '/faculty/materials', icon: BookOpen },
        ]
    },
    {
        section: 'AI Tools',
        items: [
            { name: 'AI Tutor', href: '/faculty/ai-tutor', icon: Brain },
            { name: 'Question Generator', href: '/faculty/ai-questions', icon: Lightbulb },
            { name: 'Content Creator', href: '/faculty/ai-content', icon: FileText },
        ]
    },
    {
        section: 'Progress',
        items: [
            { name: 'Analytics', href: '/faculty/analytics', icon: BarChart3 },
            { name: 'Leaderboard', href: '/faculty/leaderboard', icon: Award },
            { name: 'Achievements', href: '/faculty/achievements', icon: Target },
        ]
    },
    {
        section: 'Communication',
        items: [
            { name: 'Messages', href: '/faculty/messages', icon: MessageSquare },
            { name: 'Announcements', href: '/faculty/announcements', icon: Calendar },
            { name: 'Doubts', href: '/faculty/doubts', icon: HelpCircle },
        ]
    }
];

function HelpCircle({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
        </svg>
    );
}

export function FacultySidebar({ subject }: FacultySidebarProps) {
    const pathname = usePathname();

    const menuItems = subject 
        ? ALL_MENU_ITEMS.map(section => ({
            ...section,
            items: section.items.map(item => ({
                ...item,
                href: `/faculty/${subject}${item.href.replace('/faculty', '')}`
            }))
        }))
        : ALL_MENU_ITEMS;

    return (
        <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-16 bg-white border-r border-slate-200 overflow-y-auto">
            <div className="p-4">
                <div className="mb-6">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Subjects
                    </h3>
                    <div className="space-y-2">
                        {SUBJECTS.map((subj) => {
                            const isActive = subject?.toLowerCase() === subj.id;
                            const Icon = subj.icon;
                            return (
                                <Link
                                    key={subj.id}
                                    href={`/faculty/${subj.id}`}
                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                                        isActive 
                                            ? `bg-gradient-to-r ${subj.gradient} text-white shadow-md` 
                                            : `${subj.bgColor} ${subj.color}`
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                                    <span className={`font-medium ${isActive ? 'text-white' : ''}`}>
                                        {subj.name}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {menuItems.map((section) => (
                    <div key={section.section} className="mb-6">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                            {section.section}
                        </h3>
                        <nav className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                                            isActive
                                                ? 'bg-indigo-50 text-indigo-600 font-medium'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                                        {item.name}
                                        {item.name === 'Doubts' && (
                                            <span className="ml-auto bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                                                5
                                            </span>
                                        )}
                                        {item.name === 'Assignments' && (
                                            <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                                                3
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                ))}

                <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                            <Brain className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-indigo-900">AI Assistant</p>
                            <p className="text-xs text-indigo-600">Need help?</p>
                        </div>
                    </div>
                    <Link 
                        href="/faculty/ai-assistant"
                        className="block w-full text-center py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
                    >
                        Ask AI Helper
                    </Link>
                </div>
            </div>

            <div className="mt-auto p-4 border-t border-slate-200">
                <Link 
                    href="/faculty/settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                    <Settings className="w-5 h-5 text-slate-400" />
                    Settings
                </Link>
            </div>
        </aside>
    );
}
