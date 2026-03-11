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
    const requestId = `analytics_automation_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient();
        
        const results = {
            reportsGenerated: 0,
            studentsAnalyzed: 0,
            insightsGenerated: 0,
            trendsUpdated: 0,
            errors: [] as string[],
        };

        const { data: activeStudents } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'student')
            .eq('is_active', true)
            .limit(100);

        if (activeStudents) {
            for (const student of activeStudents) {
                const { data: enrollments } = await supabase
                    .from('enrollments')
                    .select('id, course_id, progress, last_accessed_at')
                    .eq('student_id', student.id);

                if (enrollments && enrollments.length > 0) {
                    const totalProgress = enrollments.reduce((sum, e) => sum + (e.progress || 0), 0);
                    const avgProgress = Math.round(totalProgress / enrollments.length);
                    
                    const { data: testAttempts } = await supabase
                        .from('test_attempts')
                        .select('id, total_marks, percentile')
                        .eq('student_id', student.id);

                    let avgPercentile = 0;
                    if (testAttempts && testAttempts.length > 0) {
                        const totalPercentile = testAttempts.reduce((sum, t) => sum + (t.percentile || 0), 0);
                        avgPercentile = Math.round(totalPercentile / testAttempts.length);
                    }

                    await supabase
                        .from('student_analytics')
                        .upsert({
                            student_id: student.id,
                            avg_progress: avgProgress,
                            avg_test_percentile: avgPercentile,
                            courses_enrolled: enrollments.length,
                            last_updated: new Date().toISOString(),
                        });

                    results.studentsAnalyzed++;
                }
            }
        }

        const { data: courseStats } = await supabase
            .from('courses')
            .select('id, title');

        if (courseStats) {
            for (const course of courseStats) {
                const { data: enrollments } = await supabase
                    .from('enrollments')
                    .select('id, student_id')
                    .eq('course_id', course.id);

                const { data: ratings } = await supabase
                    .from('course_reviews')
                    .select('rating')
                    .eq('course_id', course.id);

                const avgRating = ratings && ratings.length > 0
                    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                    : 0;

                await supabase
                    .from('course_analytics')
                    .upsert({
                        course_id: course.id,
                        total_enrollments: enrollments?.length || 0,
                        avg_rating: Math.round(avgRating * 10) / 10,
                        last_updated: new Date().toISOString(),
                    });

                results.reportsGenerated++;
            }
        }

        const { data: platformStats } = await supabase
            .from('platform_analytics')
            .select('*')
            .order('date', { ascending: false })
            .limit(1);

        if (platformStats && platformStats.length > 0) {
            const lastDate = new Date(platformStats[0].date);
            const today = new Date();
            const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff >= 1) {
                const { count: totalStudents } = await supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('role', 'student');

                const { count: totalEnrollments } = await supabase
                    .from('enrollments')
                    .select('id', { count: 'exact', head: true });

                const { data: revenue } = await supabase
                    .from('financial_transactions')
                    .select('amount')
                    .eq('payment_status', 'captured');

                const totalRevenue = revenue?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

                await supabase
                    .from('platform_analytics')
                    .insert({
                        date: today.toISOString().split('T')[0],
                        total_students: totalStudents || 0,
                        total_enrollments: totalEnrollments || 0,
                        total_revenue: totalRevenue,
                    });

                results.reportsGenerated++;
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Analytics Automation] Completed in ${duration}ms - Students: ${results.studentsAnalyzed}`);

        return NextResponse.json({
            success: true,
            message: 'Analytics automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Analytics Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
