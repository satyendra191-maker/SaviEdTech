'use client';

import { usePathname } from 'next/navigation';
import { Sparkles, Trophy, Clock, Target } from 'lucide-react';

const notices = [
    {
        icon: Trophy,
        text: 'National Daily Challenge Live Now!',
        color: 'text-amber-400',
    },
    {
        icon: Target,
        text: 'Free JEE/NEET Practice Tests Available',
        color: 'text-green-400',
    },
    {
        icon: Sparkles,
        text: 'New Physics Lectures Added by Dharmendra Sir',
        color: 'text-blue-400',
    },
    {
        icon: Clock,
        text: 'Daily Practice Problems Updated at 2:30 AM',
        color: 'text-purple-400',
    },
];

export function NoticeBar() {
    const pathname = usePathname();

    const isDashboardRoute = pathname?.startsWith('/dashboard') ||
        pathname?.startsWith('/admin') ||
        pathname?.startsWith('/super-admin') ||
        pathname?.startsWith('/faculty-dashboard') ||
        pathname?.startsWith('/auth/callback');

    if (isDashboardRoute) return null;

    return (
        <div className="bg-indigo-900 border-b border-indigo-800 py-2 overflow-hidden relative group">
            <div className="flex animate-scroll-left whitespace-nowrap hover:[animation-play-state:paused]">
                {/* Duplicate the list to create a seamless loop */}
                {[...notices, ...notices].map((notice, index) => {
                    const Icon = notice.icon;
                    return (
                        <div key={index} className="inline-flex items-center gap-2 px-12 border-r border-indigo-700/30">
                            <Icon className={`w-4 h-4 ${notice.color}`} />
                            <span className="text-sm font-medium text-indigo-100">
                                {notice.text}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
