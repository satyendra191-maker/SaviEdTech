import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient() as any;
    const results = {
        sessions: { created: 0, reminders: 0 },
        reminders: { sent: 0 },
        recordings: { processed: 0 },
        feedback: { collected: 0 },
        errors: [] as string[]
    };

    try {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const { data: upcomingWebinars } = await supabase
            .from('webinars')
            .select('*, courses(title), profiles(name)')
            .gte('scheduled_at', tomorrowStr)
            .lte('scheduled_at', tomorrowStr + 'T23:59:59')
            .eq('is_published', true);

        if (upcomingWebinars) {
            for (const webinar of upcomingWebinars) {
                const enrolledStudents = await supabase
                    .from('enrollments')
                    .select('user_id, profiles(name, email)')
                    .eq('course_id', webinar.course_id);

                if (enrolledStudents.data) {
                    for (const student of enrolledStudents.data) {
                        const existingReminder = await supabase
                            .from('webinar_reminders')
                            .select('id')
                            .eq('webinar_id', webinar.id)
                            .eq('user_id', student.user_id)
                            .single();

                        if (!existingReminder.data) {
                            await supabase.from('webinar_reminders').insert({
                                webinar_id: webinar.id,
                                user_id: student.user_id,
                                reminder_type: 'day_before',
                                sent_at: new Date().toISOString()
                            });

                            await supabase.from('notifications').insert({
                                user_id: student.user_id,
                                type: 'webinar_reminder',
                                title: 'Webinar Tomorrow!',
                                message: `Reminder: "${webinar.title}" is scheduled for tomorrow at ${new Date(webinar.scheduled_at).toLocaleTimeString()}`,
                                is_read: false,
                                created_at: new Date().toISOString()
                            });
                            results.reminders.sent++;
                        }
                    }
                }
            }
        }

        const { data: completedWebinars } = await supabase
            .from('webinars')
            .select('*')
            .eq('status', 'completed')
            .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (completedWebinars) {
            for (const webinar of completedWebinars) {
                const enrolledStudents = await supabase
                    .from('enrollments')
                    .select('user_id')
                    .eq('course_id', webinar.course_id);

                if (enrolledStudents.data) {
                    for (const student of enrolledStudents.data) {
                        await supabase.from('webinar_feedback_requests').insert({
                            webinar_id: webinar.id,
                            user_id: student.user_id,
                            requested_at: new Date().toISOString()
                        });

                        await supabase.from('notifications').insert({
                            user_id: student.user_id,
                            type: 'webinar_feedback',
                            title: 'How was the webinar?',
                            message: `We hope you enjoyed "${webinar.title}". Please share your feedback!`,
                            is_read: false,
                            created_at: new Date().toISOString()
                        });
                        results.feedback.collected++;
                    }
                }

                if (webinar.recording_url) {
                    await supabase
                        .from('webinars')
                        .update({ 
                            recording_processed: true,
                            recording_available: true
                        })
                        .eq('id', webinar.id);
                    results.recordings.processed++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Webinar management automation completed',
            results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Webinar automation error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            results
        }, { status: 500 });
    }
}
