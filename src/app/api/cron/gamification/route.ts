import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyCronSecret(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    return token === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
    const requestId = `gamification_automation_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient();
        
        const results = {
            streaksUpdated: 0,
            leaderboardUpdated: 0,
            achievementsUnlocked: 0,
            pointsCredited: 0,
            errors: [] as string[],
        };

        const { data: students } = await supabase
            .from('profiles')
            .select('id, last_active_at')
            .eq('role', 'student');

        if (students) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString();

            for (const student of students) {
                const lastActive = student.last_active_at ? new Date(student.last_active_at) : null;
                const lastActiveDay = lastActive ? new Date(lastActive.setHours(0, 0, 0, 0)) : null;

                let currentStreak = 0;
                
                const { data: existingStreak } = await supabase
                    .from('study_streaks')
                    .select('current_streak, longest_streak')
                    .eq('student_id', student.id)
                    .single();

                if (existingStreak) {
                    currentStreak = existingStreak.current_streak || 0;
                    
                    if (lastActiveDay && lastActiveDay.getTime() === today.getTime()) {
                        currentStreak = currentStreak + 1;
                    } else if (lastActiveDay && lastActiveDay.getTime() < today.getTime() - 86400000) {
                        currentStreak = 1;
                    }

                    const longestStreak = Math.max(currentStreak, existingStreak.longest_streak || 0);

                    await supabase
                        .from('study_streaks')
                        .upsert({
                            student_id: student.id,
                            current_streak: currentStreak,
                            longest_streak: longestStreak,
                            last_study_date: todayStr,
                        });

                    results.streaksUpdated++;
                } else {
                    await supabase
                        .from('study_streaks')
                        .insert({
                            student_id: student.id,
                            current_streak: 1,
                            longest_streak: 1,
                            last_study_date: todayStr,
                        });

                    results.streaksUpdated++;
                }

                if (currentStreak > 0 && currentStreak % 7 === 0) {
                    await supabase
                        .from('achievements')
                        .insert({
                            student_id: student.id,
                            achievement_type: 'streak_milestone',
                            title: `${currentStreak} Day Streak!`,
                            description: `You have studied for ${currentStreak} consecutive days!`,
                        });
                    
                    results.achievementsUnlocked++;
                }
            }
        }

        const { data: topStudents } = await supabase
            .from('student_analytics')
            .select('student_id, total_points')
            .order('total_points', { ascending: false })
            .limit(50);

        if (topStudents) {
            for (let i = 0; i < topStudents.length; i++) {
                await supabase
                    .from('leaderboard')
                    .upsert({
                        student_id: topStudents[i].student_id,
                        rank: i + 1,
                        points: topStudents[i].total_points || 0,
                        updated_at: new Date().toISOString(),
                    });
            }
            results.leaderboardUpdated = topStudents.length;
        }

        const { data: studentsForPoints } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'student')
            .limit(50);

        if (studentsForPoints) {
            for (const student of studentsForPoints) {
                const dailyPoints = 10;
                
                await supabase
                    .from('points_transactions')
                    .insert({
                        student_id: student.id,
                        points: dailyPoints,
                        reason: 'Daily login bonus',
                        type: 'credit',
                    });

                await supabase
                    .from('student_analytics')
                    .upsert({
                        student_id: student.id,
                        total_points: dailyPoints,
                    });

                results.pointsCredited += dailyPoints;
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Gamification Automation] Completed in ${duration}ms - Streaks: ${results.streaksUpdated}`);

        return NextResponse.json({
            success: true,
            message: 'Gamification automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Gamification Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
