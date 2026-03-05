'use client';

import React, { useEffect, useState } from 'react';
import { Flame, Trophy, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { getUserStreak, getStreakMilestones, getStreakStatusMessage, hasActiveStreakToday, type StreakUpdateResult } from '@/lib/gamification/streaks';
import { cn } from '@/lib/utils';

interface StreakDisplayProps {
    userId: string;
    variant?: 'compact' | 'full' | 'minimal';
    className?: string;
    onStreakUpdate?: (result: StreakUpdateResult) => void;
}

interface StreakData {
    currentStreak: number;
    longestStreak: number;
    isActiveToday: boolean;
    nextMilestone: number;
    milestoneProgress: number;
    statusMessage: string;
}

export function StreakDisplay({
    userId,
    variant = 'full',
    className,
    onStreakUpdate,
}: StreakDisplayProps) {
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAnimation, setShowAnimation] = useState(false);

    useEffect(() => {
        loadStreakData();
    }, [userId]);

    const loadStreakData = async () => {
        try {
            setLoading(true);
            const [streakInfo, isActiveToday] = await Promise.all([
                getUserStreak(userId),
                hasActiveStreakToday(userId),
            ]);

            const milestones = getStreakMilestones(streakInfo.currentStreak);
            const statusMessage = getStreakStatusMessage(streakInfo.currentStreak);

            setStreakData({
                currentStreak: streakInfo.currentStreak,
                longestStreak: streakInfo.longestStreak,
                isActiveToday,
                nextMilestone: milestones.nextMilestone,
                milestoneProgress: milestones.progress,
                statusMessage,
            });
        } catch (error) {
            console.error('Error loading streak data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={cn('animate-pulse', className)}>
                <div className="h-24 bg-muted rounded-lg" />
            </div>
        );
    }

    if (!streakData) {
        return null;
    }

    const { currentStreak, longestStreak, isActiveToday, nextMilestone, milestoneProgress, statusMessage } = streakData;

    // Minimal variant
    if (variant === 'minimal') {
        return (
            <div className={cn('flex items-center gap-2', className)}>
                <Flame
                    className={cn(
                        'h-5 w-5',
                        currentStreak > 0 ? 'text-orange-500' : 'text-gray-400'
                    )}
                />
                <span className="font-semibold">{currentStreak}</span>
            </div>
        );
    }

    // Compact variant
    if (variant === 'compact') {
        return (
            <div
                className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border bg-card transition-all duration-300',
                    isActiveToday ? 'border-orange-200 bg-orange-50/50' : 'border-gray-200',
                    className
                )}
            >
                <div className="relative">
                    <div className={cn(
                        'transition-transform duration-300',
                        currentStreak > 0 && 'animate-pulse'
                    )}>
                        <Flame
                            className={cn(
                                'h-8 w-8',
                                currentStreak > 0 ? 'text-orange-500' : 'text-gray-400'
                            )}
                        />
                    </div>
                    {isActiveToday && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                </div>
                <div>
                    <p className="font-bold text-lg leading-tight">
                        {currentStreak} Day{currentStreak !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Best: {longestStreak}
                    </p>
                </div>
            </div>
        );
    }

    // Full variant
    return (
        <div
            className={cn(
                'p-6 rounded-xl border bg-card transition-all duration-300',
                isActiveToday ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-white' : 'border-gray-200',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            'p-3 rounded-full transition-all duration-300',
                            currentStreak > 0 ? 'bg-orange-100' : 'bg-gray-100'
                        )}
                    >
                        <Flame
                            className={cn(
                                'h-8 w-8',
                                currentStreak > 0 ? 'text-orange-500' : 'text-gray-400'
                            )}
                        />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl">Study Streak</h3>
                        <p className="text-sm text-muted-foreground">{statusMessage}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold text-orange-500">{currentStreak}</p>
                    <p className="text-xs text-muted-foreground">days</p>
                </div>
            </div>

            {/* Streak Status */}
            <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                        {isActiveToday ? (
                            <span className="text-green-600 font-medium">Active today</span>
                        ) : (
                            <span className="text-amber-600 font-medium">Study today to keep it going!</span>
                        )}
                    </span>
                </div>
            </div>

            {/* Milestone Progress */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Next milestone</span>
                    <span className="font-medium">{nextMilestone} days</span>
                </div>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="absolute h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${milestoneProgress}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(milestoneProgress)}% to {nextMilestone} days
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <div>
                        <p className="text-xs text-muted-foreground">Best Streak</p>
                        <p className="font-semibold">{longestStreak} days</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <div>
                        <p className="text-xs text-muted-foreground">Current</p>
                        <p className="font-semibold">{currentStreak} days</p>
                    </div>
                </div>
            </div>

            {/* Warning for inactive streak */}
            {!isActiveToday && currentStreak > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                        Don't lose your {currentStreak}-day streak! Complete a learning activity today.
                    </p>
                </div>
            )}

            {/* Streak Animation Overlay */}
            {showAnimation && (
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50 animate-in zoom-in-50 fade-in duration-300">
                    <div className="text-center">
                        <Flame className="h-24 w-24 text-orange-500 mx-auto animate-bounce" />
                        <p className="text-2xl font-bold text-orange-500 mt-4">
                            Streak Extended!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Streak mini component for navbar/header
export function StreakBadge({ userId, className }: { userId: string; className?: string }) {
    const [streak, setStreak] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStreak = async () => {
            try {
                const data = await getUserStreak(userId);
                setStreak(data.currentStreak);
            } catch (error) {
                console.error('Error loading streak:', error);
            } finally {
                setLoading(false);
            }
        };

        loadStreak();
    }, [userId]);

    if (loading || streak === 0) return null;

    return (
        <div
            className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 transition-all duration-300',
                className
            )}
        >
            <Flame className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">{streak}</span>
        </div>
    );
}

// Weekly streak calendar view
export function StreakCalendar({ userId, className }: { userId: string; className?: string }) {
    const [weekData, setWeekData] = useState<boolean[]>([]);

    useEffect(() => {
        // Generate last 7 days of activity
        const generateWeekData = async () => {
            const days: boolean[] = [];
            const today = new Date();

            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                // In a real implementation, you'd fetch actual activity for each day
                days.push(i === 0); // Just today for demo
            }

            setWeekData(days);
        };

        generateWeekData();
    }, [userId]);

    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div className={cn('flex gap-1', className)}>
            {daysOfWeek.map((day, index) => (
                <div key={index} className="flex flex-col items-center">
                    <span className="text-[10px] text-muted-foreground mb-1">{day}</span>
                    <div
                        className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300',
                            weekData[index]
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 text-gray-400'
                        )}
                    >
                        <Flame className="h-3 w-3" />
                    </div>
                </div>
            ))}
        </div>
    );
}
