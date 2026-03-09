'use client';

import { useEffect, useState, useCallback } from 'react';

interface ScreenshotProtectionProps {
    children: React.ReactNode;
    enabled?: boolean;
    blurOnCapture?: boolean;
}

export function ScreenshotProtection({
    children,
    enabled = true,
    blurOnCapture = true,
}: ScreenshotProtectionProps) {
    const [isCaptured, setIsCaptured] = useState(false);

    const handleCapture = useCallback(() => {
        if (!enabled) return;
        
        setIsCaptured(true);
        
        if (blurOnCapture) {
            document.body.style.filter = 'blur(20px)';
            document.body.style.overflow = 'hidden';
        }
    }, [enabled, blurOnCapture]);

    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                handleCapture();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        const originalImage = Image;
        const ImageWithProtection = class extends originalImage {
            constructor() {
                super();
                handleCapture();
            }
        };

        let mediaStream: MediaStream | null = null;

        const initScreenCaptureDetection = async () => {
            if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
                try {
                    navigator.mediaDevices.addEventListener('startstreaming', (event: any) => {
                        const stream = event.stream;
                        if (stream) {
                            handleCapture();
                        }
                    });
                } catch (e) {
                    // Ignore errors
                }
            }
        };

        initScreenCaptureDetection();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.body.style.filter = '';
            document.body.style.overflow = '';
            setIsCaptured(false);
        };
    }, [enabled, handleCapture]);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                (e.key === 'PrintScreen') ||
                (e.key === 'SysReq') ||
                (e.key === 'F12' && (e.ctrlKey || e.metaKey)) ||
                ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) ||
                ((e.key === 'u' || e.key === 'U') && (e.ctrlKey || e.metaKey)) ||
                ((e.key === 'i' || e.key === 'I') && (e.ctrlKey || e.metaKey)) ||
                ((e.key === 'j' || e.key === 'J') && (e.ctrlKey || e.metaKey))
            ) {
                e.preventDefault();
                handleCapture();
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [enabled, handleCapture]);

    if (!enabled) {
        return <>{children}</>;
    }

    if (isCaptured && blurOnCapture) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950">
                <div className="text-center p-8">
                    <div className="mb-4 text-6xl">🔒</div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        Content Protected
                    </h2>
                    <p className="text-slate-400">
                        Screen capture and recording are disabled on this platform.
                    </p>
                    <p className="text-slate-500 mt-4 text-sm">
                        This is to protect our intellectual property and ensure fair exam practice.
                    </p>
                    <button
                        onClick={() => {
                            setIsCaptured(false);
                            document.body.style.filter = '';
                            document.body.style.overflow = '';
                        }}
                        className="mt-6 px-6 py-2 bg-sky-600 text-white rounded-full font-semibold hover:bg-sky-500 transition-colors"
                    >
                        Continue Viewing
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

export function useScreenshotProtection() {
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                (e.key === 'PrintScreen') ||
                (e.key === 'SysReq') ||
                (e.key === 'F12' && (e.ctrlKey || e.metaKey)) ||
                ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) ||
                ((e.key === 'u' || e.key === 'U') && (e.ctrlKey || e.metaKey))
            ) {
                e.preventDefault();
                setIsBlocked(true);
                setTimeout(() => setIsBlocked(false), 100);
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            setIsBlocked(true);
            setTimeout(() => setIsBlocked(false), 100);
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    return { isBlocked };
}
