'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AnimatedLogoProps {
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
    className?: string;
}

const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
};

const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
};

export function AnimatedLogo({ size = 'md', showText = true, className = '' }: AnimatedLogoProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <Link href="/" className={`flex items-center gap-2 ${className}`}>
            <div className={`relative ${sizeClasses[size]}`}>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-lg opacity-50 animate-pulse" />
                
                {/* Main atom container */}
                <svg
                    viewBox="0 0 100 100"
                    className={`${sizeClasses[size]} relative z-10`}
                    style={{ animation: isVisible ? 'float 3s ease-in-out infinite' : 'none' }}
                >
                    {/* Background circle */}
                    <defs>
                        <linearGradient id="atomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="50%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                        <linearGradient id="electronGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Nucleus */}
                    <circle
                        cx="50"
                        cy="50"
                        r="12"
                        fill="url(#atomGradient)"
                        filter="url(#glow)"
                        className="animate-pulse"
                    />

                    {/* Orbit paths */}
                    <ellipse
                        cx="50"
                        cy="50"
                        rx="35"
                        ry="15"
                        fill="none"
                        stroke="rgba(59, 130, 246, 0.3)"
                        strokeWidth="1"
                        style={{ 
                            transformOrigin: 'center',
                            animation: 'rotate3d 8s linear infinite',
                            transform: 'rotateX(60deg)'
                        }}
                    />
                    <ellipse
                        cx="50"
                        cy="50"
                        rx="35"
                        ry="15"
                        fill="none"
                        stroke="rgba(6, 182, 212, 0.3)"
                        strokeWidth="1"
                        style={{ 
                            transformOrigin: 'center',
                            animation: 'rotate3d 8s linear infinite',
                            animationDelay: '-2.67s',
                            transform: 'rotateX(60deg) rotateY(120deg)'
                        }}
                    />
                    <ellipse
                        cx="50"
                        cy="50"
                        rx="35"
                        ry="15"
                        fill="none"
                        stroke="rgba(139, 92, 246, 0.3)"
                        strokeWidth="1"
                        style={{ 
                            transformOrigin: 'center',
                            animation: 'rotate3d 8s linear infinite',
                            animationDelay: '-5.33s',
                            transform: 'rotateX(60deg) rotateY(240deg)'
                        }}
                    />

                    {/* Orbiting electrons */}
                    <g style={{ transformOrigin: '50px 50px' }}>
                        {/* Electron 1 */}
                        <circle
                            r="5"
                            fill="url(#electronGradient)"
                            filter="url(#glow)"
                            style={{
                                animation: 'orbit1 3s linear infinite',
                            }}
                        />
                    </g>
                    <g style={{ transformOrigin: '50px 50px' }}>
                        {/* Electron 2 */}
                        <circle
                            r="4"
                            fill="url(#electronGradient)"
                            filter="url(#glow)"
                            style={{
                                animation: 'orbit2 3s linear infinite',
                                animationDelay: '-1s',
                            }}
                        />
                    </g>
                    <g style={{ transformOrigin: '50px 50px' }}>
                        {/* Electron 3 */}
                        <circle
                            r="4"
                            fill="url(#electronGradient)"
                            filter="url(#glow)"
                            style={{
                                animation: 'orbit3 3s linear infinite',
                                animationDelay: '-2s',
                            }}
                        />
                    </g>

                    {/* Tech circuit lines */}
                    <path
                        d="M50 38 L50 25 M50 62 L50 75 M38 50 L25 50 M62 50 L75 50"
                        stroke="rgba(34, 211, 238, 0.5)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                        className="animate-pulse"
                    />
                </svg>
            </div>

            {showText && (
                <div className={`font-bold ${textSizeClasses[size]} bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent whitespace-nowrap`}>
                    SaviEduTech
                </div>
            )}

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                
                @keyframes orbit1 {
                    0% { 
                        transform: rotate(0deg) translateX(35px) rotate(0deg);
                    }
                    100% { 
                        transform: rotate(360deg) translateX(35px) rotate(-360deg);
                    }
                }

                @keyframes orbit2 {
                    0% { 
                        transform: rotate(120deg) translateX(35px) rotate(-120deg);
                    }
                    100% { 
                        transform: rotate(480deg) translateX(35px) rotate(-480deg);
                    }
                }

                @keyframes orbit3 {
                    0% { 
                        transform: rotate(240deg) translateX(35px) rotate(-240deg);
                    }
                    100% { 
                        transform: rotate(600deg) translateX(35px) rotate(-600deg);
                    }
                }

                @keyframes rotate3d {
                    from { transform: rotateX(60deg) rotateZ(0deg); }
                    to { transform: rotateX(60deg) rotateZ(360deg); }
                }
            `}</style>
        </Link>
    );
}

export default AnimatedLogo;
