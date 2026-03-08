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
        const shuffle = <T,>(items: T[]) => {
            const clone = [...items];
            for (let index = clone.length - 1; index > 0; index -= 1) {
                const swapIndex = Math.floor(Math.random() * (index + 1));
                [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
            }
            return clone;
        };

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

                const { data: chapters, error: chaptersError } = await supabase
                    .from('chapters')
                    .select('id')
                    .eq('subject_id', subject.id)
                    .eq('is_active', true) as any;

                if (chaptersError) {
                    results.errors.push(`Failed to get chapters for ${subject.name}: ${chaptersError.message}`);
                    continue;
                }

                const chapterIds = (chapters as any[])?.map((chapter: any) => chapter.id) ?? [];
                if (chapterIds.length === 0) {
                    results.errors.push(`No chapters found for ${subject.name}`);
                    continue;
                }

                const { data: topics, error: topicsError } = await supabase
                    .from('topics')
                    .select('id')
                    .in('chapter_id', chapterIds)
                    .eq('is_active', true)
                    .limit(500) as any;

                if (topicsError) {
                    results.errors.push(`Failed to get topics for ${subject.name}: ${topicsError.message}`);
                    continue;
                }

                const topicIds = (topics as any[])?.map((t: any) => t.id) ?? [];

                if (topicIds.length === 0) {
                    results.errors.push(`No topics found for ${subject.name}`);
                    continue;
                }

                const difficultyPlan = [
                    { difficulty: 'easy', count: 5 },
                    { difficulty: 'medium', count: 6 },
                    { difficulty: 'hard', count: 4 },
                ] as const;

                const selectedQuestions: any[] = [];
                const selectedQuestionIds = new Set<string>();

                for (const bucket of difficultyPlan) {
                    const { data: bucketQuestions, error: bucketError } = await supabase
                        .from('questions')
                        .select('id, difficulty_level')
                        .eq('is_published', true)
                        .eq('difficulty_level', bucket.difficulty)
                        .in('topic_id', topicIds)
                        .limit(bucket.count * 8) as any;

                    if (bucketError) {
                        results.errors.push(`Failed to get ${bucket.difficulty} questions for ${subject.name}: ${bucketError.message}`);
                        continue;
                    }

                    for (const question of shuffle((bucketQuestions as any[]) ?? []).slice(0, bucket.count)) {
                        if (!selectedQuestionIds.has((question as any).id)) {
                            selectedQuestions.push(question);
                            selectedQuestionIds.add(question.id);
                        }
                    }
                }

                if (selectedQuestions.length < 15) {
                    const { data: fallbackQuestions, error: fallbackError } = await supabase
                        .from('questions')
                        .select('id, difficulty_level')
                        .eq('is_published', true)
                        .in('topic_id', topicIds)
                        .limit(200) as any;

                    if (fallbackError) {
                        results.errors.push(`Failed to get fallback questions for ${subject.name}: ${fallbackError.message}`);
                        continue;
                    }

                    for (const question of shuffle((fallbackQuestions as any[]) ?? [])) {
                        if (selectedQuestionIds.has((question as any).id)) {
                            continue;
                        }

                        selectedQuestions.push(question);
                        selectedQuestionIds.add((question as any).id);

                        if (selectedQuestions.length === 15) {
                            break;
                        }
                    }
                }

                if (selectedQuestions.length < 15) {
                    results.errors.push(`Not enough published questions for ${subject.name} to build a 15-question DPP`);
                    continue;
                }

                // Create DPP set
                const insertData: any = {
                    title: `${subject.name} - ${today}`,
                    exam_id: exam.id,
                    subject_id: subject.id,
                    topic_ids: topicIds,
                    difficulty_mix: 'mixed',
                    total_questions: 15,
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
                const dppQuestions: any = selectedQuestions.map((q: any, idx: number) => ({
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
