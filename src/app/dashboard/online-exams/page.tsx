'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Monitor, ShieldCheck, Trophy, Clock3, ArrowRight, History } from 'lucide-react';
import type { OnlineExamsDashboardPayload } from '@/lib/online-exams/types';

export default function DashboardOnlineExamsPage() {
    const [data, setData] = useState<OnlineExamsDashboardPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/online-exams', {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const payload = await response.json().catch(() => null);
                if (!response.ok) {
                    throw new Error(payload?.error || 'Failed to load online exams');
                }

                if (!isCancelled) {
                    setData(payload.data);
                }
            } catch (fetchError) {
                console.error('Failed to load online exams dashboard:', fetchError);
                if (!isCancelled) {
                    setError(fetchError instanceof Error ? fetchError.message : 'Failed to load online exams');
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        }

        void load();
        return () => {
            isCancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
                    <p className="text-sm text-slate-500">Loading online exam center...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
                <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5" />
                    <div>
                        <h1 className="text-lg font-semibold">Online exam center unavailable</h1>
                        <p className="mt-1 text-sm">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] p-6 text-white shadow-lg">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                    <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-white/70">SaviEduTech Online Exam Center</p>
                        <h1 className="mt-3 text-3xl font-black tracking-tight">Take proctored full-length exams with instant analytics.</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">
                            Simulate real national exam pressure with section navigation, answer palette tracking, autosave, fullscreen enforcement, and immediate result analysis.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <SummaryCard label="Available Exams" value={String(data?.availableExams.length || 0)} icon={Monitor} />
                        <SummaryCard label="Attempt History" value={String(data?.history.length || 0)} icon={History} />
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Available Online Exams</h2>
                        <p className="text-sm text-slate-500">Choose a scheduled exam, review instructions, and begin when you are ready.</p>
                    </div>
                    <Link
                        href="/online-exam"
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Learn More
                    </Link>
                </div>

                {data?.availableExams.length ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                        {data.availableExams.map((exam) => (
                            <article key={exam.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                                                {exam.examMode.replace('_', ' ')}
                                            </span>
                                            {exam.proctoringEnabled ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    Proctored
                                                </span>
                                            ) : null}
                                            {exam.desktopOnly ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                                    <Monitor className="h-3.5 w-3.5" />
                                                    Desktop / Tablet
                                                </span>
                                            ) : null}
                                        </div>
                                        <h3 className="mt-3 text-xl font-semibold text-slate-900">{exam.title}</h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-500">{exam.description || 'Full-length online examination with instant score analysis.'}</p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                                        <div className="text-xs uppercase tracking-wide text-slate-400">Duration</div>
                                        <div className="mt-1 text-lg font-semibold text-slate-900">{exam.durationMinutes} min</div>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                                    <Metric label="Questions" value={String(exam.questionCount)} />
                                    <Metric label="Marks" value={String(exam.totalMarks)} />
                                    <Metric label="Start" value={exam.startTime ? new Date(exam.startTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Anytime'} />
                                    <Metric label="Ends" value={exam.endTime ? new Date(exam.endTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Open'} />
                                </div>

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <Link
                                        href={`/dashboard/online-exams/${exam.id}/instructions${exam.activeAttemptId ? `?attempt=${exam.activeAttemptId}` : ''}`}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
                                    >
                                        {exam.activeAttemptId ? 'Resume Exam' : 'View Instructions'}
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                        No online exams are currently available. Check back after the next schedule is published.
                    </div>
                )}
            </section>

            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary-600" />
                    <h2 className="text-xl font-semibold text-slate-900">Exam History</h2>
                </div>

                {data?.history.length ? (
                    <div className="grid gap-4">
                        {data.history.map((attempt) => (
                            <article key={attempt.attemptId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-400">{attempt.examMode.replace('_', ' ')}</p>
                                        <h3 className="mt-1 text-lg font-semibold text-slate-900">{attempt.examTitle}</h3>
                                        <p className="mt-2 text-sm text-slate-500">
                                            Attempted on {new Date(attempt.attemptedAt).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div className="grid min-w-[240px] grid-cols-2 gap-3">
                                        <Metric label="Score" value={`${attempt.score}/${attempt.maxScore}`} />
                                        <Metric label="Accuracy" value={`${attempt.accuracy.toFixed(1)}%`} />
                                        <Metric label="Percentile" value={attempt.percentile ? attempt.percentile.toFixed(1) : 'Pending'} />
                                        <Metric label="Pred Rank" value={attempt.rankPrediction ? `AIR ${attempt.rankPrediction}` : 'Pending'} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <Link
                                        href={`/dashboard/online-exams/results/${attempt.attemptId}`}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                    >
                                        View Detailed Result
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                        No online exam attempts yet. Once you submit an exam, your results and analytics will appear here.
                    </div>
                )}
            </section>
        </div>
    );
}

function SummaryCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon: typeof Monitor;
}) {
    return (
        <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
                    <p className="mt-2 text-2xl font-black">{value}</p>
                </div>
                <Icon className="h-5 w-5 text-white/80" />
            </div>
        </div>
    );
}

function Metric({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">{value}</div>
        </div>
    );
}
