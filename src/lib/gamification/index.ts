/**
 * Gamification System - Main Export Module
 * 
 * This module provides a complete gamification system including:
 * - Study Streaks
 * - Achievement System
 * - Points System
 * - Leaderboards
 * 
 * @example
 * import { trackActivity, getUserGamificationSummary } from '@/lib/gamification';
 * 
 * // Track a learning activity
 * await trackActivity({
 *   userId: 'user-123',
 *   activityType: 'lecture_completed',
 *   metadata: { lectureId: 'lec-456' }
 * });
 * 
 * // Get user's gamification summary
 * const summary = await getUserGamificationSummary('user-123');
 */

// Export streak functions
export {
    getUserStreak,
    trackStreakActivity,
    getStreakHistory,
    hasActiveStreakToday,
    getStreakMilestones,
    getStreakStatusMessage,
    canFreezeStreak,
    useStreakFreeze,
    getStreakLeaderboard,
    type StreakUpdateResult,
    type StreakActivity,
} from './streaks';

// Export points functions
export {
    awardPoints,
    getUserTotalPoints,
    getPointsHistory,
    getPointsSummary,
    getPointsLeaderboard,
    hasEnoughPoints,
    redeemPoints,
    POINTS_CONFIG,
    type ActivityType,
    type PointTransaction,
} from './points';

// Export achievements functions
export {
    checkAchievements,
    getUserAchievements,
    getAchievement,
    getAchievementTotalPoints,
    checkAchievementOnAction,
    ACHIEVEMENTS,
    type AchievementId,
    type AchievementProgress,
} from './achievements';

// Export leaderboard functions
export {
    getLeaderboard,
    getLeaderboardMetadata,
    getPeriodDisplayName,
    updateLeaderboard,
    type LeaderboardType,
    type LeaderboardPeriod,
    type LeaderboardEntry,
    type LeaderboardFilters,
} from './leaderboards';

import { trackStreakActivity } from './streaks';
import { awardPoints } from './points';
import { checkAchievements, checkAchievementOnAction } from './achievements';

/**
 * Track a learning activity and update all gamification systems
 */
export interface TrackActivityInput {
    userId: string;
    activityType:
    | 'lecture_completed'
    | 'test_completed'
    | 'practice_completed'
    | 'challenge_completed'
    | 'dpp_completed'
    | 'revision_completed'
    | 'correct_answer'
    | 'streak_extended';
    metadata?: Record<string, unknown>;
}

export interface TrackActivityResult {
    pointsAwarded: number;
    newAchievements: string[];
    streakUpdated: boolean;
    currentStreak: number;
    totalPoints: number;
}

/**
 * Main function to track a learning activity
 * This orchestrates all gamification systems
 */
export async function trackActivity(
    input: TrackActivityInput
): Promise<TrackActivityResult> {
    const { userId, activityType, metadata } = input;

    const result: TrackActivityResult = {
        pointsAwarded: 0,
        newAchievements: [],
        streakUpdated: false,
        currentStreak: 0,
        totalPoints: 0,
    };

    try {
        // 1. Update streak
        const streakResult = await trackStreakActivity(userId);
        result.streakUpdated = streakResult.isStreakExtended;
        result.currentStreak = streakResult.currentStreak;

        // 2. Award points based on activity type
        let pointsActivityType: Parameters<typeof awardPoints>[1] | null = null;

        switch (activityType) {
            case 'lecture_completed':
                pointsActivityType = 'lecture_completed';
                break;
            case 'test_completed':
                pointsActivityType = 'test_completed';
                break;
            case 'practice_completed':
                pointsActivityType = 'practice_session';
                break;
            case 'challenge_completed':
                pointsActivityType = 'daily_challenge';
                break;
            case 'dpp_completed':
                pointsActivityType = 'dpp_completed';
                break;
            case 'revision_completed':
                pointsActivityType = 'revision_completed';
                break;
            case 'correct_answer':
                pointsActivityType = 'correct_answer';
                break;
        }

        if (pointsActivityType) {
            const pointsResult = await awardPoints(userId, pointsActivityType, metadata);
            result.pointsAwarded = pointsResult.pointsAwarded;
            result.totalPoints = pointsResult.newTotal;
        }

        // 3. Check for achievements
        const achievementActionType = mapActivityToAchievementAction(activityType);
        if (achievementActionType) {
            const newAchievements = await checkAchievementOnAction(userId, achievementActionType);
            result.newAchievements = newAchievements.map(a => a.achievement_id);
        }

        // Also run general achievement check
        const generalAchievements = await checkAchievements(userId);
        result.newAchievements.push(...generalAchievements.map(a => a.achievement_id));

        // Remove duplicates
        result.newAchievements = [...new Set(result.newAchievements)];

    } catch (error) {
        console.error('Error tracking activity:', error);
    }

    return result;
}

/**
 * Map activity type to achievement action type
 */
function mapActivityToAchievementAction(
    activityType: TrackActivityInput['activityType']
): Parameters<typeof checkAchievementOnAction>[1] | null {
    const mapping: Record<string, Parameters<typeof checkAchievementOnAction>[1]> = {
        lecture_completed: 'lecture_completed',
        test_completed: 'test_completed',
        challenge_completed: 'challenge_completed',
        correct_answer: 'correct_answer',
        streak_extended: 'streak_updated',
    };

    return mapping[activityType] || null;
}

/**
 * Get complete gamification summary for a user
 */
export interface GamificationSummary {
    userId: string;
    points: {
        total: number;
        today: number;
        thisWeek: number;
        thisMonth: number;
    };
    streaks: {
        current: number;
        longest: number;
        isActiveToday: boolean;
        nextMilestone: number;
        milestoneProgress: number;
    };
    achievements: {
        unlocked: number;
        total: number;
        recentlyUnlocked: string[];
        inProgress: Array<{
            id: string;
            name: string;
            progress: number;
        }>;
    };
    leaderboards: {
        pointsRank: number | null;
        streaksRank: number | null;
    };
}

/**
 * Get complete gamification summary
 */
export async function getUserGamificationSummary(userId: string, customSupabase?: any): Promise<GamificationSummary> {
    let supabase = customSupabase;
    
    if (!supabase) {
        // Fallback to correct client based on environment
        if (typeof window !== 'undefined') {
            const { createBrowserSupabaseClient } = await import('@/lib/supabase');
            supabase = createBrowserSupabaseClient();
        } else {
            // This is just a fallback, ideally a client should be passed from the server route
            const { createClient } = await import('@supabase/supabase-js');
            supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
        }
    }

    // Get points summary
    const { getPointsSummary } = await import('./points');
    const pointsSummary = await getPointsSummary(userId, supabase);

    // Get streak info
    const { getUserStreak, getStreakMilestones, hasActiveStreakToday } = await import('./streaks');
    const streakInfo = await getUserStreak(userId, supabase);
    const milestones = getStreakMilestones(streakInfo.currentStreak);
    const isActiveToday = await hasActiveStreakToday(userId, supabase);

    // Get achievements
    const { getUserAchievements, ACHIEVEMENTS } = await import('./achievements');
    const achievements = await getUserAchievements(userId, supabase);

    // Get leaderboard ranks
    const { getLeaderboard } = await import('./leaderboards');

    const [pointsLeaderboard, streaksLeaderboard] = await Promise.all([
        getLeaderboard({ type: 'points', period: 'all_time' }, userId, supabase),
        getLeaderboard({ type: 'streaks', period: 'all_time' }, userId, supabase),
    ]);

    return {
        userId,
        points: {
            total: pointsSummary.totalPoints,
            today: pointsSummary.pointsToday,
            thisWeek: pointsSummary.pointsThisWeek,
            thisMonth: pointsSummary.pointsThisMonth,
        },
        streaks: {
            current: streakInfo.currentStreak,
            longest: streakInfo.longestStreak,
            isActiveToday,
            nextMilestone: milestones.nextMilestone,
            milestoneProgress: milestones.progress,
        },
        achievements: {
            unlocked: achievements.unlocked.length,
            total: Object.keys(ACHIEVEMENTS).length,
            recentlyUnlocked: achievements.unlocked.slice(0, 5).map(a => a.achievement_id),
            inProgress: achievements.inProgress.slice(0, 3).map(p => ({
                id: p.achievementId,
                name: p.achievement.name,
                progress: p.percentComplete,
            })),
        },
        leaderboards: {
            pointsRank: pointsLeaderboard.userRank?.rank || null,
            streaksRank: streaksLeaderboard.userRank?.rank || null,
        },
    };
}

/**
 * Hook for real-time gamification updates
 * This can be used with Supabase realtime subscriptions
 */
export async function subscribeToGamificationUpdates(
    userId: string,
    callback: (update: Partial<GamificationSummary>) => void
): Promise<() => void> {
    const { createBrowserSupabaseClient } = await import('@/lib/supabase');
    const supabase = createBrowserSupabaseClient();
    
    // Subscribe to points changes
    const pointsSubscription = supabase
        .channel(`user_points:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'user_points',
                filter: `user_id=eq.${userId}`,
            },
            () => {
                // Trigger callback with updated points info
                getUserGamificationSummary(userId).then(summary => {
                    callback({ points: summary.points });
                });
            }
        )
        .subscribe();
    
    // Subscribe to achievements
    const achievementsSubscription = supabase
        .channel(`user_achievements:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'user_achievements',
                filter: `user_id=eq.${userId}`,
            },
            () => {
                callback({});
            }
        )
        .subscribe();
    
    // Return unsubscribe function
    return () => {
        pointsSubscription.unsubscribe();
        achievementsSubscription.unsubscribe();
    };
}
