'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, Bell, ArrowRight } from 'lucide-react';

export function NotificationBar() {
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDashboardRoute = pathname?.startsWith('/dashboard') ||
        pathname?.startsWith('/admin') ||
        pathname?.startsWith('/super-admin') ||
        pathname?.startsWith('/faculty-dashboard') ||
        pathname?.startsWith('/auth/callback');

    // Only hide after mount on dashboard routes, otherwise show
    if (!mounted) {
        return (
            <div className="relative bg-slate-900 text-white py-2 px-4 text-center border-b border-slate-800">
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                    <Bell className="w-4 h-4 text-cyan-400" />
                    <p className="text-sm font-medium">
                        <span className="hidden sm:inline">JEE Main 2026 Crash Course starts in 2 days! </span>
                        <span className="sm:hidden">JEE Crash Course starts soon! </span>
                        <button className="underline font-bold hover:text-cyan-300 transition-colors ml-1">
                            Enroll Now
                        </button>
                    </p>
                    <ArrowRight className="w-4 h-4 hidden sm:block text-cyan-400" />
                </div>
            </div>
        );
    }

    if (isDashboardRoute) return null;

    return (
        <div className="relative bg-slate-900 text-white py-2 px-4 text-center border-b border-slate-800">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                <Bell className="w-4 h-4 text-cyan-400" />
                <p className="text-sm font-medium">
                    <span className="hidden sm:inline">JEE Main 2026 Crash Course starts in 2 days! </span>
                    <span className="sm:hidden">JEE Crash Course starts soon! </span>
                    <button className="underline font-bold hover:text-cyan-300 transition-colors ml-1">
                        Enroll Now
                    </button>
                </p>
                <ArrowRight className="w-4 h-4 hidden sm:block text-cyan-400" />
            </div>
            <button
                onClick={() => setIsVisible(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Close notification"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
