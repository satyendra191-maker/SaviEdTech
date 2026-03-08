'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    CheckCircle,
    Clock,
    Loader2,
    Target,
    Trophy,
    XCircle,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { evaluateQuestion } from '@/lib/learning/assessment';
import { QuestionCard } from '@/components/test/QuestionCard';
import { NavigationPanel } from '@/components/test/NavigationPanel';
import { Timer } from '@/components/test/Timer';
import { useTest } from '@/hooks/useTest';
import type { DPPAttempt, DPPSet, Question, Test } from '@/types';

interface DppQuestion extends Question {
    subject_name?: string | null;
}

interface DppResultRow {
    displayOrder: number;
    question: DppQuestion;
    userAnswer: string | null;
    isCorrect: boolean;
    isAttempted: boolean;
    marksObtained: number;
    timeTakenSeconds: number;
}

interface DppSummary {
    totalQuestions: number;
    attemptedQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    totalScore: number;
    maxScore: number;
    accuracyPercent: number;
    timeTakenSeconds: number;
}

const EMPTY_DPP_TEST: Test = {
    id: 'dpp-session',
    exam_id: null,
    title: 'Daily Practice Problem',
    description: 'Daily practice set',
    test_type: 'custom',
    duration_minutes: 0,
    total_marks: 0,
    negative_marking: 0,
    passing_percent: 0,
    question_count: 0,
    is_published: true,
    scheduled_at: null,
    start_time: null,
    end_time: null,
    allow_multiple_attempts: true,
    show_result_immediately: true,
    created_at: new Date().toISOString(),
};

function DppAttemptContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const dppId = params.id as string;
    const requestedAttemptId = searchParams.get('attempt');
    const reviewRequested = searchParams.get('review') === '1';

    const [dpp, setDpp] = useState<(DPPSet & { subject_name?: string | null }) | null>(null);
    const [questions, setQuestions] = useState<DppQuestion[]>([]);
    const [attempt, setAttempt] = useState<DPPAttempt | null>(null);
    const [summary, setSummary] = useState<DppSummary | null>(null);
    const [resultRows, setResultRows] = useState<DppResultRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    useEffect(() => {
        async function loadDppAttempt() {
            setLoading(true);
            setError(null);
            setSubmissionError(null);

            try {
                const supabase = getSupabaseBrowserClient();
                if (!supabase) {
                    throw new Error('Supabase client is unavailable');
                }

                const [{ data: dppRow, error: dppError }, { data: dppQuestionRows, error: questionError }] = await Promise.all([
                    supabase
                        .from('dpp_sets')
                        .select('id, title, exam_id, subject_id, topic_ids, difficulty_mix, total_questions, time_limit_minutes, scheduled_date, is_published, published_at, created_at, subject:subject_id(name)')
                        .eq('id', dppId)
                        .eq('is_published', true)
                        .single(),
                    supabase
                        .from('dpp_questions')
                        .select(`
                            display_order,
                            question:question_id(
                                id,
                                topic_id,
                                question_type,
                                question_text,
                                question_image_url,
                                solution_text,
                                solution_video_url,
                                solution_image_url,
                                correct_answer,
                                marks,
                                negative_marks,
                                difficulty_level,
                                estimated_time_minutes,
                                average_solve_time,
                                success_rate,
                                attempt_count,
                                correct_count,
                                tags,
                                hint,
                                is_published,
                                created_at,
                                updated_at,
                                options:question_options(
                                    id,
                                    question_id,
                                    option_text,
                                    option_image_url,
                                    option_label,
                                    display_order
                                )
                            )
                        `)
                        .eq('dpp_set_id', dppId)
                        .order('display_order', { ascending: true }),
                ]);

                if (dppError) throw dppError;
                if (questionError) throw questionError;

                const dppData = dppRow as DPPSet & { subject: { name: string } | null };
                setDpp({ ...dppData, subject_name: dppData.subject?.name || null });

                const loadedQuestions = ((dppQuestionRows ?? []) as Array<{ display_order: number; question: DppQuestion }>).map((row) => ({
                    ...row.question,
                    options: [...(row.question.options ?? [])].sort((left, right) => left.display_order - right.display_order),
                    subject_name: dppData.subject?.name || null,
                }));
                setQuestions(loadedQuestions);

                let attemptPayload: DPPAttempt | null = null;
                if (requestedAttemptId) {
                    const response = await fetch(`/api/dpp-attempts?attemptId=${requestedAttemptId}`, { credentials: 'include' });
                    const payload = await response.json().catch(() => null);
                    if (response.ok) {
                        attemptPayload = payload?.attempt as DPPAttempt | null;
                    }
                }

                if (!attemptPayload) {
                    const response = await fetch(`/api/dpp-attempts?dppId=${dppId}`, { credentials: 'include' });
                    const payload = await response.json().catch(() => null);
                    if (!response.ok) {
                        throw new Error(payload?.error || 'Failed to load DPP attempts');
                    }

                    const attempts = (payload?.attempts ?? []) as DPPAttempt[];
                    if (reviewRequested) {
                        attemptPayload = attempts.find((item) => item.status === 'completed') || attempts[0] || null;
                    } else {
                        attemptPayload = attempts.find((item) => item.status === 'in_progress') || null;
                    }
                }

                if (!reviewRequested && (!attemptPayload || attemptPayload.status !== 'in_progress')) {
                    const response = await fetch('/api/dpp-attempts', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'start_attempt', dppId }),
                    });
                    const payload = await response.json().catch(() => null);
                    if (!response.ok) {
                        throw new Error(payload?.error || 'Failed to start DPP');
                    }

                    const attemptResponse = await fetch(`/api/dpp-attempts?attemptId=${payload.attemptId}`, { credentials: 'include' });
                    const attemptData = await attemptResponse.json().catch(() => null);
                    if (!attemptResponse.ok) {
                        throw new Error(attemptData?.error || 'Failed to load started DPP attempt');
                    }

                    attemptPayload = attemptData.attempt as DPPAttempt;
                    router.replace(`/dashboard/dpp/${dppId}?attempt=${payload.attemptId}`);
                }

                setAttempt(attemptPayload);
            } catch (loadError) {
                console.error('Failed to load DPP attempt:', loadError);
                setError(loadError instanceof Error ? loadError.message : 'Failed to load DPP attempt');
            } finally {
                setLoading(false);
            }
        }

        void loadDppAttempt();
    }, [dppId, requestedAttemptId, reviewRequested, router]);

    const derivedReview = useMemo(() => {
        if (!attempt || questions.length === 0 || attempt.status !== 'completed') {
            return { summary: null as DppSummary | null, rows: [] as DppResultRow[] };
        }

        const answers = (attempt.answers ?? {}) as Record<string, string>;
        const rows = questions.map((question, index) => {
            const outcome = evaluateQuestion(question, answers[question.id]);
            return {
                displayOrder: index + 1,
                question,
                userAnswer: outcome.userAnswer,
                isCorrect: outcome.isCorrect,
                isAttempted: outcome.isAttempted,
                marksObtained: outcome.marksObtained,
                timeTakenSeconds: 0,
            };
        });

        const attemptedQuestions = rows.filter((row) => row.isAttempted).length;
        const correctAnswers = rows.filter((row) => row.isCorrect).length;
        return {
            summary: {
                totalQuestions: rows.length,
                attemptedQuestions,
                correctAnswers,
                incorrectAnswers: attemptedQuestions - correctAnswers,
                totalScore: attempt.total_score || 0,
                maxScore: attempt.max_score,
                accuracyPercent: attempt.accuracy_percent || 0,
                timeTakenSeconds: attempt.time_taken_seconds || 0,
            },
            rows,
        };
    }, [attempt, questions]);

    useEffect(() => {
        if (reviewRequested && derivedReview.summary && !summary) {
            setSummary(derivedReview.summary);
            setResultRows(derivedReview.rows);
        }
    }, [reviewRequested, derivedReview, summary]);

    const initialTimeRemainingSeconds = useMemo(() => {
        if (!dpp) {
            return 0;
        }

        if (!attempt?.started_at || attempt.status !== 'in_progress') {
            return dpp.time_limit_minutes * 60;
        }

        const elapsedSeconds = Math.max(
            0,
            Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000)
        );
        return Math.max(0, (dpp.time_limit_minutes * 60) - elapsedSeconds);
    }, [attempt?.started_at, attempt?.status, dpp]);

    const handleSubmit = async (answers: Record<string, string>, timeTakenSeconds: number) => {
        if (!attempt) {
            throw new Error('DPP attempt is not initialized');
        }

        try {
            setSubmissionError(null);

            const answeredQuestionIds = Object.entries(answers)
                .filter(([, answer]) => answer.trim().length > 0)
                .map(([questionId]) => questionId);
            const averageTimePerAnsweredQuestion = answeredQuestionIds.length > 0
                ? Math.max(1, Math.round(timeTakenSeconds / answeredQuestionIds.length))
                : 0;
            const timeTakenSecondsByQuestion = answeredQuestionIds.reduce<Record<string, number>>((map, questionId) => {
                map[questionId] = averageTimePerAnsweredQuestion;
                return map;
            }, {});

            const response = await fetch('/api/dpp-attempts', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'submit_attempt',
                    attemptId: attempt.id,
                    dppId,
                    answers,
                    timeTakenSeconds,
                    timeTakenSecondsByQuestion,
                }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to submit DPP');
            }

            setAttempt({
                ...attempt,
                answers,
                submitted_at: new Date().toISOString(),
                total_score: payload.summary?.totalScore ?? attempt.total_score,
                max_score: payload.summary?.maxScore ?? attempt.max_score,
                accuracy_percent: payload.summary?.accuracyPercent ?? attempt.accuracy_percent,
                status: 'completed',
                time_taken_seconds: timeTakenSeconds,
            });
            setSummary(payload.summary as DppSummary);
            setResultRows(payload.results as DppResultRow[]);
            router.replace(`/dashboard/dpp/${dppId}?attempt=${attempt.id}&review=1`);

            try {
                await fetch('/api/gamification/track-activity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        activityType: 'dpp_completed',
                        metadata: {
                            dppId,
                            score: payload.summary?.totalScore,
                        },
                    }),
                });
            } catch (trackingError) {
                console.error('Failed to track DPP completion:', trackingError);
            }
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : 'Failed to submit DPP';
            setSubmissionError(message);
            throw submitError;
        }
    };

    const handleAutoSave = async (answers: Record<string, string>) => {
        if (!attempt?.id) {
            return;
        }

        await fetch('/api/dpp-attempts', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'auto_save',
                attemptId: attempt.id,
                answers,
            }),
        });
    };

    const {
        currentQuestionIndex,
        questionStatuses,
        goToQuestion,
        goToNext,
        goToPrevious,
        selectAnswer,
        toggleMarkForReview,
        isMarkedForReview,
        getAnsweredCount,
        getMarkedCount,
        getNotVisitedCount,
        submitTest,
        handleTimeUp,
        currentQuestion,
        currentAnswer,
        timeRemaining,
    } = useTest({
        test: dpp ? {
            ...EMPTY_DPP_TEST,
            id: dpp.id,
            title: dpp.title,
            duration_minutes: dpp.time_limit_minutes,
            total_marks: questions.reduce((total, question) => total + (question.marks || 0), 0),
            question_count: questions.length,
        } : EMPTY_DPP_TEST,
        questions,
        attemptId: attempt?.id,
        initialTimeRemainingSeconds,
        onSubmit: handleSubmit,
        onAutoSave: handleAutoSave,
    });

    useEffect(() => {
        if (attempt?.answers && Object.keys(attempt.answers).length > 0) {
            Object.entries(attempt.answers).forEach(([questionId, answer]) => {
                if (answer) {
                    selectAnswer(questionId, answer);
                }
            });
        }
    }, [attempt?.id]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                    <p className="text-slate-600">Loading DPP...</p>
                </div>
            </div>
        );
    }

    if (error || !dpp) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
                <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-slate-900 mb-2">DPP unavailable</h1>
                    <p className="text-slate-600 mb-6">{error || 'The requested DPP could not be loaded.'}</p>
                    <Link href="/dashboard/dpp" className="rounded-xl bg-primary-600 px-4 py-2 text-white hover:bg-primary-700">
                        Back to DPP
                    </Link>
                </div>
            </div>
        );
    }

    if (summary) {
        return (
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <Link href="/dashboard/dpp" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
                            <ArrowLeft className="w-4 h-4" />
                            Back to DPP
                        </Link>
                        <h1 className="mt-2 text-2xl font-bold text-slate-900">{dpp.title}</h1>
                        <p className="text-slate-500">Review and solutions</p>
                    </div>
                    <div className="rounded-2xl bg-primary-50 px-4 py-2 text-primary-700">
                        {dpp.subject_name || 'General'}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <ResultCard icon={Target} label="Score" value={`${summary.totalScore} / ${summary.maxScore}`} />
                    <ResultCard icon={CheckCircle} label="Correct" value={String(summary.correctAnswers)} />
                    <ResultCard icon={XCircle} label="Incorrect" value={String(summary.incorrectAnswers)} />
                    <ResultCard icon={Clock} label="Time Used" value={`${Math.floor(summary.timeTakenSeconds / 60)} min`} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-900">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <h2 className="text-lg font-semibold">Accuracy</h2>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{summary.accuracyPercent.toFixed(1)}%</p>
                </div>

                <div className="space-y-4">
                    {resultRows.map((row) => (
                        <article key={row.question.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm text-slate-500">Q{row.displayOrder} - {dpp.subject_name || 'General'}</p>
                                    <h2 className="mt-1 font-medium text-slate-900">{row.question.question_text}</h2>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-sm font-medium ${row.isCorrect ? 'bg-green-100 text-green-700' : row.isAttempted ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {row.isCorrect ? 'Correct' : row.isAttempted ? 'Incorrect' : 'Unattempted'}
                                </span>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <ReviewBox label="Your Answer" value={row.userAnswer || 'Not attempted'} tone={row.isCorrect ? 'success' : row.isAttempted ? 'danger' : 'neutral'} />
                                <ReviewBox label="Correct Answer" value={row.question.correct_answer} tone="success" />
                            </div>

                            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                <p className="text-sm font-medium text-blue-900">Solution</p>
                                <p className="mt-2 text-sm leading-6 text-blue-900">{row.question.solution_text}</p>
                                {row.question.solution_image_url && (
                                    <img
                                        src={row.question.solution_image_url}
                                        alt="Solution"
                                        className="mt-3 max-h-64 rounded-xl border border-blue-200"
                                    />
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Link href="/dashboard/dpp" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
                        <ArrowLeft className="w-4 h-4" />
                        Back to DPP
                    </Link>
                    <h1 className="mt-2 text-2xl font-bold text-slate-900">{dpp.title}</h1>
                    <p className="text-slate-500">{dpp.subject_name || 'General'} - {questions.length} questions</p>
                </div>
                <Timer
                    durationMinutes={dpp.time_limit_minutes}
                    initialTimeRemainingSeconds={initialTimeRemainingSeconds}
                    timeRemainingSeconds={timeRemaining}
                    onTimeUp={handleTimeUp}
                />
            </div>

            {submissionError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submissionError}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-4">
                <div className="lg:col-span-3 space-y-6">
                    {currentQuestion && (
                        <QuestionCard
                            question={currentQuestion}
                            questionNumber={currentQuestionIndex + 1}
                            totalQuestions={questions.length}
                            selectedAnswer={currentAnswer}
                            onAnswerSelect={(answer) => selectAnswer(currentQuestion.id, answer)}
                            onMarkForReview={() => toggleMarkForReview(currentQuestion.id)}
                            isMarkedForReview={isMarkedForReview(currentQuestion.id)}
                            sectionName={dpp.subject_name || 'General'}
                        />
                    )}
                </div>
                <div className="lg:col-span-1">
                    <div className="sticky top-24">
                        <NavigationPanel
                            totalQuestions={questions.length}
                            currentQuestion={currentQuestionIndex}
                            questionStatuses={questionStatuses}
                            sectionBreakdown={[{ name: dpp.subject_name || 'General', startIndex: 0, count: questions.length }]}
                            onQuestionSelect={goToQuestion}
                            onPrevious={goToPrevious}
                            onNext={goToNext}
                            onSubmit={() => void submitTest()}
                            answeredCount={getAnsweredCount()}
                            markedCount={getMarkedCount()}
                            notVisitedCount={getNotVisitedCount()}
                            submitLabel="Submit DPP"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DppAttemptPage() {
    return (
        <Suspense fallback={<DppAttemptFallback />}>
            <DppAttemptContent />
        </Suspense>
    );
}

function DppAttemptFallback() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                <p className="text-slate-600">Loading daily practice problem...</p>
            </div>
        </div>
    );
}

function ResultCard({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary-50 p-2 text-primary-600">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-lg font-semibold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    );
}

function ReviewBox({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: 'success' | 'danger' | 'neutral';
}) {
    const toneClass = {
        success: 'border-green-200 bg-green-50 text-green-800',
        danger: 'border-red-200 bg-red-50 text-red-800',
        neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    }[tone];

    return (
        <div className={`rounded-2xl border p-4 ${toneClass}`}>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
            <p className="mt-2 text-sm font-medium">{value}</p>
        </div>
    );
}
