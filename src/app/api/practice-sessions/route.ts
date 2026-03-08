// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { calculateAccuracy, evaluateQuestion } from '@/lib/learning/assessment';
import { upsertLearningProgress } from '@/lib/learning/progress';

interface PracticeSubmitRequest {
    questionIds: string[];
    answers: Record<string, string>;
    timeTakenSecondsByQuestion?: Record<string, number>;
}

function createSupabaseClient(request: NextRequest) {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set() {
                    // no-op in route handlers
                },
                remove() {
                    // no-op in route handlers
                },
            },
        }
    );
}

async function requireUser(request: NextRequest) {
    const supabase = createSupabaseClient(request);
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return { supabase, user: null };
    }

    return { supabase, user };
}

function clampCount(rawCount: string | null): number {
    const parsed = Number.parseInt(rawCount ?? '10', 10);
    if (Number.isNaN(parsed)) {
        return 10;
    }

    return Math.min(20, Math.max(5, parsed));
}

function shuffleArray<T>(items: T[]): T[] {
    const clone = [...items];
    for (let index = clone.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
    }
    return clone;
}

async function getTopicIdsForSubject(
    supabase: ReturnType<typeof createSupabaseClient>,
    subjectId: string
): Promise<string[]> {
    const { data: chapters, error: chapterError } = await supabase
        .from('chapters')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('is_active', true);

    if (chapterError) {
        throw chapterError;
    }

    const chapterIds = (chapters ?? []).map((chapter) => chapter.id);
    if (chapterIds.length === 0) {
        return [];
    }

    const { data: topics, error: topicError } = await supabase
        .from('topics')
        .select('id')
        .in('chapter_id', chapterIds)
        .eq('is_active', true);

    if (topicError) {
        throw topicError;
    }

    return (topics ?? []).map((topic) => topic.id);
}

function mapQuestionRow(row: {
    id: string;
    question_type: 'MCQ' | 'NUMERICAL' | 'ASSERTION_REASON';
    question_text: string;
    question_image_url: string | null;
    solution_text: string;
    solution_image_url: string | null;
    correct_answer: string;
    marks: number;
    negative_marks: number;
    difficulty_level: 'easy' | 'medium' | 'hard' | null;
    hint: string | null;
    options?: Array<{
        id: string;
        question_id: string;
        option_text: string;
        option_image_url: string | null;
        option_label: string;
        display_order: number;
    }>;
    topic?: {
        name: string;
        chapter?: {
            subject?: {
                id: string;
                name: string;
            } | null;
        } | null;
    } | null;
}) {
    return {
        id: row.id,
        question_type: row.question_type,
        question_text: row.question_text,
        question_image_url: row.question_image_url,
        solution_text: row.solution_text,
        solution_image_url: row.solution_image_url,
        correct_answer: row.correct_answer,
        marks: row.marks,
        negative_marks: row.negative_marks,
        difficulty_level: row.difficulty_level,
        hint: row.hint,
        options: [...(row.options ?? [])].sort((left, right) => left.display_order - right.display_order),
        topic_name: row.topic?.name ?? null,
        subject_name: row.topic?.chapter?.subject?.name ?? null,
        subject_id: row.topic?.chapter?.subject?.id ?? null,
    };
}

export async function GET(request: NextRequest) {
    const { supabase, user } = await requireUser(request);
    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const count = clampCount(searchParams.get('count'));
    const subjectId = searchParams.get('subjectId');

    try {
        let topicIds: string[] | null = null;
        if (subjectId) {
            topicIds = await getTopicIdsForSubject(supabase, subjectId);
            if (topicIds.length === 0) {
                return NextResponse.json({ success: true, questions: [] });
            }
        }

        let query = supabase
            .from('questions')
            .select(`
                id,
                question_type,
                question_text,
                question_image_url,
                solution_text,
                solution_image_url,
                correct_answer,
                marks,
                negative_marks,
                difficulty_level,
                hint,
                options:question_options(
                    id,
                    question_id,
                    option_text,
                    option_image_url,
                    option_label,
                    display_order
                ),
                topic:topic_id(
                    name,
                    chapter:chapter_id(
                        subject:subject_id(
                            id,
                            name
                        )
                    )
                )
            `)
            .eq('is_published', true)
            .limit(Math.max(count * 4, 40));

        if (topicIds) {
            query = query.in('topic_id', topicIds);
        }

        const { data, error } = await query;
        if (error) {
            throw error;
        }

        const questions = shuffleArray(
            ((data ?? []) as any[]).map((row) => mapQuestionRow(row))
        ).slice(0, count);

        return NextResponse.json({ success: true, questions });
    } catch (error) {
        console.error('Practice session GET failed:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to load practice questions' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const { supabase, user } = await requireUser(request);
    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body: PracticeSubmitRequest;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!Array.isArray(body.questionIds) || body.questionIds.length === 0) {
        return NextResponse.json({ success: false, error: 'questionIds is required' }, { status: 400 });
    }

    try {
        const { data: rawQuestions, error } = await supabase
            .from('questions')
            .select(`
                id,
                question_type,
                question_text,
                question_image_url,
                solution_text,
                solution_image_url,
                correct_answer,
                marks,
                negative_marks,
                difficulty_level,
                hint,
                options:question_options(
                    id,
                    question_id,
                    option_text,
                    option_image_url,
                    option_label,
                    display_order
                ),
                topic:topic_id(
                    name,
                    chapter:chapter_id(
                        subject:subject_id(
                            id,
                            name
                        )
                    )
                )
            `)
            .in('id', body.questionIds);

        if (error) {
            throw error;
        }

        const questions = ((rawQuestions ?? []) as any[])
            .map((row) => mapQuestionRow(row))
            .sort((left, right) => body.questionIds.indexOf(left.id) - body.questionIds.indexOf(right.id));

        const answeredAttemptRows = [] as Array<{
            user_id: string;
            question_id: string;
            is_correct: boolean;
            time_taken_seconds: number;
            user_answer: string | null;
            correct_answer: string;
        }>;

        const learningProgressRows = [] as Array<{
            questionId: string;
            isCorrect: boolean;
            timeTakenSeconds: number;
        }>;

        const results = questions.map((question) => {
            const userAnswer = body.answers?.[question.id];
            const outcome = evaluateQuestion(question, userAnswer);
            const timeTakenSeconds = Math.max(body.timeTakenSecondsByQuestion?.[question.id] ?? 0, 0);

            if (outcome.isAttempted) {
                answeredAttemptRows.push({
                    user_id: user.id,
                    question_id: question.id,
                    is_correct: outcome.isCorrect,
                    time_taken_seconds: timeTakenSeconds,
                    user_answer: outcome.userAnswer,
                    correct_answer: outcome.correctAnswer,
                });

                learningProgressRows.push({
                    questionId: question.id,
                    isCorrect: outcome.isCorrect,
                    timeTakenSeconds,
                });
            }

            return {
                question,
                userAnswer: outcome.userAnswer,
                isCorrect: outcome.isCorrect,
                isAttempted: outcome.isAttempted,
                marksObtained: outcome.marksObtained,
            };
        });

        if (answeredAttemptRows.length > 0) {
            const { error: insertError } = await supabase
                .from('question_attempts')
                .insert(answeredAttemptRows);

            if (insertError) {
                throw insertError;
            }

            await upsertLearningProgress(supabase, user.id, learningProgressRows);
        }

        const attemptedCount = results.filter((result) => result.isAttempted).length;
        const correctCount = results.filter((result) => result.isCorrect).length;
        const totalTimeTakenSeconds = Object.values(body.timeTakenSecondsByQuestion ?? {}).reduce(
            (total, seconds) => total + Math.max(seconds, 0),
            0
        );

        return NextResponse.json({
            success: true,
            summary: {
                totalQuestions: questions.length,
                attemptedQuestions: attemptedCount,
                correctAnswers: correctCount,
                incorrectAnswers: attemptedCount - correctCount,
                accuracyPercent: calculateAccuracy(correctCount, attemptedCount),
                totalTimeTakenSeconds,
            },
            results,
        });
    } catch (error) {
        console.error('Practice session submission failed:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to submit practice session' },
            { status: 500 }
        );
    }
}
