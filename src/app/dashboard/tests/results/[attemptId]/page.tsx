'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Trophy,
    Target,
    Clock,
    CheckCircle,
    XCircle,
    HelpCircle,
    ArrowLeft,
    Download,
    Share2,
    ChevronDown,
    ChevronUp,
    BookOpen,
    BarChart3,
    FileText,
    Award,
    TrendingUp,
    AlertTriangle,
    Loader2
} from 'lucide-react';
import Link from 'next/link';

// Types
interface QuestionResult {
    id: string;
    questionNumber: number;
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
    solutionImage?: string | null;
    section: string;
    timeSpent: number;
}

interface SectionResult {
    name: string;
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    score: number;
    maxScore: number;
    accuracy: number;
    avgTimePerQuestion: number;
}

interface TestResult {
    id: string;
    testTitle: string;
    testType: 'JEE' | 'NEET' | 'custom';
    submittedAt: string;
    duration: number; // in minutes
    timeTaken: number; // in seconds

    // Scores
    totalScore: number;
    maxScore: number;
    percentage: number;
    percentile: number;
    rank: number | null;

    // Question stats
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unattempted: number;

    // Accuracy
    accuracy: number;

    // Section-wise
    sections: SectionResult[];

    // Question details
    questions: QuestionResult[];
}

// Mock data for demonstration
const MOCK_RESULT: TestResult = {
    id: 'attempt-123',
    testTitle: 'JEE Main Full Mock Test #1',
    testType: 'JEE',
    submittedAt: new Date().toISOString(),
    duration: 180,
    timeTaken: 9360, // 2 hours 36 minutes

    totalScore: 245,
    maxScore: 300,
    percentage: 81.67,
    percentile: 94.5,
    rank: 1250,

    totalQuestions: 90,
    attempted: 75,
    correct: 62,
    incorrect: 13,
    unattempted: 15,

    accuracy: 82.67,

    sections: [
        {
            name: 'Physics',
            totalQuestions: 30,
            attempted: 26,
            correct: 21,
            incorrect: 5,
            score: 79,
            maxScore: 120,
            accuracy: 80.77,
            avgTimePerQuestion: 112,
        },
        {
            name: 'Chemistry',
            totalQuestions: 30,
            attempted: 24,
            correct: 20,
            incorrect: 4,
            score: 76,
            maxScore: 120,
            accuracy: 83.33,
            avgTimePerQuestion: 98,
        },
        {
            name: 'Mathematics',
            totalQuestions: 30,
            attempted: 25,
            correct: 21,
            incorrect: 4,
            score: 90,
            maxScore: 120,
            accuracy: 84.00,
            avgTimePerQuestion: 125,
        },
    ],

    questions: [
        {
            id: 'q1',
            questionNumber: 1,
            questionText: 'The dimensional formula of Planck\'s constant is:',
            questionType: 'MCQ',
            yourAnswer: 'A',
            correctAnswer: 'A',
            isCorrect: true,
            isAttempted: true,
            marksObtained: 4,
            maxMarks: 4,
            negativeMarks: 1,
            solution: 'Using E = hν, we get h = E/ν = [ML²T⁻²]/[T⁻¹] = [ML²T⁻¹]',
            section: 'Physics',
            timeSpent: 45,
        },
        {
            id: 'q2',
            questionNumber: 2,
            questionText: 'A particle moves in a circle of radius R with constant angular velocity ω. The magnitude of its acceleration is:',
            questionType: 'MCQ',
            yourAnswer: 'B',
            correctAnswer: 'C',
            isCorrect: false,
            isAttempted: true,
            marksObtained: -1,
            maxMarks: 4,
            negativeMarks: 1,
            solution: 'For circular motion, a = ω²R',
            section: 'Physics',
            timeSpent: 120,
        },
        {
            id: 'q3',
            questionNumber: 3,
            questionText: 'The escape velocity from Earth\'s surface is 11.2 km/s. If a body is projected with a velocity of 20 km/s, what will be its velocity at infinity?',
            questionType: 'NUMERICAL',
            yourAnswer: null,
            correctAnswer: '16.6',
            isCorrect: false,
            isAttempted: false,
            marksObtained: 0,
            maxMarks: 4,
            negativeMarks: 0,
            solution: 'Using conservation of energy: v_∞ = √(v² - v_e²) = √(400 - 125.44) = √274.56 ≈ 16.6 km/s',
            section: 'Physics',
            timeSpent: 0,
        },
    ],
};

const COLORS = {
    correct: 'bg-green-500',
    incorrect: 'bg-red-500',
    unattempted: 'bg-gray-300',
    physics: 'bg-blue-500',
    chemistry: 'bg-emerald-500',
    mathematics: 'bg-purple-500',
    biology: 'bg-amber-500',
};

export default function TestResultsPage() {
    const params = useParams();
    const router = useRouter();
    const attemptId = params.attemptId as string;

    const [result, setResult] = useState<TestResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'solutions' | 'analysis'>('overview');
    const [filterSection, setFilterSection] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'correct' | 'incorrect' | 'unattempted'>('all');
    const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

    // Refs for PDF generation
    const resultRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch result data
        const fetchResult = async () => {
            setIsLoading(true);
            try {
                // In real app, fetch from API
                // const response = await fetch(`/api/test-engine?action=get_result&attemptId=${attemptId}`);
                // const data = await response.json();

                // Mock data for now
                await new Promise(resolve => setTimeout(resolve, 1000));
                setResult(MOCK_RESULT);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResult();
    }, [attemptId]);

    const handleDownloadPDF = async () => {
        if (!result) return;

        setIsDownloadingPDF(true);
        try {
            // For mock data, use client-side generation
            if (result.id.startsWith('attempt-')) {
                // Client-side generation for demo/mock data
                const { downloadAnswerKeyPDF } = await import('@/lib/pdf/test-pdf-generator');
                await downloadAnswerKeyPDF(result, {
                    name: 'Demo Student',
                }, `answer-key-${result.testTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`);
                return;
            }

            // Server-side generation via API
            const response = await fetch(`/api/tests/${result.testType === 'JEE' ? 'jee' : result.testType === 'NEET' ? 'neet' : 'custom'}/${result.id}/answer-key?attemptId=${attemptId}`, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to download PDF');
            }

            // Get the blob from response
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `answer-key-${result.testTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        } finally {
            setIsDownloadingPDF(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Test Result: ${result?.testTitle}`,
                    text: `I scored ${result?.totalScore}/${result?.maxScore} (${result?.percentage}%) on ${result?.testTitle}!`,
                    url: window.location.href,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    const getPerformanceMessage = (percentage: number) => {
        if (percentage >= 90) return { message: 'Outstanding!', color: 'text-green-600', icon: Trophy };
        if (percentage >= 75) return { message: 'Excellent!', color: 'text-blue-600', icon: Award };
        if (percentage >= 60) return { message: 'Good Job!', color: 'text-purple-600', icon: Target };
        if (percentage >= 40) return { message: 'Keep Practicing!', color: 'text-orange-600', icon: TrendingUp };
        return { message: 'Needs Improvement', color: 'text-red-600', icon: AlertTriangle };
    };

    const filteredQuestions = result?.questions.filter(q => {
        if (filterSection !== 'all' && q.section !== filterSection) return false;
        if (filterStatus === 'correct' && !q.isCorrect) return false;
        if (filterStatus === 'incorrect' && (q.isCorrect || !q.isAttempted)) return false;
        if (filterStatus === 'unattempted' && q.isAttempted) return false;
        return true;
    }) || [];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                    <p className="text-gray-600">Loading results...</p>
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Results Not Found</h2>
                    <p className="text-gray-600 mb-4">The test results you are looking for could not be found.</p>
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

    const performance = getPerformanceMessage(result.percentage);
    const PerformanceIcon = performance.icon;

    return (
        <div className="min-h-screen bg-gray-50 pb-12" ref={resultRef}>
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard/tests"
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="hidden sm:inline">Back</span>
                        </Link>
                        <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">
                            Test Results
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Share</span>
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloadingPDF}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDownloadingPDF ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="hidden sm:inline">Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Download PDF</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Score Card */}
                <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-3xl p-8 text-white mb-8">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div>
                            <p className="text-primary-100 text-sm font-medium mb-1">{result.testTitle}</p>
                            <h2 className="text-3xl font-bold mb-4">{performance.message}</h2>
                            <p className="text-primary-100 mb-6">
                                Submitted on {new Date(result.submittedAt).toLocaleDateString('en-IN', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
                                    <Clock className="w-4 h-4" />
                                    <span>{Math.floor(result.timeTaken / 60)} min used</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
                                    <Target className="w-4 h-4" />
                                    <span>{result.accuracy.toFixed(1)}% Accuracy</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                            <div className="relative">
                                <svg className="w-40 h-40 transform -rotate-90">
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="70"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="none"
                                        className="text-primary-400/30"
                                    />
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="70"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={`${(result.percentage / 100) * 440} 440`}
                                        strokeLinecap="round"
                                        className="text-white"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold">{result.percentage.toFixed(1)}%</span>
                                    <span className="text-sm text-primary-100">Score</span>
                                </div>
                            </div>
                            <div className="mt-4 text-center">
                                <p className="text-2xl font-bold">{result.totalScore} / {result.maxScore}</p>
                                <p className="text-sm text-primary-100">Marks Obtained</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {(['overview', 'solutions', 'analysis'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-xl font-medium capitalize whitespace-nowrap transition-colors ${activeTab === tab
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                }`}
                        >
                            {tab === 'overview' && <BarChart3 className="w-4 h-4 inline mr-2" />}
                            {tab === 'solutions' && <BookOpen className="w-4 h-4 inline mr-2" />}
                            {tab === 'analysis' && <FileText className="w-4 h-4 inline mr-2" />}
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    </div>
                                    <span className="text-sm text-gray-500">Correct</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{result.correct}</p>
                                <p className="text-xs text-green-600 mt-1">+{result.correct * 4} marks</p>
                            </div>
                            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                                        <XCircle className="w-5 h-5 text-red-600" />
                                    </div>
                                    <span className="text-sm text-gray-500">Incorrect</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{result.incorrect}</p>
                                <p className="text-xs text-red-600 mt-1">-{result.incorrect * 1} marks</p>
                            </div>
                            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                        <HelpCircle className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <span className="text-sm text-gray-500">Unattempted</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{result.unattempted}</p>
                                <p className="text-xs text-gray-500 mt-1">0 marks</p>
                            </div>
                            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                        <Trophy className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <span className="text-sm text-gray-500">Percentile</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{result.percentile.toFixed(1)}</p>
                                {result.rank && (
                                    <p className="text-xs text-purple-600 mt-1">Rank #{result.rank}</p>
                                )}
                            </div>
                        </div>

                        {/* Section-wise Performance */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">Section-wise Performance</h3>
                            <div className="space-y-6">
                                {result.sections.map((section) => (
                                    <div key={section.name} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-3 h-3 rounded-full ${section.name === 'Physics' ? COLORS.physics :
                                                    section.name === 'Chemistry' ? COLORS.chemistry :
                                                        section.name === 'Mathematics' ? COLORS.mathematics :
                                                            COLORS.biology
                                                    }`} />
                                                <span className="font-medium text-gray-900">{section.name}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-gray-500">
                                                    {section.attempted}/{section.totalQuestions} attempted
                                                </span>
                                                <span className="font-semibold text-gray-900">
                                                    {section.score}/{section.maxScore}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`absolute inset-y-0 left-0 rounded-full ${section.name === 'Physics' ? 'bg-blue-500' :
                                                    section.name === 'Chemistry' ? 'bg-emerald-500' :
                                                        section.name === 'Mathematics' ? 'bg-purple-500' :
                                                            'bg-amber-500'
                                                    }`}
                                                style={{ width: `${(section.score / section.maxScore) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                                {section.correct} correct
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <XCircle className="w-3 h-3 text-red-500" />
                                                {section.incorrect} wrong
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Target className="w-3 h-3 text-blue-500" />
                                                {section.accuracy.toFixed(1)}% accuracy
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Solutions Tab */}
                {activeTab === 'solutions' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="flex flex-wrap gap-4 bg-white rounded-2xl border border-gray-200 p-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Section:</span>
                                <select
                                    value={filterSection}
                                    onChange={(e) => setFilterSection(e.target.value)}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="all">All Sections</option>
                                    {result.sections.map(s => (
                                        <option key={s.name} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Status:</span>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="all">All Questions</option>
                                    <option value="correct">Correct</option>
                                    <option value="incorrect">Incorrect</option>
                                    <option value="unattempted">Unattempted</option>
                                </select>
                            </div>
                            <div className="ml-auto text-sm text-gray-500">
                                Showing {filteredQuestions.length} of {result.questions.length} questions
                            </div>
                        </div>

                        {/* Questions List */}
                        <div className="space-y-4">
                            {filteredQuestions.map((question) => (
                                <div
                                    key={question.id}
                                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                                >
                                    <button
                                        onClick={() => setExpandedQuestion(
                                            expandedQuestion === question.id ? null : question.id
                                        )}
                                        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm ${question.isCorrect ? 'bg-green-100 text-green-700' :
                                                !question.isAttempted ? 'bg-gray-100 text-gray-600' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {question.questionNumber}
                                            </span>
                                            <div className="text-left">
                                                <p className="font-medium text-gray-900 line-clamp-1">
                                                    {question.questionText}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                    <span>{question.section}</span>
                                                    <span>•</span>
                                                    <span>{question.questionType}</span>
                                                    {question.isAttempted && (
                                                        <>
                                                            <span>•</span>
                                                            <span className={question.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                                                {question.isCorrect ? `+${question.marksObtained}` : question.marksObtained}
                                                                marks
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {!question.isAttempted ? (
                                                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
                                                    Not Attempted
                                                </span>
                                            ) : question.isCorrect ? (
                                                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Correct
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm flex items-center gap-1">
                                                    <XCircle className="w-3 h-3" />
                                                    Incorrect
                                                </span>
                                            )}
                                            {expandedQuestion === question.id ? (
                                                <ChevronUp className="w-5 h-5 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                    </button>

                                    {expandedQuestion === question.id && (
                                        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                                            <div className="space-y-4">
                                                {/* Your Answer vs Correct Answer */}
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    <div className={`p-4 rounded-xl ${question.isCorrect ? 'bg-green-50 border border-green-200' :
                                                        question.isAttempted ? 'bg-red-50 border border-red-200' :
                                                            'bg-gray-50 border border-gray-200'
                                                        }`}>
                                                        <p className="text-sm text-gray-500 mb-1">Your Answer</p>
                                                        <p className={`font-semibold ${question.isCorrect ? 'text-green-700' :
                                                            question.isAttempted ? 'text-red-700' :
                                                                'text-gray-600'
                                                            }`}>
                                                            {question.yourAnswer || 'Not Attempted'}
                                                        </p>
                                                    </div>
                                                    <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                                                        <p className="text-sm text-gray-500 mb-1">Correct Answer</p>
                                                        <p className="font-semibold text-green-700">
                                                            {question.correctAnswer}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Solution */}
                                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4" />
                                                        Solution
                                                    </h4>
                                                    <p className="text-blue-800 leading-relaxed">
                                                        {question.solution}
                                                    </p>
                                                    {question.solutionImage && (
                                                        <img
                                                            src={question.solutionImage}
                                                            alt="Solution"
                                                            className="mt-4 max-w-full rounded-lg border border-blue-200"
                                                        />
                                                    )}
                                                </div>

                                                {/* Time Spent */}
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <Clock className="w-4 h-4" />
                                                    <span>Time spent: {question.timeSpent} seconds</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Analysis Tab */}
                {activeTab === 'analysis' && (
                    <div className="space-y-6">
                        {/* Time Analysis */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Management</h3>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-gray-50 rounded-xl">
                                    <p className="text-3xl font-bold text-gray-900">
                                        {Math.floor(result.timeTaken / 60)}
                                    </p>
                                    <p className="text-sm text-gray-500">Minutes Used</p>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-xl">
                                    <p className="text-3xl font-bold text-gray-900">
                                        {Math.floor((result.duration * 60 - result.timeTaken) / 60)}
                                    </p>
                                    <p className="text-sm text-gray-500">Minutes Remaining</p>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-xl">
                                    <p className="text-3xl font-bold text-gray-900">
                                        {Math.floor(result.timeTaken / result.attempted)}
                                    </p>
                                    <p className="text-sm text-gray-500">Avg Sec/Question</p>
                                </div>
                            </div>
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-green-50 rounded-2xl border border-green-200 p-6">
                                <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Strong Areas
                                </h3>
                                <ul className="space-y-2">
                                    {result.sections
                                        .filter(s => s.accuracy >= 80)
                                        .map(s => (
                                            <li key={s.name} className="flex items-center justify-between text-green-800">
                                                <span>{s.name}</span>
                                                <span className="font-semibold">{s.accuracy.toFixed(1)}%</span>
                                            </li>
                                        ))}
                                    {result.sections.filter(s => s.accuracy >= 80).length === 0 && (
                                        <li className="text-green-700">Keep practicing to improve your accuracy!</li>
                                    )}
                                </ul>
                            </div>
                            <div className="bg-orange-50 rounded-2xl border border-orange-200 p-6">
                                <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    Areas to Improve
                                </h3>
                                <ul className="space-y-2">
                                    {result.sections
                                        .filter(s => s.accuracy < 70)
                                        .map(s => (
                                            <li key={s.name} className="flex items-center justify-between text-orange-800">
                                                <span>{s.name}</span>
                                                <span className="font-semibold">{s.accuracy.toFixed(1)}%</span>
                                            </li>
                                        ))}
                                    {result.sections.filter(s => s.accuracy < 70).length === 0 && (
                                        <li className="text-orange-700">Great job! All sections above 70% accuracy.</li>
                                    )}
                                </ul>
                            </div>
                        </div>

                        {/* Recommendations */}
                        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-4">Recommendations</h3>
                            <ul className="space-y-3 text-blue-800">
                                {result.unattempted > 10 && (
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500">•</span>
                                        <span>You left {result.unattempted} questions unattempted. Try to attempt all questions, even if unsure.</span>
                                    </li>
                                )}
                                {result.incorrect > 0 && (
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500">•</span>
                                        <span>Review the incorrect answers carefully. Understanding mistakes is key to improvement.</span>
                                    </li>
                                )}
                                {result.accuracy < 80 && (
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-500">•</span>
                                        <span>Focus on improving accuracy by practicing similar questions.</span>
                                    </li>
                                )}
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500">•</span>
                                    <span>Keep practicing regularly to maintain and improve your performance.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
