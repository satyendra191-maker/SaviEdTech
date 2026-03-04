import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';

/**
 * CRON Job: Daily Practice Problem (DPP) Generator
 * Runs at 2:30 AM daily
 * Generates DPP sets for all active exams and subjects
 */
export async function GET(request: NextRequest) {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();
    const results = {
        generated: 0,
        errors: [] as string[],
        timestamp: new Date().toISOString(),
    };

    try {
        // Get all active exams
        const { data: exams, error: examsError } = await supabase
            .from('exams')
            .select('id, name, subjects')
            .eq('is_active', true) as any;

        if (examsError) throw examsError;

        const today = new Date().toISOString().split('T')[0];

        for (const exam of (exams as any[]) ?? []) {
            // Get subjects for this exam
            const { data: subjects, error: subjectsError } = await supabase
                .from('subjects')
                .select('id, name')
                .eq('exam_id', exam.id)
                .eq('is_active', true) as any;

            if (subjectsError) {
                results.errors.push(`Failed to get subjects for ${exam.name}: ${subjectsError.message}`);
                continue;
            }

            for (const subject of (subjects as any[]) ?? []) {
                // Check if DPP already exists for today
                const { data: existingDpp } = await supabase
                    .from('dpp_sets')
                    .select('id')
                    .eq('exam_id', exam.id)
                    .eq('subject_id', subject.id)
                    .eq('scheduled_date', today)
                    .maybeSingle() as any;

                if (existingDpp) continue;

                // Get topics for this subject - simplified query
                const { data: topics, error: topicsError } = await supabase
                    .from('topics')
                    .select('id')
                    .eq('is_active', true)
                    .limit(100) as any;

                if (topicsError) {
                    results.errors.push(`Failed to get topics for ${subject.name}: ${topicsError.message}`);
                    continue;
                }

                const topicIds = (topics as any[])?.map((t: any) => t.id) ?? [];

                if (topicIds.length === 0) {
                    results.errors.push(`No topics found for ${subject.name}`);
                    continue;
                }

                // Select 15 random questions
                const { data: questionsData, error: questionsError } = await supabase
                    .from('questions')
                    .select('id, difficulty_level')
                    .eq('is_published', true)
                    .in('topic_id', topicIds)
                    .limit(15) as any;

                const questions: any[] = questionsData ?? [];

                if (questionsError) {
                    results.errors.push(`Failed to get questions: ${questionsError.message}`);
                    continue;
                }

                if (!questions || questions.length < 5) {
                    results.errors.push(`Not enough questions for ${subject.name}`);
                    continue;
                }

                // Create DPP set
                const insertData: any = {
                    title: `${subject.name} - ${today}`,
                    exam_id: exam.id,
                    subject_id: subject.id,
                    topic_ids: topicIds,
                    difficulty_mix: 'mixed',
                    total_questions: questions.length,
                    time_limit_minutes: 30,
                    scheduled_date: today,
                    is_published: true,
                    published_at: new Date().toISOString(),
                };
                const { data: dppSet, error: dppError } = await supabase
                    .from('dpp_sets')
                    .insert(insertData)
                    .select()
                    .single() as any;

                if (dppError) {
                    results.errors.push(`Failed to create DPP: ${dppError.message}`);
                    continue;
                }

                if (!dppSet || !dppSet.id) continue;

                // Map questions to DPP
                const dppQuestions: any = questions.map((q: any, idx: number) => ({
                    dpp_set_id: dppSet.id,
                    question_id: q.id,
                    display_order: idx + 1,
                }));

                await supabase
                    .from('dpp_questions')
                    .insert(dppQuestions);

                results.generated++;
            }
        }

        // Log success
        await supabase.from('system_health').insert({
            check_name: 'dpp_generator',
            status: results.errors.length > 0 ? 'degraded' : 'healthy',
            details: results,
        } as any);

        return NextResponse.json({
            success: true,
            message: `Generated ${results.generated} DPP sets`,
            results,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log error
        await supabase.from('error_logs').insert({
            error_type: 'cron_job_failed',
            error_message: `DPP Generator failed: ${errorMessage}`,
            metadata: { results },
        } as any);

        return NextResponse.json(
            { success: false, error: errorMessage, results },
            { status: 500 }
        );
    }
}
