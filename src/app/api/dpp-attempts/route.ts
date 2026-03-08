// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { calculateAccuracy, evaluateQuestion } from '@/lib/learning/assessment';
import { upsertLearningProgress } from '@/lib/learning/progress';

interface StartAttemptRequest {
    action: 'start_attempt';
    dppId: string;
}

interface SubmitAttemptRequest {
    action: 'submit_attempt';
    attemptId: string;
    dppId: string;
    answers: Record<string, string>;
    timeTakenSeconds: number;
    timeTakenSecondsByQuestion?: Record<string, number>;
}

interface AutoSaveRequest {
    action: 'auto_save';
    attemptId: string;
    answers: Record<string, string>;
}

type DppAttemptRequest = StartAttemptRequest | SubmitAttemptRequest | AutoSaveRequest;

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

async function getDppQuestionSet(
    supabase: ReturnType<typeof createSupabaseClient>,
    dppId: string
) {
    const { data, error } = await supabase
        .from('dpp_questions')
        .select(`
            id,
            display_order,
            question:question_id(
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
                hint
            )
        `)
        .eq('dpp_set_id', dppId)
        .order('display_order', { ascending: true });

    if (error) {
        throw error;
    }

    return (data ?? []) as Array<{
        id: string;
        display_order: number;
        question: {
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
        };
    }>;
}

export async function GET(request: NextRequest) {
    const { supabase, user } = await requireUser(request);
    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');
    const dppId = searchParams.get('dppId');

    try {
        if (attemptId) {
            const { data, error } = await supabase
                .from('dpp_attempts')
                .select('*')
                .eq('id', attemptId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                throw error;
            }

            return NextResponse.json({ success: true, attempt: data });
        }

        if (!dppId) {
            return NextResponse.json({ success: false, error: 'attemptId or dppId is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('dpp_attempts')
            .select('*')
            .eq('dpp_set_id', dppId)
            .eq('user_id', user.id)
            .order('started_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, attempts: data ?? [] });
    } catch (error) {
        console.error('DPP attempt GET failed:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to load DPP attempts' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const { supabase, user } = await requireUser(request);
    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body: DppAttemptRequest;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    try {
        switch (body.action) {
            case 'start_attempt': {
                const { data: dppSet, error: dppError } = await supabase
                    .from('dpp_sets')
                    .select('id, title, is_published')
                    .eq('id', body.dppId)
                    .eq('is_published', true)
                    .maybeSingle();

                if (dppError) {
                    throw dppError;
                }

                if (!dppSet) {
                    return NextResponse.json({ success: false, error: 'DPP not found' }, { status: 404 });
                }

                const { data: existingAttempt, error: existingError } = await supabase
                    .from('dpp_attempts')
                    .select('*')
                    .eq('dpp_set_id', body.dppId)
                    .eq('user_id', user.id)
                    .eq('status', 'in_progress')
                    .maybeSingle();

                if (existingError) {
                    throw existingError;
                }

                if (existingAttempt) {
                    return NextResponse.json({ success: true, attemptId: existingAttempt.id, resumed: true });
                }

                const dppQuestions = await getDppQuestionSet(supabase, body.dppId);
                const maxScore = dppQuestions.reduce((total, item) => total + (item.question?.marks ?? 0), 0);

                const { data: attempt, error: createError } = await supabase
                    .from('dpp_attempts')
                    .insert({
                        user_id: user.id,
                        dpp_set_id: body.dppId,
                        started_at: new Date().toISOString(),
                        max_score: maxScore,
                        answers: {},
                        status: 'in_progress',
                    })
                    .select()
                    .single();

                if (createError) {
                    throw createError;
                }

                return NextResponse.json({ success: true, attemptId: attempt.id, resumed: false });
            }
            case 'auto_save': {
                const { error } = await supabase
                    .from('dpp_attempts')
                    .update({ answers: body.answers })
                    .eq('id', body.attemptId)
                    .eq('user_id', user.id);

                if (error) {
                    throw error;
                }

                return NextResponse.json({ success: true });
            }
            case 'submit_attempt': {
                const { data: attempt, error: attemptError } = await supabase
                    .from('dpp_attempts')
                    .select('*')
                    .eq('id', body.attemptId)
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (attemptError) {
                    throw attemptError;
                }

                if (!attempt) {
                    return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
                }

                const dppQuestions = await getDppQuestionSet(supabase, body.dppId);
                const results = dppQuestions.map((item) => {
                    const question = item.question;
                    const userAnswer = body.answers?.[question.id];
                    const outcome = evaluateQuestion(question, userAnswer);
                    const timeTakenSeconds = Math.max(body.timeTakenSecondsByQuestion?.[question.id] ?? 0, 0);

                    return {
                        displayOrder: item.display_order,
                        question,
                        userAnswer: outcome.userAnswer,
                        isCorrect: outcome.isCorrect,
                        isAttempted: outcome.isAttempted,
                        marksObtained: outcome.marksObtained,
                        timeTakenSeconds,
                    };
                });

                const attemptedCount = results.filter((result) => result.isAttempted).length;
                const correctCount = results.filter((result) => result.isCorrect).length;
                const totalScore = results.reduce((total, result) => total + result.marksObtained, 0);
                const accuracyPercent = calculateAccuracy(correctCount, attemptedCount);

                const { error: updateError } = await supabase
                    .from('dpp_attempts')
                    .update({
                        answers: body.answers,
                        submitted_at: new Date().toISOString(),
                        time_taken_seconds: body.timeTakenSeconds,
                        total_score: totalScore,
                        accuracy_percent: accuracyPercent,
                        status: 'completed',
                    })
                    .eq('id', body.attemptId)
                    .eq('user_id', user.id);

                if (updateError) {
                    throw updateError;
                }

                const answeredRows = results.filter((result) => result.isAttempted);
                if (answeredRows.length > 0) {
                    const { error: questionAttemptError } = await supabase
                        .from('question_attempts')
                        .insert(
                            answeredRows.map((result) => ({
                                user_id: user.id,
                                question_id: result.question.id,
                                is_correct: result.isCorrect,
                                time_taken_seconds: result.timeTakenSeconds,
                                user_answer: result.userAnswer,
                                correct_answer: result.question.correct_answer,
                            }))
                        );

                    if (questionAttemptError) {
                        throw questionAttemptError;
                    }

                    await upsertLearningProgress(
                        supabase,
                        user.id,
                        answeredRows.map((result) => ({
                            questionId: result.question.id,
                            isCorrect: result.isCorrect,
                            timeTakenSeconds: result.timeTakenSeconds,
                        }))
                    );
                }

                return NextResponse.json({
                    success: true,
                    summary: {
                        totalQuestions: results.length,
                        attemptedQuestions: attemptedCount,
                        correctAnswers: correctCount,
                        incorrectAnswers: attemptedCount - correctCount,
                        totalScore,
                        maxScore: attempt.max_score,
                        accuracyPercent,
                        timeTakenSeconds: body.timeTakenSeconds,
                    },
                    results: results.map((result) => ({
                        displayOrder: result.displayOrder,
                        question: result.question,
                        userAnswer: result.userAnswer,
                        isCorrect: result.isCorrect,
                        isAttempted: result.isAttempted,
                        marksObtained: result.marksObtained,
                        timeTakenSeconds: result.timeTakenSeconds,
                    })),
                });
            }
            default:
                return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('DPP attempt POST failed:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to process DPP attempt' },
            { status: 500 }
        );
    }
}
