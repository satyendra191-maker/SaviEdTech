/**
 * User Gamification Stats API
 * 
 * GET /api/gamification/user-stats
 * 
 * Returns user's gamification statistics including:
 * - Total points
 * - Current streak
 * - Achievements count
 * - Leaderboard position
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { getUserGamificationSummary } from '@/lib/gamification';

// Get authenticated user
async function getUser(request: NextRequest) {
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set() { /* no-op */ },
                remove() { /* no-op */ },
            },
        }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
}

export async function GET(request: NextRequest) {
    try {
        // Authenticate the request
        const user = await getUser(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please sign in.' },
                { status: 401 }
            );
        }

        const userId = user.id;

        // Get gamification summary
        const summary = await getUserGamificationSummary(userId);

        return NextResponse.json({
            success: true,
            data: {
                totalPoints: summary.points.total,
                pointsToday: summary.points.today,
                pointsThisWeek: summary.points.thisWeek,
                pointsThisMonth: summary.points.thisMonth,
                currentStreak: summary.streaks.current,
                longestStreak: summary.streaks.longest,
                isActiveToday: summary.streaks.isActiveToday,
                achievementsUnlocked: summary.achievements.unlocked,
                totalAchievements: summary.achievements.total,
                pointsRank: summary.leaderboards.pointsRank,
                streaksRank: summary.leaderboards.streaksRank,
            },
        });

    } catch (error) {
        console.error('Error fetching user stats:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch user stats',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
