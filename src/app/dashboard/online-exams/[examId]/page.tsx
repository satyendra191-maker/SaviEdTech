'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    AlertCircle,
    Camera,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Flag,
    Laptop2,
    Maximize2,
    Minimize2,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    TriangleAlert,
    UserCircle2,
    XCircle,
    Video,
} from 'lucide-react';
import type { OnlineExamDetail } from '@/lib/online-exams/types';
import { QuestionCard } from '@/components/test/QuestionCard';
import { Timer } from '@/components/test/Timer';
import { useTest } from '@/hooks/useTest';
import { useExamProctoring } from '@/hooks/useExamProctoring';
import type { Question, Test } from '@/types';

const WARNING_THRESHOLDS = [30, 10, 5];

function detectMobileClient(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.innerWidth < 768 || /android|iphone|mobile/i.test(window.navigator.userAgent);
}

export default function OnlineExamWorkspacePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const examId = params.examId as string;
    const attemptId = searchParams.get('attempt');

    const [detail, setDetail] = useState<OnlineExamDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
                const query = new URLSearchParams({ examId });
                if (attemptId) {
                    query.set('attemptId', attemptId);
                }

                const response = await fetch(`/api/online-exams?${query.toString()}`, {
                    credentials: 'include',
                    cache: 'no-store',
                });
                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(payload?.error || 'Failed to load the online exam workspace.');
                }

                if (!cancelled) {
                    setDetail(payload.data as OnlineExamDetail);
                }
            } catch (loadError) {
                console.error('Failed to load online exam workspace:', loadError);
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : 'Failed to load the online exam workspace.');
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
    }, [attemptId, examId]);

    if (loading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
                    <p className="text-sm text-slate-500">Preparing online exam workspace...</p>
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
                            href={`/dashboard/online-exams/${examId}/instructions`}
                            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Instructions
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!detail.attempt?.id) {
        return (
            <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-800">
                <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-5 w-5" />
                    <div>
                        <h1 className="text-lg font-semibold">Start the exam from the instruction screen first</h1>
                        <p className="mt-1 text-sm">
                            A valid attempt id is required before the CBT workspace can open.
                        </p>
                        <Link
                            href={`/dashboard/online-exams/${examId}/instructions`}
                            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
                        >
                            Open Instructions
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <OnlineExamWorkspaceClient
            key={`${detail.exam.id}:${detail.attempt.id}`}
            detail={detail}
            isMobileClient={isMobileClient}
        />
    );
}

function OnlineExamWorkspaceClient({
    detail,
    isMobileClient,
}: {
    detail: OnlineExamDetail;
    isMobileClient: boolean;
}) {
    const router = useRouter();
    const attemptId = detail.attempt?.id || null;
    const autoSubmitRequestedRef = useRef(false);
    const answersRef = useRef<Record<string, string>>(detail.attempt?.answers || {});
    const markedQuestionsRef = useRef<Set<string>>(new Set(detail.attempt?.markedForReview || []));
    const currentQuestionIndexRef = useRef(0);
    const timeRemainingRef = useRef(detail.attempt?.timeRemainingSeconds ?? detail.exam.durationMinutes * 60);
    const lastQuestionStartedAtRef = useRef(Date.now());
    const questionTimeMapRef = useRef<Record<string, number>>(detail.attempt?.questionTimeMap || {});
    const warningAnnouncementsRef = useRef<Set<number>>(new Set());
    const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [infoBanner, setInfoBanner] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const onlineExamQuestions = detail.questions;

    const sectionBreakdown = useMemo(() => {
        const grouped = new Map<string, { id: string; name: string; startIndex: number; count: number }>();
        onlineExamQuestions.forEach((question, index) => {
            const existing = grouped.get(question.sectionId);
            if (existing) {
                existing.count += 1;
                return;
            }

            grouped.set(question.sectionId, {
                id: question.sectionId,
                name: question.sectionName,
                startIndex: index,
                count: 1,
            });
        });

        return detail.sections.map((section) => grouped.get(section.id)).filter(Boolean) as Array<{
            id: string;
            name: string;
            startIndex: number;
            count: number;
        }>;
    }, [detail.sections, onlineExamQuestions]);

    const questionIndexById = useMemo(() => {
        const map = new Map<string, number>();
        onlineExamQuestions.forEach((question, index) => {
            map.set(question.id, index);
        });
        return map;
    }, [onlineExamQuestions]);

    const initialQuestionIndex = detail.attempt?.currentQuestionId
        ? Math.max(0, questionIndexById.get(detail.attempt.currentQuestionId) ?? 0)
        : 0;

    const testShape = useMemo<Test>(() => ({
        id: detail.exam.id,
        exam_id: null,
        title: detail.exam.title,
        description: detail.exam.description,
        test_type: 'full_mock',
        duration_minutes: detail.exam.durationMinutes,
        total_marks: detail.exam.totalMarks,
        negative_marking: 1,
        passing_percent: 0,
        question_count: detail.exam.questionCount,
        is_published: detail.exam.isPublished,
        scheduled_at: detail.exam.scheduledAt,
        start_time: detail.exam.startTime,
        end_time: detail.exam.endTime,
        allow_multiple_attempts: false,
        show_result_immediately: true,
        created_at: detail.attempt?.startedAt || new Date().toISOString(),
    }), [detail]);

    const questionShape = useMemo<Question[]>(() => {
        return onlineExamQuestions.map((question) => ({
            id: question.id,
            topic_id: question.topicId || '',
            question_type: question.questionType,
            question_text: question.questionText,
            question_image_url: question.questionImageUrl,
            solution_text: question.solutionText,
            solution_video_url: null,
            solution_image_url: null,
            correct_answer: question.correctAnswer,
            marks: question.marks,
            negative_marks: question.negativeMarks,
            difficulty_level: null,
            estimated_time_minutes: 2,
            average_solve_time: null,
            success_rate: null,
            attempt_count: 0,
            correct_count: 0,
            tags: [],
            hint: null,
            is_published: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            options: question.options.map((option) => ({
                id: option.id,
                question_id: question.id,
                option_label: option.optionLabel,
                option_text: option.optionText,
                option_image_url: option.optionImageUrl,
                display_order: option.displayOrder,
            })),
        }));
    }, [onlineExamQuestions]);

    const handleExamSubmit = useCallback(async (
        submittedAnswers: Record<string, string>,
        timeTakenSeconds: number
    ) => {
        if (!attemptId) {
            throw new Error('Exam attempt id is missing.');
        }

        const now = Date.now();
        const currentQuestion = onlineExamQuestions[currentQuestionIndexRef.current];
        if (currentQuestion) {
            const elapsed = Math.max(0, Math.round((now - lastQuestionStartedAtRef.current) / 1000));
            if (elapsed > 0) {
                questionTimeMapRef.current = {
                    ...questionTimeMapRef.current,
                    [currentQuestion.id]: (questionTimeMapRef.current[currentQuestion.id] || 0) + elapsed,
                };
            }
        }
        lastQuestionStartedAtRef.current = now;

        setSubmissionError(null);
        const response = await fetch('/api/online-exams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                action: 'submit_attempt',
                attemptId,
                answers: submittedAnswers,
                questionTimeMap: questionTimeMapRef.current,
                markedForReview: Array.from(markedQuestionsRef.current),
                timeTakenSeconds,
                timeRemainingSeconds: timeRemainingRef.current,
                autoSubmitted: autoSubmitRequestedRef.current,
            }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            const message = payload?.error || 'Failed to submit the online exam.';
            setSubmissionError(message);
            throw new Error(message);
        }

        router.replace(`/dashboard/online-exams/results/${attemptId}`);
    }, [attemptId, onlineExamQuestions, router]);

    const testState = useTest({
        test: testShape,
        questions: questionShape,
        attemptId: detail.attempt?.id,
        initialTimeRemainingSeconds: detail.attempt?.timeRemainingSeconds ?? detail.exam.durationMinutes * 60,
        initialAnswers: detail.attempt?.answers || {},
        initialMarkedQuestionIds: detail.attempt?.markedForReview || [],
        initialQuestionIndex,
        onSubmit: handleExamSubmit,
        onAutoSave: async () => {
            if (!attemptId) {
                return;
            }

            await persistProgressInternal({
                attemptId,
                answers: answersRef.current,
                questionTimeMap: questionTimeMapRef.current,
                markedForReview: Array.from(markedQuestionsRef.current),
                currentQuestion: onlineExamQuestions[currentQuestionIndexRef.current],
                timeRemainingSeconds: timeRemainingRef.current,
                setSaveStatus,
            });
        },
    });

    const {
        currentQuestionIndex,
        answers,
        markedQuestions,
        questionStatuses,
        isSubmitting,
        goToQuestion,
        selectAnswer,
        clearAnswer,
        toggleMarkForReview,
        isMarkedForReview,
        getAnsweredCount,
        getMarkedCount,
        getNotVisitedCount,
        submitTest,
        currentAnswer,
        timeRemaining,
    } = testState;

    currentQuestionIndexRef.current = currentQuestionIndex;
    timeRemainingRef.current = timeRemaining;

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        markedQuestionsRef.current = new Set(markedQuestions);
    }, [markedQuestions]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };

        handleFullscreenChange();
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    useEffect(() => {
        lastQuestionStartedAtRef.current = Date.now();
    }, []);

    const currentExamQuestion = onlineExamQuestions[currentQuestionIndex] || null;
    const currentSectionId = currentExamQuestion?.sectionId || detail.sections[0]?.id || null;
    const currentSectionIndex = sectionBreakdown.findIndex((section) => section.id === currentSectionId);

    useEffect(() => {
        const threshold = WARNING_THRESHOLDS.find((minutes) => {
            if (warningAnnouncementsRef.current.has(minutes)) {
                return false;
            }

            return timeRemaining <= minutes * 60 && timeRemaining > (minutes - 1) * 60;
        });

        if (threshold) {
            warningAnnouncementsRef.current.add(threshold);
            setInfoBanner(`${threshold} minutes remaining. Review unanswered questions and manage your time carefully.`);
        }
    }, [timeRemaining]);

    const handleAutoSubmit = useCallback(() => {
        if (isSubmitting) {
            return;
        }

        autoSubmitRequestedRef.current = true;
        setInfoBanner('The exam is being auto-submitted because the time expired or the proctoring threshold was reached.');
        void submitTest();
    }, [isSubmitting, submitTest]);

    const {
        videoRef,
        isCameraReady,
        cameraError,
        warningCount,
        lastEvent,
        isFullscreen: proctoringFullscreen,
        requestFullscreen,
    } = useExamProctoring({
        enabled: detail.exam.proctoringEnabled,
        examId: detail.exam.id,
        attemptId,
        initialWarningCount: detail.attempt?.warningCount || 0,
        onAutoSubmit: handleAutoSubmit,
    });

    useEffect(() => {
        if (detail.exam.proctoringEnabled && lastEvent?.message) {
            setInfoBanner(lastEvent.message);
        }
    }, [detail.exam.proctoringEnabled, lastEvent]);

    const commitCurrentQuestionTime = useCallback(() => {
        const question = onlineExamQuestions[currentQuestionIndexRef.current];
        if (!question) {
            return questionTimeMapRef.current;
        }

        const now = Date.now();
        const elapsed = Math.max(0, Math.round((now - lastQuestionStartedAtRef.current) / 1000));
        if (elapsed > 0) {
            questionTimeMapRef.current = {
                ...questionTimeMapRef.current,
                [question.id]: (questionTimeMapRef.current[question.id] || 0) + elapsed,
            };
        }

        lastQuestionStartedAtRef.current = now;
        return questionTimeMapRef.current;
    }, [onlineExamQuestions]);

    const persistProgress = useCallback(async (
        overrides?: {
            answers?: Record<string, string>;
            markedForReview?: string[];
            currentQuestionIndex?: number;
        }
    ) => {
        if (!attemptId) {
            return;
        }

        const nextIndex = overrides?.currentQuestionIndex ?? currentQuestionIndexRef.current;
        const nextQuestion = onlineExamQuestions[nextIndex] || onlineExamQuestions[currentQuestionIndexRef.current] || null;

        await persistProgressInternal({
            attemptId,
            answers: overrides?.answers || answersRef.current,
            questionTimeMap: commitCurrentQuestionTime(),
            markedForReview: overrides?.markedForReview || Array.from(markedQuestionsRef.current),
            currentQuestion: nextQuestion,
            timeRemainingSeconds: timeRemainingRef.current,
            setSaveStatus,
        });
    }, [attemptId, commitCurrentQuestionTime, onlineExamQuestions]);

    useEffect(() => {
        if (!attemptId) {
            return undefined;
        }

        autoSaveTimerRef.current = setInterval(() => {
            void persistProgress();
        }, 20000);

        return () => {
            if (autoSaveTimerRef.current) {
                clearInterval(autoSaveTimerRef.current);
            }
        };
    }, [attemptId, persistProgress]);

    useEffect(() => {
        return () => {
            commitCurrentQuestionTime();
        };
    }, [commitCurrentQuestionTime]);

    const handleAnswerSelect = useCallback((answer: string) => {
        if (!currentExamQuestion) {
            return;
        }

        answersRef.current = {
            ...answersRef.current,
            [currentExamQuestion.id]: answer,
        };
        selectAnswer(currentExamQuestion.id, answer);
    }, [currentExamQuestion, selectAnswer]);

    const handleClearResponse = useCallback(async () => {
        if (!currentExamQuestion) {
            return;
        }

        const nextAnswers = { ...answersRef.current };
        delete nextAnswers[currentExamQuestion.id];
        answersRef.current = nextAnswers;
        clearAnswer(currentExamQuestion.id);
        await persistProgress({ answers: nextAnswers });
    }, [clearAnswer, currentExamQuestion, persistProgress]);

    const handleNavigate = useCallback(async (targetIndex: number) => {
        if (targetIndex < 0 || targetIndex >= onlineExamQuestions.length) {
            return;
        }

        commitCurrentQuestionTime();
        goToQuestion(targetIndex);
        currentQuestionIndexRef.current = targetIndex;
        lastQuestionStartedAtRef.current = Date.now();
        await persistProgress({ currentQuestionIndex: targetIndex });
    }, [commitCurrentQuestionTime, goToQuestion, onlineExamQuestions.length, persistProgress]);

    const handleSaveAndNext = useCallback(async () => {
        await handleNavigate(Math.min(onlineExamQuestions.length - 1, currentQuestionIndex + 1));
    }, [currentQuestionIndex, handleNavigate, onlineExamQuestions.length]);

    const handlePrevious = useCallback(async () => {
        await handleNavigate(Math.max(0, currentQuestionIndex - 1));
    }, [currentQuestionIndex, handleNavigate]);

    const handleMarkForReview = useCallback(async () => {
        if (!currentExamQuestion) {
            return;
        }

        const nextMarkedSet = new Set(markedQuestionsRef.current);
        if (nextMarkedSet.has(currentExamQuestion.id)) {
            nextMarkedSet.delete(currentExamQuestion.id);
        } else {
            nextMarkedSet.add(currentExamQuestion.id);
        }

        markedQuestionsRef.current = nextMarkedSet;
        toggleMarkForReview(currentExamQuestion.id);

        const nextIndex = Math.min(onlineExamQuestions.length - 1, currentQuestionIndex + 1);
        if (nextIndex !== currentQuestionIndex) {
            commitCurrentQuestionTime();
            goToQuestion(nextIndex);
            currentQuestionIndexRef.current = nextIndex;
            lastQuestionStartedAtRef.current = Date.now();
        }

        await persistProgress({
            markedForReview: Array.from(nextMarkedSet),
            currentQuestionIndex: nextIndex,
        });
    }, [
        commitCurrentQuestionTime,
        currentExamQuestion,
        currentQuestionIndex,
        goToQuestion,
        onlineExamQuestions.length,
        persistProgress,
        toggleMarkForReview,
    ]);

    async function handleManualFullscreenToggle() {
        if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => undefined);
            setIsFullscreen(false);
            return;
        }

        const success = await requestFullscreen();
        if (success) {
            setIsFullscreen(true);
        }
    }

    const paletteCounts = {
        answered: questionStatuses.filter((status) => status === 'answered' || status === 'answered_and_marked').length,
        marked: questionStatuses.filter((status) => status === 'marked_for_review' || status === 'answered_and_marked').length,
        notVisited: questionStatuses.filter((status) => status === 'not_visited').length,
        notAnswered: questionStatuses.filter((status) => status === 'visited').length,
    };

    if (detail.exam.desktopOnly && isMobileClient) {
        return (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
                <div className="flex items-start gap-3">
                    <Laptop2 className="mt-0.5 h-5 w-5" />
                    <div>
                        <h1 className="text-lg font-semibold">Desktop or tablet required</h1>
                        <p className="mt-1 text-sm leading-6">
                            High-stakes online exams are disabled on mobile screens. Move to a desktop or tablet and resume this attempt from the exam center.
                        </p>
                        <Link
                            href="/dashboard/online-exams"
                            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                        >
                            Back to Exam Center
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (detail.exam.proctoringEnabled && cameraError) {
        return (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
                <div className="flex items-start gap-3">
                    <Camera className="mt-0.5 h-5 w-5" />
                    <div>
                        <h1 className="text-lg font-semibold">Webcam permission is required</h1>
                        <p className="mt-1 text-sm leading-6">
                            {cameraError} This exam cannot continue until camera access is granted.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Retry Camera Setup
                            </button>
                            <Link
                                href={`/dashboard/online-exams/${detail.exam.id}/instructions`}
                                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                            >
                                Back to Instructions
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (detail.exam.proctoringEnabled && !isCameraReady) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                        <Video className="h-6 w-6" />
                    </div>
                    <h1 className="mt-4 text-xl font-semibold text-slate-900">Preparing AI proctoring</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Waiting for the webcam feed and exam security checks to come online before the CBT workspace opens.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {infoBanner ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                    {infoBanner}
                </div>
            ) : null}

            {submissionError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submissionError}
                </div>
            ) : null}

            {showSubmitConfirm ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-6 w-6 text-primary-600" />
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Submit this exam?</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    You have answered {getAnsweredCount()} questions and left {detail.questions.length - getAnsweredCount()} unanswered.
                                </p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    {getMarkedCount()} questions are still marked for review. Once submitted, answers cannot be changed.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <ConfirmMetric label="Answered" value={String(getAnsweredCount())} tone="green" />
                            <ConfirmMetric label="Unanswered" value={String(detail.questions.length - getAnsweredCount())} tone="red" />
                            <ConfirmMetric label="Marked" value={String(getMarkedCount())} tone="purple" />
                            <ConfirmMetric label="Not Visited" value={String(getNotVisitedCount())} tone="slate" />
                        </div>

                        <div className="mt-6 flex flex-wrap justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowSubmitConfirm(false)}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Continue Reviewing
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    autoSubmitRequestedRef.current = false;
                                    setShowSubmitConfirm(false);
                                    void submitTest();
                                }}
                                disabled={isSubmitting}
                                className="rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                            >
                                {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <header className="border-b border-slate-200 px-4 py-4 sm:px-6">
                    <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr_auto] xl:items-center">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">NTA-style CBT Interface</p>
                            <h1 className="mt-2 text-xl font-bold text-slate-900">{detail.exam.title}</h1>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <HeaderInfo icon={UserCircle2} label="Candidate" value={detail.exam.candidateName} />
                            <HeaderInfo icon={ShieldCheck} label="ID" value={detail.exam.candidateId} />
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3">
                            <Timer
                                durationMinutes={detail.exam.durationMinutes}
                                initialTimeRemainingSeconds={detail.attempt?.timeRemainingSeconds ?? detail.exam.durationMinutes * 60}
                                timeRemainingSeconds={timeRemaining}
                                onTimeUp={handleAutoSubmit}
                            />
                            <button
                                type="button"
                                onClick={() => void handleManualFullscreenToggle()}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                {isFullscreen || proctoringFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                {isFullscreen || proctoringFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowSubmitConfirm(true)}
                                className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                            >
                                Submit Exam
                            </button>
                        </div>
                    </div>
                </header>

                <div className="grid gap-0 xl:grid-cols-[1fr_320px]">
                    <div className="border-r border-slate-200">
                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
                            <div className="flex flex-wrap gap-2">
                                {sectionBreakdown.map((section, index) => {
                                    const isActive = currentSectionId === section.id;
                                    return (
                                        <button
                                            key={section.id}
                                            type="button"
                                            onClick={() => void handleNavigate(section.startIndex)}
                                            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                                                isActive
                                                    ? 'bg-slate-900 text-white'
                                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            {index + 1}. {section.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            {currentExamQuestion ? (
                                <QuestionCard
                                    question={questionShape[currentQuestionIndex]}
                                    questionNumber={currentQuestionIndex + 1}
                                    totalQuestions={detail.questions.length}
                                    selectedAnswer={currentAnswer}
                                    onAnswerSelect={handleAnswerSelect}
                                    onMarkForReview={() => {
                                        void handleMarkForReview();
                                    }}
                                    isMarkedForReview={Boolean(currentExamQuestion && isMarkedForReview(currentExamQuestion.id))}
                                    sectionName={`${currentExamQuestion.sectionName} • ${currentExamQuestion.subjectName}`}
                                />
                            ) : (
                                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                                    This question is not available.
                                </div>
                            )}
                        </div>

                        <footer className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => void handlePrevious()}
                                        disabled={currentQuestionIndex === 0}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleSaveAndNext()}
                                        disabled={currentQuestionIndex === detail.questions.length - 1}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Save & Next
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleClearResponse()}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Clear Response
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleMarkForReview()}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100"
                                    >
                                        <Flag className="h-4 w-4" />
                                        Mark for Review
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                                    <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Auto-saved' : saveStatus === 'error' ? 'Save failed' : 'Autosave active'}</span>
                                </div>
                            </div>
                        </footer>
                    </div>

                    <aside className="bg-slate-50">
                        <div className="space-y-5 p-4 sm:p-5">
                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-400">Exam security</p>
                                        <h2 className="mt-1 text-base font-semibold text-slate-900">Proctoring status</h2>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        detail.exam.proctoringEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {detail.exam.proctoringEnabled ? 'Live' : 'Disabled'}
                                    </span>
                                </div>

                                {detail.exam.proctoringEnabled ? (
                                    <>
                                        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                muted
                                                playsInline
                                                className="aspect-video w-full object-cover"
                                            />
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                            <ProctorMetric label="Warnings" value={String(warningCount)} />
                                            <ProctorMetric label="Fullscreen" value={proctoringFullscreen || isFullscreen ? 'On' : 'Off'} />
                                        </div>
                                        {lastEvent ? (
                                            <div className={`mt-4 rounded-2xl px-3 py-3 text-sm ${
                                                lastEvent.severity === 'critical'
                                                    ? 'bg-red-50 text-red-700'
                                                    : lastEvent.severity === 'warning'
                                                        ? 'bg-amber-50 text-amber-700'
                                                        : 'bg-sky-50 text-sky-700'
                                            }`}>
                                                {lastEvent.message}
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <p className="mt-3 text-sm leading-6 text-slate-500">
                                        This exam does not require live webcam-based proctoring.
                                    </p>
                                )}
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-slate-400">Question palette</p>
                                        <h2 className="mt-1 text-base font-semibold text-slate-900">Jump to any question</h2>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                        Q{currentQuestionIndex + 1}/{detail.questions.length}
                                    </span>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                    <LegendItem label={`Not visited (${paletteCounts.notVisited})`} color="bg-slate-300" />
                                    <LegendItem label={`Not answered (${paletteCounts.notAnswered})`} color="bg-red-500" />
                                    <LegendItem label={`Answered (${paletteCounts.answered})`} color="bg-emerald-500" />
                                    <LegendItem label={`Review (${paletteCounts.marked})`} color="bg-purple-500" />
                                </div>

                                <div className="mt-5 space-y-4">
                                    {sectionBreakdown.map((section) => (
                                        <div key={section.id}>
                                            <div className="mb-2 flex items-center justify-between">
                                                <p className="text-sm font-semibold text-slate-800">{section.name}</p>
                                                <span className="text-xs text-slate-400">{section.count} questions</span>
                                            </div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {questionStatuses
                                                    .slice(section.startIndex, section.startIndex + section.count)
                                                    .map((status, indexWithinSection) => {
                                                        const absoluteIndex = section.startIndex + indexWithinSection;
                                                        const isCurrent = absoluteIndex === currentQuestionIndex;
                                                        return (
                                                            <button
                                                                key={`${section.id}-${absoluteIndex}`}
                                                                type="button"
                                                                onClick={() => void handleNavigate(absoluteIndex)}
                                                                className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                                                                    getPaletteClasses(status, isCurrent)
                                                                }`}
                                                            >
                                                                {absoluteIndex + 1}
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-slate-400">Attempt summary</p>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <SummaryMetric label="Answered" value={String(getAnsweredCount())} />
                                    <SummaryMetric label="Marked" value={String(getMarkedCount())} />
                                    <SummaryMetric label="Section" value={currentSectionIndex >= 0 ? String(currentSectionIndex + 1) : '-'} />
                                    <SummaryMetric label="Warnings" value={String(warningCount)} />
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>
        </div>
    );
}

async function persistProgressInternal({
    attemptId,
    answers,
    questionTimeMap,
    markedForReview,
    currentQuestion,
    timeRemainingSeconds,
    setSaveStatus,
}: {
    attemptId: string;
    answers: Record<string, string>;
    questionTimeMap: Record<string, number>;
    markedForReview: string[];
    currentQuestion: OnlineExamDetail['questions'][number] | null;
    timeRemainingSeconds: number;
    setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
}) {
    setSaveStatus('saving');

    try {
        const response = await fetch('/api/online-exams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                action: 'save_progress',
                attemptId,
                answers,
                questionTimeMap,
                markedForReview,
                currentQuestionId: currentQuestion?.id || null,
                currentSectionId: currentQuestion?.sectionId || null,
                timeRemainingSeconds,
            }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(payload?.error || 'Failed to save exam progress.');
        }

        setSaveStatus('saved');
        window.setTimeout(() => setSaveStatus('idle'), 1200);
    } catch (saveError) {
        console.error('Failed to persist online exam progress:', saveError);
        setSaveStatus('error');
    }
}

function HeaderInfo({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof UserCircle2;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </div>
            <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-900">{value}</p>
        </div>
    );
}

function ConfirmMetric({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: 'green' | 'red' | 'purple' | 'slate';
}) {
    const toneClass = {
        green: 'bg-green-50 text-green-700',
        red: 'bg-red-50 text-red-700',
        purple: 'bg-purple-50 text-purple-700',
        slate: 'bg-slate-50 text-slate-700',
    }[tone];

    return (
        <div className={`rounded-2xl px-4 py-3 ${toneClass}`}>
            <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
    );
}

function ProctorMetric({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
        </div>
    );
}

function LegendItem({
    label,
    color,
}: {
    label: string;
    color: string;
}) {
    return (
        <div className="flex items-center gap-2 text-slate-600">
            <span className={`h-3 w-3 rounded-full ${color}`} />
            <span>{label}</span>
        </div>
    );
}

function SummaryMetric({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
        </div>
    );
}

function getPaletteClasses(status: string, isCurrent: boolean): string {
    if (isCurrent) {
        return 'ring-2 ring-offset-2 ring-primary-500 bg-slate-900 text-white';
    }

    switch (status) {
        case 'answered':
            return 'bg-emerald-500 text-white hover:bg-emerald-600';
        case 'answered_and_marked':
            return 'bg-purple-500 text-white hover:bg-purple-600';
        case 'marked_for_review':
            return 'bg-purple-500 text-white hover:bg-purple-600';
        case 'visited':
            return 'bg-red-500 text-white hover:bg-red-600';
        case 'not_visited':
        default:
            return 'bg-slate-300 text-slate-700 hover:bg-slate-400';
    }
}
