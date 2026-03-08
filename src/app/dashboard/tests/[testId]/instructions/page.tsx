'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Clock,
    HelpCircle,
    AlertTriangle,
    CheckCircle,
    FileText,
    Calculator,
    ChevronRight,
    AlertOctagon,
    BookOpen,
    ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { formatTestLabel } from '@/lib/learning/assessment';

interface TestDetails {
    id: string;
    title: string;
    description: string;
    testTypeLabel: string;
    durationMinutes: number;
    totalQuestions: number;
    totalMarks: number;
    negativeMarking: number;
    sections: { name: string; questions: number }[];
    instructions: string[];
}

export default function TestInstructionsPage() {
    const params = useParams();
    const router = useRouter();
    const testId = params.testId as string;

    const [testDetails, setTestDetails] = useState<TestDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasAgreed, setHasAgreed] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        async function fetchTestDetails() {
            setIsLoading(true);
            setError(null);

            try {
                const supabase = getSupabaseBrowserClient();
                if (!supabase) {
                    throw new Error('Supabase client is unavailable');
                }

                const { data, error: testError } = await supabase
                    .from('tests')
                    .select(`
                        id,
                        title,
                        description,
                        test_type,
                        duration_minutes,
                        total_marks,
                        negative_marking,
                        question_count,
                        exam:exam_id(name),
                        test_questions(section)
                    `)
                    .eq('id', testId)
                    .eq('is_published', true)
                    .single();

                if (testError || !data) {
                    throw testError || new Error('Test not found');
                }

                const row = data as {
                    id: string;
                    title: string;
                    description: string | null;
                    test_type: string;
                    duration_minutes: number;
                    total_marks: number;
                    negative_marking: number;
                    question_count: number;
                    exam: { name: string } | null;
                    test_questions: Array<{ section: string | null }> | null;
                };

                const sectionCounts = new Map<string, number>();
                for (const item of row.test_questions ?? []) {
                    const sectionName = item.section || 'General';
                    sectionCounts.set(sectionName, (sectionCounts.get(sectionName) ?? 0) + 1);
                }

                const sections = Array.from(sectionCounts.entries()).map(([name, questions]) => ({
                    name,
                    questions,
                }));

                const marksPerQuestion = row.question_count > 0
                    ? Math.round((row.total_marks / row.question_count) * 100) / 100
                    : 0;
                const testTypeLabel = formatTestLabel(row.test_type, row.exam?.name || null);

                setTestDetails({
                    id: row.id,
                    title: row.title,
                    description: row.description || 'Practice a full-length simulated exam with detailed analysis after submission.',
                    testTypeLabel,
                    durationMinutes: row.duration_minutes,
                    totalQuestions: row.question_count,
                    totalMarks: row.total_marks,
                    negativeMarking: row.negative_marking,
                    sections,
                    instructions: [
                        `This assessment contains ${row.question_count} questions to be completed in ${row.duration_minutes} minutes.`,
                        `Every correct answer awards +${marksPerQuestion} marks.`,
                        row.negative_marking > 0
                            ? `Every incorrect answer deducts ${row.negative_marking} mark${row.negative_marking === 1 ? '' : 's'}.`
                            : 'There is no negative marking for incorrect answers in this test.',
                        'Use the navigator to move between questions and mark difficult ones for review.',
                        'Your progress auto-saves while you are attempting the test.',
                        'The test submits automatically when the timer reaches zero.',
                        'Do not refresh the page or close the browser tab during the test.',
                    ],
                });
            } catch (fetchError) {
                console.error('Failed to load test instructions:', fetchError);
                setError(fetchError instanceof Error ? fetchError.message : 'Failed to load test instructions');
            } finally {
                setIsLoading(false);
            }
        }

        void fetchTestDetails();
    }, [testId]);

    const handleStartTest = async () => {
        if (!hasAgreed) {
            return;
        }

        setIsStarting(true);
        try {
            const response = await fetch('/api/test-attempts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'start_attempt',
                    testId,
                }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to start test');
            }

            router.push(`/dashboard/tests/${testId}?attempt=${payload.attemptId}`);
        } catch (startError) {
            console.error('Error starting test:', startError);
            setError(startError instanceof Error ? startError.message : 'Failed to start test');
        } finally {
            setIsStarting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    <p className="text-gray-600">Loading test instructions...</p>
                </div>
            </div>
        );
    }

    if (error || !testDetails) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md px-4">
                    <AlertOctagon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Test Not Available</h2>
                    <p className="text-gray-600 mb-4">{error || 'The test you are looking for does not exist.'}</p>
                    <Link
                        href="/dashboard/tests"
                        className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Tests
                    </Link>
                </div>
            </div>
        );
    }

    const marksPerQuestion = testDetails.totalQuestions > 0
        ? Math.round((testDetails.totalMarks / testDetails.totalQuestions) * 100) / 100
        : 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard/tests"
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="hidden sm:inline">Back</span>
                        </Link>
                        <h1 className="text-lg font-semibold text-gray-900">Test Instructions</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                            {testDetails.testTypeLabel}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {testDetails.title}
                            </h2>
                            <p className="text-gray-600 mb-6">
                                {testDetails.description}
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Duration</p>
                                        <p className="font-semibold text-gray-900">{testDetails.durationMinutes} min</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                        <HelpCircle className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Questions</p>
                                        <p className="font-semibold text-gray-900">{testDetails.totalQuestions}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Max Marks</p>
                                        <p className="font-semibold text-gray-900">{testDetails.totalMarks}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Negative</p>
                                        <p className="font-semibold text-gray-900">-{testDetails.negativeMarking}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary-600" />
                                Section Breakdown
                            </h3>
                            <div className="space-y-3">
                                {(testDetails.sections.length > 0 ? testDetails.sections : [{ name: 'General', questions: testDetails.totalQuestions }]).map((section, index) => (
                                    <div
                                        key={`${section.name}-${index}`}
                                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 font-semibold text-sm text-gray-700">
                                                {index + 1}
                                            </span>
                                            <span className="font-medium text-gray-900">{section.name}</span>
                                        </div>
                                        <span className="text-sm text-gray-600">
                                            {section.questions} Questions
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-primary-600" />
                                Marking Scheme
                            </h3>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                    <div>
                                        <p className="font-semibold text-green-900">Correct Answer</p>
                                        <p className="text-2xl font-bold text-green-700">+{marksPerQuestion}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                    <div>
                                        <p className="font-semibold text-red-900">Incorrect Answer</p>
                                        <p className="text-2xl font-bold text-red-700">-{testDetails.negativeMarking}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                    <HelpCircle className="w-6 h-6 text-gray-600" />
                                    <div>
                                        <p className="font-semibold text-gray-900">Unattempted</p>
                                        <p className="text-2xl font-bold text-gray-700">0</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary-600" />
                                Important Instructions
                            </h3>
                            <ul className="space-y-3">
                                {testDetails.instructions.map((instruction, index) => (
                                    <li key={instruction} className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold mt-0.5">
                                            {index + 1}
                                        </span>
                                        <span className="text-gray-700 leading-relaxed">{instruction}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Ready to Start?
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Once you start the test, the timer begins immediately and cannot be paused.
                                    Make sure your connection is stable before continuing.
                                </p>

                                <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors mb-6">
                                    <input
                                        type="checkbox"
                                        checked={hasAgreed}
                                        onChange={(e) => setHasAgreed(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-0.5"
                                    />
                                    <span className="text-sm text-gray-700">
                                        I have read and understood the instructions and will follow the test rules.
                                    </span>
                                </label>

                                {error && (
                                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleStartTest}
                                    disabled={!hasAgreed || isStarting}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                                >
                                    {isStarting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Starting...
                                        </>
                                    ) : (
                                        <>
                                            Start Test Now
                                            <ChevronRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>

                                {!hasAgreed && (
                                    <p className="mt-3 text-xs text-center text-orange-600">
                                        Please confirm the instructions before starting.
                                    </p>
                                )}
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Quick Tips
                                </h4>
                                <ul className="space-y-2 text-sm text-blue-800">
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500">-</span>
                                        Read each question fully before locking an answer.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500">-</span>
                                        Mark difficult questions for review and return later.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500">-</span>
                                        Track your time section by section instead of rushing the last third.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500">-</span>
                                        Submit only after checking unanswered and marked questions.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
