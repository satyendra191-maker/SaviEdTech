'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    BookOpen,
    CheckCircle,
    Clock,
    Copy,
    Download,
    Loader2,
    Target,
    Trophy,
    XCircle,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';

interface SectionResult {
    name: string;
    attempted: number;
    correct: number;
    incorrect: number;
    score: number;
    maxScore: number;
    accuracy: number;
}

interface QuestionResult {
    id: string;
    displayOrder: number;
    section: string;
    questionText: string;
    questionType: 'MCQ' | 'NUMERICAL' | 'ASSERTION_REASON';
    yourAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    isAttempted: boolean;
    marksObtained: number;
    maxMarks: number;
    negativeMarks: number;
    solution: string;
    solutionImageUrl: string | null;
    timeSpentSeconds: number;
}

interface TestResultData {
    attemptId: string;
    testId: string;
    testTitle: string;
    testLabel: string;
    submittedAt: string | null;
    durationMinutes: number;
    timeTakenSeconds: number;
    totalScore: number;
    maxScore: number;
    accuracyPercent: number;
    percentile: number | null;
    rank: number | null;
    predictedRank: number | null;
    correctCount: number;
    incorrectCount: number;
    unattemptedCount: number;
    questions: QuestionResult[];
    sections: SectionResult[];
}

export default function TestResultsPage() {
    const params = useParams();
    const attemptId = params.attemptId as string;

    const [result, setResult] = useState<TestResultData | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'solutions'>('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchResult() {
            setIsLoading(true);
            setError(null);

            try {
                const supabase = getSupabaseBrowserClient();
                if (!supabase) {
                    throw new Error('Supabase client is unavailable');
                }

                const {
                    data: { user },
                    error: authError,
                } = await supabase.auth.getUser();

                if (authError || !user) {
                    throw new Error('Please sign in to view your test analysis');
                }

                const { data: attemptRow, error: attemptError } = await supabase
                    .from('test_attempts')
                    .select(`
                        id,
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
                        answers,
                        status,
                        section_scores,
                        test:test_id(
                            title,
                            test_type,
                            duration_minutes,
                            total_marks,
                            exam:exam_id(name)
                        )
                    `)
                    .eq('id', attemptId)
                    .eq('user_id', user.id)
                    .single();

                if (attemptError || !attemptRow) {
                    throw attemptError || new Error('Result not found');
                }

                const attempt = attemptRow as {
                    id: string;
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
                    answers: Record<string, string> | null;
                    status: string;
                    section_scores: Record<string, number> | null;
                    test: {
                        title: string;
                        test_type: string;
                        duration_minutes: number;
                        total_marks: number;
                        exam: { name: string } | null;
                    } | null;
                };

                if (attempt.status !== 'completed' && attempt.status !== 'time_up') {
                    throw new Error('This attempt is not submitted yet');
                }

                const [{ data: testQuestionRows, error: testQuestionsError }, { data: answerRows, error: answersError }, { data: studentProfile }] = await Promise.all([
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
                                solution_image_url
                            )
                        `)
                        .eq('test_id', attempt.test_id)
                        .order('display_order', { ascending: true }),
                    supabase
                        .from('test_answers')
                        .select('question_id, selected_answer, is_correct, marks_obtained, time_spent_seconds')
                        .eq('attempt_id', attempt.id),
                    supabase
                        .from('student_profiles')
                        .select('rank_prediction')
                        .eq('id', user.id)
                        .maybeSingle(),
                ]);

                if (testQuestionsError) {
                    throw testQuestionsError;
                }

                if (answersError) {
                    throw answersError;
                }

                const typedAnswerRows = (answerRows ?? []) as Array<{
                    question_id: string | null;
                    selected_answer: string | null;
                    is_correct: boolean | null;
                    marks_obtained: number | null;
                    time_spent_seconds: number | null;
                }>;
                const answersByQuestionId = new Map(
                    typedAnswerRows.map((row) => [row.question_id ?? '', row])
                );
                const rawAnswers = (attempt.answers ?? {}) as Record<string, string>;

                const questions: QuestionResult[] = ((testQuestionRows ?? []) as Array<{
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
                    };
                }>).map((row) => {
                    const answer = answersByQuestionId.get(row.question.id);
                    const fallbackAnswer = rawAnswers[row.question.id] ?? null;
                    const yourAnswer = answer?.selected_answer ?? fallbackAnswer;
                    const isAttempted = Boolean(yourAnswer && yourAnswer.trim().length > 0);
                    const isCorrect = answer?.is_correct ?? false;
                    return {
                        id: row.question.id,
                        displayOrder: row.display_order,
                        section: row.section || 'General',
                        questionText: row.question.question_text,
                        questionType: row.question.question_type,
                        yourAnswer,
                        correctAnswer: row.question.correct_answer,
                        isCorrect,
                        isAttempted,
                        marksObtained: answer?.marks_obtained ?? 0,
                        maxMarks: row.marks,
                        negativeMarks: row.negative_marks ?? 0,
                        solution: row.question.solution_text,
                        solutionImageUrl: row.question.solution_image_url,
                        timeSpentSeconds: answer?.time_spent_seconds ?? 0,
                    };
                });

                const sectionAccumulator = new Map<string, SectionResult>();
                for (const question of questions) {
                    const section = sectionAccumulator.get(question.section) ?? {
                        name: question.section,
                        attempted: 0,
                        correct: 0,
                        incorrect: 0,
                        score: 0,
                        maxScore: 0,
                        accuracy: 0,
                    };

                    section.maxScore += question.maxMarks;
                    section.score += question.marksObtained;
                    if (question.isAttempted) {
                        section.attempted += 1;
                    }
                    if (question.isCorrect) {
                        section.correct += 1;
                    }
                    if (question.isAttempted && !question.isCorrect) {
                        section.incorrect += 1;
                    }

                    sectionAccumulator.set(question.section, section);
                }

                const sections = Array.from(sectionAccumulator.values()).map((section) => ({
                    ...section,
                    accuracy: section.attempted > 0 ? Number(((section.correct / section.attempted) * 100).toFixed(2)) : 0,
                }));

                const testLabel = attempt.test?.exam?.name || attempt.test?.test_type || 'Mock Test';
                const predictedRank = (studentProfile as { rank_prediction?: number | null } | null)?.rank_prediction ?? null;
                setResult({
                    attemptId: attempt.id,
                    testId: attempt.test_id,
                    testTitle: attempt.test?.title || 'Mock Test',
                    testLabel,
                    submittedAt: attempt.submitted_at,
                    durationMinutes: attempt.test?.duration_minutes || 0,
                    timeTakenSeconds: attempt.time_taken_seconds || 0,
                    totalScore: attempt.total_score || 0,
                    maxScore: attempt.max_score,
                    accuracyPercent: attempt.accuracy_percent || 0,
                    percentile: attempt.percentile,
                    rank: attempt.rank,
                    predictedRank,
                    correctCount: attempt.correct_count || 0,
                    incorrectCount: attempt.incorrect_count || 0,
                    unattemptedCount: attempt.unattempted_count || 0,
                    questions,
                    sections,
                });
            } catch (fetchError) {
                console.error('Failed to load test result:', fetchError);
                setError(fetchError instanceof Error ? fetchError.message : 'Failed to load result');
            } finally {
                setIsLoading(false);
            }
        }

        void fetchResult();
    }, [attemptId]);

    const scorePercent = useMemo(() => {
        if (!result || result.maxScore <= 0) {
            return 0;
        }

        return Number(((result.totalScore / result.maxScore) * 100).toFixed(2));
    }, [result]);

    async function handleDownload() {
        if (!result) {
            return;
        }

        setIsDownloading(true);
        try {
            const response = await fetch(`/api/tests/${result.testId}/answer-key?attemptId=${result.attemptId}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error || 'Failed to download answer key PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `answer-key-${result.testTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            window.URL.revokeObjectURL(url);
        } catch (downloadError) {
            console.error('Failed to download answer key:', downloadError);
            setError(downloadError instanceof Error ? downloadError.message : 'Failed to download answer key');
        } finally {
            setIsDownloading(false);
        }
    }

    async function handleCopyLink() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch (copyError) {
            console.error('Failed to copy result link:', copyError);
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    <p className="text-gray-600">Loading test analysis...</p>
                </div>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-slate-900 mb-2">Result unavailable</h1>
                    <p className="text-slate-600 mb-6">{error || 'The requested attempt could not be loaded.'}</p>
                    <Link
                        href="/dashboard/tests"
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Tests
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/tests" className="text-slate-600 hover:text-slate-900">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <p className="text-sm text-slate-500">{result.testLabel}</p>
                            <h1 className="text-lg font-semibold text-slate-900">{result.testTitle}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopyLink}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                            <Copy className="w-4 h-4" />
                            {copied ? 'Copied' : 'Copy Link'}
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-60"
                        >
                            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download PDF
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <section className="rounded-3xl bg-gradient-to-br from-primary-700 to-primary-500 p-6 text-white shadow-sm">
                    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
                        <div>
                            <p className="text-sm text-white/80">Submitted {result.submittedAt ? new Date(result.submittedAt).toLocaleString('en-IN') : 'recently'}</p>
                            <h2 className="mt-2 text-3xl font-bold">Score {result.totalScore} / {result.maxScore}</h2>
                            <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/90">
                                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                                    <Clock className="w-4 h-4" />
                                    {Math.floor(result.timeTakenSeconds / 60)} min used
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                                    <Target className="w-4 h-4" />
                                    {result.accuracyPercent.toFixed(1)}% accuracy
                                </span>
                                {result.percentile !== null && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                                        <Trophy className="w-4 h-4" />
                                        {result.percentile.toFixed(1)} percentile
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <MetricCard label="Correct" value={String(result.correctCount)} accent="green" />
                            <MetricCard label="Incorrect" value={String(result.incorrectCount)} accent="red" />
                            <MetricCard label="Unattempted" value={String(result.unattemptedCount)} accent="slate" />
                            <MetricCard label="Rank" value={result.rank ? `AIR ${result.rank}` : result.predictedRank ? `Pred ${result.predictedRank}` : 'Pending'} accent="amber" />
                        </div>
                    </div>
                </section>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard icon={BarChart3} label="Score Percent" value={`${scorePercent.toFixed(1)}%`} />
                    <StatCard icon={CheckCircle} label="Correct Answers" value={String(result.correctCount)} />
                    <StatCard icon={XCircle} label="Incorrect Answers" value={String(result.incorrectCount)} />
                    <StatCard icon={Clock} label="Avg Time / Attempt" value={result.correctCount + result.incorrectCount > 0 ? `${Math.round(result.timeTakenSeconds / Math.max(result.correctCount + result.incorrectCount, 1))} sec` : '0 sec'} />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === 'overview' ? 'bg-primary-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('solutions')}
                        className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === 'solutions' ? 'bg-primary-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                    >
                        Solutions
                    </button>
                </div>

                {activeTab === 'overview' ? (
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-primary-600" />
                            <h3 className="text-lg font-semibold text-slate-900">Section Analysis</h3>
                        </div>
                        <div className="space-y-4">
                            {result.sections.map((section) => (
                                <div key={section.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h4 className="font-semibold text-slate-900">{section.name}</h4>
                                            <p className="text-sm text-slate-500">
                                                {section.correct} correct, {section.incorrect} incorrect, {section.attempted} attempted
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-semibold text-slate-900">{section.score} / {section.maxScore}</p>
                                            <p className="text-sm text-slate-500">{section.accuracy.toFixed(1)}% accuracy</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full rounded-full bg-primary-600"
                                            style={{ width: `${Math.max(0, Math.min(100, section.maxScore > 0 ? (section.score / section.maxScore) * 100 : 0))}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : (
                    <section className="space-y-4">
                        {result.questions.map((question) => (
                            <article key={question.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span>Q{question.displayOrder}</span>
                                            <span>-</span>
                                            <span>{question.section}</span>
                                            <span>-</span>
                                            <span>{question.questionType}</span>
                                        </div>
                                        <h3 className="mt-2 font-medium text-slate-900">{question.questionText}</h3>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${question.isCorrect ? 'bg-green-100 text-green-700' : question.isAttempted ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {question.isCorrect ? 'Correct' : question.isAttempted ? 'Incorrect' : 'Unattempted'}
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    <AnswerBox label="Your Answer" value={question.yourAnswer || 'Not attempted'} tone={question.isCorrect ? 'success' : question.isAttempted ? 'danger' : 'neutral'} />
                                    <AnswerBox label="Correct Answer" value={question.correctAnswer} tone="success" />
                                </div>

                                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                    <p className="text-sm font-medium text-blue-900">Step-by-step solution</p>
                                    <p className="mt-2 text-sm leading-6 text-blue-900">{question.solution}</p>
                                    {question.solutionImageUrl && (
                                        <img
                                            src={question.solutionImageUrl}
                                            alt="Solution"
                                            className="mt-3 max-h-64 rounded-xl border border-blue-200"
                                        />
                                    )}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                                    <span>Marks: {question.marksObtained}</span>
                                    <span>Max: {question.maxMarks}</span>
                                    <span>Negative: {question.negativeMarks}</span>
                                    <span>Time: {question.timeSpentSeconds} sec</span>
                                </div>
                            </article>
                        ))}
                    </section>
                )}
            </main>
        </div>
    );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: 'green' | 'red' | 'slate' | 'amber' }) {
    const accentClass = {
        green: 'bg-green-100 text-green-700',
        red: 'bg-red-100 text-red-700',
        slate: 'bg-slate-100 text-slate-700',
        amber: 'bg-amber-100 text-amber-700',
    }[accent];

    return (
        <div className={`rounded-2xl ${accentClass} p-4`}>
            <p className="text-sm opacity-80">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
    );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
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
