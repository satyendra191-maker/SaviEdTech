'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Clock, Calendar, Trophy, ArrowRight, PlayCircle, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface TestsData {
    stats: {
        testsTaken: number;
        bestScore: number;
        upcomingCount: number;
        totalTime: number;
    };
    upcomingTests: Array<{
        id: string;
        title: string;
        date: string;
        duration: string;
        questions: number;
        marks: number;
        status: 'upcoming';
    }>;
    pastTests: Array<{
        id: string;
        title: string;
        date: string;
        score: number;
        maxScore: number;
        rank: number | null;
        percentile: number | null;
    }>;
}

export default function TestsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [data, setData] = useState<TestsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchTestsData() {
            if (!user) return;

            try {
                const supabase = getSupabaseBrowserClient();

                // Fetch upcoming tests
                const { data: upcomingTestsData } = await supabase
                    .from('tests')
                    .select('id, title, scheduled_at, duration_minutes, question_count, total_marks')
                    .gte('scheduled_at', new Date().toISOString())
                    .eq('is_published', true)
                    .order('scheduled_at', { ascending: true });

                // Fetch user's test attempts
                const { data: testAttempts } = await supabase
                    .from('test_attempts')
                    .select(`
                        id,
                        total_score,
                        max_score,
                        rank,
                        percentile,
                        submitted_at,
                        time_taken_seconds,
                        tests:test_id (title)
                    `)
                    .eq('user_id', user.id)
                    .eq('status', 'completed')
                    .order('submitted_at', { ascending: false });

                // Calculate stats
                const attempts = (testAttempts || []) as {
                    id: string;
                    total_score: number | null;
                    max_score: number;
                    rank: number | null;
                    percentile: number | null;
                    submitted_at: string;
                    time_taken_seconds: number | null;
                    tests: { title: string } | null;
                }[];

                const testsTaken = attempts.length;
                const bestScore = testsTaken > 0
                    ? Math.max(...attempts.map(a => a.total_score || 0))
                    : 0;
                const totalTime = attempts.reduce((acc, a) => acc + (a.time_taken_seconds || 0), 0);

                // Process upcoming tests
                const upcomingTests = (upcomingTestsData || []).map((item: unknown) => {
                    const test = item as {
                        id: string;
                        title: string;
                        scheduled_at: string;
                        duration_minutes: number;
                        question_count: number;
                        total_marks: number;
                    };
                    return {
                        id: test.id,
                        title: test.title,
                        date: formatDate(test.scheduled_at),
                        duration: formatDuration(test.duration_minutes),
                        questions: test.question_count,
                        marks: test.total_marks,
                        status: 'upcoming' as const,
                    };
                });

                // Process past tests
                const pastTests = attempts.map((attempt) => ({
                    id: attempt.id,
                    title: attempt.tests?.title || 'Test',
                    date: formatPastDate(attempt.submitted_at),
                    score: attempt.total_score || 0,
                    maxScore: attempt.max_score,
                    rank: attempt.rank,
                    percentile: attempt.percentile,
                }));

                setData({
                    stats: {
                        testsTaken,
                        bestScore,
                        upcomingCount: upcomingTests.length,
                        totalTime: Math.floor(totalTime / 3600),
                    },
                    upcomingTests,
                    pastTests,
                });
            } catch (err) {
                console.error('Error fetching tests data:', err);
                setError('Failed to load tests data. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading) {
            fetchTestsData();
        }
    }, [user, authLoading]);

    if (authLoading || loading) {
        return <TestsSkeleton />;
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
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Mock Tests</h1>
                <p className="text-slate-500">Practice with JEE/NEET pattern tests</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{data?.stats.testsTaken || 0}</div>
                    <div className="text-sm text-slate-500">Tests Taken</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3">
                        <Trophy className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{data?.stats.bestScore || 0}</div>
                    <div className="text-sm text-slate-500">Best Score</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{data?.stats.upcomingCount || 0}</div>
                    <div className="text-sm text-slate-500">Upcoming</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{data?.stats.totalTime || 0}h</div>
                    <div className="text-sm text-slate-500">Total Time</div>
                </div>
            </div>

            {/* Upcoming Tests */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">Upcoming Tests</h3>
                </div>
                {data?.upcomingTests && data.upcomingTests.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {data.upcomingTests.map((test) => (
                            <div key={test.id} className="p-6 flex items-center justify-between hover:bg-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                                        <PlayCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{test.title}</h4>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {test.date}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {test.duration}
                                            </span>
                                            <span>{test.questions} Questions</span>
                                            <span>{test.marks} Marks</span>
                                        </div>
                                    </div>
                                </div>
                                <Link
                                    href={`/dashboard/tests/${test.id}/instructions`}
                                    className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                    Start Test
                                </Link>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>No upcoming tests scheduled</p>
                    </div>
                )}
            </div>

            {/* Past Tests */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">Recent Test Results</h3>
                </div>
                {data?.pastTests && data.pastTests.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {data.pastTests.map((test) => (
                            <div key={test.id} className="p-6 flex items-center justify-between hover:bg-slate-50">
                                <div>
                                    <h4 className="font-semibold text-slate-900">{test.title}</h4>
                                    <p className="text-sm text-slate-500 mt-1">{test.date}</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-semibold text-slate-900">{test.score}/{test.maxScore}</div>
                                            <div className="text-xs text-slate-500">Score</div>
                                        </div>
                                        {test.percentile && (
                                            <div className="text-right">
                                                <div className="font-semibold text-slate-900">{test.percentile.toFixed(1)}%</div>
                                                <div className="text-xs text-slate-500">Percentile</div>
                                            </div>
                                        )}
                                        <Link
                                            href={`/dashboard/tests/results/${test.id}`}
                                            className="ml-4 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                                        >
                                            View Analysis
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>No tests taken yet. Start with an upcoming test!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function TestsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div>
                <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-64"></div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100">
                        <div className="w-10 h-10 bg-slate-200 rounded-xl mb-3"></div>
                        <div className="h-8 bg-slate-200 rounded w-16 mb-1"></div>
                        <div className="h-4 bg-slate-200 rounded w-24"></div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="h-16 bg-slate-200 border-b"></div>
                <div className="divide-y divide-slate-100">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-6 h-24 bg-slate-100"></div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="h-16 bg-slate-200 border-b"></div>
                <div className="divide-y divide-slate-100">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="p-6 h-24 bg-slate-100"></div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Helper functions
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatPastDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} Minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} Hours`;
}
