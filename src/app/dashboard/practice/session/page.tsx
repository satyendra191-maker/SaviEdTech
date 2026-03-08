'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { QuestionCard } from '@/components/test/QuestionCard';
import { NavigationPanel } from '@/components/test/NavigationPanel';
import { Timer } from '@/components/test/Timer';
import { useTest } from '@/hooks/useTest';
import type { Question, Test } from '@/types';

interface PracticeQuestion extends Question {
    subject_name?: string | null;
    topic_name?: string | null;
}

interface PracticeResult {
    question: PracticeQuestion;
    userAnswer: string | null;
    isCorrect: boolean;
    isAttempted: boolean;
    marksObtained: number;
}

interface PracticeSummary {
    totalQuestions: number;
    attemptedQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    accuracyPercent: number;
    totalTimeTakenSeconds: number;
}

const PRACTICE_SESSION: Test = {
    id: 'practice-session',
    exam_id: null,
    title: 'Quick Practice Session',
    description: 'Ten-question adaptive practice set',
    test_type: 'custom',
    duration_minutes: 15,
    total_marks: 40,
    negative_marking: 1,
    passing_percent: 0,
    question_count: 10,
    is_published: true,
    scheduled_at: null,
    start_time: null,
    end_time: null,
    allow_multiple_attempts: true,
    show_result_immediately: true,
    created_at: new Date().toISOString(),
};

function PracticeSessionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const subjectId = searchParams.get('subjectId');
    const subjectName = searchParams.get('subjectName') || 'Mixed Practice';

    const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [resultSummary, setResultSummary] = useState<PracticeSummary | null>(null);
    const [results, setResults] = useState<PracticeResult[]>([]);

    useEffect(() => {
        async function fetchQuestions() {
            setLoading(true);
            setError(null);
            setSubmissionError(null);

            try {
                const query = new URLSearchParams({ count: '10' });
                if (subjectId) {
                    query.set('subjectId', subjectId);
                }

                const response = await fetch(`/api/practice-sessions?${query.toString()}`, {
                    credentials: 'include',
                });
                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(payload?.error || 'Failed to load practice questions');
                }

                const loadedQuestions = (payload?.questions ?? []) as PracticeQuestion[];
                if (loadedQuestions.length === 0) {
                    throw new Error('No published questions are available for this practice set');
                }

                setQuestions(loadedQuestions);
            } catch (fetchError) {
                console.error('Failed to load practice session:', fetchError);
                setError(fetchError instanceof Error ? fetchError.message : 'Failed to load practice session');
            } finally {
                setLoading(false);
            }
        }

        void fetchQuestions();
    }, [subjectId]);

    const handleSubmit = async (answers: Record<string, string>, timeTakenSeconds: number) => {
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

            const response = await fetch('/api/practice-sessions', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionIds: questions.map((question) => question.id),
                    answers,
                    timeTakenSecondsByQuestion,
                }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to submit practice session');
            }

            setResultSummary(payload.summary as PracticeSummary);
            setResults(payload.results as PracticeResult[]);

            try {
                await fetch('/api/gamification/track-activity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        activityType: 'practice_completed',
                        metadata: {
                            questionCount: questions.length,
                            accuracyPercent: payload.summary?.accuracyPercent,
                        },
                    }),
                });
            } catch (trackingError) {
                console.error('Failed to track practice completion:', trackingError);
            }
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : 'Failed to submit practice session';
            setSubmissionError(message);
            throw submitError;
        }
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
        test: {
            ...PRACTICE_SESSION,
            total_marks: questions.reduce((total, question) => total + (question.marks || 0), 0),
            question_count: questions.length,
        },
        questions,
        onSubmit: handleSubmit,
    });

    const questionNavigatorSections = useMemo(() => {
        if (questions.length === 0) {
            return [];
        }

        return [{ name: subjectName, startIndex: 0, count: questions.length }];
    }, [questions, subjectName]);

    const activeQuestion = currentQuestion as PracticeQuestion | null;

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                    <p className="text-slate-600">Preparing your practice set...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
                <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-slate-900 mb-2">Practice unavailable</h1>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-xl bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
                        >
                            Retry
                        </button>
                        <Link
                            href="/dashboard/practice"
                            className="rounded-xl border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
                        >
                            Back
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (resultSummary) {
        return (
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <Link href="/dashboard/practice" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Practice
                        </Link>
                        <h1 className="mt-2 text-2xl font-bold text-slate-900">Practice Review</h1>
                        <p className="text-slate-500">{subjectName}</p>
                    </div>
                    <button
                        onClick={() => router.push(`/dashboard/practice/session${subjectId ? `?subjectId=${subjectId}&subjectName=${encodeURIComponent(subjectName)}` : ''}`)}
                        className="rounded-xl bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
                    >
                        Start Another Set
                    </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard icon={Target} label="Accuracy" value={`${resultSummary.accuracyPercent.toFixed(1)}%`} />
                    <SummaryCard icon={CheckCircle} label="Correct" value={String(resultSummary.correctAnswers)} />
                    <SummaryCard icon={XCircle} label="Incorrect" value={String(resultSummary.incorrectAnswers)} />
                    <SummaryCard icon={Clock} label="Time Used" value={`${Math.floor(resultSummary.totalTimeTakenSeconds / 60)} min`} />
                </div>

                <div className="space-y-4">
                    {results.map((result, index) => (
                        <article key={result.question.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm text-slate-500">Q{index + 1} - {result.question.subject_name || subjectName}</p>
                                    <h2 className="mt-1 font-medium text-slate-900">{result.question.question_text}</h2>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-sm font-medium ${result.isCorrect ? 'bg-green-100 text-green-700' : result.isAttempted ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {result.isCorrect ? 'Correct' : result.isAttempted ? 'Incorrect' : 'Unattempted'}
                                </span>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <AnswerBox label="Your Answer" value={result.userAnswer || 'Not attempted'} tone={result.isCorrect ? 'success' : result.isAttempted ? 'danger' : 'neutral'} />
                                <AnswerBox label="Correct Answer" value={result.question.correct_answer} tone="success" />
                            </div>

                            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                <p className="text-sm font-medium text-blue-900">Solution</p>
                                <p className="mt-2 text-sm leading-6 text-blue-900">{result.question.solution_text}</p>
                                {result.question.solution_image_url && (
                                    <img
                                        src={result.question.solution_image_url}
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
                    <Link href="/dashboard/practice" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Practice
                    </Link>
                    <h1 className="mt-2 text-2xl font-bold text-slate-900">Quick Practice Session</h1>
                    <p className="text-slate-500">{subjectName} - 10 questions</p>
                </div>
                <Timer
                    durationMinutes={15}
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
                    {activeQuestion && (
                        <QuestionCard
                            question={activeQuestion}
                            questionNumber={currentQuestionIndex + 1}
                            totalQuestions={questions.length}
                            selectedAnswer={currentAnswer}
                            onAnswerSelect={(answer) => selectAnswer(activeQuestion.id, answer)}
                            onMarkForReview={() => toggleMarkForReview(activeQuestion.id)}
                            isMarkedForReview={isMarkedForReview(activeQuestion.id)}
                            sectionName={activeQuestion.topic_name || activeQuestion.subject_name || subjectName}
                        />
                    )}
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-24">
                        <NavigationPanel
                            totalQuestions={questions.length}
                            currentQuestion={currentQuestionIndex}
                            questionStatuses={questionStatuses}
                            sectionBreakdown={questionNavigatorSections}
                            onQuestionSelect={goToQuestion}
                            onPrevious={goToPrevious}
                            onNext={goToNext}
                            onSubmit={() => void submitTest()}
                            answeredCount={getAnsweredCount()}
                            markedCount={getMarkedCount()}
                            notVisitedCount={getNotVisitedCount()}
                            submitLabel="Finish Practice"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PracticeSessionPage() {
    return (
        <Suspense fallback={<PracticeSessionFallback />}>
            <PracticeSessionContent />
        </Suspense>
    );
}

function PracticeSessionFallback() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                <p className="text-slate-600">Preparing your practice set...</p>
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
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

function AnswerBox({
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
