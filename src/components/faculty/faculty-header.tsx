'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Menu, 
    Bell, 
    Search, 
    User, 
    ChevronDown,
    LogOut,
    Settings,
    BookOpen,
    GraduationCap,
    Flame
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';

interface FacultyHeaderProps {
    role?: string;
    subject?: string;
}

const SUBJECT_INFO: Record<string, { color: string; icon: string; description: string }> = {
    physics: { 
        color: 'from-blue-600 to-cyan-500', 
        icon: '⚛️',
        description: 'Physics Department'
    },
    chemistry: { 
        color: 'from-green-600 to-emerald-500', 
        icon: '🧪',
        description: 'Chemistry Department'
    },
    mathematics: { 
        color: 'from-purple-600 to-pink-500', 
        icon: '📐',
        description: 'Mathematics Department'
    },
    biology: { 
        color: 'from-amber-600 to-orange-500', 
        icon: '🧬',
        description: 'Biology Department'
    }
};

export function FacultyHeader({ role, subject }: FacultyHeaderProps) {
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const supabase = getSupabaseBrowserClient();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setUser(profile);
            }
        };
        fetchUser();
    }, []);

    const subjectInfo = subject ? SUBJECT_INFO[subject.toLowerCase()] : null;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
            <div className="flex items-center justify-between h-16 px-4 lg:px-6">
                <div className="flex items-center gap-4">
                    <button 
                        id="mobile-menu-btn"
                        className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
                        aria-label="Toggle menu"
                    >
                        <Menu className="w-5 h-5 text-slate-600" />
                    </button>
                    
                    <Link href={`/faculty/${subject || 'dashboard'}`} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${subjectInfo?.color || 'from-indigo-600 to-purple-500'} flex items-center justify-center text-white font-bold text-lg`}>
                            {subjectInfo?.icon || '🎓'}
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-lg font-bold text-slate-800">
                                {subject ? `${subject.charAt(0).toUpperCase()}${subject.slice(1)}` : 'Faculty'} Portal
                            </h1>
                            <p className="text-xs text-slate-500">{subjectInfo?.description || 'SaviEduTech'}</p>
                        </div>
                    </Link>
                </div>

                <div className="hidden md:flex flex-1 max-w-md mx-8">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search courses, students, assignments..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 border-0 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 lg:gap-4">
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-700">🔥 15 Day Streak</span>
                    </div>

                    <button className="relative p-2 rounded-lg hover:bg-slate-100">
                        <Bell className="w-5 h-5 text-slate-600" />
                        {notifications > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                                {notifications}
                            </span>
                        )}
                    </button>

                    <div className="relative">
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium">
                                {user?.full_name?.charAt(0) || 'F'}
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                        </button>

                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                                <div className="px-4 py-2 border-b border-slate-100">
                                    <p className="font-medium text-slate-800">{user?.full_name || 'Faculty'}</p>
                                    <p className="text-sm text-slate-500">{user?.email}</p>
                                </div>
                                <Link href="/faculty/profile" className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50">
                                    <User className="w-4 h-4" />
                                    My Profile
                                </Link>
                                <Link href="/faculty/settings" className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50">
                                    <Settings className="w-4 h-4" />
                                    Settings
                                </Link>
                                <div className="border-t border-slate-100 mt-2 pt-2">
                                    <button className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 w-full">
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
