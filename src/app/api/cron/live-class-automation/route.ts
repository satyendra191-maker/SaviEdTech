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
            job_name: jobName, status, details, duration_ms: durationMs ?? null,
            executed_at: new Date().toISOString(),
        });
    } catch { /* silently ignore */ }
}

export async function GET(request: NextRequest) {
    if (!verifyCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const startTime = Date.now();
    const jobId = `live_class_${Date.now()}`;
    const supabase = createServerSupabaseClient();
    await logCronJob(supabase, 'live-class-automation', 'running', { jobId });

    const results = {
        classesScheduled: 0,
        remindersSet: 0,
        attendanceUpdated: 0,
        recordingsArchived: 0,
        errors: [] as string[],
    };

    try {
        // Step 1: Auto-schedule recurring live classes
        const { data: recurringClasses } = await (supabase as any)
            .from('live_classes')
            .select('id, title, teacher_id, subject, recurrence_days, duration_minutes')
            .eq('is_recurring', true)
            .eq('is_active', true)
            .limit(20);

        if (recurringClasses) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowDay = tomorrow.getDay(); // 0=Sun, 1=Mon...

            for (const cls of recurringClasses) {
                const days: number[] = cls.recurrence_days ?? [];
                if (days.includes(tomorrowDay)) {
                    // Check if already scheduled for tomorrow
                    const tomorrowStr = tomorrow.toISOString().split('T')[0];
                    const { data: existing } = await (supabase as any)
                        .from('live_class_sessions')
                        .select('id')
                        .eq('class_id', cls.id)
                        .eq('scheduled_date', tomorrowStr)
                        .maybeSingle();

                    if (!existing) {
                        await (supabase as any).from('live_class_sessions').insert({
                            class_id: cls.id,
                            title: cls.title,
                            teacher_id: cls.teacher_id,
                            subject: cls.subject,
                            scheduled_date: tomorrowStr,
                            scheduled_at: `${tomorrowStr}T09:00:00.000Z`,
                            duration_minutes: cls.duration_minutes || 60,
                            status: 'scheduled',
                            created_at: new Date().toISOString(),
                        });
                        results.classesScheduled++;
                    }
                }
            }
        }

        // Step 2: Send reminders for classes in next 2 hours
        const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

        const { data: upcomingSessions } = await (supabase as any)
            .from('live_class_sessions')
            .select('id, title, scheduled_at, class_id')
            .eq('status', 'scheduled')
            .eq('reminders_sent', false)
            .lte('scheduled_at', twoHoursFromNow)
            .gte('scheduled_at', new Date().toISOString())
            .limit(10);

        if (upcomingSessions) {
            for (const session of upcomingSessions) {
                // Notify enrolled students
                const { data: enrolledStudents } = await (supabase as any)
                    .from('live_class_enrollments')
                    .select('student_id')
                    .eq('class_id', session.class_id)
                    .limit(500);

                if (enrolledStudents) {
                    const notifications = enrolledStudents.map((e: { student_id: string }) => ({
                        user_id: e.student_id,
                        title: '🎓 Live Class Starting Soon!',
                        message: `"${session.title}" starts in less than 2 hours. Don't miss it!`,
                        type: 'live_class_reminder',
                        metadata: { session_id: session.id },
                        is_read: false,
                        created_at: new Date().toISOString(),
                    }));

                    for (let i = 0; i < notifications.length; i += 100) {
                        await (supabase as any).from('notifications').insert(notifications.slice(i, i + 100));
                    }

                    await (supabase as any)
                        .from('live_class_sessions')
                        .update({ reminders_sent: true, reminders_sent_at: new Date().toISOString() })
                        .eq('id', session.id);

                    results.remindersSet += enrolledStudents.length;
                }
            }
        }

        // Step 3: Update attendance logs for completed sessions
        const cutoff2h = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

        const { data: endedSessions } = await (supabase as any)
            .from('live_class_sessions')
            .select('id, title, class_id, scheduled_at, duration_minutes')
            .eq('status', 'scheduled')
            .lt('scheduled_at', cutoff2h)
            .limit(20);

        if (endedSessions) {
            for (const session of endedSessions) {
                await (supabase as any)
                    .from('live_class_sessions')
                    .update({ status: 'completed', completed_at: new Date().toISOString() })
                    .eq('id', session.id);
                results.attendanceUpdated++;
            }
        }

        // Step 4: Archive recordings for sessions older than 7 days
        const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: oldSessions } = await (supabase as any)
            .from('live_class_sessions')
            .select('id')
            .eq('status', 'completed')
            .eq('recording_archived', false)
            .lt('completed_at', cutoff7d)
            .limit(20);

        if (oldSessions) {
            for (const session of oldSessions) {
                await (supabase as any)
                    .from('live_class_sessions')
                    .update({ recording_archived: true, archived_at: new Date().toISOString() })
                    .eq('id', session.id);
                results.recordingsArchived++;
            }
        }

        const duration = Date.now() - startTime;
        await logCronJob(supabase, 'live-class-automation', 'success', results, duration);
        return NextResponse.json({ success: true, results, duration, jobId });
    } catch (error) {
        const duration = Date.now() - startTime;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(msg);
        await logCronJob(supabase, 'live-class-automation', 'failed', { error: msg }, duration);
        return NextResponse.json({ success: false, error: msg, results, jobId }, { status: 500 });
    }
}
