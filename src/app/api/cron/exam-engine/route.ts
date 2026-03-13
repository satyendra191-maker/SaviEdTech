import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyCron(request: NextRequest): boolean {
    const auth = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    return !!secret && auth === `Bearer ${secret}`;
}

async function logCronJob(
    supabase: ReturnType<typeof createServerSupabaseClient>,
    jobName: string,
    status: 'running' | 'success' | 'failed',
    details: Record<string, unknown> = {},
    durationMs?: number
) {
    try {
        await (supabase as any).from('cron_job_logs').insert({
            job_name: jobName,
            status,
            details,
            duration_ms: durationMs ?? null,
            executed_at: new Date().toISOString(),
        });
    } catch { /* silently ignore */ }
}

export async function GET(request: NextRequest) {
    if (!verifyCron(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const jobId = `exam_engine_${Date.now()}`;
    const supabase = createServerSupabaseClient();
    await logCronJob(supabase, 'exam-engine', 'running', { jobId });

    const results = {
        mockExamsGenerated: 0,
        questionBankUpdated: 0,
        adaptiveQuizzesGenerated: 0,
        difficultyRebalanced: 0,
        errors: [] as string[],
    };

    try {
        // Step 1: Generate scheduled mock exams
        const { data: scheduledExams } = await (supabase as any)
            .from('mock_tests')
            .select('id, title, exam_type, subject, total_questions')
            .eq('auto_generate', true)
            .eq('is_generated', false)
            .gte('scheduled_at', new Date().toISOString())
            .limit(5);

        if (scheduledExams) {
            for (const exam of scheduledExams) {
                const { data: questions } = await (supabase as any)
                    .from('questions')
                    .select('id')
                    .eq('subject', exam.subject)
                    .eq('is_active', true)
                    .limit(exam.total_questions || 30);

                if (questions && questions.length > 0) {
                    const questionIds = questions.map((q: { id: string }) => q.id);
                    await (supabase as any)
                        .from('mock_tests')
                        .update({
                            question_ids: questionIds,
                            is_generated: true,
                            generated_at: new Date().toISOString(),
                        })
                        .eq('id', exam.id);
                    results.mockExamsGenerated++;
                }
            }
        }

        // Step 2: Update question bank — tag new questions with difficulty
        const { data: untaggedQuestions } = await (supabase as any)
            .from('questions')
            .select('id, attempt_count, correct_count')
            .is('computed_difficulty', null)
            .gt('attempt_count', 10)
            .limit(100);

        if (untaggedQuestions) {
            for (const q of untaggedQuestions) {
                const accuracy = q.attempt_count > 0
                    ? (q.correct_count || 0) / q.attempt_count
                    : 0;
                const difficulty = accuracy > 0.7 ? 'easy' : accuracy > 0.4 ? 'medium' : 'hard';
                await (supabase as any)
                    .from('questions')
                    .update({ computed_difficulty: difficulty })
                    .eq('id', q.id);
                results.questionBankUpdated++;
            }
        }

        // Step 3: Generate adaptive quizzes for students
        const { data: activeStudents } = await (supabase as any)
            .from('profiles')
            .select('id')
            .eq('role', 'student')
            .eq('is_active', true)
            .limit(50);

        if (activeStudents) {
            for (const student of activeStudents) {
                const { data: weakTopics } = await (supabase as any)
                    .from('student_analytics')
                    .select('weak_topics')
                    .eq('student_id', student.id)
                    .maybeSingle();

                if (weakTopics?.weak_topics?.length > 0) {
                    const topic = weakTopics.weak_topics[0];
                    const { data: topicQuestions } = await (supabase as any)
                        .from('questions')
                        .select('id')
                        .eq('topic', topic)
                        .eq('is_active', true)
                        .limit(10);

                    if (topicQuestions && topicQuestions.length >= 5) {
                        await (supabase as any).from('adaptive_quizzes').upsert({
                            student_id: student.id,
                            topic,
                            question_ids: topicQuestions.map((q: { id: string }) => q.id),
                            generated_at: new Date().toISOString(),
                            is_completed: false,
                        }, { onConflict: 'student_id,topic' });
                        results.adaptiveQuizzesGenerated++;
                    }
                }
            }
        }

        // Step 4: Rebalance exam difficulty based on pass rates
        const { data: recentExams } = await (supabase as any)
            .from('mock_tests')
            .select('id, avg_score, pass_rate, difficulty_level')
            .not('avg_score', 'is', null)
            .limit(20);

        if (recentExams) {
            for (const exam of recentExams) {
                const passRate = exam.pass_rate ?? 0;
                let newDifficulty = exam.difficulty_level;
                if (passRate > 0.8 && exam.difficulty_level !== 'hard') newDifficulty = 'medium';
                if (passRate < 0.3 && exam.difficulty_level !== 'easy') newDifficulty = 'medium';

                if (newDifficulty !== exam.difficulty_level) {
                    await (supabase as any)
                        .from('mock_tests')
                        .update({ difficulty_level: newDifficulty, difficulty_rebalanced_at: new Date().toISOString() })
                        .eq('id', exam.id);
                    results.difficultyRebalanced++;
                }
            }
        }

        const duration = Date.now() - startTime;
        await logCronJob(supabase, 'exam-engine', 'success', results, duration);

        return NextResponse.json({ success: true, results, duration, jobId });
    } catch (error) {
        const duration = Date.now() - startTime;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(msg);
        await logCronJob(supabase, 'exam-engine', 'failed', { error: msg }, duration);
        return NextResponse.json({ success: false, error: msg, results, jobId }, { status: 500 });
    }
}
