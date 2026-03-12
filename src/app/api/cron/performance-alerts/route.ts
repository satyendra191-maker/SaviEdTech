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
    const requestId = `performance_alerts_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient() as any;
        
        const results = {
            studentAlerts: 0,
            teacherAlerts: 0,
            parentAlerts: 0,
            warningsIssued: 0,
            errors: [] as string[],
        };

        const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'student')
            .limit(50);

        if (students) {
            for (const student of students) {
                const { data: testAttempts } = await supabase
                    .from('test_attempts')
                    .select('percentile')
                    .eq('student_id', student.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (testAttempts && testAttempts.length >= 3) {
                    const recentPercentiles = testAttempts.map(t => t.percentile || 0);
                    const declining = recentPercentiles.every((p, i) => i === 0 || p <= recentPercentiles[i - 1]);
                    
                    if (declining && recentPercentiles[recentPercentiles.length - 1] < 50) {
                        await supabase
                            .from('notifications')
                            .insert({
                                user_id: student.id,
                                title: 'Performance Alert',
                                message: 'Your test scores have been declining. Consider reviewing your study plan.',
                                type: 'performance_warning',
                            });
                        
                        results.warningsIssued++;
                    }
                }

                const { data: enrollments } = await supabase
                    .from('enrollments')
                    .select('progress')
                    .eq('student_id', student.id);

                if (enrollments) {
                    const avgProgress = enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length;
                    
                    if (avgProgress < 20 && enrollments.length > 0) {
                        await supabase
                            .from('notifications')
                            .insert({
                                user_id: student.id,
                                title: 'Low Progress Alert',
                                message: 'You have low course progress. Start learning today!',
                                type: 'progress_alert',
                            });
                        
                        results.studentAlerts++;
                    }
                }
            }
        }

        const { data: teachers } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'teacher')
            .limit(10);

        if (teachers) {
            for (const teacher of teachers) {
                const { data: pendingDoubts } = await supabase
                    .from('doubts')
                    .select('id')
                    .eq('teacher_id', teacher.id)
                    .eq('status', 'assigned');

                if (pendingDoubts && pendingDoubts.length > 10) {
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: teacher.id,
                            title: 'Pending Doubts Alert',
                            message: `You have ${pendingDoubts.length} pending doubts to resolve.`,
                            type: 'teacher_alert',
                        });
                    
                    results.teacherAlerts++;
                }
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Performance Alerts Automation] Completed in ${duration}ms - Alerts: ${results.studentAlerts}`);

        return NextResponse.json({
            success: true,
            message: 'Performance alerts automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Performance Alerts Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
