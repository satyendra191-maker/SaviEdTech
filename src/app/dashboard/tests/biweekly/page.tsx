'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
    Calendar,
    Clock,
    BookOpen,
    Trophy,
    Users,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Loader2,
    GraduationCap,
    Timer,
    Star,
    FileText,
} from 'lucide-react';

interface BiWeeklyTest {
    id: string;
    test_id: string;
    exam_name: string;
    exam_type: string;
    test_date: string;
    duration_minutes: number;
    question_count: number;
    total_marks: number;
    subjects: string[];
    status: 'open' | 'closed' | 'upcoming';
    is_registered: boolean;
    registration_count: number;
    max_registrations: number;
}

interface RegistrationStatus {
    success: boolean;
    message: string;
}

export default function BiWeeklyTestsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [tests, setTests] = useState<BiWeeklyTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [registering, setRegistering] = useState<string | null>(null);
    const [registrationStatus, setRegistrationStatus] = useState<Record<string, RegistrationStatus>>({});

    useEffect(() => {
        async function fetchBiWeeklyTests() {
            if (!user) return;

            try {
                const supabase = getSupabaseBrowserClient();

                // Fetch upcoming bi-weekly tests with registration status
                const { data: testsData, error: testsError } = await supabase
                    .from('biweekly_tests')
                    .select(`
                        id,
                        test_id,
                        test_date,
                        status,
                        max_registrations,
                        current_registrations,
                        tests:test_id (
                            id,
                            title,
                            duration_minutes,
                            question_count,
                            total_marks,
                            exams:exam_id (
                                name,
                                code
                            )
                        )
                    `)
                    .gte('test_date', new Date().toISOString().split('T')[0])
                    .order('test_date', { ascending: true })
                    .limit(10) as any;

                if (testsError) throw testsError;

                // Check user's registrations
                const { data: registrations } = await supabase
                    .from('biweekly_registrations')
                    .select('biweekly_test_id')
                    .eq('user_id', user.id) as any;

                const registeredTestIds = new Set(
                    (registrations || []).map((r: any) => r.biweekly_test_id)
                );

                // Get subject distribution for each exam
                const processedTests: BiWeeklyTest[] = [];

                for (const test of (testsData || [])) {
                    const testRecord = test.tests;
                    const exam = testRecord?.exams;

                    if (!testRecord || !exam) continue;

                    // Determine subjects based on exam type
                    const subjects = getSubjectsForExam(exam.code);

                    processedTests.push({
                        id: test.id,
                        test_id: test.test_id,
                        exam_name: exam.name,
                        exam_type: exam.code,
                        test_date: test.test_date,
                        duration_minutes: testRecord.duration_minutes,
                        question_count: testRecord.question_count,
                        total_marks: testRecord.total_marks,
                        subjects,
                        status: test.status,
                        is_registered: registeredTestIds.has(test.id),
                        registration_count: test.current_registrations || 0,
                        max_registrations: test.max_registrations || 10000,
                    });
                }

                setTests(processedTests);
            } catch (err) {
                console.error('Error fetching bi-weekly tests:', err);
                setError('Failed to load bi-weekly tests. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading) {
            fetchBiWeeklyTests();
        }
    }, [user, authLoading]);

    const getSubjectsForExam = (examCode: string): string[] => {
        switch (examCode) {
            case 'jee-main':
            case 'jee-advanced':
                return ['Physics', 'Chemistry', 'Mathematics'];
            case 'neet':
                return ['Physics', 'Chemistry', 'Biology'];
            default:
                return ['Physics', 'Chemistry', 'Mathematics'];
        }
    };

    const handleRegister = async (testId: string) => {
        if (!user) {
            router.push('/login');
            return;
        }

        setRegistering(testId);
        setRegistrationStatus(prev => ({ ...prev, [testId]: { success: false, message: '' } }));

        try {
            const response = await fetch('/api/tests/biweekly/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    biweeklyTestId: testId,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setRegistrationStatus(prev => ({
                    ...prev,
                    [testId]: { success: true, message: 'Registered successfully!' },
                }));

                // Update local state
                setTests(prev =>
                    prev.map(t =>
                        t.id === testId
                            ? { ...t, is_registered: true, registration_count: t.registration_count + 1 }
                            : t
                    )
                );
            } else {
                setRegistrationStatus(prev => ({
                    ...prev,
                    [testId]: { success: false, message: data.error || 'Registration failed' },
                }));
            }
        } catch (err) {
            setRegistrationStatus(prev => ({
                ...prev,
                [testId]: { success: false, message: 'Network error. Please try again.' },
            }));
        } finally {
            setRegistering(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getDaysUntil = (dateStr: string) => {
        const testDate = new Date(dateStr);
        const today = new Date();
        const diffTime = testDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getExamColor = (examType: string) => {
        switch (examType) {
            case 'jee-main':
                return 'bg-blue-500';
            case 'jee-advanced':
                return 'bg-purple-600';
            case 'neet':
                return 'bg-green-500';
            default:
                return 'bg-slate-500';
        }
    };

    const getExamBadgeColor = (examType: string) => {
        switch (examType) {
            case 'jee-main':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'jee-advanced':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'neet':
                return 'bg-green-50 text-green-700 border-green-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    if (authLoading || loading) {
        return <BiWeeklyTestsSkeleton />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <AlertCircle className="w-16 h-16 text-red-500" />
                <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
                <p className="text-slate-500">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-8 h-8" />
                    <h1 className="text-2xl font-bold">Bi-Weekly Full Syllabus Tests</h1>
                </div>
                <p className="text-primary-100 max-w-2xl">
                    Comprehensive full syllabus tests conducted every 15 days on Sundays.
                    Test your preparation with exam-pattern questions covering all subjects proportionally.
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <div className="text-3xl font-bold">15</div>
                        <div className="text-sm text-primary-100">Days Interval</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <div className="text-3xl font-bold">Sunday</div>
                        <div className="text-sm text-primary-100">Test Day</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <div className="text-3xl font-bold">3</div>
                        <div className="text-sm text-primary-100">Exam Types</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                        <div className="text-3xl font-bold">100%</div>
                        <div className="text-sm text-primary-100">Syllabus Coverage</div>
                    </div>
                </div>
            </div>

            {/* Upcoming Tests */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">Upcoming Tests</h2>
                    <Link
                        href="/dashboard/tests"
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                    >
                        View All Tests
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                {tests.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                        <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Upcoming Tests</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                            There are no bi-weekly tests scheduled at the moment.
                            Check back soon for the next test announcement!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tests.map((test) => {
                            const daysUntil = getDaysUntil(test.test_date);

                            return (
                                <div
                                    key={test.id}
                                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow"
                                >
                                    {/* Exam Type Banner */}
                                    <div className={`${getExamColor(test.exam_type)} h-2`} />

                                    <div className="p-6">
                                        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                                            {/* Left: Test Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getExamBadgeColor(test.exam_type)}`}>
                                                        {test.exam_name}
                                                    </span>
                                                    {daysUntil <= 3 && daysUntil > 0 && (
                                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                            Coming Soon
                                                        </span>
                                                    )}
                                                    {test.is_registered && (
                                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                            Registered
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                                    Bi-Weekly Full Syllabus Test - {test.exam_name}
                                                </h3>

                                                <p className="text-slate-500 text-sm mb-4">
                                                    Complete full syllabus assessment covering all chapters proportionally.
                                                    Matches actual {test.exam_name} exam pattern.
                                                </p>

                                                {/* Test Details Grid */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm text-slate-600">{formatDate(test.test_date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm text-slate-600">{test.duration_minutes} minutes</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm text-slate-600">{test.question_count} Questions</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Star className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm text-slate-600">{test.total_marks} Marks</span>
                                                    </div>
                                                </div>

                                                {/* Subjects */}
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {test.subjects.map((subject) => (
                                                        <span
                                                            key={subject}
                                                            className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs"
                                                        >
                                                            {subject}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Registration Count */}
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <Users className="w-4 h-4" />
                                                    <span>
                                                        {test.registration_count.toLocaleString()} students registered
                                                        {test.max_registrations < 10000 && (
                                                            <span className="text-slate-400">
                                                                {' '}({test.max_registrations - test.registration_count} spots left)
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: Action */}
                                            <div className="flex flex-col items-start lg:items-end gap-3">
                                                {test.is_registered ? (
                                                    <div className="text-center">
                                                        <div className="flex items-center gap-2 text-green-600 mb-2">
                                                            <CheckCircle className="w-5 h-5" />
                                                            <span className="font-medium">Registered</span>
                                                        </div>
                                                        <p className="text-sm text-slate-500 mb-3">
                                                            Test starts in {daysUntil} days
                                                        </p>
                                                        <Link
                                                            href={`/dashboard/tests/${test.test_id}/instructions`}
                                                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
                                                        >
                                                            View Instructions
                                                            <ChevronRight className="w-4 h-4" />
                                                        </Link>
                                                    </div>
                                                ) : test.status === 'closed' ? (
                                                    <div className="text-center">
                                                        <div className="flex items-center gap-2 text-red-600 mb-2">
                                                            <AlertCircle className="w-5 h-5" />
                                                            <span className="font-medium">Registration Closed</span>
                                                        </div>
                                                        <p className="text-sm text-slate-500">
                                                            Look out for the next test!
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <p className="text-sm text-slate-500 mb-3">
                                                            Registration closes 30 min before test
                                                        </p>
                                                        <button
                                                            onClick={() => handleRegister(test.id)}
                                                            disabled={registering === test.id}
                                                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {registering === test.id ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                    Registering...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    Register Now
                                                                    <ChevronRight className="w-4 h-4" />
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Status Message */}
                                                {registrationStatus[test.id]?.message && (
                                                    <div className={`text-sm text-center ${registrationStatus[test.id].success
                                                            ? 'text-green-600'
                                                            : 'text-red-600'
                                                        }`}>
                                                        {registrationStatus[test.id].message}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Benefits Section */}
            <div className="bg-slate-50 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Why Take Bi-Weekly Tests?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <h3 className="font-medium text-slate-900 mb-1">Full Syllabus Coverage</h3>
                        <p className="text-sm text-slate-500">
                            Questions selected proportionally from all chapters ensuring comprehensive preparation assessment.
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-3">
                            <Timer className="w-5 h-5" />
                        </div>
                        <h3 className="font-medium text-slate-900 mb-1">Exam Pattern Match</h3>
                        <p className="text-sm text-slate-500">
                            Same timing, marking scheme, and difficulty distribution as actual JEE/NEET exams.
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <h3 className="font-medium text-slate-900 mb-1">Performance Tracking</h3>
                        <p className="text-sm text-slate-500">
                            Compare your scores with thousands of students and track your improvement over time.
                        </p>
                    </div>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-medium text-slate-900 mb-1">When are bi-weekly tests conducted?</h3>
                        <p className="text-sm text-slate-500">
                            Tests are scheduled every 15 days on Sunday at 9:00 AM IST.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-medium text-slate-900 mb-1">Can I take the test without registering?</h3>
                        <p className="text-sm text-slate-500">
                            No, registration is mandatory and closes 30 minutes before the test starts.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-medium text-slate-900 mb-1">What if I miss the test?</h3>
                        <p className="text-sm text-slate-500">
                            You can view the test and its solutions after the test window closes, but cannot attempt it for scoring.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-medium text-slate-900 mb-1">Is there negative marking?</h3>
                        <p className="text-sm text-slate-500">
                            Yes, same as actual exams: -1 for JEE Main/NEET, -2 for JEE Advanced.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BiWeeklyTestsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="bg-slate-200 rounded-2xl p-6 h-48">
                <div className="h-8 w-64 bg-slate-300 rounded mb-4" />
                <div className="h-4 w-full max-w-2xl bg-slate-300 rounded mb-6" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-20 bg-slate-300 rounded-xl" />
                    ))}
                </div>
            </div>

            {/* Tests Skeleton */}
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6">
                        <div className="h-6 w-32 bg-slate-200 rounded mb-3" />
                        <div className="h-4 w-3/4 bg-slate-200 rounded mb-4" />
                        <div className="grid grid-cols-4 gap-4 mb-4">
                            {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="h-4 bg-slate-200 rounded" />
                            ))}
                        </div>
                        <div className="h-10 w-32 bg-slate-200 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
