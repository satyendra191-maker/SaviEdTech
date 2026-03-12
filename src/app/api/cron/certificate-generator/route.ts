// @ts-nocheck
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
    const requestId = `certificate_automation_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient();
        
        const results = {
            certificatesGenerated: 0,
            studentsProcessed: 0,
            coursesCompleted: 0,
            errors: [] as string[],
        };

        const { data: completedEnrollments } = await supabase
            .from('enrollments')
            .select('id, student_id, course_id, progress, completed_at, is_certificate_issued')
            .eq('progress', 100)
            .eq('is_certificate_issued', false)
            .order('completed_at', { ascending: false })
            .limit(50);

        if (completedEnrollments) {
            for (const enrollment of completedEnrollments) {
                try {
                    const { data: course } = await supabase
                        .from('courses')
                        .select('id, title, instructor_name')
                        .eq('id', enrollment.course_id)
                        .single();

                    const { data: student } = await supabase
                        .from('profiles')
                        .select('id, full_name, email')
                        .eq('id', enrollment.student_id)
                        .single();

                    if (course && student) {
                        const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
                        
                        const { data: certificate, error: certError } = await supabase
                            .from('certificates')
                            .insert({
                                enrollment_id: enrollment.id,
                                student_id: enrollment.student_id,
                                course_id: enrollment.course_id,
                                certificate_number: certificateNumber,
                                issued_at: new Date().toISOString(),
                                status: 'active',
                            })
                            .select()
                            .single();

                        if (!certError && certificate) {
                            await supabase
                                .from('enrollments')
                                .update({ is_certificate_issued: true })
                                .eq('id', enrollment.id);

                            results.certificatesGenerated++;
                        }
                    }
                    
                    results.studentsProcessed++;
                } catch (err) {
                    results.errors.push(`Failed to generate certificate for enrollment ${enrollment.id}`);
                }
            }
        }

        const { data: biweeklyCompletions } = await supabase
            .from('biweekly_test_attempts')
            .select('id, student_id, test_id, total_marks, percentile')
            .eq('is_certificate_issued', false)
            .gte('percentile', 90)
            .limit(20);

        if (biweeklyCompletions) {
            for (const attempt of biweeklyCompletions) {
                const { data: test } = await supabase
                    .from('biweekly_tests')
                    .select('id, title')
                    .eq('id', attempt.test_id)
                    .single();

                if (test) {
                    const certNumber = `RANK-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
                    
                    await supabase
                        .from('certificates')
                        .insert({
                            student_id: attempt.student_id,
                            test_id: attempt.test_id,
                            certificate_number: certNumber,
                            issued_at: new Date().toISOString(),
                            status: 'active',
                            certificate_type: 'achievement',
                        });

                    await supabase
                        .from('biweekly_test_attempts')
                        .update({ is_certificate_issued: true })
                        .eq('id', attempt.id);

                    results.certificatesGenerated++;
                }
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Certificate Automation] Completed in ${duration}ms - Generated: ${results.certificatesGenerated}`);

        return NextResponse.json({
            success: true,
            message: 'Certificate automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Certificate Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
