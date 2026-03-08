import { useId } from 'react';

interface BrandLogoProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    showText?: boolean;
    showTagline?: boolean;
    taglineTone?: 'dark' | 'gradient';
    wordmarkTone?: 'dark' | 'gradient';
    iconClassName?: string;
    className?: string;
}

const iconSizeClasses = {
    xs: 'h-10 w-10',
    sm: 'h-12 w-12',
    md: 'h-14 w-14',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20',
    '2xl': 'h-28 w-28',
};

const wordmarkSizeClasses = {
    xs: 'text-xl',
    sm: 'text-2xl',
    md: 'text-[2rem]',
    lg: 'text-[2.4rem]',
    xl: 'text-[3rem]',
    '2xl': 'text-[4.5rem]',
};

const taglineSizeClasses = {
    xs: 'text-[0.58rem]',
    sm: 'text-[0.64rem]',
    md: 'text-[0.68rem]',
    lg: 'text-[0.74rem]',
    xl: 'text-[0.82rem]',
    '2xl': 'text-base',
};

export function BrandLogo({
    size = 'md',
    showText = true,
    showTagline = true,
    taglineTone = 'gradient',
    wordmarkTone = 'gradient',
    iconClassName = '',
    className = '',
}: BrandLogoProps) {
    const id = useId().replace(/:/g, '');
    const shellGradient = `${id}-shell-gradient`;
    const shellStroke = `${id}-shell-stroke`;
    const liquidGradient = `${id}-liquid-gradient`;
    const liquidGlow = `${id}-liquid-glow`;
    const glassGradient = `${id}-glass-gradient`;
    const capGradient = `${id}-cap-gradient`;
    const capTopGradient = `${id}-cap-top-gradient`;
    const moleculeGradient = `${id}-molecule-gradient`;
    const glowFilter = `${id}-glow-filter`;
    const shadowFilter = `${id}-shadow-filter`;

    return (
        <div className={`inline-flex items-center gap-3 ${className}`}>
            <svg
                viewBox="0 0 180 200"
                aria-hidden="true"
                className={`${iconSizeClasses[size]} shrink-0 overflow-visible ${iconClassName}`}
            >
                <defs>
                    <linearGradient id={shellGradient} x1="20%" y1="10%" x2="80%" y2="95%">
                        <stop offset="0%" stopColor="#45a5ff" />
                        <stop offset="48%" stopColor="#0f4fbc" />
                        <stop offset="100%" stopColor="#072d74" />
                    </linearGradient>
                    <linearGradient id={shellStroke} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#76c9ff" />
                        <stop offset="100%" stopColor="#1947ac" />
                    </linearGradient>
                    <linearGradient id={liquidGradient} x1="15%" y1="15%" x2="85%" y2="95%">
                        <stop offset="0%" stopColor="#ffd15a" />
                        <stop offset="55%" stopColor="#ff8a00" />
                        <stop offset="100%" stopColor="#ff5a00" />
                    </linearGradient>
                    <radialGradient id={liquidGlow} cx="50%" cy="35%" r="75%">
                        <stop offset="0%" stopColor="#fff4b5" />
                        <stop offset="38%" stopColor="#ffc83d" />
                        <stop offset="100%" stopColor="#ff8a00" />
                    </radialGradient>
                    <linearGradient id={glassGradient} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
                        <stop offset="100%" stopColor="#d7ecff" stopOpacity="0.82" />
                    </linearGradient>
                    <linearGradient id={capGradient} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2b86f6" />
                        <stop offset="55%" stopColor="#0e4aa5" />
                        <stop offset="100%" stopColor="#061f52" />
                    </linearGradient>
                    <linearGradient id={capTopGradient} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1d4fba" />
                        <stop offset="100%" stopColor="#06193d" />
                    </linearGradient>
                    <linearGradient id={moleculeGradient} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffd45f" />
                        <stop offset="45%" stopColor="#ff9c00" />
                        <stop offset="100%" stopColor="#ff6500" />
                    </linearGradient>
                    <filter id={glowFilter} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id={shadowFilter} x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#03132f" floodOpacity="0.38" />
                    </filter>
                </defs>

                <ellipse cx="90" cy="180" rx="58" ry="9" fill="#07234f" fillOpacity="0.28" />

                <g filter={`url(#${shadowFilter})`}>
                    <path
                        d="M88 25 L34 49 C30 51 30 56 35 58 L80 71 C86 73 94 73 100 71 L145 58 C150 56 150 51 146 49 Z"
                        fill={`url(#${capTopGradient})`}
                    />
                    <path
                        d="M52 56 C52 44 64 35 90 35 C116 35 128 44 128 56 V70 C128 81 116 88 90 88 C64 88 52 81 52 70 Z"
                        fill={`url(#${capGradient})`}
                    />
                    <path d="M140 57 L140 92" stroke="#164baf" strokeWidth="4" strokeLinecap="round" />
                    <rect x="134" y="92" width="12" height="18" rx="3" fill={`url(#${capGradient})`} />
                </g>

                <g fill={`url(#${moleculeGradient})`} stroke="#ffbe52" strokeWidth="1.4" filter={`url(#${glowFilter})`}>
                    <line x1="86" y1="9" x2="98" y2="16" />
                    <line x1="86" y1="9" x2="77" y2="19" />
                    <line x1="98" y1="16" x2="110" y2="12" />
                    <line x1="98" y1="16" x2="94" y2="28" />
                    <line x1="77" y1="19" x2="67" y2="13" />
                    <circle cx="86" cy="9" r="4.5" />
                    <circle cx="98" cy="16" r="4.2" />
                    <circle cx="77" cy="19" r="4" />
                    <circle cx="110" cy="12" r="4" />
                    <circle cx="94" cy="28" r="4" />
                    <circle cx="67" cy="13" r="3.5" />
                </g>

                <g filter={`url(#${shadowFilter})`}>
                    <path
                        d="M66 71 L66 113 C66 120 62 128 57 135 L39 157 C33 164 38 174 49 174 H131 C142 174 147 164 141 157 L123 135 C118 128 114 120 114 113 V71 Z"
                        fill={`url(#${shellGradient})`}
                    />
                    <path
                        d="M76 72 L76 109 C76 115 73 121 69 127 L53 149 C49 154 53 160 60 160 H120 C127 160 131 154 127 149 L111 127 C107 121 104 115 104 109 V72 Z"
                        fill={`url(#${glassGradient})`}
                        stroke={`url(#${shellStroke})`}
                        strokeWidth="3"
                    />
                    <path
                        d="M54 149 C50 154 54 160 60 160 H120 C126 160 130 154 126 149 L115 132 C111 126 107 121 104 116 H76 C73 121 69 126 65 132 Z"
                        fill={`url(#${liquidGradient})`}
                    />
                    <path
                        d="M64 147 C60 151 63 156 68 156 H112 C117 156 120 151 116 147 L110 139 C106 133 101 129 96 125 H84 C79 129 74 133 70 139 Z"
                        fill={`url(#${liquidGlow})`}
                        fillOpacity="0.55"
                    />
                    <path
                        d="M76 72 L83 72 L73 143 C71 149 66 151 61 149 Z"
                        fill="#ffffff"
                        fillOpacity="0.3"
                    />
                    <path
                        d="M109 83 C110 95 111 109 119 125 L127 141"
                        fill="none"
                        stroke="#ffffff"
                        strokeOpacity="0.3"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    <rect x="57" y="172" width="66" height="10" rx="4" fill={`url(#${shellGradient})`} />
                </g>

                <g fill={`url(#${moleculeGradient})`} filter={`url(#${glowFilter})`}>
                    <circle cx="90" cy="118" r="10" />
                    <circle cx="70" cy="108" r="6.5" />
                    <circle cx="112" cy="107" r="7" />
                    <circle cx="80" cy="93" r="4.5" />
                    <circle cx="103" cy="95" r="4.5" />
                    <circle cx="69" cy="136" r="5.5" />
                    <circle cx="106" cy="136" r="5.5" />
                    <circle cx="90" cy="72" r="4" />
                    <circle cx="80" cy="86" r="5" />
                    <circle cx="101" cy="80" r="4" />
                </g>
            </svg>

            {showText ? (
                <div className="flex min-w-0 flex-col items-start leading-none">
                    <div className={`font-black tracking-[-0.05em] ${wordmarkSizeClasses[size]}`}>
                        <span
                            className={
                                wordmarkTone === 'dark'
                                    ? 'text-[#b45309]'
                                    : 'bg-gradient-to-b from-[#ffb545] via-[#ff8900] to-[#d75600] bg-clip-text text-transparent [text-shadow:0_2px_12px_rgba(255,126,0,0.22)]'
                            }
                        >
                            Savi
                        </span>
                        <span
                            className={
                                wordmarkTone === 'dark'
                                    ? 'text-[#1e3a8a]'
                                    : 'bg-gradient-to-b from-[#66c8ff] via-[#1d8fff] to-[#0a4db7] bg-clip-text text-transparent [text-shadow:0_2px_14px_rgba(33,128,255,0.22)]'
                            }
                        >
                            EduTech
                        </span>
                    </div>
                    {showTagline ? (
                        <div
                            className={
                                taglineTone === 'dark'
                                    ? `mt-1 font-semibold tracking-[0.06em] text-slate-700 ${taglineSizeClasses[size]}`
                                    : `mt-1 bg-gradient-to-r from-[#5ca8ff] via-[#83c8ff] to-[#ffbf62] bg-clip-text font-semibold tracking-[0.06em] text-transparent ${taglineSizeClasses[size]}`
                            }
                        >
                            Innovate. Learn. Grow.
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
