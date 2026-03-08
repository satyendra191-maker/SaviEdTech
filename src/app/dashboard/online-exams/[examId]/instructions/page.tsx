'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    AlertCircle,
    ArrowLeft,
    Camera,
    ChevronRight,
    Clock3,
    Laptop2,
    Monitor,
    ShieldCheck,
    TriangleAlert,
} from 'lucide-react';
import type { OnlineExamDetail } from '@/lib/online-exams/types';

function detectMobileClient(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.innerWidth < 768 || /android|iphone|mobile/i.test(window.navigator.userAgent);
}

export default function OnlineExamInstructionsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const examId = params.examId as string;
    const requestedAttemptId = searchParams.get('attempt');

    const [detail, setDetail] = useState<OnlineExamDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
    const [hasConsentedToProctoring, setHasConsentedToProctoring] = useState(false);
    const [isMobileClient, setIsMobileClient] = useState(false);

    useEffect(() => {
        setIsMobileClient(detectMobileClient());
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadExam() {
            setLoading(true);
            setError(null);

            try {
                const url = new URL('/api/online-exams', window.location.origin);
                url.searchParams.set('examId', examId);
                if (requestedAttemptId) {
                    url.searchParams.set('attemptId', requestedAttemptId);
                }

                const response = await fetch(url.toString(), {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(payload?.error || 'Failed to load online exam instructions.');
                }

                if (!cancelled) {
                    setDetail(payload.data as OnlineExamDetail);
                }
            } catch (loadError) {
                console.error('Failed to load online exam instructions:', loadError);
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : 'Failed to load online exam instructions.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadExam();

        return () => {
            cancelled = true;
        };
    }, [examId, requestedAttemptId]);

    const sectionSummary = useMemo(() => {
        return (detail?.sections || []).map((section, index) => ({
            ...section,
            order: index + 1,
        }));
    }, [detail?.sections]);

    const canContinue = hasAcceptedRules && (!detail?.exam.proctoringEnabled || hasConsentedToProctoring);

    async function handleStartExam() {
        if (!detail) {
            return;
        }

        if (detail.exam.desktopOnly && isMobileClient) {
            setError('This exam is configured for desktop or tablet devices only. Please switch devices to continue.');
            return;
        }

        if (!canContinue) {
            return;
        }

        setStarting(true);
        setError(null);

        try {
            const response = await fetch('/api/online-exams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'start_attempt',
                    examId,
                    deviceMetadata: {
                        userAgent: typeof navigator === 'undefined' ? null : navigator.userAgent,
                        viewport: typeof window === 'undefined'
                            ? null
                            : {
                                width: window.innerWidth,
                                height: window.innerHeight,
                            },
                    },
                }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to start online exam.');
            }

            const attemptId = payload?.data?.attemptId;
            if (!attemptId) {
                throw new Error('Exam attempt was created without an id.');
            }

            router.push(`/dashboard/online-exams/${examId}?attempt=${attemptId}`);
        } catch (startError) {
            console.error('Failed to start online exam:', startError);
            setError(startError instanceof Error ? startError.message : 'Failed to start online exam.');
        } finally {
            setStarting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
                    <p className="text-sm text-slate-500">Loading exam instructions...</p>
                </div>
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
                <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5" />
                    <div>
                        <h1 className="text-lg font-semibold">Online exam unavailable</h1>
                        <p className="mt-1 text-sm">{error || 'The requested online exam could not be loaded.'}</p>
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
            <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_52%,#22c55e_100%)] p-6 text-white shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                                {detail.exam.examMode.replace('_', ' ')}
                            </span>
                            {detail.exam.proctoringEnabled ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/85">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    AI Proctored
                                </span>
                            ) : null}
                            {detail.exam.desktopOnly ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/85">
                                    <Monitor className="h-3.5 w-3.5" />
                                    Desktop / Tablet Only
                                </span>
                            ) : null}
                        </div>
                        <h1 className="mt-4 text-3xl font-black tracking-tight">{detail.exam.title}</h1>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">
                            {detail.exam.description || 'Review the rules, confirm your exam setup, and enter the CBT workspace when you are ready.'}
                        </p>
                    </div>

                    <div className="grid min-w-[280px] grid-cols-2 gap-3">
                        <InfoCard label="Candidate" value={detail.exam.candidateName} />
                        <InfoCard label="Candidate ID" value={detail.exam.candidateId} />
                        <InfoCard label="Duration" value={`${detail.exam.durationMinutes} min`} />
                        <InfoCard label="Questions" value={String(detail.exam.questionCount)} />
                    </div>
                </div>
            </section>

            {detail.exam.desktopOnly && isMobileClient ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
                    <div className="flex items-start gap-3">
                        <Laptop2 className="mt-0.5 h-5 w-5" />
                        <div>
                            <h2 className="font-semibold">Switch to a larger device before starting</h2>
                            <p className="mt-1 text-sm leading-6">
                                This online exam is restricted to desktop or tablet layouts to preserve the real NTA-style exam experience.
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-6">
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Clock3 className="h-5 w-5 text-primary-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Exam Structure</h2>
                        </div>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <ExamMetric title="Total Marks" value={String(detail.exam.totalMarks)} />
                            <ExamMetric title="Sections" value={String(sectionSummary.length)} />
                            <ExamMetric title="Scheduled" value={detail.exam.scheduledAt ? new Date(detail.exam.scheduledAt).toLocaleString('en-IN') : 'Live now'} />
                            <ExamMetric title="Result Mode" value="Instant evaluation" />
                        </div>

                        <div className="mt-6 space-y-3">
                            {sectionSummary.map((section) => (
                                <div key={section.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-400">Section {section.order}</p>
                                            <h3 className="mt-1 font-semibold text-slate-900">{section.name}</h3>
                                            <p className="mt-1 text-sm text-slate-500">{section.subjectName}</p>
                                        </div>
                                        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                                            {section.totalQuestions} questions
                                        </span>
                                    </div>
                                    {section.instructions.length ? (
                                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                            {section.instructions.map((instruction) => (
                                                <li key={instruction} className="flex items-start gap-2">
                                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                    <span>{instruction}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Rules and Instructions</h2>
                        </div>
                        <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                            {detail.exam.instructions.map((instruction, index) => (
                                <li key={instruction} className="flex items-start gap-3">
                                    <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">
                                        {index + 1}
                                    </span>
                                    <span>{instruction}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">Readiness Checklist</h2>
                        <div className="mt-5 space-y-4">
                            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <input
                                    type="checkbox"
                                    checked={hasAcceptedRules}
                                    onChange={(event) => setHasAcceptedRules(event.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm leading-6 text-slate-700">
                                    I have reviewed the instructions and understand that the timer starts immediately when I enter the exam workspace.
                                </span>
                            </label>

                            {detail.exam.proctoringEnabled ? (
                                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <input
                                        type="checkbox"
                                        checked={hasConsentedToProctoring}
                                        onChange={(event) => setHasConsentedToProctoring(event.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm leading-6 text-slate-700">
                                        I consent to webcam-based AI proctoring for this exam and understand that suspicious activity may be logged for review.
                                    </span>
                                </label>
                            ) : null}
                        </div>

                        <div className="mt-6 space-y-3">
                            <SetupCard
                                icon={Camera}
                                title="Webcam required"
                                description={detail.exam.proctoringEnabled ? 'Camera access will be requested before the exam starts.' : 'This exam does not require live camera monitoring.'}
                            />
                            <SetupCard
                                icon={Monitor}
                                title="Fullscreen exam mode"
                                description="You will be asked to remain in fullscreen mode during the attempt."
                            />
                            <SetupCard
                                icon={TriangleAlert}
                                title="Auto-save and timer enforcement"
                                description="Answers are saved continuously and the exam auto-submits when time expires."
                            />
                        </div>

                        {error ? (
                            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        ) : null}

                        <button
                            type="button"
                            onClick={() => void handleStartExam()}
                            disabled={!canContinue || starting || (detail.exam.desktopOnly && isMobileClient)}
                            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {starting ? 'Preparing Exam...' : detail.attempt?.id ? 'Resume Online Exam' : 'Enter Exam Workspace'}
                            {!starting ? <ChevronRight className="h-4 w-4" /> : null}
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}

function InfoCard({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-3xl bg-white/10 p-4">
            <div className="text-xs uppercase tracking-wide text-white/70">{label}</div>
            <div className="mt-2 text-sm font-semibold text-white">{value}</div>
        </div>
    );
}

function ExamMetric({
    title,
    value,
}: {
    title: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
        </div>
    );
}

function SetupCard({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof Camera;
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-2 text-primary-600 shadow-sm">
                    <Icon className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                </div>
            </div>
        </div>
    );
}
