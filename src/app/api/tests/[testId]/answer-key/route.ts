// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateAnswerKeyPDF } from '@/lib/pdf/test-pdf-generator';
import { ADMIN_PRIVILEGED_ROLES } from '@/lib/auth/roles';

const hasRole = (roles: readonly string[], role: string | null | undefined) =>
    !!role && roles.includes(role);

function inferTestType(examName?: string | null): 'JEE' | 'NEET' | 'custom' {
    const normalizedExamName = (examName || '').toLowerCase();
    if (normalizedExamName.includes('jee')) {
        return 'JEE';
    }
    if (normalizedExamName.includes('neet')) {
        return 'NEET';
    }
    return 'custom';
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ testId: string }> }
): Promise<NextResponse> {
    try {
        const { testId } = await params;
        const attemptId = new URL(request.url).searchParams.get('attemptId');

        if (!attemptId) {
            return NextResponse.json({ error: 'Attempt ID is required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name: string, value: string, options: Record<string, unknown>) {
                        cookieStore.set({ name, value, ...options });
                    },
                    remove(name: string, options: Record<string, unknown>) {
                        cookieStore.set({ name, value: '', ...options });
                    },
                },
            }
        );

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: attemptRow, error: attemptError } = await supabase
            .from('test_attempts')
            .select(`
                id,
                user_id,
                test_id,
                submitted_at,
                time_taken_seconds,
                total_score,
                max_score,
                accuracy_percent,
                percentile,
                rank,
                correct_count,
                incorrect_count,
                unattempted_count,
                status,
                answers,
                test:test_id(
                    id,
                    title,
                    test_type,
                    duration_minutes,
                    total_marks,
                    question_count,
                    exam:exam_id(name)
                )
            `)
            .eq('id', attemptId)
            .eq('test_id', testId)
            .single();

        if (attemptError || !attemptRow) {
            return NextResponse.json({ error: 'Test attempt not found' }, { status: 404 });
        }

        const attempt = attemptRow as {
            id: string;
            user_id: string | null;
            test_id: string;
            submitted_at: string | null;
            time_taken_seconds: number | null;
            total_score: number | null;
            max_score: number;
            accuracy_percent: number | null;
            percentile: number | null;
            rank: number | null;
            correct_count: number | null;
            incorrect_count: number | null;
            unattempted_count: number | null;
            status: string;
            answers: Record<string, string> | null;
            test: {
                id: string;
                title: string;
                test_type: string;
                duration_minutes: number;
                total_marks: number;
                question_count: number;
                exam: { name: string } | null;
            } | null;
        };

        if (attempt.user_id !== user.id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
            const isAdmin = hasRole(ADMIN_PRIVILEGED_ROLES, profile?.role);
            if (!isAdmin) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        if (attempt.status !== 'completed' && attempt.status !== 'time_up') {
            return NextResponse.json({ error: 'Answer key is only available for submitted tests' }, { status: 400 });
        }

        const [{ data: questionRows, error: questionError }, { data: answerRows, error: answerError }, { data: profile }] = await Promise.all([
            supabase
                .from('test_questions')
                .select(`
                    display_order,
                    marks,
                    negative_marks,
                    section,
                    question:question_id(
                        id,
                        question_text,
                        question_type,
                        correct_answer,
                        solution_text,
                        solution_image_url,
                        options:question_options(
                            option_label,
                            option_text,
                            display_order
                        )
                    )
                `)
                .eq('test_id', testId)
                .order('display_order', { ascending: true }),
            supabase
                .from('test_answers')
                .select('question_id, selected_answer, is_correct, marks_obtained, time_spent_seconds')
                .eq('attempt_id', attemptId),
            supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', attempt.user_id)
                .maybeSingle(),
        ]);

        if (questionError) {
            return NextResponse.json({ error: questionError.message }, { status: 500 });
        }

        if (answerError) {
            return NextResponse.json({ error: answerError.message }, { status: 500 });
        }

        const answersByQuestionId = new Map((answerRows ?? []).map((row) => [row.question_id ?? '', row]));
        const rawAnswers = attempt.answers ?? {};
        const sectionStats = new Map<string, {
            totalQuestions: number;
            attempted: number;
            correct: number;
            incorrect: number;
            score: number;
            maxScore: number;
            totalTime: number;
        }>();

        const questions = ((questionRows ?? []) as Array<{
            display_order: number;
            marks: number;
            negative_marks: number | null;
            section: string | null;
            question: {
                id: string;
                question_text: string;
                question_type: 'MCQ' | 'NUMERICAL' | 'ASSERTION_REASON';
                correct_answer: string;
                solution_text: string;
                solution_image_url: string | null;
                options?: Array<{ option_label: string; option_text: string; display_order: number }>;
            };
        }>).map((row) => {
            const answer = answersByQuestionId.get(row.question.id);
            const selectedAnswer = answer?.selected_answer ?? rawAnswers[row.question.id] ?? null;
            const isAttempted = Boolean(selectedAnswer && selectedAnswer.trim().length > 0);
            const isCorrect = answer?.is_correct ?? false;
            const sectionName = row.section || 'General';
            const section = sectionStats.get(sectionName) ?? {
                totalQuestions: 0,
                attempted: 0,
                correct: 0,
                incorrect: 0,
                score: 0,
                maxScore: 0,
                totalTime: 0,
            };

            section.totalQuestions += 1;
            section.maxScore += row.marks;
            section.score += answer?.marks_obtained ?? 0;
            section.totalTime += answer?.time_spent_seconds ?? 0;
            if (isAttempted) {
                section.attempted += 1;
            }
            if (isCorrect) {
                section.correct += 1;
            }
            if (isAttempted && !isCorrect) {
                section.incorrect += 1;
            }
            sectionStats.set(sectionName, section);

            return {
                id: row.question.id,
                questionNumber: row.display_order,
                questionText: row.question.question_text,
                questionType: row.question.question_type,
                yourAnswer: selectedAnswer,
                correctAnswer: row.question.correct_answer,
                isCorrect,
                isAttempted,
                marksObtained: answer?.marks_obtained ?? 0,
                maxMarks: row.marks,
                negativeMarks: row.negative_marks ?? 0,
                solution: row.question.solution_text,
                solutionImage: row.question.solution_image_url,
                section: sectionName,
                timeSpent: answer?.time_spent_seconds ?? 0,
                options: [...(row.question.options ?? [])]
                    .sort((left, right) => left.display_order - right.display_order)
                    .map((option) => ({ label: option.option_label, text: option.option_text })),
            };
        });

        const result = {
            id: attemptId,
            testTitle: attempt.test?.title || 'Mock Test',
            testType: inferTestType(attempt.test?.exam?.name),
            submittedAt: attempt.submitted_at || new Date().toISOString(),
            duration: attempt.test?.duration_minutes || 0,
            timeTaken: attempt.time_taken_seconds || 0,
            totalScore: attempt.total_score || 0,
            maxScore: attempt.max_score,
            percentage: attempt.max_score > 0 ? ((attempt.total_score || 0) / attempt.max_score) * 100 : 0,
            percentile: attempt.percentile || 0,
            rank: attempt.rank,
            totalQuestions: questions.length,
            attempted: questions.filter((question) => question.isAttempted).length,
            correct: questions.filter((question) => question.isCorrect).length,
            incorrect: questions.filter((question) => question.isAttempted && !question.isCorrect).length,
            unattempted: questions.filter((question) => !question.isAttempted).length,
            accuracy: attempt.accuracy_percent || 0,
            sections: Array.from(sectionStats.entries()).map(([name, stats]) => ({
                name,
                totalQuestions: stats.totalQuestions,
                attempted: stats.attempted,
                correct: stats.correct,
                incorrect: stats.incorrect,
                score: stats.score,
                maxScore: stats.maxScore,
                accuracy: stats.attempted > 0 ? (stats.correct / stats.attempted) * 100 : 0,
                avgTimePerQuestion: stats.attempted > 0 ? Math.round(stats.totalTime / stats.attempted) : 0,
            })),
            questions,
        };

        const pdfBlob = await generateAnswerKeyPDF(result, {
            name: profile?.full_name || user.email?.split('@')[0] || 'Student',
            email: profile?.email || user.email,
        });

        const arrayBuffer = await pdfBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="answer-key-${testId}-${new Date().toISOString().split('T')[0]}.pdf"`,
                'Content-Length': String(buffer.length),
            },
        });
    } catch (error) {
        console.error('Error generating answer key PDF:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate answer key PDF' },
            { status: 500 }
        );
    }
}
