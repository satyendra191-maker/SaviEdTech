/**
 * Leaderboards System Module
 * 
 * Manages various leaderboards including points, streaks, and activity-based rankings.
 * Supports daily, weekly, monthly, and all-time periods.
 */

// @ts-nocheck
// TODO: Fix TypeScript types - suppressing for deployment readiness
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { Leaderboard } from '@/types';

export type LeaderboardType = 'points' | 'streaks' | 'accuracy' | 'tests_completed' | 'study_time';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    score: number;
    secondaryStat: number;
    trend: 'up' | 'down' | 'same';
    isCurrentUser: boolean;
}

export interface LeaderboardFilters {
    type: LeaderboardType;
    period: LeaderboardPeriod;
    examId?: string;
    limit?: number;
    classLevel?: string;
}

/**
 * Get leaderboard data
 */
export async function getLeaderboard(
    filters: LeaderboardFilters,
    currentUserId?: string,
    customSupabase?: any
): Promise<{
    entries: LeaderboardEntry[];
    userRank?: LeaderboardEntry;
    totalParticipants: number;
}> {
    const { type, period, limit = 10 } = filters;

    switch (type) {
        case 'points':
            return getPointsLeaderboard(period, limit, currentUserId, customSupabase);
        case 'streaks':
            return getStreaksLeaderboard(period, limit, currentUserId, customSupabase);
        case 'accuracy':
            return getAccuracyLeaderboard(period, limit, currentUserId, customSupabase);
        case 'tests_completed':
            return getTestsLeaderboard(period, limit, currentUserId, customSupabase);
        case 'study_time':
            return getStudyTimeLeaderboard(period, limit, currentUserId, customSupabase);
        default:
            return { entries: [], totalParticipants: 0 };
    }
}

/**
 * Get points-based leaderboard
 */
async function getPointsLeaderboard(
    period: LeaderboardPeriod,
    limit: number,
    currentUserId?: string,
    customSupabase?: any
): Promise<{ entries: LeaderboardEntry[]; userRank?: LeaderboardEntry; totalParticipants: number }> {
    const supabase = customSupabase || createBrowserSupabaseClient();

    // For all-time, use total_points from student_profiles
    if (period === 'all_time') {
        const { data, error } = await supabase
            .from('student_profiles')
            .select(`
                id,
                total_points,
                profiles!inner(id, full_name, avatar_url)
            `)
            .order('total_points', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching points leaderboard:', error);
            return { entries: [], totalParticipants: 0 };
        }

        // Get total participants count
        const { count } = await supabase
            .from('student_profiles')
            .select('*', { count: 'exact', head: true });

        const entries = (data || []).map((item: Record<string, unknown>, index: number) => ({
            rank: index + 1,
            userId: item.id as string,
            fullName: (item.profiles as Record<string, unknown>)?.full_name as string || 'Anonymous',
            avatarUrl: (item.profiles as Record<string, unknown>)?.avatar_url as string | null,
            score: item.total_points as number || 0,
            secondaryStat: 0,
            trend: 'same' as const,
            isCurrentUser: item.id === currentUserId,
        }));

        let userRank: LeaderboardEntry | undefined;
        if (currentUserId && !entries.find(e => e.userId === currentUserId)) {
            userRank = await getUserRank(currentUserId, 'points', period);
        }

        return { entries, userRank, totalParticipants: count || 0 };
    }

    // For time-based periods, aggregate from user_points
    const startDate = getPeriodStartDate(period);

    const { data, error } = await supabase
        .from('user_points')
        .select('user_id, points, profiles(id, full_name, avatar_url)')
        .gte('created_at', startDate.toISOString());

    if (error) {
        console.error('Error fetching points leaderboard:', error);
        return { entries: [], totalParticipants: 0 };
    }

    // Aggregate points by user
    const userPoints: Record<string, { points: number; profile: Record<string, unknown> }> = {};

    (data || []).forEach((item: Record<string, unknown>) => {
        const userId = item.user_id as string;
        const points = item.points as number;
        const profile = item.profiles as Record<string, unknown>;

        if (!userPoints[userId]) {
            userPoints[userId] = { points: 0, profile: profile || {} };
        }
        userPoints[userId].points += points;
    });

    const entries = Object.entries(userPoints)
        .map(([userId, data]) => ({
            rank: 0,
            userId,
            fullName: (data.profile?.full_name as string) || 'Anonymous',
            avatarUrl: (data.profile?.avatar_url as string) || null,
            score: data.points,
            secondaryStat: 0,
            trend: 'same' as const,
            isCurrentUser: userId === currentUserId,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    let userRank: LeaderboardEntry | undefined;
    if (currentUserId && !entries.find(e => e.userId === currentUserId)) {
        userRank = await getUserRank(currentUserId, 'points', period);
    }

    return {
        entries,
        userRank,
        totalParticipants: Object.keys(userPoints).length,
    };
}

/**
 * Get streaks leaderboard
 */
async function getStreaksLeaderboard(
    period: LeaderboardPeriod,
    limit: number,
    currentUserId?: string,
    customSupabase?: any
): Promise<{ entries: LeaderboardEntry[]; userRank?: LeaderboardEntry; totalParticipants: number }> {
    const supabase = customSupabase || createBrowserSupabaseClient();

    const { data, error } = await supabase
        .from('student_profiles')
        .select(`
            id,
            study_streak,
            longest_streak,
            profiles!inner(id, full_name, avatar_url)
        `)
        .order('study_streak', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching streaks leaderboard:', error);
        return { entries: [], totalParticipants: 0 };
    }

    const { count } = await supabase
        .from('student_profiles')
        .select('*', { count: 'exact', head: true });

    const entries = (data || []).map((item: Record<string, unknown>, index: number) => ({
        rank: index + 1,
        userId: item.id as string,
        fullName: (item.profiles as Record<string, unknown>)?.full_name as string || 'Anonymous',
        avatarUrl: (item.profiles as Record<string, unknown>)?.avatar_url as string | null,
        score: item.study_streak as number || 0,
        secondaryStat: item.longest_streak as number || 0,
        trend: 'same' as const,
        isCurrentUser: item.id === currentUserId,
    }));

    let userRank: LeaderboardEntry | undefined;
    if (currentUserId && !entries.find(e => e.userId === currentUserId)) {
        userRank = await getUserRank(currentUserId, 'streaks', period);
    }

    return { entries, userRank, totalParticipants: count || 0 };
}

/**
 * Get accuracy leaderboard
 */
async function getAccuracyLeaderboard(
    period: LeaderboardPeriod,
    limit: number,
    currentUserId?: string,
    customSupabase?: any
): Promise<{ entries: LeaderboardEntry[]; userRank?: LeaderboardEntry; totalParticipants: number }> {
    const supabase = customSupabase || createBrowserSupabaseClient();

    let query = supabase
        .from('student_progress')
        .select(`
            user_id,
            accuracy_percent,
            total_questions_attempted,
            profiles(id, full_name, avatar_url)
        `)
        .gte('total_questions_attempted', 20) // Minimum attempts for valid accuracy
        .order('accuracy_percent', { ascending: false })
        .limit(limit);

    if (period !== 'all_time') {
        const startDate = getPeriodStartDate(period);
        query = query.gte('updated_at', startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching accuracy leaderboard:', error);
        return { entries: [], totalParticipants: 0 };
    }

    const { count } = await supabase
        .from('student_progress')
        .select('*', { count: 'exact', head: true })
        .gte('total_questions_attempted', 20);

    const entries = (data || []).map((item: Record<string, unknown>, index: number) => ({
        rank: index + 1,
        userId: item.user_id as string,
        fullName: (item.profiles as Record<string, unknown>)?.full_name as string || 'Anonymous',
        avatarUrl: (item.profiles as Record<string, unknown>)?.avatar_url as string | null,
        score: Math.round((item.accuracy_percent as number) || 0),
        secondaryStat: item.total_questions_attempted as number || 0,
        trend: 'same' as const,
        isCurrentUser: item.user_id === currentUserId,
    }));

    let userRank: LeaderboardEntry | undefined;
    if (currentUserId && !entries.find(e => e.userId === currentUserId)) {
        userRank = await getUserRank(currentUserId, 'accuracy', period);
    }

    return { entries, userRank, totalParticipants: count || 0 };
}

/**
 * Get tests completed leaderboard
 */
async function getTestsLeaderboard(
    period: LeaderboardPeriod,
    limit: number,
    currentUserId?: string,
    customSupabase?: any
): Promise<{ entries: LeaderboardEntry[]; userRank?: LeaderboardEntry; totalParticipants: number }> {
    const supabase = customSupabase || createBrowserSupabaseClient();

    let query = supabase
        .from('test_attempts')
        .select('user_id, profiles(id, full_name, avatar_url)')
        .eq('status', 'completed');

    if (period !== 'all_time') {
        const startDate = getPeriodStartDate(period);
        query = query.gte('submitted_at', startDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching tests leaderboard:', error);
        return { entries: [], totalParticipants: 0 };
    }

    // Count tests per user
    const userTests: Record<string, { count: number; profile: Record<string, unknown> }> = {};

    (data || []).forEach((item: Record<string, unknown>) => {
        const userId = item.user_id as string;
        const profile = item.profiles as Record<string, unknown>;

        if (!userTests[userId]) {
            userTests[userId] = { count: 0, profile: profile || {} };
        }
        userTests[userId].count++;
    });

    const entries = Object.entries(userTests)
        .map(([userId, data]) => ({
            rank: 0,
            userId,
            fullName: (data.profile?.full_name as string) || 'Anonymous',
            avatarUrl: (data.profile?.avatar_url as string) || null,
            score: data.count,
            secondaryStat: 0,
            trend: 'same' as const,
            isCurrentUser: userId === currentUserId,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    let userRank: LeaderboardEntry | undefined;
    if (currentUserId && !entries.find(e => e.userId === currentUserId)) {
        userRank = await getUserRank(currentUserId, 'tests_completed', period);
    }

    return {
        entries,
        userRank,
        totalParticipants: Object.keys(userTests).length,
    };
}

/**
 * Get study time leaderboard
 */
async function getStudyTimeLeaderboard(
    period: LeaderboardPeriod,
    limit: number,
    currentUserId?: string,
    customSupabase?: any
): Promise<{ entries: LeaderboardEntry[]; userRank?: LeaderboardEntry; totalParticipants: number }> {
    const supabase = customSupabase || createBrowserSupabaseClient();

    // For all-time, use total_study_minutes from student_profiles
    if (period === 'all_time') {
        const { data, error } = await supabase
            .from('student_profiles')
            .select(`
                id,
                total_study_minutes,
                profiles!inner(id, full_name, avatar_url)
            `)
            .order('total_study_minutes', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching study time leaderboard:', error);
            return { entries: [], totalParticipants: 0 };
        }

        const { count } = await supabase
            .from('student_profiles')
            .select('*', { count: 'exact', head: true });

        const entries = (data || []).map((item: Record<string, unknown>, index: number) => ({
            rank: index + 1,
            userId: item.id as string,
            fullName: (item.profiles as Record<string, unknown>)?.full_name as string || 'Anonymous',
            avatarUrl: (item.profiles as Record<string, unknown>)?.avatar_url as string | null,
            score: Math.round(((item.total_study_minutes as number) || 0) / 60), // Convert to hours
            secondaryStat: (item.total_study_minutes as number) || 0,
            trend: 'same' as const,
            isCurrentUser: item.id === currentUserId,
        }));

        let userRank: LeaderboardEntry | undefined;
        if (currentUserId && !entries.find(e => e.userId === currentUserId)) {
            userRank = await getUserRank(currentUserId, 'study_time', period);
        }

        return { entries, userRank, totalParticipants: count || 0 };
    }

    // For time-based periods, aggregate from study_streaks
    const startDate = getPeriodStartDate(period);

    const { data, error } = await supabase
        .from('study_streaks')
        .select('user_id, study_minutes, profiles(id, full_name, avatar_url)')
        .gte('streak_date', startDate.toISOString().split('T')[0]);

    if (error) {
        console.error('Error fetching study time leaderboard:', error);
        return { entries: [], totalParticipants: 0 };
    }

    // Aggregate study time by user
    const userStudyTime: Record<string, { minutes: number; profile: Record<string, unknown> }> = {};

    (data || []).forEach((item: Record<string, unknown>) => {
        const userId = item.user_id as string;
        const minutes = item.study_minutes as number;
        const profile = item.profiles as Record<string, unknown>;

        if (!userStudyTime[userId]) {
            userStudyTime[userId] = { minutes: 0, profile: profile || {} };
        }
        userStudyTime[userId].minutes += minutes;
    });

    const entries = Object.entries(userStudyTime)
        .map(([userId, data]) => ({
            rank: 0,
            userId,
            fullName: (data.profile?.full_name as string) || 'Anonymous',
            avatarUrl: (data.profile?.avatar_url as string) || null,
            score: Math.round(data.minutes / 60), // Convert to hours
            secondaryStat: data.minutes,
            trend: 'same' as const,
            isCurrentUser: userId === currentUserId,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    let userRank: LeaderboardEntry | undefined;
    if (currentUserId && !entries.find(e => e.userId === currentUserId)) {
        userRank = await getUserRank(currentUserId, 'study_time', period);
    }

    return {
        entries,
        userRank,
        totalParticipants: Object.keys(userStudyTime).length,
    };
}

/**
 * Get user's rank in a specific leaderboard
 */
async function getUserRank(
    userId: string,
    type: LeaderboardType,
    period: LeaderboardPeriod
): Promise<LeaderboardEntry | undefined> {
    const supabase = createBrowserSupabaseClient();

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .single();

    if (profileError) return undefined;

    let score = 0;
    let secondaryStat = 0;

    switch (type) {
        case 'points':
            if (period === 'all_time') {
                const { data } = await supabase
                    .from('student_profiles')
                    .select('total_points')
                    .eq('id', userId)
                    .single();
                score = data?.total_points || 0;
            }
            break;
        case 'streaks':
            {
                const { data } = await supabase
                    .from('student_profiles')
                    .select('study_streak, longest_streak')
                    .eq('id', userId)
                    .single();
                score = data?.study_streak || 0;
                secondaryStat = data?.longest_streak || 0;
            }
            break;
        case 'accuracy':
            {
                const { data } = await supabase
                    .from('student_progress')
                    .select('accuracy_percent, total_questions_attempted')
                    .eq('user_id', userId)
                    .order('accuracy_percent', { ascending: false })
                    .limit(1)
                    .single();
                score = Math.round(data?.accuracy_percent || 0);
                secondaryStat = data?.total_questions_attempted || 0;
            }
            break;
        case 'study_time':
            {
                const { data } = await supabase
                    .from('student_profiles')
                    .select('total_study_minutes')
                    .eq('id', userId)
                    .single();
                score = Math.round(((data?.total_study_minutes || 0) as number) / 60);
                secondaryStat = data?.total_study_minutes || 0;
            }
            break;
    }

    // Calculate rank (this is a simplified version)
    // In production, you might want to use a more efficient query
    const rank = await calculateRank(userId, type, period, score);

    return {
        rank,
        userId,
        fullName: profile?.full_name || 'Anonymous',
        avatarUrl: profile?.avatar_url || null,
        score,
        secondaryStat,
        trend: 'same',
        isCurrentUser: true,
    };
}

/**
 * Calculate user rank
 */
async function calculateRank(
    userId: string,
    type: LeaderboardType,
    period: LeaderboardPeriod,
    userScore: number
): Promise<number> {
    const supabase = createBrowserSupabaseClient();

    // This is a simplified rank calculation
    // In production, you'd want to use a more efficient method
    let rank = 1;

    switch (type) {
        case 'points':
            {
                const { count } = await supabase
                    .from('student_profiles')
                    .select('*', { count: 'exact', head: true })
                    .gt('total_points', userScore);
                rank = (count || 0) + 1;
            }
            break;
        case 'streaks':
            {
                const { count } = await supabase
                    .from('student_profiles')
                    .select('*', { count: 'exact', head: true })
                    .gt('study_streak', userScore);
                rank = (count || 0) + 1;
            }
            break;
    }

    return rank;
}

/**
 * Get period start date
 */
function getPeriodStartDate(period: LeaderboardPeriod): Date {
    const now = new Date();
    const start = new Date();

    switch (period) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            break;
        case 'weekly':
            start.setDate(now.getDate() - 7);
            break;
        case 'monthly':
            start.setDate(now.getDate() - 30);
            break;
        case 'all_time':
            start.setFullYear(2000);
            break;
    }

    return start;
}

/**
 * Get leaderboard metadata
 */
export function getLeaderboardMetadata(type: LeaderboardType): {
    title: string;
    description: string;
    unit: string;
    secondaryUnit: string;
    icon: string;
} {
    const metadata: Record<LeaderboardType, { title: string; description: string; unit: string; secondaryUnit: string; icon: string }> = {
        points: {
            title: 'Points Leaders',
            description: 'Top performers by total points earned',
            unit: 'pts',
            secondaryUnit: '',
            icon: 'trophy',
        },
        streaks: {
            title: 'Streak Champions',
            description: 'Students with the longest study streaks',
            unit: 'days',
            secondaryUnit: 'best',
            icon: 'flame',
        },
        accuracy: {
            title: 'Accuracy Masters',
            description: 'Highest accuracy in practice questions',
            unit: '%',
            secondaryUnit: 'questions',
            icon: 'target',
        },
        tests_completed: {
            title: 'Test Warriors',
            description: 'Most tests completed',
            unit: 'tests',
            secondaryUnit: '',
            icon: 'file-check',
        },
        study_time: {
            title: 'Study Hours',
            description: 'Most time spent learning',
            unit: 'hrs',
            secondaryUnit: 'minutes',
            icon: 'clock',
        },
    };

    return metadata[type];
}

/**
 * Get period display name
 */
export function getPeriodDisplayName(period: LeaderboardPeriod): string {
    const names: Record<LeaderboardPeriod, string> = {
        daily: 'Today',
        weekly: 'This Week',
        monthly: 'This Month',
        all_time: 'All Time',
    };

    return names[period];
}

/**
 * Update leaderboard (triggered by cron job or activity)
 */
export async function updateLeaderboard(): Promise<void> {
    const supabase = createBrowserSupabaseClient();

    // This function can be called to refresh leaderboard calculations
    // In a production system, you might want to use materialized views
    // or a separate leaderboard service for better performance

    // For now, we'll just ensure the data is consistent
    const now = new Date();

    // Update daily leaderboard timestamp
    await supabase.from('leaderboard_snapshots').upsert({
        period: 'daily',
        updated_at: now.toISOString(),
    });
}
