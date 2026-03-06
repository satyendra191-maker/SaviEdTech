'use client';

import React from 'react';
import { StreakDisplay, AchievementBadge, UserPointsDisplay } from '@/components/gamification';
import { CompactLeaderboard } from '@/components/gamification/Leaderboard';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Target, Flame, Star } from 'lucide-react';

interface GamificationWidgetProps {
    variant?: 'full' | 'compact' | 'sidebar';
    className?: string;
}

export function GamificationWidget({ variant = 'full', className }: GamificationWidgetProps) {
    const { user, isLoading } = useAuth();

    if (isLoading || !user) {
        return (
            <div className={`animate-pulse space-y-4 ${className}`}>
                <div className="h-24 bg-slate-200 rounded-xl" />
                <div className="h-32 bg-slate-200 rounded-xl" />
            </div>
        );
    }

    // Sidebar variant - minimal display for sidebar
    if (variant === 'sidebar') {
        return (
            <div className={className}>
                <StreakDisplay userId={user.id} variant="compact" />
            </div>
        );
    }

    // Compact variant - for smaller spaces
    if (variant === 'compact') {
        return (
            <div className={`space-y-4 ${className}`}>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-orange-100 rounded-lg">
                                <Flame className="w-4 h-4 text-orange-600" />
                            </div>
                            <span className="text-xs font-medium text-orange-700">Streak</span>
                        </div>
                        <StreakDisplay userId={user.id} variant="minimal" />
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-yellow-100 rounded-lg">
                                <Trophy className="w-4 h-4 text-yellow-600" />
                            </div>
                            <span className="text-xs font-medium text-yellow-700">Achievements</span>
                        </div>
                        <AchievementBadge userId={user.id} variant="compact" />
                    </div>
                </div>
            </div>
        );
    }

    // Full variant - complete gamification dashboard
    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl">
                    <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">Your Progress</h3>
                    <p className="text-sm text-slate-500">Keep learning to earn more points!</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Streak Card */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                    <StreakDisplay userId={user.id} variant="compact" />
                </div>

                {/* Points Card */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                            <Star className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-xs font-medium text-slate-600">Total Points</span>
                    </div>
                    <UserPointsDisplay userId={user.id} />
                </div>
            </div>

            {/* Achievements Section */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary-600" />
                        <span className="font-semibold text-slate-900">Achievements</span>
                    </div>
                </div>
                <AchievementBadge userId={user.id} variant="compact" limit={3} />
            </div>

            {/* Mini Leaderboard */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <CompactLeaderboard userId={user.id} limit={5} />
            </div>
        </div>
    );
}

export default GamificationWidget;
