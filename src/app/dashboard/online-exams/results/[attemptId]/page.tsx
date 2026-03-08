'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    AlertCircle,
    ArrowLeft,
    BarChart3,
    CheckCircle2,
    Clock3,
    ShieldAlert,
    Target,
    Trophy,
    XCircle,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { OnlineExamResultDetail } from '@/lib/online-exams/types';

export default function OnlineExamResultPage() {
    const params = useParams();
    const attemptId = params.attemptId as string;

    const [result, setResult] = useState<OnlineExamResultDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadResult() {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/online-exams?resultAttemptId=${attemptId}`, {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(payload?.error || 'Failed to load online exam result.');
                }

                if (!cancelled) {
                    setResult(payload.data as OnlineExamResultDetail);
                }
            } catch (loadError) {
                console.error('Failed to load online exam result:', loadError);
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : 'Failed to load online exam result.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadResult();

        return () => {
            cancelled = true;
        };
    }, [attemptId]);

    const scorePercent = useMemo(() => {
        if (!result || result.maxScore <= 0) {
            return 0;
        }

        return Number(((result.score / result.maxScore) * 100).toFixed(2));
    }, [result]);

    const sectionChartData = useMemo(() => {
        return (result?.sections || []).map((section) => ({
            section: section.sectionName,
            accuracy: section.accuracy,
            score: section.score,
        }));
    }, [result?.sections]);

    const topicChartData = useMemo(() => {
        return (result?.topicPerformance || [])
            .slice()
            .sort((left, right) => right.accuracy - left.accuracy)
            .slice(0, 8)
            .map((topic) => ({
                topic: topic.topicName.length > 18 ? `${topic.topicName.slice(0, 18)}...` : topic.topicName,
                accuracy: topic.accuracy,
            }));
    }, [result?.topicPerformance]);

    const timeChartData = useMemo(() => {
        return (result?.questions || [])
            .slice(0, 12)
            .map((question, index) => ({
                question: `Q${index + 1}`,
                time: question.timeSpentSeconds,
            }));
    }, [result?.questions]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
                    <p className="text-sm text-slate-500">Loading online exam analysis...</p>
                </div>
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
                <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5" />
                    <div>
                        <h1 className="text-lg font-semibold">Result unavailable</h1>
                        <p className="mt-1 text-sm">{error || 'The requested result could not be loaded.'}</p>
                        <Link
                            href="/dashboard/online-exams"
                            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Exam Center
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] p-6 text-white shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-white/70">{result.examMode.replace('_', ' ')} Result</p>
                        <h1 className="mt-3 text-3xl font-black tracking-tight">{result.examTitle}</h1>
                        <p className="mt-2 text-sm text-white/80">
                            Submitted on {new Date(result.submittedAt).toLocaleString('en-IN')}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3 text-sm">
                            <Badge icon={Target} label={`${result.accuracy.toFixed(1)}% accuracy`} />
                            <Badge icon={Trophy} label={`${result.percentile.toFixed(1)} percentile`} />
                            <Badge icon={Clock3} label={`${result.warningCount} warnings`} />
                        </div>
                    </div>

                    <div className="grid min-w-[280px] grid-cols-2 gap-3">
                        <HeroMetric label="Score" value={`${result.score}/${result.maxScore}`} />
                        <HeroMetric label="Predicted Rank" value={`AIR ${result.rankPrediction.toLocaleString()}`} />
                        <HeroMetric label="Correct" value={String(result.correctCount)} />
                        <HeroMetric label="Incorrect" value={String(result.incorrectCount)} />
                    </div>
                </div>
            </section>

            {(result.flagged || result.autoSubmitted) ? (
                <div className={`rounded-3xl border p-5 ${
                    result.autoSubmitted
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                }`}>
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5" />
                        <div>
                            <h2 className="font-semibold">
                                {result.autoSubmitted ? 'Exam auto-submitted' : 'Exam flagged for review'}
                            </h2>
                            <p className="mt-1 text-sm leading-6">
                                {result.autoSubmitted
                                    ? 'The system auto-submitted this attempt after the configured proctoring threshold was reached.'
                                    : 'This attempt contains elevated proctoring warnings and may be reviewed by the admin team.'}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={BarChart3} label="Score Percent" value={`${scorePercent.toFixed(1)}%`} />
                <StatCard icon={CheckCircle2} label="Correct" value={String(result.correctCount)} />
                <StatCard icon={XCircle} label="Unattempted" value={String(result.unattemptedCount)} />
                <StatCard icon={Trophy} label="Weak Topics" value={String(result.weakTopics.length)} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <ChartCard title="Subject Accuracy">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sectionChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="section" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(value) => `${value}%`} />
                                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Accuracy']} />
                                <Bar dataKey="accuracy" radius={[8, 8, 0, 0]} fill="#2563eb" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Topic Performance">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topicChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="topic" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                                <YAxis tickFormatter={(value) => `${value}%`} />
                                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Accuracy']} />
                                <Bar dataKey="accuracy" radius={[8, 8, 0, 0]} fill="#16a34a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            <ChartCard title="Time Per Question">
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={timeChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="question" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(value) => `${value}s`} />
                            <Tooltip formatter={(value: number) => [`${value}s`, 'Time spent']} />
                            <Bar dataKey="time" radius={[8, 8, 0, 0]} fill="#f97316" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </ChartCard>

            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Section Analysis</h2>
                    <div className="mt-4 space-y-3">
                        {result.sections.map((section) => (
                            <div key={section.sectionId} className="rounded-2xl bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-900">{section.sectionName}</p>
                                        <p className="text-sm text-slate-500">
                                            {section.correct} correct • {section.incorrect} incorrect • {section.unattempted} unattempted
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-slate-900">{section.score}/{section.maxScore}</p>
                                        <p className="text-sm text-slate-500">{section.accuracy.toFixed(1)}%</p>
                                    </div>
                                </div>
                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className="h-full rounded-full bg-primary-600"
                                        style={{ width: `${Math.max(4, Math.min(100, section.accuracy))}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Weak Topics</h2>
                    {result.weakTopics.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {result.weakTopics.map((topic) => (
                                <span
                                    key={topic}
                                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700"
                                >
                                    {topic}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-slate-500">
                            No weak topics were flagged in this attempt.
                        </p>
                    )}

                    <h3 className="mt-8 text-base font-semibold text-slate-900">Question Review</h3>
                    <div className="mt-4 space-y-3">
                        {result.questions.slice(0, 12).map((question, index) => (
                            <article key={`${question.questionId}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-400">
                                            {question.sectionName} • {question.subjectName}
                                        </p>
                                        <h4 className="mt-1 font-medium text-slate-900">{question.questionText}</h4>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        question.isCorrect
                                            ? 'bg-green-100 text-green-700'
                                            : question.isAttempted
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-slate-200 text-slate-700'
                                    }`}>
                                        {question.isCorrect ? 'Correct' : question.isAttempted ? 'Incorrect' : 'Unattempted'}
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    <AnswerBox label="Your Answer" value={question.selectedAnswer || 'Not attempted'} />
                                    <AnswerBox label="Correct Answer" value={question.correctAnswer} />
                                </div>

                                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                                    <span>Marks: {question.marksObtained}/{question.maxMarks}</span>
                                    <span>Time: {question.timeSpentSeconds}s</span>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

function Badge({
    icon: Icon,
    label,
}: {
    icon: typeof Target;
    label: string;
}) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white/90">
            <Icon className="h-4 w-4" />
            {label}
        </span>
    );
}

function HeroMetric({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-3xl bg-white/10 p-4">
            <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof BarChart3;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-xl font-semibold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    );
}

function ChartCard({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function AnswerBox({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
        </div>
    );
}
