'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Home,
    BookOpen,
    Users,
    Video,
    FlaskConical,
    BarChart3,
    Brain,
    Menu,
    X,
    ChevronRight,
    Atom,
    FlaskConical as ChemistryIcon,
    Calculator,
    Microscope
} from 'lucide-react';
import { useState } from 'react';

interface FacultyMobileNavProps {
    subject?: string;
}

const SUBJECTS = [
    { id: 'physics', name: 'Physics', icon: Atom, color: 'text-blue-500' },
    { id: 'chemistry', name: 'Chemistry', icon: ChemistryIcon, color: 'text-green-500' },
    { id: 'mathematics', name: 'Math', icon: Calculator, color: 'text-purple-500' },
    { id: 'biology', name: 'Biology', icon: Microscope, color: 'text-amber-500' }
];

const MAIN_NAV = [
    { name: 'Home', href: '/faculty/dashboard', icon: Home },
    { name: 'Courses', href: '/faculty/courses', icon: BookOpen },
    { name: 'Students', href: '/faculty/students', icon: Users },
    { name: 'Live', href: '/faculty/live-classes', icon: Video },
    { name: 'Analytics', href: '/faculty/analytics', icon: BarChart3 },
];

export function FacultyMobileNav({ subject }: FacultyMobileNavProps) {
    const pathname = usePathname();
    const [showMenu, setShowMenu] = useState(false);
    const [showSubjects, setShowSubjects] = useState(false);

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 lg:hidden z-50">
                <div className="flex items-center justify-around h-16">
                    {MAIN_NAV.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full ${
                                    isActive ? 'text-indigo-600' : 'text-slate-500'
                                }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-500' : ''}`} />
                                <span className="text-xs font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                    <button 
                        onClick={() => setShowMenu(true)}
                        className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-slate-500"
                    >
                        <Menu className="w-5 h-5" />
                        <span className="text-xs font-medium">More</span>
                    </button>
                </div>
            </nav>

            {showMenu && (
                <div className="fixed inset-0 bg-black/50 z-50 lg:hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white animate-slide-in">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold">Menu</h2>
                            <button 
                                onClick={() => setShowMenu(false)}
                                className="p-2 rounded-lg hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4 overflow-y-auto pb-24">
                            <div>
                                <button 
                                    onClick={() => setShowSubjects(!showSubjects)}
                                    className="flex items-center justify-between w-full p-3 rounded-xl bg-slate-50"
                                >
                                    <span className="font-medium">Switch Subject</span>
                                    <ChevronRight className={`w-5 h-5 transition-transform ${showSubjects ? 'rotate-90' : ''}`} />
                                </button>
                                {showSubjects && (
                                    <div className="mt-2 space-y-2 pl-2">
                                        {SUBJECTS.map((subj) => {
                                            const Icon = subj.icon;
                                            const isActive = subject?.toLowerCase() === subj.id;
                                            return (
                                                <Link
                                                    key={subj.id}
                                                    href={`/faculty/${subj.id}`}
                                                    onClick={() => setShowMenu(false)}
                                                    className={`flex items-center gap-3 p-3 rounded-lg ${
                                                        isActive ? 'bg-indigo-50' : 'hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <Icon className={`w-5 h-5 ${subj.color}`} />
                                                    <span className={isActive ? 'text-indigo-600 font-medium' : ''}>
                                                        {subj.name}
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <Link href="/faculty/assignments" onClick={() => setShowMenu(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                                    <BookOpen className="w-5 h-5 text-slate-400" />
                                    Assignments
                                </Link>
                                <Link href="/faculty/experiments" onClick={() => setShowMenu(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                                    <FlaskConical className="w-5 h-5 text-slate-400" />
                                    Experiments
                                </Link>
                                <Link href="/faculty/ai-tutor" onClick={() => setShowMenu(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                                    <Brain className="w-5 h-5 text-slate-400" />
                                    AI Tools
                                </Link>
                                <Link href="/faculty/leaderboard" onClick={() => setShowMenu(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                                    <BarChart3 className="w-5 h-5 text-slate-400" />
                                    Leaderboard
                                </Link>
                            </div>

                            <div className="pt-4 border-t border-slate-200">
                                <Link href="/faculty/settings" onClick={() => setShowMenu(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                                    <Settings className="w-5 h-5 text-slate-400" />
                                    Settings
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function Settings({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
    );
}
