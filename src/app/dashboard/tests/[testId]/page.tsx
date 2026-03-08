'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minimize2,
    AlertTriangle,
    CheckCircle,
    Keyboard
} from 'lucide-react';

import { Timer } from '@/components/test/Timer';
import { QuestionCard } from '@/components/test/QuestionCard';
import { NavigationPanel } from '@/components/test/NavigationPanel';
import { useTest } from '@/hooks/useTest';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { Question, Test, TestAttempt, TestQuestion, QuestionOption } from '@/types';

interface SectionInfo {
    name: string;
    startIndex: number;
    count: number;
}

// Supabase response types
interface SupabaseTestQuestion {
    id: string;
    test_id: string;
    question_id: string;
    marks: number;
    negative_marks: number | null;
    display_order: number;
    section: string | null;
    questions: SupabaseQuestion;
}

interface SupabaseQuestion {
    id: string;
    topic_id: string;
    question_type: 'MCQ' | 'NUMERICAL' | 'ASSERTION_REASON';
    question_text: string;
    question_image_url: string | null;
    solution_text: string;
    solution_video_url: string | null;
    solution_image_url: string | null;
    correct_answer: string;
    marks: number;
    negative_marks: number;
    difficulty_level: 'easy' | 'medium' | 'hard' | null;
    estimated_time_minutes: number;
    average_solve_time: number | null;
    success_rate: number | null;
    attempt_count: number;
    correct_count: number;
    tags: string[] | null;
    hint: string | null;
    is_published: boolean;
    created_at: string;
    updated_at: string;
    options?: SupabaseOption[];
}

interface SupabaseOption {
    id: string;
    question_id: string;
    option_text: string;
    option_image_url: string | null;
    option_label: string;
    display_order: number;
}

interface SupabaseTest {
    id: string;
    exam_id: string | null;
    title: string;
    description: string | null;
    test_type: 'full_mock' | 'subject_test' | 'chapter_test' | 'custom';
    duration_minutes: number;
    total_marks: number;
    negative_marking: number;
    passing_percent: number;
    question_count: number;
    is_published: boolean;
    scheduled_at: string | null;
    start_time: string | null;
    end_time: string | null;
    allow_multiple_attempts: boolean;
    show_result_immediately: boolean;
    created_at: string;
    test_questions: SupabaseTestQuestion[];
}

function TestTakingContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const testId = params.testId as string;
    const urlAttemptId = searchParams.get('attempt');

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
    const [showWarning, setShowWarning] = useState(false);

    // Data states
    const [test, setTest] = useState<Test | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [attempt, setAttempt] = useState<TestAttempt | null>(null);
    const [sections, setSections] = useState<SectionInfo[]>([]);

    // Loading and error states
    const [isLoading, setIsLoading] = useState(true);
    const [isInitializingAttempt, setIsInitializingAttempt] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    const supabase = useMemo(() => getSupabaseBrowserClient(), []);

    // Fetch test data and handle attempt
    useEffect(() => {
        async function loadTestData() {
            try {
                setIsLoading(true);
                setError(null);
                setSubmissionError(null);

                if (!supabase) {
                    setError('Test service is unavailable. Please refresh the page.');
                    return;
                }

                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setError('Please sign in to take this test');
                    return;
                }

                // Fetch test with questions
                const { data: testDataRaw, error: testError } = await supabase
                    .from('tests')
                    .select(`
                        *,
                        test_questions(
                            *,
                            questions(*, options:question_options(*))
                        )
                    `)
                    .eq('id', testId)
                    .single();

                if (testError || !testDataRaw) {
                    setError('Test not found or unavailable');
                    return;
                }

                const testData = testDataRaw as unknown as SupabaseTest;

                // Transform test data
                const transformedTest: Test = {
                    id: testData.id,
                    exam_id: testData.exam_id,
                    title: testData.title,
                    description: testData.description,
                    test_type: testData.test_type,
                    duration_minutes: testData.duration_minutes,
                    total_marks: testData.total_marks,
                    negative_marking: testData.negative_marking,
                    passing_percent: testData.passing_percent,
                    question_count: testData.question_count,
                    is_published: testData.is_published,
                    scheduled_at: testData.scheduled_at,
                    start_time: testData.start_time,
                    end_time: testData.end_time,
                    allow_multiple_attempts: testData.allow_multiple_attempts,
                    show_result_immediately: testData.show_result_immediately,
                    created_at: testData.created_at,
                };

                setTest(transformedTest);

                // Transform and sort questions
                const testQuestions: SupabaseTestQuestion[] = testData.test_questions || [];
                const sortedTestQuestions = testQuestions.sort((a, b) => a.display_order - b.display_order);

                const transformedQuestions: Question[] = sortedTestQuestions.map((tq) => {
                    const q = tq.questions;
                    return {
                        id: q.id,
                        topic_id: q.topic_id,
                        question_type: q.question_type,
                        question_text: q.question_text,
                        question_image_url: q.question_image_url,
                        solution_text: q.solution_text,
                        solution_video_url: q.solution_video_url,
                        solution_image_url: q.solution_image_url,
                        correct_answer: q.correct_answer,
                        marks: tq.marks || q.marks,
                        negative_marks: tq.negative_marks ?? q.negative_marks,
                        difficulty_level: q.difficulty_level,
                        estimated_time_minutes: q.estimated_time_minutes,
                        average_solve_time: q.average_solve_time,
                        success_rate: q.success_rate,
                        attempt_count: q.attempt_count,
                        correct_count: q.correct_count,
                        tags: q.tags || [],
                        hint: q.hint,
                        is_published: q.is_published,
                        created_at: q.created_at,
                        updated_at: q.updated_at,
                        options: q.options?.sort((a: SupabaseOption, b: SupabaseOption) => a.display_order - b.display_order) as QuestionOption[],
                    };
                });

                setQuestions(transformedQuestions);

                // Build sections from test questions
                const sectionMap = new Map<string, { startIndex: number; count: number }>();
                sortedTestQuestions.forEach((tq, index) => {
                    const sectionName = tq.section || 'General';
                    if (!sectionMap.has(sectionName)) {
                        sectionMap.set(sectionName, { startIndex: index, count: 0 });
                    }
                    sectionMap.get(sectionName)!.count++;
                });

                const sectionList: SectionInfo[] = [];
                sectionMap.forEach((value, name) => {
                    sectionList.push({ name, startIndex: value.startIndex, count: value.count });
                });
                setSections(sectionList);

                // Handle attempt
                setIsInitializingAttempt(true);
                let currentAttempt: TestAttempt | null = null;

                if (urlAttemptId) {
                    // Load existing attempt
                    const { data: attemptData, error: attemptError } = await supabase
                        .from('test_attempts')
                        .select('*')
                        .eq('id', urlAttemptId)
                        .eq('user_id', user.id)
                        .single();

                    if (!attemptError && attemptData) {
                        currentAttempt = attemptData as TestAttempt;
                    }
                }

                // Check for any in-progress attempt if no valid attempt from URL
                if (!currentAttempt) {
                    const { data: existingAttempts } = await supabase
                        .from('test_attempts')
                        .select('*')
                        .eq('test_id', testId)
                        .eq('user_id', user.id)
                        .eq('status', 'in_progress')
                        .order('started_at', { ascending: false })
                        .limit(1);

                    if (existingAttempts && existingAttempts.length > 0) {
                        currentAttempt = existingAttempts[0] as TestAttempt;
                    }
                }

                // Create new attempt if needed
                if (!currentAttempt) {
                    // Check if multiple attempts allowed
                    if (!transformedTest.allow_multiple_attempts) {
                        const { data: completedAttempts } = await supabase
                            .from('test_attempts')
                            .select('id')
                            .eq('test_id', testId)
                            .eq('user_id', user.id)
                            .in('status', ['completed', 'time_up'])
                            .limit(1);

                        if (completedAttempts && completedAttempts.length > 0) {
                            setError('You have already completed this test. Multiple attempts are not allowed.');
                            setIsInitializingAttempt(false);
                            return;
                        }
                    }

                    const { data: newAttempt, error: createError } = await supabase
                        .from('test_attempts')
                        .insert({
                            test_id: testId,
                            user_id: user.id,
                            status: 'in_progress',
                            started_at: new Date().toISOString(),
                            max_score: transformedTest.total_marks,
                            answers: {} as Record<string, string>,
                            section_scores: {} as Record<string, number>,
                            attempt_number: 1,
                        } as never)
                        .select()
                        .single();

                    if (createError || !newAttempt) {
                        setError('Failed to start test. Please try again.');
                        setIsInitializingAttempt(false);
                        return;
                    }

                    currentAttempt = newAttempt as TestAttempt;
                }

                setAttempt(currentAttempt);

                // Update URL with attempt ID if not present
                if (!urlAttemptId && currentAttempt) {
                    router.replace(`/dashboard/tests/${testId}?attempt=${currentAttempt.id}`);
                }

            } catch (err) {
                console.error('Error loading test:', err);
                setError('Failed to load test. Please try again.');
            } finally {
                setIsLoading(false);
                setIsInitializingAttempt(false);
            }
        }

        void loadTestData();
    }, [testId, urlAttemptId, supabase, router]);

    const handleSubmit = useCallback(async (answers: Record<string, string>, timeTakenSeconds: number) => {
        if (!attempt) return;

        try {
            setSubmissionError(null);
            const response = await fetch('/api/test-attempts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'submit_attempt',
                    attemptId: attempt.id,
                    answers,
                    timeTakenSeconds,
                }),
            });

            if (response.ok) {
                const data = await response.json();

                // Track test completion for gamification
                try {
                    await fetch('/api/gamification/track-activity', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            activityType: 'test_completed',
                            metadata: {
                                testId,
                                attemptId: attempt.id,
                                timeTaken: timeTakenSeconds,
                            },
                        }),
                    });
                } catch (gamificationError) {
                    console.error('Error tracking test completion:', gamificationError);
                }

                router.push(`/dashboard/tests/results/${data.attemptId || attempt.id}`);
            } else {
                const payload = await response.json().catch(() => null);
                const message = payload?.error || 'Failed to submit test. Please try again.';
                setSubmissionError(message);
                throw new Error(message);
            }
        } catch (error) {
            console.error('Failed to submit test:', error);
            const message = error instanceof Error ? error.message : 'Failed to submit test. Please try again.';
            setSubmissionError(message);
            throw error;
        }
    }, [testId, attempt, router]);

    const handleAutoSave = useCallback(async (answers: Record<string, string>) => {
        if (!attempt) return;

        try {
            const response = await fetch('/api/test-attempts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'auto_save',
                    attemptId: attempt.id,
                    answers,
                }),
            });

            if (!response.ok) {
                console.warn('Auto-save request failed with status', response.status);
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }, [testId, attempt]);

    const initialTimeRemainingSeconds = useMemo(() => {
        if (!test) {
            return 0;
        }

        if (!attempt?.started_at) {
            return test.duration_minutes * 60;
        }

        const elapsedSeconds = Math.max(
            0,
            Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000)
        );

        return Math.max(0, (test.duration_minutes * 60) - elapsedSeconds);
    }, [attempt?.started_at, test]);

    const {
        currentQuestionIndex,
        answers,
        questionStatuses,
        isSubmitting,
        goToQuestion,
        goToNext,
        goToPrevious,
        selectAnswer,
        toggleMarkForReview,
        isMarkedForReview,
        getQuestionStatus,
        getAnsweredCount,
        getMarkedCount,
        getNotVisitedCount,
        submitTest,
        handleTimeUp,
        currentQuestion,
        currentAnswer,
        timeRemaining,
    } = useTest({
        test: test || {
            id: '',
            exam_id: null,
            title: '',
            description: null,
            duration_minutes: 0,
            total_marks: 0,
            negative_marking: 0,
            passing_percent: 0,
            question_count: 0,
            is_published: true,
            allow_multiple_attempts: false,
            show_result_immediately: true,
            test_type: 'full_mock',
            scheduled_at: null,
            start_time: null,
            end_time: null,
            created_at: '',
        },
        questions,
        attemptId: attempt?.id,
        initialTimeRemainingSeconds,
        onSubmit: handleSubmit,
        onAutoSave: handleAutoSave,
    });

    // Load saved answers from attempt
    useEffect(() => {
        if (attempt?.answers && Object.keys(attempt.answers).length > 0) {
            Object.entries(attempt.answers).forEach(([questionId, answer]) => {
                selectAnswer(questionId, answer);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt?.id]);

    // Fullscreen handling
    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    }, []);

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if input is focused
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key) {
                case 'ArrowRight':
                case 'n':
                case 'N':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        goToNext();
                    }
                    break;
                case 'ArrowLeft':
                case 'p':
                case 'P':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        goToPrevious();
                    }
                    break;
                case 'm':
                case 'M':
                    if (currentQuestion) {
                        e.preventDefault();
                        toggleMarkForReview(currentQuestion.id);
                    }
                    break;
                case 's':
                case 'S':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setShowSubmitConfirm(true);
                    }
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                    if (currentQuestion?.question_type === 'MCQ' && currentQuestion.options) {
                        const optionIndex = parseInt(e.key) - 1;
                        if (currentQuestion.options[optionIndex]) {
                            e.preventDefault();
                            selectAnswer(currentQuestion.id, currentQuestion.options[optionIndex].option_label);
                        }
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNext, goToPrevious, toggleMarkForReview, currentQuestion, selectAnswer, toggleFullscreen]);

    // Prevent accidental navigation
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'Are you sure you want to leave? Your test progress will be lost.';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // Handle visibility change (tab switching warning)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setShowWarning(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Loading state
    if (isLoading || isInitializingAttempt) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    <p className="text-gray-600">
                        {isInitializingAttempt ? 'Initializing test...' : 'Loading test...'}
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/dashboard/tests')}
                        className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
                    >
                        Back to Tests
                    </button>
                </div>
            </div>
        );
    }

    // No test data state
    if (!test || questions.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-orange-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Test Not Available</h2>
                    <p className="text-gray-600 mb-6">This test is not available or has no questions.</p>
                    <button
                        onClick={() => router.push('/dashboard/tests')}
                        className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
                    >
                        Back to Tests
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Warning Modal */}
            {showWarning && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <div className="flex items-center gap-3 text-orange-600 mb-4">
                            <AlertTriangle className="w-8 h-8" />
                            <h3 className="text-lg font-bold">Warning</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            You have switched tabs or minimized the window. Please stay on this page during the test.
                            Multiple warnings may result in disqualification.
                        </p>
                        <button
                            onClick={() => setShowWarning(false)}
                            className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700"
                        >
                            I Understand
                        </button>
                    </div>
                </div>
            )}

            {/* Submit Confirmation Modal */}
            {showSubmitConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <div className="flex items-center gap-3 text-primary-600 mb-4">
                            <CheckCircle className="w-8 h-8" />
                            <h3 className="text-lg font-bold">Submit Test?</h3>
                        </div>
                        <div className="space-y-3 mb-6">
                            <p className="text-gray-600">
                                You have answered <strong>{getAnsweredCount()}</strong> out of <strong>{questions.length}</strong> questions.
                            </p>
                            <div className="flex gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span>{getAnsweredCount()} Answered</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                                    <span>{getMarkedCount()} Marked</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                                    <span>{getNotVisitedCount()} Not Visited</span>
                                </div>
                            </div>
                            <p className="text-orange-600 text-sm">
                                <AlertCircle className="w-4 h-4 inline mr-1" />
                                Once submitted, you cannot modify your answers.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubmitConfirm(false)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                            >
                                Review Answers
                            </button>
                            <button
                                onClick={() => {
                                    setShowSubmitConfirm(false);
                                    submitTest();
                                }}
                                disabled={isSubmitting}
                                className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Test'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Keyboard Shortcuts Modal */}
            {showKeyboardShortcuts && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Keyboard className="w-5 h-5" />
                                Keyboard Shortcuts
                            </h3>
                            <button
                                onClick={() => setShowKeyboardShortcuts(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Next Question</span>
                                <kbd className="px-2 py-1 bg-gray-100 rounded font-mono">→ / N</kbd>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Previous Question</span>
                                <kbd className="px-2 py-1 bg-gray-100 rounded font-mono">← / P</kbd>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Mark for Review</span>
                                <kbd className="px-2 py-1 bg-gray-100 rounded font-mono">M</kbd>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Select Option (MCQ)</span>
                                <kbd className="px-2 py-1 bg-gray-100 rounded font-mono">1-4</kbd>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Submit Test</span>
                                <kbd className="px-2 py-1 bg-gray-100 rounded font-mono">S</kbd>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-600">Toggle Fullscreen</span>
                                <kbd className="px-2 py-1 bg-gray-100 rounded font-mono">F</kbd>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">
                            {test.title}
                        </h1>
                        <span className="px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                            Q{currentQuestionIndex + 1}/{questions.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Timer
                            durationMinutes={test.duration_minutes}
                            initialTimeRemainingSeconds={initialTimeRemainingSeconds}
                            timeRemainingSeconds={timeRemaining}
                            onTimeUp={handleTimeUp}
                            onWarning={(mins) => console.log(`Warning: ${mins} minutes remaining`)}
                        />
                        <button
                            onClick={() => setShowKeyboardShortcuts(true)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hidden sm:block"
                            title="Keyboard Shortcuts"
                        >
                            <Keyboard className="w-5 h-5" />
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                            title="Toggle Fullscreen"
                        >
                            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => setShowSubmitConfirm(true)}
                            className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {submissionError && (
                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {submissionError}
                    </div>
                )}

                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Question Area */}
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
                                sectionName={sections.find(s =>
                                    currentQuestionIndex >= s.startIndex &&
                                    currentQuestionIndex < s.startIndex + s.count
                                )?.name}
                            />
                        )}

                        {/* Mobile Navigation */}
                        <div className="flex items-center justify-between lg:hidden">
                            <button
                                onClick={goToPrevious}
                                disabled={currentQuestionIndex === 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 disabled:opacity-50"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </button>
                            <button
                                onClick={goToNext}
                                disabled={currentQuestionIndex === questions.length - 1}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 disabled:opacity-50"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Navigation Panel */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <NavigationPanel
                                totalQuestions={questions.length}
                                currentQuestion={currentQuestionIndex}
                                questionStatuses={questionStatuses}
                                sectionBreakdown={sections}
                                onQuestionSelect={goToQuestion}
                                onPrevious={goToPrevious}
                                onNext={goToNext}
                                onSubmit={() => setShowSubmitConfirm(true)}
                                answeredCount={getAnsweredCount()}
                                markedCount={getMarkedCount()}
                                notVisitedCount={getNotVisitedCount()}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function TestTakingPage() {
    return (
        <Suspense fallback={<TestTakingFallback />}>
            <TestTakingContent />
        </Suspense>
    );
}

function TestTakingFallback() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
                <p className="text-slate-600">Loading test workspace...</p>
            </div>
        </div>
    );
}
