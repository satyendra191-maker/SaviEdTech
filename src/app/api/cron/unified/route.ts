import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyCronSecret(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    return token === process.env.CRON_SECRET;
}

interface CronResult {
    id: string;
    name: string;
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
    duration: number;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://saviedutech.vercel.app';

async function triggerCronEndpoint(endpoint: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
        const response = await fetch(`${APP_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`,
                'Content-Type': 'application/json',
            },
        });
        
        if (response.ok) {
            let data: unknown;
            try { data = await response.json(); } catch { data = null; }
            return { success: true, data };
        } else {
            const error = await response.text();
            return { success: false, error: `HTTP ${response.status}: ${error}` };
        }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

async function sendStudyReminders(): Promise<CronResult> {
    const start = Date.now();
    try {
        const supabase = createAdminSupabaseClient();
        const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        const { data: inactiveStudents } = await (supabase as any)
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'student')
            .eq('is_active', true)
            .lt('last_active_at', cutoff48h)
            .limit(500);

        let notificationsSent = 0;
        if (inactiveStudents) {
            for (const student of inactiveStudents) {
                await (supabase as any).from('notifications').insert({
                    user_id: student.id,
                    title: '📚 Time to Study!',
                    message: `Hey ${student.full_name?.split(' ')[0] ?? 'there'}! You haven't studied in a while. Keep your streak alive!`,
                    type: 'study_reminder',
                    is_read: false,
                });
                notificationsSent++;
            }
        }

        return { 
            id: 'study-reminders', 
            name: 'Study Reminders', 
            success: true, 
            message: `Sent ${notificationsSent} study reminders to inactive students`,
            details: { notificationsSent },
            duration: Date.now() - start 
        };
    } catch (error) {
        return { 
            id: 'study-reminders', 
            name: 'Study Reminders', 
            success: false, 
            message: String(error),
            duration: Date.now() - start 
        };
    }
}

async function notifyNewLectures(): Promise<CronResult> {
    const start = Date.now();
    try {
        const supabase = createAdminSupabaseClient();
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: newLectures } = await (supabase as any)
            .from('lectures')
            .select('id, title, subject')
            .gte('created_at', cutoff24h)
            .eq('is_published', true)
            .limit(20);

        let notificationsSent = 0;
        if (newLectures && newLectures.length > 0) {
            const { data: allStudents } = await (supabase as any)
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'student')
                .eq('is_active', true)
                .limit(500);

            if (allStudents) {
                for (const student of allStudents) {
                    for (const lecture of newLectures) {
                        await (supabase as any).from('notifications').insert({
                            user_id: student.id,
                            title: '📖 New Lecture Available!',
                            message: `${lecture.title} has been published. Start learning now!`,
                            type: 'lecture',
                            link: `/lectures/${lecture.id}`,
                        });
                        notificationsSent++;
                    }
                }
            }
        }

        return { 
            id: 'lecture-alerts', 
            name: 'Lecture Alerts', 
            success: true, 
            message: `Sent ${notificationsSent} new lecture notifications`,
            details: { lecturesFound: newLectures?.length || 0, notificationsSent },
            duration: Date.now() - start 
        };
    } catch (error) {
        return { 
            id: 'lecture-alerts', 
            name: 'Lecture Alerts', 
            success: false, 
            message: String(error),
            duration: Date.now() - start 
        };
    }
}

async function notifyDailyChallenge(): Promise<CronResult> {
    const start = Date.now();
    try {
        const supabase = createAdminSupabaseClient();
        const today = new Date().toISOString().split('T')[0];

        const { data: challenge } = await (supabase as any)
            .from('daily_challenges')
            .select('id, title, challenge_date')
            .eq('challenge_date', today)
            .maybeSingle();

        let notificationsSent = 0;
        if (challenge) {
            const { data: allStudents } = await (supabase as any)
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'student')
                .eq('is_active', true)
                .limit(500);

            if (allStudents) {
                for (const student of allStudents) {
                    await (supabase as any).from('notifications').insert({
                        user_id: student.id,
                        title: '🎯 Daily Challenge Ready!',
                        message: `Today's challenge: ${challenge.title}. Test your skills now!`,
                        type: 'challenge',
                        link: '/challenge',
                    });
                    notificationsSent++;
                }
            }
        }

        return { 
            id: 'daily-challenge', 
            name: 'Daily Challenge', 
            success: true, 
            message: `Published daily challenge and sent ${notificationsSent} notifications`,
            details: { notificationsSent },
            duration: Date.now() - start 
        };
    } catch (error) {
        return { 
            id: 'daily-challenge', 
            name: 'Daily Challenge', 
            success: false, 
            message: String(error),
            duration: Date.now() - start 
        };
    }
}

async function updateStudentAnalytics(): Promise<CronResult> {
    const start = Date.now();
    try {
        const supabase = createAdminSupabaseClient();

        const { data: students } = await (supabase as any)
            .from('profiles')
            .select('id')
            .eq('role', 'student')
            .eq('is_active', true)
            .limit(500);

        let analyticsUpdated = 0;
        if (students) {
            for (const student of students) {
                const { data: testAttempts } = await (supabase as any)
                    .from('test_attempts')
                    .select('total_score, max_score')
                    .eq('user_id', student.id)
                    .in('status', ['completed', 'time_up']);

                const { data: lectureProgress } = await (supabase as any)
                    .from('lecture_progress')
                    .select('progress_percent')
                    .eq('user_id', student.id);

                const avgScore = testAttempts && testAttempts.length > 0
                    ? testAttempts.reduce((sum, t) => sum + (t.total_score / t.max_score * 100), 0) / testAttempts.length
                    : 0;

                const avgProgress = lectureProgress && lectureProgress.length > 0
                    ? lectureProgress.reduce((sum, p) => sum + (p.progress_percent || 0), 0) / lectureProgress.length
                    : 0;

                await (supabase as any).from('student_analytics').upsert({
                    student_id: student.id,
                    avg_progress: Math.round(avgProgress),
                    avg_test_percentile: Math.round(avgScore),
                    last_updated: new Date().toISOString(),
                });
                analyticsUpdated++;
            }
        }

        return { 
            id: 'student-analytics', 
            name: 'Student Analytics', 
            success: true, 
            message: `Updated analytics for ${analyticsUpdated} students`,
            details: { analyticsUpdated },
            duration: Date.now() - start 
        };
    } catch (error) {
        return { 
            id: 'student-analytics', 
            name: 'Student Analytics', 
            success: false, 
            message: String(error),
            duration: Date.now() - start 
        };
    }
}

async function updateLeaderboard(): Promise<CronResult> {
    const start = Date.now();
    try {
        const supabase = createAdminSupabaseClient();

        const { data: topStudents } = await (supabase as any)
            .from('user_points')
            .select('user_id, total_points')
            .order('total_points', { ascending: false })
            .limit(100);

        let ranksUpdated = 0;
        if (topStudents) {
            for (let i = 0; i < topStudents.length; i++) {
                await (supabase as any).from('leaderboard').upsert({
                    user_id: topStudents[i].user_id,
                    rank: i + 1,
                    points: topStudents[i].total_points,
                    updated_at: new Date().toISOString(),
                });
                ranksUpdated++;
            }
        }

        return { 
            id: 'leaderboard', 
            name: 'Leaderboard Update', 
            success: true, 
            message: `Updated ranks for top ${ranksUpdated} students`,
            details: { ranksUpdated },
            duration: Date.now() - start 
        };
    } catch (error) {
        return { 
            id: 'leaderboard', 
            name: 'Leaderboard Update', 
            success: false, 
            message: String(error),
            duration: Date.now() - start 
        };
    }
}

async function processLeads(): Promise<CronResult> {
    const start = Date.now();
    try {
        const supabase = createAdminSupabaseClient();

        const { data: newLeads } = await (supabase as any)
            .from('lead_forms')
            .select('id, name, phone, email, exam_target')
            .eq('status', 'new')
            .limit(100);

        let leadsProcessed = 0;
        if (newLeads) {
            for (const lead of newLeads) {
                await (supabase as any).from('leads').insert({
                    name: lead.name,
                    phone: lead.phone,
                    email: lead.email,
                    exam_target: lead.exam_target,
                    source: 'website',
                    status: 'new',
                    created_at: new Date().toISOString(),
                });

                await (supabase as any).from('lead_forms')
                    .update({ status: 'processed' })
                    .eq('id', lead.id);
                
                leadsProcessed++;
            }
        }

        return { 
            id: 'lead-processing', 
            name: 'Lead Processing', 
            success: true, 
            message: `Processed ${leadsProcessed} new leads`,
            details: { leadsProcessed },
            duration: Date.now() - start 
        };
    } catch (error) {
        return { 
            id: 'lead-processing', 
            name: 'Lead Processing', 
            success: false, 
            message: String(error),
            duration: Date.now() - start 
        };
    }
}

async function verifyPayments(): Promise<CronResult> {
    const start = Date.now();
    try {
        const supabase = createAdminSupabaseClient();

        const { data: pendingPayments } = await (supabase as any)
            .from('payments')
            .select('id, user_id, amount, status')
            .eq('status', 'pending')
            .limit(50);

        let paymentsVerified = 0;
        if (pendingPayments) {
            for (const payment of pendingPayments) {
                const { data: enrollments } = await (supabase as any)
                    .from('enrollments')
                    .select('id')
                    .eq('user_id', payment.user_id)
                    .limit(1);

                if (enrollments && enrollments.length > 0) {
                    await (supabase as any).from('payments')
                        .update({ status: 'completed' })
                        .eq('id', payment.id);
                    
                    await (supabase as any).from('notifications').insert({
                        user_id: payment.user_id,
                        title: '✅ Payment Confirmed!',
                        message: `Your payment of ₹${payment.amount} has been verified. Start learning now!`,
                        type: 'payment',
                    });
                    paymentsVerified++;
                }
            }
        }

        return { 
            id: 'payment-verification', 
            name: 'Payment Verification', 
            success: true, 
            message: `Verified ${paymentsVerified} payments`,
            details: { paymentsVerified },
            duration: Date.now() - start 
        };
    } catch (error) {
        return { 
            id: 'payment-verification', 
            name: 'Payment Verification', 
            success: false, 
            message: String(error),
            duration: Date.now() - start 
        };
    }
}

async function checkDatabaseHealth(): Promise<CronResult> {
    const start = Date.now();
    try {
        const supabase = createAdminSupabaseClient();
        
        const { error } = await supabase.from('profiles').select('id').limit(1);
        
        if (error) throw error;

        await (supabase as any).from('system_health').insert({
            check_name: 'database',
            status: 'healthy',
            response_time_ms: Date.now() - start,
            checked_at: new Date().toISOString(),
        });

        return { 
            id: 'db-health', 
            name: 'Database Health', 
            success: true, 
            message: 'Database connection healthy',
            duration: Date.now() - start 
        };
    } catch (error) {
        return { 
            id: 'db-health', 
            name: 'Database Health', 
            success: false, 
            message: String(error),
            duration: Date.now() - start 
        };
    }
}

async function runGamification(): Promise<CronResult> {
    const start = Date.now();
    try {
        const supabase = createAdminSupabaseClient();

        const { data: students } = await (supabase as any)
            .from('profiles')
            .select('id, last_active_at')
            .eq('role', 'student')
            .eq('is_active', true)
            .limit(500);

        let streaksUpdated = 0;
        const today = new Date().toISOString().split('T')[0];
        
        if (students) {
            for (const student of students) {
                const lastActive = student.last_active_at?.split('T')[0];
                
                if (lastActive === today) {
                    const { data: existingStreak } = await (supabase as any)
                        .from('user_streaks')
                        .select('current_streak')
                        .eq('user_id', student.id)
                        .maybeSingle();

                    const newStreak = (existingStreak?.current_streak || 0) + 1;

                    await (supabase as any).from('user_streaks').upsert({
                        user_id: student.id,
                        current_streak: newStreak,
                        longest_streak: Math.max(newStreak, existingStreak?.longest_streak || 0),
                        last_study_date: today,
                        updated_at: new Date().toISOString(),
                    });
                    streaksUpdated++;
                }
            }
        }

        return { 
            id: 'gamification', 
            name: 'Gamification', 
            success: true, 
            message: `Updated streaks for ${streaksUpdated} students`,
            details: { streaksUpdated },
            duration: Date.now() - start 
        };
    } catch (error) {
        return { 
            id: 'gamification', 
            name: 'Gamification', 
            success: false, 
            message: String(error),
            duration: Date.now() - start 
        };
    }
}

export async function GET(request: NextRequest) {
    const requestId = `unified_cron_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Execute all cron tasks
        const tasks = [
            sendStudyReminders,
            notifyNewLectures,
            notifyDailyChallenge,
            updateStudentAnalytics,
            updateLeaderboard,
            processLeads,
            verifyPayments,
            checkDatabaseHealth,
            runGamification,
        ];

        const supabase = createAdminSupabaseClient();

        // Run tasks in parallel for faster execution
        const taskPromises = tasks.map(async (task) => {
            try {
                const result = await Promise.race([
                    task(),
                    new Promise<CronResult>((resolve) => 
                        setTimeout(() => resolve({
                            id: task.name,
                            name: task.name,
                            success: false,
                            message: 'Task timed out after 30 seconds',
                            duration: 30000
                        }), 30000)
                    )
                ]);
                
                // Log to database
                await (supabase as any).from('cron_job_logs').insert({
                    job_name: result.id,
                    status: result.success ? 'success' : 'failed',
                    details: { message: result.message, ...result.details },
                    duration_ms: result.duration,
                    executed_at: new Date().toISOString(),
                });
                
                return result;
            } catch (error) {
                const errorResult = {
                    id: task.name,
                    name: task.name,
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                    duration: 0
                };
                
                await (supabase as any).from('cron_job_logs').insert({
                    job_name: errorResult.id,
                    status: 'failed',
                    details: { message: errorResult.message },
                    duration_ms: 0,
                    executed_at: new Date().toISOString(),
                });
                
                return errorResult;
            }
        });

        const results: CronResult[] = await Promise.all(taskPromises);

        const totalDuration = Date.now() - startTime;
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log(`[Unified Cron] Completed in ${totalDuration}ms - Success: ${successful}, Failed: ${failed}`);

        return NextResponse.json({
            success: failed === 0,
            requestId,
            summary: {
                totalTasks: tasks.length,
                successful,
                failed,
                totalDuration: `${totalDuration}ms`,
            },
            results,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error(`[Unified Cron] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
