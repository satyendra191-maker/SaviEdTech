'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    BookOpen,
    Brain,
    GraduationCap,
    Trophy,
    User,
    Menu,
    X,
    MessageCircle,
    Sparkles,
    ChevronUp,
    Bell,
    Search,
    Video,
    FileQuestion,
    Mic,
    Lightbulb,
    Target,
    TrendingUp,
    Clock,
    Star,
    Crown,
    Medal,
    Search as SearchIcon,
    Calculator,
    BarChart3,
    FolderOpen,
    Calendar,
} from 'lucide-react';

interface MobileNavProps {
    isCollapsed?: boolean;
    onToggle?: () => void;
}

const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Courses', href: '/courses', icon: BookOpen },
    { name: 'AI Tutor', href: '/ai-tutor', icon: Brain },
    { name: 'Tests', href: '/mock-tests', icon: GraduationCap },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
];

const aiTools = [
    { name: 'AI Tutor', href: '/ai-tutor', icon: Brain, color: 'bg-purple-500' },
    { name: 'Question Solver', href: '/ai-question-solver', icon: FileQuestion, color: 'bg-blue-500' },
    { name: 'Voice Doubt', href: '/ai-voice-doubt', icon: Mic, color: 'bg-green-500' },
    { name: 'Adaptive Learning', href: '/ai-adaptive', icon: Target, color: 'bg-amber-500' },
    { name: 'Knowledge Graph', href: '/ai-knowledge-graph', icon: Lightbulb, color: 'bg-pink-500' },
    { name: 'Rank Simulator', href: '/ai-rank-simulator', icon: TrendingUp, color: 'bg-red-500' },
];

export function MobileBottomNav({ isCollapsed = false, onToggle }: MobileNavProps) {
    const pathname = usePathname();
    const [showAITools, setShowAITools] = useState(false);

    const hideOnPaths = ['/login', '/signup', '/admin', '/super-admin', '/dashboard/parent', '/exam'];
    const shouldHide = hideOnPaths.some(path => pathname.startsWith(path));

    if (shouldHide) return null;

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden safe-area-bottom">
                <div className="flex items-center justify-around h-16 px-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || 
                            (item.href !== '/' && pathname.startsWith(item.href));
                        
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all duration-200 min-w-[64px] touch-manipulation ${
                                    isActive 
                                        ? 'text-primary-600' 
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-primary-100' : ''}`}>
                                    <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className="text-[11px] font-medium mt-1">{item.name}</span>
                            </Link>
                        );
                    })}
                    
                    <button
                        onClick={() => setShowAITools(!showAITools)}
                        className={`flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all duration-200 min-w-[64px] touch-manipulation ${
                            showAITools 
                                ? 'text-purple-600' 
                                : 'text-slate-500 hover:text-purple-600'
                        }`}
                    >
                        <div className={`p-1.5 ${showAITools ? 'bg-purple-100' : ''} rounded-lg transition-colors`}>
                            <Sparkles className="w-6 h-6" strokeWidth={showAITools ? 2.5 : 2} />
                        </div>
                        <span className="text-[11px] font-medium mt-1">AI</span>
                    </button>
                </div>
            </nav>

            {showAITools && (
                <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowAITools(false)}>
                    <div className="absolute bottom-20 left-2 right-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                        <div className="p-4 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-600" />
                                    SaviTech AI Tools
                                </h3>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowAITools(false);
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-lg touch-manipulation"
                                >
                                    <ChevronUp className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 grid grid-cols-3 gap-3">
                            {aiTools.map((tool) => {
                                const Icon = tool.icon;
                                return (
                                    <Link
                                        key={tool.name}
                                        href={tool.href}
                                        onClick={() => setShowAITools(false)}
                                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors touch-manipulation min-h-[88px]"
                                    >
                                        <div className={`p-3 rounded-xl ${tool.color} shadow-md`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="text-xs font-medium text-slate-700 text-center">{tool.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="h-20 md:hidden" />
        </>
    );
}

export function MobileHeader() {
    const pathname = usePathname();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    
    const hideOnPaths = ['/login', '/signup', '/admin', '/super-admin', '/exam', '/online-exam'];
    const shouldHide = hideOnPaths.some(path => pathname.startsWith(path));

    if (shouldHide) return null;

    return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 md:hidden">
            <div className="flex items-center justify-between h-14 px-3">
                <Link href="/" className="flex items-center gap-2 touch-manipulation">
                    <span className="font-black text-lg tracking-tight">
                        <span className="text-amber-500">Savi</span>
                        <span className="text-sky-500">EduTech</span>
                    </span>
                </Link>
                
                <div className="flex items-center gap-1">
                    <Link 
                        href="/search"
                        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl touch-manipulation"
                        aria-label="Search"
                    >
                        <SearchIcon className="w-5 h-5" />
                    </Link>
                    <Link 
                        href="/notifications"
                        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl touch-manipulation relative"
                        aria-label="Notifications"
                    >
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                    </Link>
                    <Link 
                        href="/dashboard"
                        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl touch-manipulation"
                        aria-label="Profile"
                    >
                        <User className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </header>
    );
}

export function MobileAIFloatingButton() {
    const pathname = usePathname();
    
    // Hide on certain pages
    const hideOnPaths = ['/login', '/signup', '/admin', '/super-admin', '/ai-tutor'];
    const shouldHide = hideOnPaths.some(path => pathname.startsWith(path));

    if (shouldHide) return null;

    return (
        <Link
            href="/ai-tutor"
            className="fixed right-4 bottom-24 z-40 md:hidden bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 animate-bounce"
        >
            <MessageCircle className="w-6 h-6" />
        </Link>
    );
}

export default MobileBottomNav;
