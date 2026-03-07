'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AnimatedLogoProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    showText?: boolean;
    showTagline?: boolean;
    className?: string;
}

const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    '2xl': 'w-48 h-48',
};

const textSizeClasses = {
    xs: 'text-sm',
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
    '2xl': 'text-5xl',
};

const taglineSizeClasses = {
    xs: 'text-[8px]',
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
    '2xl': 'text-lg',
};

export function AnimatedLogo({ size = 'md', showText = true, showTagline = true, className = '' }: AnimatedLogoProps) {
    // Use mounted state to prevent hydration mismatch
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Render static SVG during SSR and initial render to avoid hydration mismatch
    const logoSvg = (
        <div className={`relative ${sizeClasses[size]} drop-shadow-2xl`}>
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-900 to-black rounded-full blur-xl opacity-80" />

            {/* Main 3D Online Study Icon Container */}
            <svg
                viewBox="0 0 100 100"
                className={`${sizeClasses[size]} relative z-10 filter drop-shadow-lg`}
            >
                <defs>
                    <linearGradient id="atomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e293b" />
                        <stop offset="50%" stopColor="#334155" />
                        <stop offset="100%" stopColor="#475569" />
                    </linearGradient>
                    <linearGradient id="electronGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0891b2" />
                        <stop offset="100%" stopColor="#0e7490" />
                    </linearGradient>
                    <linearGradient id="studyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#db2777" />
                        <stop offset="50%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="shadow">
                        <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.5" />
                    </filter>
                    <filter id="innerShadow">
                        <feOffset dx="0" dy="2" />
                        <feGaussianBlur stdDeviation="2" result="offset-blur" />
                        <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                        <feFlood floodColor="black" floodOpacity="0.3" result="color" />
                        <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                        <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                    </filter>
                </defs>

                {/* Central sphere - representing online learning platform */}
                <circle cx="50" cy="50" r="22" fill="url(#atomGradient)" filter="url(#glow)" />

                {/* Inner highlight */}
                <circle cx="42" cy="42" r="8" fill="white" opacity="0.3" />

                {/* Orbit rings - representing global connectivity */}
                <ellipse cx="50" cy="50" rx="32" ry="12" fill="none" stroke="url(#electronGradient)" strokeWidth="1.5" transform="rotate(0 50 50)" opacity="0.8" />
                <ellipse cx="50" cy="50" rx="32" ry="12" fill="none" stroke="url(#studyGradient)" strokeWidth="1.5" transform="rotate(60 50 50)" opacity="0.8" />
                <ellipse cx="50" cy="50" rx="32" ry="12" fill="none" stroke="#f472b6" strokeWidth="1.5" transform="rotate(-60 50 50)" opacity="0.8" />

                {/* Electrons on orbits */}
                <circle cx="82" cy="50" r="3" fill="#22d3ee" filter="url(#glow)" />
                <circle cx="34" cy="77.7" r="3" fill="#a855f7" filter="url(#glow)" />
                <circle cx="34" cy="22.3" r="3" fill="#f472b6" filter="url(#glow)" />

                {/* Book/Study symbol in center */}
                <g transform="translate(42, 42)">
                    <path d="M2 4 L8 1 L14 4 L14 12 L8 15 L2 12 Z" fill="#ffffff" opacity="0.95" filter="url(#shadow)" />
                    <path d="M2 4 L8 7 L14 4" fill="none" stroke="#8b5cf6" strokeWidth="0.5" />
                    <rect x="5" y="8" width="6" height="1" fill="#c4b5fd" />
                    <rect x="5" y="10" width="5" height="1" fill="#c4b5fd" />
                </g>

                {/* Decorative dots around */}
                <circle cx="15" cy="25" r="2" fill="#22d3ee" opacity="0.6" />
                <circle cx="85" cy="25" r="2" fill="#8b5cf6" opacity="0.6" />
                <circle cx="15" cy="75" r="2" fill="#f472b6" opacity="0.6" />
                <circle cx="85" cy="75" r="2" fill="#3b82f6" opacity="0.6" />
            </svg>
        </div>
    );

    const textContent = showText && (
        <div className="flex flex-col items-start">
            <div className={`font-black ${textSizeClasses[size]} bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-lg`}>
                SaviEduTech
            </div>
            {showTagline && (
                <div className={`font-bold ${taglineSizeClasses[size]} bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent drop-shadow-md`}>
                    JEE • NEET • BOARD
                </div>
            )}
        </div>
    );

    // On server/initial render, return static content without state-dependent elements
    if (!mounted) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                {logoSvg}
                {textContent}
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {logoSvg}
            {textContent}
        </div>
    );
}
