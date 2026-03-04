import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

/**
 * CRON Job: Revision Task Updater
 * Runs at 3:00 AM daily
 * Generates revision tasks based on mistake logs and weak topics
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();
    const results = {
        tasksCreated: 0,
        errors: [] as string[],
        timestamp: new Date().toISOString(),
    };

    try {
        // Get all active students
        const { data: students, error: studentsError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'student')
            .eq('is_active', true) as any;

        if (studentsError) throw studentsError;

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        for (const student of (students as any[]) ?? []) {
            try {
                if (!student.id) continue;

                // Get unreviewed mistakes
                const { data: mistakes, error: mistakesError } = await supabase
                    .from('mistake_logs')
                    .select('id, topic_id, difficulty_level')
                    .eq('user_id', student.id)
                    .eq('is_reviewed', false)
                    .order('occurred_at', { ascending: false } as any)
                    .limit(5) as any;

                if (mistakesError) {
                    results.errors.push(`Mistakes fetch failed for ${student.id}`);
                    continue;
                }

                // Get weak topics from topic_mastery
                const { data: weakTopics, error: topicsError } = await supabase
                    .from('topic_mastery')
                    .select('topic_id, accuracy_percent')
                    .eq('user_id', student.id)
                    .lt('accuracy_percent', 60)
                    .order('accuracy_percent', { ascending: true } as any)
                    .limit(3) as any;

                if (topicsError) {
                    results.errors.push(`Topics fetch failed for ${student.id}`);
                    continue;
                }

                // Combine unique topics
                const revisionTopicIds = new Set<string>();
                (mistakes as any[])?.forEach(m => { if (m.topic_id) revisionTopicIds.add(m.topic_id); });
                (weakTopics as any[])?.forEach(t => { if (t.topic_id) revisionTopicIds.add(t.topic_id); });

                // Create revision tasks for each topic
                for (const topicId of revisionTopicIds) {
                    // Check if task already exists for tomorrow
                    const { data: existingTask } = await supabase
                        .from('revision_tasks')
                        .select('id')
                        .eq('user_id', student.id)
                        .eq('topic_id', topicId)
                        .eq('scheduled_for', tomorrowStr)
                        .maybeSingle() as any;

                    if (existingTask) continue;

                    // Get recommended questions for this topic
                    const { data: questions } = await supabase
                        .from('questions')
                        .select('id')
                        .eq('topic_id', topicId)
                        .eq('is_published', true)
                        .limit(5) as any;

                    const insertData: any = {
                        user_id: student.id,
                        topic_id: topicId,
                        task_type: 'practice_questions',
                        priority: 'high',
                        scheduled_for: tomorrowStr,
                        status: 'pending',
                        related_mistake_ids: (mistakes as any[])
                            ?.filter(m => m.topic_id === topicId)
                            .map(m => m.id) || [],
                        recommended_questions: (questions as any[])?.map(q => q.id) || [],
                    };

                    const { error: insertError } = await supabase
                        .from('revision_tasks')
                        .insert(insertData);

                    if (insertError) {
                        results.errors.push(`Failed to create task for ${student.id}: ${insertError.message}`);
                    } else {
                        results.tasksCreated++;
                    }
                }
            } catch (studentErr) {
                const msg = studentErr instanceof Error ? studentErr.message : 'Unknown error';
                results.errors.push(`Failed to process student ${student.id}: ${msg}`);
            }
        }

        // Log success
        await supabase.from('system_health').insert({
            check_name: 'revision_updater',
            status: results.errors.length > 0 ? 'degraded' : 'healthy',
            details: results as any,
        } as any);

        return NextResponse.json({
            success: true,
            message: `Created ${results.tasksCreated} revision tasks`,
            results,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await supabase.from('error_logs').insert({
            error_type: 'cron_job_failed',
            error_message: `Revision Updater failed: ${errorMessage}`,
            metadata: { results } as any,
        } as any);

        return NextResponse.json(
            { success: false, error: errorMessage, results },
            { status: 500 }
        );
    }
}
