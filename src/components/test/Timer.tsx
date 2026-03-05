'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface TimerProps {
    durationMinutes: number;
    onTimeUp: () => void;
    onWarning?: (minutesRemaining: number) => void;
    className?: string;
}

export function Timer({ durationMinutes, onTimeUp, onWarning, className = '' }: TimerProps) {
    const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60);
    const [isWarning, setIsWarning] = useState(false);
    const [isCritical, setIsCritical] = useState(false);

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
        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                const newTime = prev - 1;

                // Check for warning thresholds
                if (newTime === 300) { // 5 minutes
                    setIsWarning(true);
                    onWarning?.(5);
                } else if (newTime === 60) { // 1 minute
                    setIsCritical(true);
                    onWarning?.(1);
                }

                // Time's up
                if (newTime <= 0) {
                    clearInterval(timer);
                    onTimeUp();
                    return 0;
                }

                return newTime;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onTimeUp, onWarning]);

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
            <span>{formatTime(timeRemaining)}</span>
            {(isWarning || isCritical) && (
                <span className="text-xs font-medium ml-1 hidden sm:inline">
                    remaining
                </span>
            )}
        </div>
    );
}

export default Timer;
