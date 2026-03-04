'use client';

import { useEffect, useState } from 'react';
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
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % notices.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [isPaused]);

    const currentNotice = notices[currentIndex];
    const Icon = currentNotice.icon;

    return (
        <div
            className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-2.5 px-4 overflow-hidden relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-center gap-3 animate-fade-in">
                    <Icon className={`w-4 h-4 ${currentNotice.color} flex-shrink-0`} />
                    <span className="text-sm font-medium text-center">
                        {currentNotice.text}
                    </span>
                    <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
                    <span className="hidden sm:inline text-xs text-white/70">
                        Join 100,000+ students preparing with SaviEduTech
                    </span>
                </div>
            </div>

            {/* Scrolling gradient overlay for mobile */}
            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
        </div>
    );
}