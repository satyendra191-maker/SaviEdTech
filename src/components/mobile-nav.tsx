'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    BookOpen,
    GraduationCap,
    Trophy,
    User,
    Menu,
    Bell,
    Search as SearchIcon,
} from 'lucide-react';

interface MobileNavProps {
    isCollapsed?: boolean;
    onToggle?: () => void;
}

const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Courses', href: '/courses', icon: BookOpen },
    { name: 'Tests', href: '/mock-tests', icon: GraduationCap },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
];

export function MobileBottomNav({ isCollapsed = false, onToggle }: MobileNavProps) {
    const pathname = usePathname();

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
                </div>
            </nav>
            
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

export default MobileBottomNav;
