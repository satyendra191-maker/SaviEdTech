'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface TimerProps {
    durationMinutes: number;
    onTimeUp: () => void;
    onWarning?: (minutesRemaining: number) => void;
    className?: string;
    initialTimeRemainingSeconds?: number;
    timeRemainingSeconds?: number;
}

export function Timer({
    durationMinutes,
    onTimeUp,
    onWarning,
    className = '',
    initialTimeRemainingSeconds,
    timeRemainingSeconds,
}: TimerProps) {
    const isControlled = typeof timeRemainingSeconds === 'number';
    const [internalTimeRemaining, setInternalTimeRemaining] = useState(initialTimeRemainingSeconds ?? durationMinutes * 60);
    const warningStateRef = useRef({ warnedAtFive: false, warnedAtOne: false, timeUp: false });

    const formatTime = useCallback((seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    useEffect(() => {
        if (!isControlled) {
            setInternalTimeRemaining(initialTimeRemainingSeconds ?? durationMinutes * 60);
        }
        warningStateRef.current = {
            warnedAtFive: false,
            warnedAtOne: false,
            timeUp: false,
        };
    }, [durationMinutes, initialTimeRemainingSeconds, isControlled]);

    const currentTimeRemaining = Math.max(
        0,
        isControlled ? (timeRemainingSeconds ?? 0) : internalTimeRemaining
    );
    const isWarning = currentTimeRemaining <= 300 && currentTimeRemaining > 60;
    const isCritical = currentTimeRemaining <= 60;

    useEffect(() => {
        if (currentTimeRemaining <= 300 && currentTimeRemaining > 60 && !warningStateRef.current.warnedAtFive) {
            warningStateRef.current.warnedAtFive = true;
            onWarning?.(5);
        }

        if (currentTimeRemaining <= 60 && currentTimeRemaining > 0 && !warningStateRef.current.warnedAtOne) {
            warningStateRef.current.warnedAtOne = true;
            onWarning?.(1);
        }
    }, [currentTimeRemaining, onWarning]);

    useEffect(() => {
        if (isControlled) {
            return undefined;
        }

        const timer = setInterval(() => {
            setInternalTimeRemaining((prev) => {
                const newTime = prev - 1;

                if (newTime <= 0) {
                    clearInterval(timer);
                    if (!warningStateRef.current.timeUp) {
                        warningStateRef.current.timeUp = true;
                        onTimeUp();
                    }
                    return 0;
                }

                return newTime;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isControlled, onTimeUp]);

    const getTimerStyles = () => {
        if (isCritical) {
            return 'bg-red-100 text-red-700 border-red-300 animate-pulse';
        }
        if (isWarning) {
            return 'bg-orange-100 text-orange-700 border-orange-300';
        }
        return 'bg-white text-gray-900 border-gray-200';
    };

    const getIconColor = () => {
        if (isCritical) return 'text-red-600';
        if (isWarning) return 'text-orange-600';
        return 'text-gray-500';
    };

    return (
        <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-mono text-lg font-semibold transition-all duration-300 ${getTimerStyles()} ${className}`}
        >
            {isCritical ? (
                <AlertCircle className={`w-5 h-5 ${getIconColor()}`} />
            ) : (
                <Clock className={`w-5 h-5 ${getIconColor()}`} />
            )}
            <span>{formatTime(currentTimeRemaining)}</span>
            {(isWarning || isCritical) && (
                <span className="text-xs font-medium ml-1 hidden sm:inline">
                    remaining
                </span>
            )}
        </div>
    );
}

export default Timer;
