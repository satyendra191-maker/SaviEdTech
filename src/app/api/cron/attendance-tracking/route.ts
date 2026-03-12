// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const results = {
        marked: 0,
        absences: 0,
        parents: { notified: 0 },
        reports: { generated: 0 },
        errors: [] as string[]
    };

    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: liveClasses } = await supabase
            .from('live_classes')
            .select('id, title, start_time, duration')
            .gte('start_time', today)
            .lte('start_time', today + 'T23:59:59');

        if (liveClasses && liveClasses.length > 0) {
            for (const classSession of liveClasses) {
                const classEndTime = new Date(new Date(classSession.start_time).getTime() + classSession.duration * 60000);
                
                if (new Date() > classEndTime) {
                    const { data: enrollments } = await supabase
                        .from('enrollments')
                        .select('user_id, courses(course_id)')
                        .eq('courses.course_id', classSession.id);

                    if (enrollments) {
                        const { data: attendanceRecords } = await supabase
                            .from('attendance')
                            .select('user_id')
                            .eq('class_id', classSession.id)
                            .eq('date', today);

                        const presentUserIds = attendanceRecords?.map(r => r.user_id) || [];

                        for (const enrollment of enrollments) {
                            if (!presentUserIds.includes(enrollment.user_id)) {
                                await supabase.from('attendance').insert({
                                    user_id: enrollment.user_id,
                                    class_id: classSession.id,
                                    date: today,
                                    status: 'absent',
                                    marked_by: 'auto_system'
                                });
                                results.absences++;

                                const { data: profile } = await supabase
                                    .from('profiles')
                                    .select('name, parent_phone')
                                    .eq('id', enrollment.user_id)
                                    .single();

                                if (profile?.parent_phone) {
                                    await supabase.from('notifications').insert({
                                        user_id: enrollment.user_id,
                                        type: 'attendance_alert',
                                        title: 'Attendance Alert',
                                        message: `Your child was absent from "${classSession.title}" on ${today}. Please ensure regular attendance.`,
                                        is_read: false,
                                        created_at: new Date().toISOString()
                                    });
                                    results.parents.notified++;
                                }
                            }
                        }
                        results.marked++;
                    }
                }
            }
        }

        const { data: students } = await supabase
            .from('profiles')
            .select('id, name, parent_email, parent_phone')
            .eq('role', 'student');

        if (students) {
            for (const student of students) {
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                
                const { data: attendanceData } = await supabase
                    .from('attendance')
                    .select('status')
                    .eq('user_id', student.id)
                    .gte('date', thirtyDaysAgo);

                if (attendanceData) {
                    const totalClasses = attendanceData.length;
                    const presentCount = attendanceData.filter(a => a.status === 'present').length;
                    const attendancePercentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

                    if (attendancePercentage < 75) {
                        await supabase.from('attendance_alerts').insert({
                            user_id: student.id,
                            alert_type: 'low_attendance',
                            attendance_percentage: attendancePercentage,
                            period_days: 30,
                            parents_notified: !!student.parent_phone,
                            created_at: new Date().toISOString()
                        });

                        if (student.parent_phone) {
                            await supabase.from('notifications').insert({
                                user_id: student.id,
                                type: 'parent_attendance_alert',
                                title: 'Low Attendance Warning',
                                message: `Your child's attendance is ${attendancePercentage.toFixed(1)}% for the last 30 days. Please ensure better attendance.`,
                                is_read: false,
                                created_at: new Date().toISOString()
                            });
                            results.parents.notified++;
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Attendance tracking processed',
            results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Attendance automation error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            results
        }, { status: 500 });
    }
}
