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
    const requestId = `assignment_automation_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient();
        
        const results = {
            assignmentsCreated: 0,
            deadlinesUpdated: 0,
            submissionsTracked: 0,
            gradesPublished: 0,
            errors: [] as string[],
        };

        const { data: chaptersForAssignments } = await supabase
            .from('chapters')
            .select('id, course_id, title')
            .order('created_at', { ascending: true })
            .limit(20);

        if (chaptersForAssignments) {
            for (const chapter of chaptersForAssignments) {
                const { data: existingAssignment } = await supabase
                    .from('assignments')
                    .select('id')
                    .eq('chapter_id', chapter.id)
                    .single();

                if (!existingAssignment) {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 14);

                    await supabase
                        .from('assignments')
                        .insert({
                            chapter_id: chapter.id,
                            course_id: chapter.course_id,
                            title: `Assignment: ${chapter.title}`,
                            description: `Complete all exercises from ${chapter.title}`,
                            due_date: dueDate.toISOString(),
                            total_marks: 100,
                            status: 'active',
                        });

                    results.assignmentsCreated++;
                }
            }
        }

        const { data: upcomingAssignments } = await supabase
            .from('assignments')
            .select('id, title, due_date')
            .eq('status', 'active')
            .gte('due_date', new Date().toISOString());

        if (upcomingAssignments) {
            for (const assignment of upcomingAssignments) {
                const dueDate = new Date(assignment.due_date);
                const hoursUntilDue = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60);

                if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
                    const { data: enrolledStudents } = await supabase
                        .from('enrollments')
                        .select('student_id')
                        .eq('course_id', (assignment as any).course_id);

                    if (enrolledStudents) {
                        for (const student of enrolledStudents) {
                            await supabase
                                .from('notifications')
                                .insert({
                                    user_id: student.student_id,
                                    title: 'Assignment Due Tomorrow!',
                                    message: `${assignment.title} is due in ${Math.round(hoursUntilDue)} hours`,
                                    type: 'assignment_reminder',
                                });
                        }
                    }
                }
            }
        }

        const { data: overdueAssignments } = await supabase
            .from('assignments')
            .select('id, chapter_id')
            .eq('status', 'active')
            .lt('due_date', new Date().toISOString());

        if (overdueAssignments) {
            for (const assignment of overdueAssignments) {
                await supabase
                    .from('assignments')
                    .update({ status: 'closed' })
                    .eq('id', assignment.id);
                
                results.deadlinesUpdated++;
            }
        }

        const { data: pendingSubmissions } = await supabase
            .from('assignment_submissions')
            .select('id, assignment_id, status')
            .eq('status', 'submitted');

        if (pendingSubmissions) {
            for (const submission of pendingSubmissions) {
                await supabase
                    .from('assignment_submissions')
                    .update({ status: 'graded', marks_obtained: 0 })
                    .eq('id', submission.id);
                
                results.gradesPublished++;
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Assignment Automation] Completed in ${duration}ms - Created: ${results.assignmentsCreated}`);

        return NextResponse.json({
            success: true,
            message: 'Assignment automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Assignment Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
