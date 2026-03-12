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
    const requestId = `webinar_automation_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient() as any;
        
        const results = {
            webinarsScheduled: 0,
            remindersSent: 0,
            recordingsProcessed: 0,
            feedbackCollected: 0,
            errors: [] as string[],
        };

        const { data: upcomingWebinars } = await supabase
            .from('webinars')
            .select('*')
            .eq('status', 'scheduled')
            .gte('scheduled_at', new Date().toISOString())
            .limit(10);

        if (upcomingWebinars) {
            for (const webinar of upcomingWebinars) {
                const webinarTime = new Date(webinar.scheduled_at);
                const hoursUntilWebinar = (webinarTime.getTime() - Date.now()) / (1000 * 60 * 60);

                if (hoursUntilWebinar <= 24 && hoursUntilWebinar > 0) {
                    const { data: enrolledStudents } = await supabase
                        .from('webinar_registrations')
                        .select('student_id')
                        .eq('webinar_id', webinar.id);

                    if (enrolledStudents) {
                        for (const student of enrolledStudents) {
                            await supabase
                                .from('notifications')
                                .insert({
                                    user_id: student.student_id,
                                    title: 'Webinar Starting Soon!',
                                    message: `${webinar.title} starts in ${Math.round(hoursUntilWebinar)} hours`,
                                    type: 'webinar_reminder',
                                });
                            
                            results.remindersSent++;
                        }
                    }
                }

                if (hoursUntilWebinar <= 1 && webinar.status === 'scheduled') {
                    await supabase
                        .from('webinars')
                        .update({ status: 'live' })
                        .eq('id', webinar.id);
                }
            }
            results.webinarsScheduled = upcomingWebinars.length;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const { data: completedWebinars } = await supabase
            .from('webinars')
            .select('*')
            .eq('status', 'live')
            .lt('scheduled_at', yesterday.toISOString());

        if (completedWebinars) {
            for (const webinar of completedWebinars) {
                await supabase
                    .from('webinars')
                    .update({ status: 'completed' })
                    .eq('id', webinar.id);

                await supabase
                    .from('feedback_requests')
                    .insert({
                        webinar_id: webinar.id,
                        status: 'pending',
                    });

                results.recordingsProcessed++;
                results.feedbackCollected++;
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Webinar Automation] Completed in ${duration}ms - Scheduled: ${results.webinarsScheduled}`);

        return NextResponse.json({
            success: true,
            message: 'Webinar automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Webinar Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
