import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyCron(request: NextRequest): boolean {
    const auth = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    return !!secret && auth === `Bearer ${secret}`;
}

async function logCronJob(
    supabase: ReturnType<typeof createServerSupabaseClient>,
    jobName: string,
    status: 'running' | 'success' | 'failed',
    details: Record<string, unknown> = {},
    durationMs?: number
) {
    try {
        await (supabase as any).from('cron_job_logs').insert({
            job_name: jobName,
            status,
            details,
            duration_ms: durationMs ?? null,
            executed_at: new Date().toISOString(),
        });
    } catch { /* silently ignore */ }
}

export async function GET(request: NextRequest) {
    if (!verifyCron(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const jobId = `engagement_${Date.now()}`;
    const supabase = createServerSupabaseClient();
    await logCronJob(supabase, 'engagement', 'running', { jobId });

    const results = {
        studyReminders: 0,
        lectureAlerts: 0,
        mockTestAlerts: 0,
        leaderboardAlerts: 0,
        errors: [] as string[],
    };

    try {
        // Step 1: Study reminders for students who haven't studied in 48h
        const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        const { data: inactiveStudents } = await (supabase as any)
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'student')
            .eq('is_active', true)
            .lt('last_active_at', cutoff48h)
            .limit(200);

        if (inactiveStudents) {
            for (const student of inactiveStudents) {
                await (supabase as any).from('notifications').insert({
                    user_id: student.id,
                    title: '📚 Time to Study!',
                    message: `Hey ${student.full_name?.split(' ')[0] ?? 'there'}! You haven't studied in a while. Your next rank goal awaits!`,
                    type: 'study_reminder',
                    is_read: false,
                    created_at: new Date().toISOString(),
                });
                results.studyReminders++;
            }
        }

        // Step 2: Alert students about new lectures published in last 24h
        const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: newLectures } = await (supabase as any)
            .from('lectures')
            .select('id, title, subject')
            .eq('is_published', true)
            .gte('published_at', cutoff24h)
            .limit(10);

        if (newLectures && newLectures.length > 0) {
            const { data: allStudents } = await (supabase as any)
                .from('profiles')
                .select('id')
                .eq('role', 'student')
                .eq('is_active', true)
                .limit(500);

            if (allStudents) {
                for (const lecture of newLectures) {
                    const notifications = allStudents.map((s: { id: string }) => ({
                        user_id: s.id,
                        title: '🎬 New Lecture Available!',
                        message: `New lecture published: "${lecture.title}" — Start learning now!`,
                        type: 'new_lecture',
                        metadata: { lecture_id: lecture.id, subject: lecture.subject },
                        is_read: false,
                        created_at: new Date().toISOString(),
                    }));

                    // Batch insert (100 at a time)
                    for (let i = 0; i < notifications.length; i += 100) {
                        await (supabase as any).from('notifications').insert(notifications.slice(i, i + 100));
                    }
                    results.lectureAlerts += allStudents.length;
                }
            }
        }

        // Step 3: Mock test alerts — remind students of upcoming tests
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const { data: upcomingTests } = await (supabase as any)
            .from('mock_tests')
            .select('id, title, scheduled_at')
            .eq('is_active', true)
            .lte('scheduled_at', tomorrow)
            .gte('scheduled_at', new Date().toISOString())
            .limit(5);

        if (upcomingTests && upcomingTests.length > 0) {
            const { data: students } = await (supabase as any)
                .from('profiles')
                .select('id')
                .eq('role', 'student')
                .eq('is_active', true)
                .limit(500);

            if (students) {
                for (const test of upcomingTests) {
                    const notifications = students.map((s: { id: string }) => ({
                        user_id: s.id,
                        title: '📝 Mock Test Reminder',
                        message: `"${test.title}" is scheduled for tomorrow. Are you ready?`,
                        type: 'mock_test_alert',
                        metadata: { test_id: test.id },
                        is_read: false,
                        created_at: new Date().toISOString(),
                    }));

                    for (let i = 0; i < notifications.length; i += 100) {
                        await (supabase as any).from('notifications').insert(notifications.slice(i, i + 100));
                    }
                    results.mockTestAlerts += students.length;
                }
            }
        }

        // Step 4: Leaderboard notifications — top 10 changes
        const { data: topStudents } = await (supabase as any)
            .from('leaderboard')
            .select('student_id, rank, full_name')
            .order('rank', { ascending: true })
            .limit(10);

        if (topStudents) {
            for (const entry of topStudents) {
                await (supabase as any).from('notifications').insert({
                    user_id: entry.student_id,
                    title: '🏆 Leaderboard Update',
                    message: `You are currently ranked #${entry.rank} on the national leaderboard! Keep it up!`,
                    type: 'leaderboard_update',
                    is_read: false,
                    created_at: new Date().toISOString(),
                });
                results.leaderboardAlerts++;
            }
        }

        const duration = Date.now() - startTime;
        await logCronJob(supabase, 'engagement', 'success', results, duration);

        return NextResponse.json({ success: true, results, duration, jobId });
    } catch (error) {
        const duration = Date.now() - startTime;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(msg);
        await logCronJob(supabase, 'engagement', 'failed', { error: msg }, duration);
        return NextResponse.json({ success: false, error: msg, results, jobId }, { status: 500 });
    }
}
