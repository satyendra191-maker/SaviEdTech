'use client';

import React, { useEffect, useState } from 'react';
import { Award, Lock, Star, Zap, Target, BookOpen, Clock, Trophy, Flame, Medal } from 'lucide-react';
import { getUserAchievements, ACHIEVEMENTS, type AchievementId } from '@/lib/gamification/achievements';
import { cn } from '@/lib/utils';

interface AchievementBadgeProps {
    userId: string;
    variant?: 'grid' | 'list' | 'compact';
    className?: string;
    limit?: number;
    showProgress?: boolean;
}

interface AchievementData {
    unlocked: Array<{
        id: string;
        achievement_id: string;
        earned_at: string;
    }>;
    inProgress: Array<{
        achievementId: AchievementId;
        currentValue: number;
        targetValue: number;
        percentComplete: number;
        achievement: typeof ACHIEVEMENTS[AchievementId];
    }>;
}

const iconMap: Record<string, React.ElementType> = {
    'first_steps': Zap,
    'scholar': BookOpen,
    'problem_solver': Target,
    'test_taker': Trophy,
    'week_warrior': Flame,
    'monthly_master': Star,
    'challenger': Medal,
    'lecture_lover': BookOpen,
    'perfectionist': Award,
    'speed_demon': Clock,
    'consistent_learner': Clock,
    'topic_master': Target,
};

export function AchievementBadge({
    userId,
    variant = 'grid',
    className,
    limit,
    showProgress = true,
}: AchievementBadgeProps) {
    const [achievements, setAchievements] = useState<AchievementData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAchievements();
    }, [userId]);

    const loadAchievements = async () => {
        try {
            setLoading(true);
            const data = await getUserAchievements(userId);
            setAchievements({
                unlocked: data.unlocked,
                inProgress: data.inProgress,
            });
        } catch (error) {
            console.error('Error loading achievements:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={cn('animate-pulse', className)}>
                <div className="h-48 bg-muted rounded-lg" />
            </div>
        );
    }

    if (!achievements) {
        return null;
    }

    const { unlocked, inProgress } = achievements;
    const totalAchievements = Object.keys(ACHIEVEMENTS).length;

    // Compact variant - just show count
    if (variant === 'compact') {
        return (
            <div className={cn('flex items-center gap-2', className)}>
                <Award className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">{unlocked.length}</span>
                <span className="text-muted-foreground text-sm">/ {totalAchievements}</span>
            </div>
        );
    }

    // List variant
    if (variant === 'list') {
        const displayAchievements = limit ? unlocked.slice(0, limit) : unlocked;

        return (
            <div className={cn('space-y-3', className)}>
                {displayAchievements.map((userAchievement) => {
                    const achievement = ACHIEVEMENTS[userAchievement.achievement_id as AchievementId];
                    if (!achievement) return null;

                    const Icon = iconMap[userAchievement.achievement_id] || Award;

                    return (
                        <div
                            key={userAchievement.id}
                            className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:border-yellow-400 transition-colors"
                        >
                            <div
                                className="p-2 rounded-full"
                                style={{ backgroundColor: `${achievement.badge_color}20` }}
                            >
                                <Icon
                                    className="h-5 w-5"
                                    style={{ color: achievement.badge_color }}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{achievement.name}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {achievement.description}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-medium text-yellow-600">
                                    +{achievement.points} pts
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Grid variant (default)
    return (
        <div className={cn('space-y-6', className)}>
            {/* Progress Summary */}
            {showProgress && (
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold">Achievements</h3>
                        <p className="text-sm text-muted-foreground">
                            {unlocked.length} of {totalAchievements} unlocked
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-32 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                                style={{ width: `${(unlocked.length / totalAchievements) * 100}%` }}
                            />
                        </div>
                        <span className="text-sm font-medium">
                            {Math.round((unlocked.length / totalAchievements) * 100)}%
                        </span>
                    </div>
                </div>
            )}

            {/* Unlocked Achievements Grid */}
            <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Unlocked</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {unlocked.map((userAchievement) => {
                        const achievement = ACHIEVEMENTS[userAchievement.achievement_id as AchievementId];
                        if (!achievement) return null;

                        const Icon = iconMap[userAchievement.achievement_id] || Award;

                        return (
                            <div
                                key={userAchievement.id}
                                className="group relative p-4 bg-card border rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer"
                                style={{ borderColor: `${achievement.badge_color}40` }}
                            >
                                <div
                                    className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: achievement.badge_color }}
                                >
                                    <Icon className="h-6 w-6 text-white" />
                                </div>
                                <p className="text-sm font-semibold text-center truncate">
                                    {achievement.name}
                                </p>
                                <p className="text-xs text-muted-foreground text-center truncate mt-1">
                                    {achievement.description}
                                </p>
                                <p className="text-xs text-yellow-600 text-center mt-2 font-medium">
                                    +{achievement.points} pts
                                </p>

                                {/* Tooltip */}
                                <div className="absolute inset-0 bg-card/95 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 pointer-events-none">
                                    <p className="text-xs text-center text-muted-foreground">
                                        Earned {new Date(userAchievement.earned_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* In Progress Achievements */}
            {inProgress.length > 0 && showProgress && (
                <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">In Progress</h4>
                    <div className="space-y-3">
                        {inProgress.slice(0, 3).map((progress) => {
                            const Icon = iconMap[progress.achievementId] || Award;

                            return (
                                <div
                                    key={progress.achievementId}
                                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                                >
                                    <div className="p-2 bg-gray-200 rounded-full">
                                        <Lock className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium text-gray-700 truncate">
                                                {progress.achievement.name}
                                            </p>
                                            <span className="text-xs text-muted-foreground">
                                                {progress.currentValue} / {progress.targetValue}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {progress.achievement.description}
                                        </p>
                                        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gray-400 rounded-full transition-all duration-500"
                                                style={{ width: `${progress.percentComplete}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center opacity-50"
                                        style={{ backgroundColor: progress.achievement.badge_color }}
                                    >
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Locked Achievements Preview */}
            {inProgress.length === 0 && unlocked.length < totalAchievements && (
                <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed">
                    <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Keep learning to unlock more achievements!
                    </p>
                </div>
            )}
        </div>
    );
}

// Single achievement badge component
export function SingleAchievementBadge({
    achievementId,
    earnedAt,
    size = 'md',
}: {
    achievementId: AchievementId;
    earnedAt?: string;
    size?: 'sm' | 'md' | 'lg';
}) {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return null;

    const Icon = iconMap[achievementId] || Award;

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };

    const iconSizes = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
    };

    return (
        <div
            className={cn(
                'rounded-full flex items-center justify-center shadow-lg',
                sizeClasses[size],
                earnedAt ? '' : 'opacity-50 grayscale'
            )}
            style={{ backgroundColor: achievement.badge_color }}
            title={`${achievement.name}: ${achievement.description}`}
        >
            <Icon className={cn('text-white', iconSizes[size])} />
        </div>
    );
}

// Achievement notification popup
export function AchievementNotification({
    achievementId,
    onClose,
}: {
    achievementId: AchievementId;
    onClose: () => void;
}) {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return null;

    const Icon = iconMap[achievementId] || Award;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-card border-2 border-yellow-400 rounded-xl shadow-xl p-4 max-w-sm">
                <div className="flex items-start gap-3">
                    <div
                        className="p-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: achievement.badge_color }}
                    >
                        <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-lg">Achievement Unlocked!</p>
                        <p className="font-semibold" style={{ color: achievement.badge_color }}>
                            {achievement.name}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {achievement.description}
                        </p>
                        <p className="text-sm text-yellow-600 mt-2 font-medium">
                            +{achievement.points} points earned
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>
    );
}
