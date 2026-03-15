'use client';

import { useEffect, useState } from 'react';
import { Logo } from '@/components/brand/Logo';

type LogoSize = 'sm' | 'md' | 'lg' | 'custom';

interface AnimatedLogoProps {
    size?:        LogoSize;
    showText?:    boolean;
    showTagline?: boolean;
    className?:   string;
}

/**
 * AnimatedLogo — wraps the brand Logo with a float animation for hero sections.
 * Drop-in replacement for the old animated-logo (same props API).
 */
export function AnimatedLogo({
    size        = 'md',
    showText    = true,
    showTagline = false,
    className   = '',
}: AnimatedLogoProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const variant = showText ? 'full' : 'icon';

    return (
        <div
            className={`inline-flex items-center gap-3 ${mounted ? 'animate-float' : ''} ${className}`}
        >
            <Logo
                size={size}
                variant={variant}
                theme="light"
            />
        </div>
    );
}

export default AnimatedLogo;
