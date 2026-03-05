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
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

// Test patterns for JEE and NEET
const TEST_PATTERNS = {
    JEE: {
        name: 'JEE Main',
        duration: 180, // minutes
        totalQuestions: 90,
        sections: [
            { name: 'Physics', questions: 30 },
            { name: 'Chemistry', questions: 30 },
            { name: 'Mathematics', questions: 30 },
        ],
        marking: {
            correct: 4,
            incorrect: -1,
            unattempted: 0,
        },
        maxMarks: 300,
    },
    NEET: {
        name: 'NEET',
        duration: 180, // minutes
        totalQuestions: 180,
        sections: [
            { name: 'Physics', questions: 45 },
            { name: 'Chemistry', questions: 45 },
            { name: 'Biology', questions: 90 },
        ],
        marking: {
            correct: 4,
            incorrect: -1,
            unattempted: 0,
        },
        maxMarks: 720,
    },
};

interface TestDetails {
    id: string;
    title: string;
    description: string;
    testType: 'JEE' | 'NEET' | 'custom';
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
    const [isLoading, setIsLoading] = useState(true);
    const [hasAgreed, setHasAgreed] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        // In a real app, fetch test details from API
        // For now, using mock data based on testId
        const fetchTestDetails = async () => {
            setIsLoading(true);
            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 500));

                // Mock test data - in real app, fetch from backend
                const mockTests: Record<string, TestDetails> = {
                    'jee-mock-1': {
                        id: 'jee-mock-1',
                        title: 'JEE Main Full Mock Test #1',
                        description: 'Complete JEE Main mock test covering Physics, Chemistry, and Mathematics with the latest pattern.',
                        testType: 'JEE',
                        durationMinutes: 180,
                        totalQuestions: 90,
                        totalMarks: 300,
                        negativeMarking: 1,
                        sections: TEST_PATTERNS.JEE.sections,
                        instructions: [
                            'This test consists of 90 questions to be completed in 3 hours.',
                            'Each correct answer carries +4 marks.',
                            'Each incorrect answer carries -1 mark (negative marking).',
                            'Unattempted questions carry 0 marks.',
                            'You can navigate between questions using the question palette.',
                            'Questions can be marked for review and answered later.',
                            'The test will auto-submit when time expires.',
                            'Do not refresh the page or navigate away during the test.',
                            'Use of calculators is not allowed for numerical questions.',
                            'All the best for your test!',
                        ],
                    },
                    'neet-mock-1': {
                        id: 'neet-mock-1',
                        title: 'NEET Full Mock Test #1',
                        description: 'Complete NEET mock test covering Physics, Chemistry, and Biology as per NTA pattern.',
                        testType: 'NEET',
                        durationMinutes: 180,
                        totalQuestions: 180,
                        totalMarks: 720,
                        negativeMarking: 1,
                        sections: TEST_PATTERNS.NEET.sections,
                        instructions: [
                            'This test consists of 180 questions to be completed in 3 hours.',
                            'Each correct answer carries +4 marks.',
                            'Each incorrect answer carries -1 mark (negative marking).',
                            'Unattempted questions carry 0 marks.',
                            'Biology section has 90 questions (45 Botany + 45 Zoology).',
                            'You can navigate between questions using the question palette.',
                            'Questions can be marked for review and answered later.',
                            'The test will auto-submit when time expires.',
                            'Do not refresh the page or navigate away during the test.',
                            'All the best for your test!',
                        ],
                    },
                };

                const details = mockTests[testId] || mockTests['jee-mock-1'];
                setTestDetails(details);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTestDetails();
    }, [testId]);

    const handleStartTest = async () => {
        if (!hasAgreed) return;

        setIsStarting(true);
        try {
            // Create attempt in backend
            const response = await fetch('/api/test-engine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'start_attempt',
                    testId: testId,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                // Navigate to the test page with attempt ID
                router.push(`/dashboard/tests/${testId}?attempt=${data.attemptId}`);
            } else {
                throw new Error('Failed to start test');
            }
        } catch (error) {
            console.error('Error starting test:', error);
            // For demo, just navigate without attempt ID
            router.push(`/dashboard/tests/${testId}`);
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

    if (!testDetails) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertOctagon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Test Not Found</h2>
                    <p className="text-gray-600 mb-4">The test you are looking for does not exist.</p>
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
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
                            {testDetails.testType}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Test Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Test Overview Card */}
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

                        {/* Section Breakdown */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary-600" />
                                Section Breakdown
                            </h3>
                            <div className="space-y-3">
                                {testDetails.sections.map((section, index) => (
                                    <div
                                        key={index}
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

                        {/* Marking Scheme */}
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
                                        <p className="text-2xl font-bold text-green-700">+{testDetails.totalMarks / testDetails.totalQuestions}</p>
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

                        {/* Instructions */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary-600" />
                                Important Instructions
                            </h3>
                            <ul className="space-y-3">
                                {testDetails.instructions.map((instruction, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold mt-0.5">
                                            {index + 1}
                                        </span>
                                        <span className="text-gray-700 leading-relaxed">{instruction}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right Column - Start Test */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Ready to Start?
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Once you start the test, the timer will begin and cannot be paused.
                                    Make sure you have a stable internet connection and are in a quiet environment.
                                </p>

                                {/* Agreement Checkbox */}
                                <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors mb-6">
                                    <input
                                        type="checkbox"
                                        checked={hasAgreed}
                                        onChange={(e) => setHasAgreed(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-0.5"
                                    />
                                    <span className="text-sm text-gray-700">
                                        I have read and understood all the instructions.
                                        I agree to abide by the test rules and understand that
                                        any malpractice will result in disqualification.
                                    </span>
                                </label>

                                {/* Start Button */}
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
                                        Please agree to the terms to start the test
                                    </p>
                                )}
                            </div>

                            {/* Quick Tips */}
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Quick Tips
                                </h4>
                                <ul className="space-y-2 text-sm text-blue-800">
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500">•</span>
                                        Read questions carefully before answering
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500">•</span>
                                        Mark difficult questions for review
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500">•</span>
                                        Manage your time wisely across sections
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500">•</span>
                                        Review all answers before submitting
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
