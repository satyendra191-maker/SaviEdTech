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
    const requestId = `push_notification_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient();
        
        const results = {
            notificationsSent: 0,
            remindersSent: 0,
            alertsSent: 0,
            errors: [] as string[],
        };

        const { data: upcomingLectures } = await supabase
            .from('lectures')
            .select('id, title, course_id, scheduled_at')
            .gte('scheduled_at', new Date().toISOString())
            .lte('scheduled_at', new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString())
            .eq('notification_sent', false)
            .limit(10);

        if (upcomingLectures) {
            for (const lecture of upcomingLectures) {
                const { data: enrolledStudents } = await supabase
                    .from('enrollments')
                    .select('student_id')
                    .eq('course_id', lecture.course_id);

                if (enrolledStudents) {
                    for (const student of enrolledStudents) {
                        await supabase
                            .from('push_notifications')
                            .insert({
                                user_id: student.student_id,
                                title: 'Live Class Starting Soon!',
                                body: `${lecture.title} will start in less than 2 hours`,
                                type: 'class_reminder',
                                reference_id: lecture.id,
                                status: 'sent',
                            });
                        
                        results.notificationsSent++;
                    }
                }

                await supabase
                    .from('lectures')
                    .update({ notification_sent: true })
                    .eq('id', lecture.id);
            }
        }

        const { data: incompleteEnrollments } = await supabase
            .from('enrollments')
            .select('id, student_id, course_id, progress')
            .lt('progress', 100)
            .gt('progress', 0)
            .order('last_accessed_at', { ascending: false })
            .limit(50);

        if (incompleteEnrollments) {
            const now = new Date();
            const lastMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            for (const enrollment of incompleteEnrollments) {
                const lastAccessed = enrollment.last_accessed_at ? new Date(enrollment.last_accessed_at) : null;
                
                if (!lastAccessed || lastAccessed < lastMidnight) {
                    const { data: course } = await supabase
                        .from('courses')
                        .select('title')
                        .eq('id', enrollment.course_id)
                        .single();

                    if (course) {
                        await supabase
                            .from('push_notifications')
                            .insert({
                                user_id: enrollment.student_id,
                                title: 'Continue Your Learning!',
                                body: `You have ${enrollment.progress}% progress in ${course.title}. Keep going!`,
                                type: 'study_reminder',
                                reference_id: enrollment.course_id,
                                status: 'sent',
                            });

                        results.remindersSent++;
                    }
                }
            }
        }

        const { data: upcomingTests } = await supabase
            .from('biweekly_tests')
            .select('id, title, scheduled_at')
            .gte('scheduled_at', new Date().toISOString())
            .lte('scheduled_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
            .eq('notification_sent', false);

        if (upcomingTests) {
            for (const test of upcomingTests) {
                const { data: allStudents } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('role', 'student');

                if (allStudents) {
                    for (const student of allStudents) {
                        await supabase
                            .from('push_notifications')
                            .insert({
                                user_id: student.id,
                                title: 'Test Tomorrow!',
                                body: `${test.title} is scheduled for tomorrow. Prepare well!`,
                                type: 'test_alert',
                                reference_id: test.id,
                                status: 'sent',
                            });

                        results.alertsSent++;
                    }
                }

                await supabase
                    .from('biweekly_tests')
                    .update({ notification_sent: true })
                    .eq('id', test.id);
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Push Notification Automation] Completed in ${duration}ms - Sent: ${results.notificationsSent}`);

        return NextResponse.json({
            success: true,
            message: 'Push notification automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Push Notification Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
