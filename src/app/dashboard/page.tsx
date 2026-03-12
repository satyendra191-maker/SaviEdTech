'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Flame,
    Trophy,
    Target,
    Clock,
    TrendingUp,
    Calendar,
    BookOpen,
    ChevronRight,
    Play,
    Award,
    AlertCircle,
    Star,
    Users,
    PlayCircle,
    HelpCircle,
    Brain,
    Zap,
    Sparkles,
    BarChart3,
    Video,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { RankPredictionWidget } from '@/components/analytics/RankPredictionWidget';
import { StreakDisplay, AchievementBadge, UserPointsDisplay } from '@/components/gamification';
import { CompactLeaderboard } from '@/components/gamification/Leaderboard';
import { formatTimeAgo, formatUpcomingDate } from '@/lib/utils';

/* ─── Types ─── */
interface DashboardData {
    profile: {
        full_name: string;
        exam_target: string;
    } | null;
    studentProfile: {
        study_streak: number;
        longest_streak: number;
        rank_prediction: number | null;
        percentile_prediction: number | null;
        total_study_minutes: number;
    } | null;
    stats: {
        predictedRank: string;
        accuracy: string;
        studyTime: string;
        testsTaken: number;
    };
    recentLectures: Array<{
        id: string;
        title: string;
        subject: string;
        faculty: string;
        progress: number;
        video_url: string | null;
        thumbnail_url: string | null;
        last_watched_at: string;
    }>;
    upcomingTests: Array<{
        id: string;
        title: string;
        scheduled_at: string;
        duration_minutes: number;
        question_count: number;
    }>;
    todayDPP: {
        id: string;
        title: string;
        subject: string;
        total_questions: number;
        time_limit_minutes: number;
    } | null;
    dailyChallenge: {
        id: string;
        title: string;
        total_participants: number;
        closes_at: string | null;
    } | null;
    dailyProgress: {
        questionsAttempted: number;
        accuracyPercent: number;
        studyMinutes: number;
        testsCompleted: number;
    };
    recentMockResult: {
        attemptId: string;
        title: string;
        score: number;
        maxScore: number;
        percentile: number | null;
        submittedAt: string;
    } | null;
    achievements: Array<{
        id: string;
        badge_type: string;
        earned_at: string;
    }>;
}

/* ─── Main Page Component ─── */
export default function DashboardPage() {
    const { user, role, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const redirectPath = role === 'admin' || role === 'content_manager'
        ? '/admin'
        : role === 'finance_manager'
            ? '/admin/finance'
        : role === 'parent'
            ? '/dashboard/parent'
            : null;

    useEffect(() => {
        if (redirectPath) {
            router.replace(redirectPath);
        }
    }, [redirectPath, router]);

    const [loadingTimeout, setLoadingTimeout] = useState(false);
    useEffect(() => {
        if (authLoading) {
            const timer = setTimeout(() => {
                setLoadingTimeout(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [authLoading]);

    if (authLoading && !loadingTimeout) {
        return <DashboardSkeleton />;
    }

    if (!user && !loadingTimeout) {
        return <DashboardSkeleton />;
    }

    if (redirectPath) {
        return <DashboardSkeleton />;
    }

    if (role === 'faculty') {
        return <FacultyDashboard user={user} />;
    }

    return <StudentDashboard user={user} />;
}

/* ─── Student Dashboard ─── */
function StudentDashboard({ user }: { user: any }) {
    const supabase = useMemo(() => getSupabaseBrowserClient(), []);
    const initialLoadRef = useRef(true);
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadingTimeout, setLoadingTimeout] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                setLoadingTimeout(true);
            }
        }, 10000);
        return () => clearTimeout(timer);
    }, [loading]);

    const fetchDashboardData = useCallback(async () => {
        if (!supabase) {
            setError('Dashboard data source is unavailable. Check Supabase configuration.');
            setLoading(false);
            return;
        }

        if (initialLoadRef.current) {
            setLoading(true);
        }

        try {
            const nowIso = new Date().toISOString();
            const today = nowIso.split('T')[0] || '';
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const startOfDayIso = startOfDay.toISOString();

            const [
                profileResult,
                studentProfileResult,
                recentLecturesResult,
                upcomingTestsResult,
                todayDPPResult,
                dailyChallengeResult,
                progressStatsResult,
                completedTestsResult,
                todayQuestionAttemptsResult,
                todayCompletedTestsResult,
                recentMockResultResult,
            ] = await Promise.all([
                supabase.from('profiles').select('full_name, exam_target').eq('id', user.id).maybeSingle(),
                supabase.from('student_profiles').select('*').eq('id', user.id).maybeSingle(),
                supabase
                    .from('lecture_progress')
                    .select(`
                        progress_percent,
                        last_watched_at,
                        lectures:lecture_id (
                            id,
                            title,
                            video_url,
                            thumbnail_url,
                            subjects:topic_id (name),
                            faculties:faculty_id (name)
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('last_watched_at', { ascending: false })
                    .limit(3),
                supabase
                    .from('tests')
                    .select('id, title, scheduled_at, duration_minutes, question_count')
                    .gte('scheduled_at', nowIso)
                    .eq('is_published', true)
                    .order('scheduled_at', { ascending: true })
                    .limit(2),
                supabase
                    .from('dpp_sets')
                    .select('id, title, subject_id, total_questions, time_limit_minutes, subjects:subject_id (name)')
                    .eq('scheduled_date', today)
                    .eq('is_published', true)
                    .maybeSingle(),
                supabase
                    .from('daily_challenges')
                    .select('id, title, total_participants, closes_at')
                    .eq('challenge_date', today)
                    .maybeSingle(),
                supabase
                    .from('student_progress')
                    .select('accuracy_percent, tests_taken')
                    .eq('user_id', user.id),
                supabase
                    .from('test_attempts')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .in('status', ['completed', 'time_up']),
                supabase
                    .from('question_attempts')
                    .select('is_correct, time_taken_seconds')
                    .eq('user_id', user.id)
                    .gte('occurred_at', startOfDayIso),
                supabase
                    .from('test_attempts')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .in('status', ['completed', 'time_up'])
                    .gte('submitted_at', startOfDayIso),
                supabase
                    .from('test_attempts')
                    .select(`
                        id,
                        total_score,
                        max_score,
                        percentile,
                        submitted_at,
                        tests:test_id (
                            title
                        )
                    `)
                    .eq('user_id', user.id)
                    .in('status', ['completed', 'time_up'])
                    .order('submitted_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
            ]);

            const queryErrors = [
                profileResult.error,
                studentProfileResult.error,
                recentLecturesResult.error,
                upcomingTestsResult.error,
                todayDPPResult.error,
                dailyChallengeResult.error,
                progressStatsResult.error,
                completedTestsResult.error,
                todayQuestionAttemptsResult.error,
                todayCompletedTestsResult.error,
                recentMockResultResult.error,
            ].filter(Boolean);

            if (queryErrors.length > 0) {
                throw queryErrors[0];
            }

            const profile = profileResult.data;
            const studentProfile = studentProfileResult.data;
            const recentLectures = recentLecturesResult.data;
            const upcomingTests = upcomingTestsResult.data;
            const todayDPP = todayDPPResult.data;
            const dailyChallenge = dailyChallengeResult.data;
            const progressStats = progressStatsResult.data;
            const todayQuestionAttempts = todayQuestionAttemptsResult.data;
            const recentMockAttempt = recentMockResultResult as {
                data: {
                    id: string;
                    total_score: number | null;
                    max_score: number;
                    percentile: number | null;
                    submitted_at: string | null;
                    tests: { title: string } | null;
                } | null;
            };

            const progressData = (progressStats || []) as { tests_taken: number; accuracy_percent: number }[];
            const totalTests = completedTestsResult.count || 0;
            const avgAccuracy = progressData.length > 0
                ? (progressData.reduce((acc, curr) => acc + (curr.accuracy_percent || 0), 0) / progressData.length).toFixed(1)
                : '0';
            const todayAttempts = (todayQuestionAttempts || []) as Array<{ is_correct: boolean; time_taken_seconds: number | null }>;
            const todayCorrect = todayAttempts.filter((attempt) => attempt.is_correct).length;
            const todayStudyMinutes = Math.max(
                0,
                Math.round(todayAttempts.reduce((total, attempt) => total + (attempt.time_taken_seconds || 0), 0) / 60)
            );
            const todayAccuracy = todayAttempts.length > 0
                ? Number(((todayCorrect / todayAttempts.length) * 100).toFixed(1))
                : 0;

            const studentData = studentProfile as { total_study_minutes?: number; rank_prediction?: number | null } | null;
            const totalMinutes = studentData?.total_study_minutes || 0;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const studyTimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

            const rank = studentData?.rank_prediction;
            const rankStr = rank ? `AIR ${rank.toLocaleString()}` : 'N/A';

            setData({
                profile: profile as DashboardData['profile'],
                studentProfile: studentProfile as DashboardData['studentProfile'],
                stats: {
                    predictedRank: rankStr,
                    accuracy: `${avgAccuracy}%`,
                    studyTime: studyTimeStr,
                    testsTaken: totalTests,
                },
                recentLectures: (recentLectures || []).map((lecture: unknown) => {
                    const l = lecture as {
                        progress_percent: number;
                        last_watched_at: string;
                        lectures: {
                            id: string;
                            title: string;
                            video_url: string | null;
                            thumbnail_url: string | null;
                            subjects: { name: string } | null;
                            faculties: { name: string } | null;
                        };
                    };
                    return {
                        id: l.lectures.id,
                        title: l.lectures.title,
                        subject: l.lectures.subjects?.name || 'General',
                        faculty: l.lectures.faculties?.name || 'Faculty',
                        progress: l.progress_percent,
                        video_url: l.lectures.video_url,
                        thumbnail_url: l.lectures.thumbnail_url,
                        last_watched_at: l.last_watched_at,
                    };
                }),
                upcomingTests: (upcomingTests || []).map((test: unknown) => {
                    const t = test as {
                        id: string;
                        title: string;
                        scheduled_at: string;
                        duration_minutes: number;
                        question_count: number;
                    };
                    return {
                        id: t.id,
                        title: t.title,
                        scheduled_at: t.scheduled_at,
                        duration_minutes: t.duration_minutes,
                        question_count: t.question_count,
                    };
                }),
                todayDPP: todayDPP ? {
                    id: (todayDPP as { id: string }).id,
                    title: (todayDPP as { title: string }).title,
                    subject: ((todayDPP as { subjects: { name: string } | null }).subjects?.name) || 'General',
                    total_questions: (todayDPP as { total_questions: number }).total_questions,
                    time_limit_minutes: (todayDPP as { time_limit_minutes: number }).time_limit_minutes,
                } : null,
                dailyChallenge: dailyChallenge ? {
                    id: (dailyChallenge as { id: string }).id,
                    title: (dailyChallenge as { title: string | null }).title || 'Daily Challenge',
                    total_participants: (dailyChallenge as { total_participants: number }).total_participants,
                    closes_at: (dailyChallenge as { closes_at: string | null }).closes_at,
                } : null,
                dailyProgress: {
                    questionsAttempted: todayAttempts.length,
                    accuracyPercent: todayAccuracy,
                    studyMinutes: todayStudyMinutes,
                    testsCompleted: todayCompletedTestsResult.count || 0,
                },
                recentMockResult: recentMockAttempt.data ? {
                    attemptId: recentMockAttempt.data.id,
                    title: recentMockAttempt.data.tests?.title || 'Mock Test',
                    score: recentMockAttempt.data.total_score || 0,
                    maxScore: recentMockAttempt.data.max_score,
                    percentile: recentMockAttempt.data.percentile,
                    submittedAt: recentMockAttempt.data.submitted_at || nowIso,
                } : null,
                achievements: [],
            });
            setError(null);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            initialLoadRef.current = false;
            setLoading(false);
        }
    }, [supabase, user.id]);

    useEffect(() => {
        void fetchDashboardData();

        if (!supabase) {
            return undefined;
        }

        const scheduleRefresh = () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }

            refreshTimeoutRef.current = setTimeout(() => {
                void fetchDashboardData();
            }, 250);
        };

        const channel = supabase
            .channel(`student-dashboard-sync:${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
                scheduleRefresh
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'student_profiles', filter: `id=eq.${user.id}` },
                scheduleRefresh
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'lecture_progress', filter: `user_id=eq.${user.id}` },
                scheduleRefresh
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'student_progress', filter: `user_id=eq.${user.id}` },
                scheduleRefresh
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tests' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dpp_sets' }, scheduleRefresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_challenges' }, scheduleRefresh)
            .subscribe();

        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
            void channel.unsubscribe();
        };
    }, [fetchDashboardData, supabase, user.id]);

    if (loading && !loadingTimeout) {
        return <DashboardSkeleton />;
    }

    if (loadingTimeout) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <AlertCircle className="w-16 h-16 text-amber-500" />
                <h2 className="text-xl font-semibold text-slate-900">Loading taking too long</h2>
                <p className="text-slate-500">Please refresh the page</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                >
                    Refresh Page
                </button>
            </div>
        );
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

    const displayName = data?.profile?.full_name?.split(' ')[0] || 'Student';
    const streakDays = data?.studentProfile?.study_streak || 0;
    const featuredLecture = data?.recentLectures?.[0] || null;
    const examTarget = data?.profile?.exam_target || '';

    return (
        <div className="space-y-5 max-w-5xl mx-auto">
            {/* ────── 1. Hero Section ────── */}
            <section className="animate-card-slide-up">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 p-5 sm:p-6 text-white shadow-lg">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                    <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-xl" />
                    <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {displayName}! 🎯</h1>
                                <p className="text-white/70 text-sm mt-1">
                                    {examTarget ? `Preparing for ${examTarget}` : "Let's continue your learning journey"}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-xl">
                                    <Flame className="w-5 h-5 text-amber-300 streak-fire" />
                                    <div>
                                        <span className="font-bold text-lg leading-none">{streakDays}</span>
                                        <span className="text-white/70 text-xs ml-1">day streak</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ────── 2. Scrollable Stat Pills ────── */}
            <section className="animate-card-slide-up stagger-1">
                <div className="scroll-strip -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:gap-3">
                    <StatPill icon={Target} label="Predicted Rank" value={data?.stats.predictedRank || 'N/A'} gradient="from-blue-500 to-cyan-500" />
                    <StatPill icon={TrendingUp} label="Accuracy" value={data?.stats.accuracy || '0%'} gradient="from-emerald-500 to-teal-500" />
                    <StatPill icon={Clock} label="Study Time" value={data?.stats.studyTime || '0m'} gradient="from-violet-500 to-purple-500" />
                    <StatPill icon={Trophy} label="Tests Done" value={String(data?.stats.testsTaken || 0)} gradient="from-amber-500 to-orange-500" />
                </div>
            </section>

            {/* ────── 3. Rank Prediction ────── */}
            <section className="animate-card-slide-up stagger-2">
                <RankPredictionWidget compact />
            </section>

            {/* ────── 4. Continue Learning ────── */}
            <section className="animate-card-slide-up stagger-2">
                <div className="glass-card rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                                <PlayCircle className="w-4 h-4 text-primary-600" />
                            </div>
                            <h2 className="text-base font-semibold text-slate-900">Continue Learning</h2>
                        </div>
                        <Link href="/dashboard/lectures" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
                            View All <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {featuredLecture ? (
                        <div className="space-y-3">
                            {/* Featured Lecture */}
                            <Link href={`/dashboard/lectures/${featuredLecture.id}`} className="block group">
                                <div className="overflow-hidden rounded-xl bg-slate-900 relative">
                                    {featuredLecture.video_url ? (
                                        <video
                                            controls
                                            preload="metadata"
                                            poster={featuredLecture.thumbnail_url || undefined}
                                            className="aspect-video w-full bg-black"
                                        >
                                            <source src={featuredLecture.video_url} />
                                        </video>
                                    ) : (
                                        <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-slate-800 to-slate-700 text-white">
                                            <div className="text-center">
                                                <PlayCircle className="mx-auto h-10 w-10 text-white/60 group-hover:text-white/80 transition-colors" />
                                                <p className="mt-2 text-xs text-white/50">Preview unavailable</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">
                                                {featuredLecture.subject}
                                            </span>
                                            <span className="text-[11px] text-slate-400">{formatTimeAgo(featuredLecture.last_watched_at)}</span>
                                        </div>
                                        <h3 className="font-semibold text-slate-900 text-sm truncate">{featuredLecture.title}</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">{featuredLecture.faculty}</p>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 transition-colors flex-shrink-0">
                                        Resume <ChevronRight className="h-3 w-3" />
                                    </span>
                                </div>
                            </Link>

                            {/* Other recent lectures */}
                            {data?.recentLectures && data.recentLectures.length > 1 && (
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    {data.recentLectures.slice(1).map((lecture) => (
                                        <ContinueLearningCard
                                            key={lecture.id}
                                            href={`/dashboard/lectures/${lecture.id}`}
                                            title={lecture.title}
                                            subject={lecture.subject}
                                            faculty={lecture.faculty}
                                            progress={lecture.progress}
                                            thumbnail={lecture.thumbnail_url || ''}
                                            lastWatched={formatTimeAgo(lecture.last_watched_at)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                            <PlayCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                            <p className="text-sm">No lectures in progress. Start learning!</p>
                            <Link
                                href="/dashboard/lectures"
                                className="inline-block mt-3 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                Browse Lectures
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* ────── 5. Daily Study Plan (DPP + Challenge) ────── */}
            <section className="animate-card-slide-up stagger-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Today's DPP */}
                    <div className="glass-card rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-indigo-600" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">Today's DPP</h3>
                            <span className="ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Live</span>
                        </div>
                        {data?.todayDPP ? (
                            <div>
                                <h4 className="font-semibold text-slate-900 text-sm">{data.todayDPP.title}</h4>
                                <p className="text-xs text-slate-500 mt-1">{data.todayDPP.total_questions} Qs · {data.todayDPP.time_limit_minutes} min</p>
                                <Link
                                    href={`/dashboard/dpp/${data.todayDPP.id}`}
                                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                                >
                                    <Zap className="w-3.5 h-3.5" /> Start DPP
                                </Link>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 py-4 text-center">No DPP today. Check back tomorrow!</p>
                        )}
                    </div>

                    {/* Daily Challenge */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white shadow-sm">
                        <div className="absolute -right-3 -bottom-3 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <Trophy className="w-5 h-5" />
                                <h3 className="text-sm font-semibold">Daily Challenge</h3>
                            </div>
                            <p className="text-white/80 text-xs mb-3">
                                Compete with students nationwide!
                            </p>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-white/70">
                                    {data?.dailyChallenge?.total_participants.toLocaleString() || '0'} attempted
                                </span>
                            </div>
                            <Link
                                href="/dashboard/challenge"
                                className="block w-full py-2.5 bg-white text-orange-600 font-semibold rounded-xl text-center text-xs hover:bg-white/90 transition-colors"
                            >
                                Attempt Now
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ────── 6. Practice & Tests Row ────── */}
            <section className="animate-card-slide-up stagger-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Practice Questions */}
                    <div className="glass-card rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-emerald-600" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">Practice Questions</h3>
                        </div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="flex-1">
                                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                    <span>Today's accuracy</span>
                                    <span className="font-semibold text-slate-700">{data?.dailyProgress.accuracyPercent.toFixed(0) || 0}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                                        style={{ width: `${Math.max(0, Math.min(data?.dailyProgress.accuracyPercent || 0, 100))}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mb-3 text-xs">
                            <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-600 font-medium">{data?.dailyProgress.questionsAttempted || 0} solved</span>
                            <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-600 font-medium">{data?.stats.accuracy || '0%'} overall</span>
                        </div>
                        <Link
                            href="/dashboard/practice/session"
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                        >
                            <Sparkles className="w-3.5 h-3.5" /> Quick Practice
                        </Link>
                    </div>

                    {/* Mock Tests & Progress */}
                    <div className="glass-card rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                <BarChart3 className="w-4 h-4 text-violet-600" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">Tests & Progress</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Study</p>
                                <p className="text-sm font-bold text-slate-900 mt-0.5">{data?.dailyProgress.studyMinutes || 0}m</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Tests</p>
                                <p className="text-sm font-bold text-slate-900 mt-0.5">{data?.dailyProgress.testsCompleted || 0}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-2.5 text-center">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Rank</p>
                                <p className="text-sm font-bold text-slate-900 mt-0.5">{data?.stats.predictedRank || 'N/A'}</p>
                            </div>
                        </div>

                        {data?.recentMockResult ? (
                            <div className="rounded-xl bg-violet-50 border border-violet-100 p-3 mb-3">
                                <p className="text-[10px] uppercase tracking-wider text-violet-400 font-semibold">Latest Mock</p>
                                <h4 className="font-semibold text-slate-900 text-sm mt-0.5">{data.recentMockResult.title}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {data.recentMockResult.score}/{data.recentMockResult.maxScore}
                                    {typeof data.recentMockResult.percentile === 'number' ? ` · ${data.recentMockResult.percentile.toFixed(1)}%ile` : ''}
                                </p>
                                <div className="flex gap-2 mt-2">
                                    <Link
                                        href={`/dashboard/tests/results/${data.recentMockResult.attemptId}`}
                                        className="text-xs font-medium text-violet-600 hover:text-violet-700"
                                    >
                                        View Result →
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-400 text-center mb-3">
                                No mock test yet. Start one from the test centre.
                            </div>
                        )}
                        <Link
                            href="/dashboard/tests"
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
                        >
                            Open Mock Tests
                        </Link>
                    </div>
                </div>
            </section>

            {/* ────── 7. AI Tutor & Live Classes Row ────── */}
            <section className="animate-card-slide-up stagger-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* AI Tutor CTA */}
                    <Link href="/ai-tutor" className="block group">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 p-5 text-white shadow-sm stat-card-hover">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Brain className="w-5 h-5" />
                                    <h3 className="text-sm font-semibold">AI Tutor</h3>
                                </div>
                                <p className="text-white/70 text-xs mb-3">Get instant help with any concept, upload photos of problems, or ask via voice.</p>
                                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-xs font-semibold group-hover:bg-white/30 transition-colors">
                                    Ask AI Tutor <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                            </div>
                        </div>
                    </Link>

                    {/* Upcoming Tests / Live Classes */}
                    <div className="glass-card rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                                <Video className="w-4 h-4 text-sky-600" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">Upcoming Tests</h3>
                        </div>
                        <div className="space-y-2">
                            {data?.upcomingTests && data.upcomingTests.length > 0 ? (
                                data.upcomingTests.map((test) => (
                                    <UpcomingTestCard
                                        key={test.id}
                                        title={test.title}
                                        date={formatUpcomingDate(test.scheduled_at)}
                                        duration={`${test.duration_minutes} min`}
                                        questions={test.question_count.toString()}
                                    />
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 py-4 text-center">No upcoming tests scheduled</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ────── 8. Gamification & Leaderboard ────── */}
            {user && (
                <section className="animate-card-slide-up stagger-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Gamification Stats */}
                        <div className="glass-card rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                        <Award className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-900">Your Progress</h3>
                                </div>
                                <Link
                                    href="/dashboard/analytics"
                                    className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                                >
                                    View All
                                </Link>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/50 rounded-xl p-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Flame className="w-3.5 h-3.5 text-orange-600" />
                                        <span className="text-[10px] font-semibold text-orange-700 uppercase tracking-wider">Streak</span>
                                    </div>
                                    <StreakDisplay userId={user.id} variant="minimal" />
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/50 rounded-xl p-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Star className="w-3.5 h-3.5 text-purple-600" />
                                        <span className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">Points</span>
                                    </div>
                                    <UserPointsDisplay userId={user.id} />
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-semibold text-slate-600 mb-2">Achievements</h4>
                                <AchievementBadge userId={user.id} variant="compact" />
                            </div>
                        </div>

                        {/* Leaderboard */}
                        <div className="glass-card rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                                    <Trophy className="w-4 h-4 text-yellow-600" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-900">Leaderboard</h3>
                            </div>
                            <CompactLeaderboard userId={user.id} limit={5} />
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

/* ─── Sub-components ─── */
function StatPill({
    icon: Icon,
    label,
    value,
    gradient,
}: {
    icon: typeof Target;
    label: string;
    value: string;
    gradient: string;
}) {
    return (
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 text-white shadow-md stat-card-hover min-w-[140px] sm:min-w-0`}>
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-4 h-4 opacity-80" />
                <span className="text-[11px] opacity-80 font-medium">{label}</span>
            </div>
            <p className="text-xl font-bold animate-count-up">{value}</p>
        </div>
    );
}

function ContinueLearningCard({
    href,
    title,
    subject,
    faculty,
    progress,
    thumbnail,
    lastWatched,
}: {
    href: string;
    title: string;
    subject: string;
    faculty: string;
    progress: number;
    thumbnail: string;
    lastWatched: string;
}) {
    const subjectColors: Record<string, string> = {
        Physics: 'bg-blue-100 text-blue-700',
        Chemistry: 'bg-emerald-100 text-emerald-700',
        Mathematics: 'bg-amber-100 text-amber-700',
        Biology: 'bg-red-100 text-red-700',
    };

    return (
        <Link href={href} className="flex gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
            <div className="w-16 h-12 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Play className="w-5 h-5 text-slate-400 group-hover:text-primary-600 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${subjectColors[subject] || 'bg-gray-100 text-gray-700'}`}>
                        {subject}
                    </span>
                    <span className="text-[10px] text-slate-400">{lastWatched}</span>
                </div>
                <h4 className="font-medium text-slate-900 text-xs truncate">{title}</h4>
                <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{progress}%</span>
                </div>
            </div>
        </Link>
    );
}

function UpcomingTestCard({
    title,
    date,
    duration,
    questions,
}: {
    title: string;
    date: string;
    duration: string;
    questions: string;
}) {
    return (
        <div className="p-3 border border-slate-100 rounded-xl hover:border-primary-200 transition-colors bg-white">
            <h4 className="font-medium text-slate-900 text-xs">{title}</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">{date}</p>
            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                <span className="px-2 py-0.5 bg-slate-50 rounded-md">{duration}</span>
                <span className="px-2 py-0.5 bg-slate-50 rounded-md">{questions} Qs</span>
            </div>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    trend,
    color
}: {
    icon: typeof Flame;
    label: string;
    value: string;
    trend: string;
    color: 'blue' | 'green' | 'purple' | 'amber';
}) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
    };

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 stat-card-hover">
            <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm text-slate-500">{label}</div>
            <div className="text-xs text-green-600 font-medium mt-1">{trend}</div>
        </div>
    );
}

/* ─── Skeleton ─── */
function DashboardSkeleton() {
    return (
        <div className="space-y-5 max-w-5xl mx-auto animate-pulse">
            {/* Hero skeleton */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 h-28 sm:h-24" />

            {/* Stat pills skeleton */}
            <div className="flex gap-3 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-2xl bg-slate-200 h-20 min-w-[140px] flex-1" />
                ))}
            </div>

            {/* Main content skeleton */}
            <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="h-5 bg-slate-200 rounded w-32 mb-4" />
                    <div className="aspect-video bg-slate-200 rounded-xl mb-3" />
                    <div className="h-4 bg-slate-200 rounded w-48" />
                </div>
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                        <div className="h-5 bg-slate-200 rounded w-24 mb-3" />
                        <div className="h-16 bg-slate-200 rounded-xl" />
                    </div>
                    <div className="bg-slate-200 rounded-2xl h-36" />
                </div>
            </div>
        </div>
    );
}

/* ─── Faculty Dashboard ─── */
function FacultyDashboard({ user }: { user: any }) {
    const displayName = user?.full_name?.split(' ')[0] || 'Faculty';

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="animate-card-slide-up">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 sm:p-6 text-white shadow-lg">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {displayName}!</h1>
                            <p className="text-white/60 text-sm mt-1">Here's an overview of your teaching sessions</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl">
                            <Users className="w-5 h-5" />
                            <span className="font-semibold text-sm">Professional Faculty</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-card-slide-up stagger-1">
                <StatCard icon={PlayCircle} label="My Lectures" value="12" trend="+2 this week" color="blue" />
                <StatCard icon={HelpCircle} label="Student Doubts" value="8" trend="Requires attention" color="amber" />
                <StatCard icon={TrendingUp} label="Student Mastery" value="72%" trend="+4.2%" color="green" />
                <StatCard icon={Clock} label="Class Hours" value="124h" trend="This year" color="purple" />
            </div>

            <div className="grid lg:grid-cols-3 gap-4 animate-card-slide-up stagger-2">
                <div className="lg:col-span-2 glass-card rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-semibold text-slate-900">Teaching Schedule</h2>
                        <button className="text-xs text-primary-600 hover:text-primary-700 font-semibold">
                            Manage Calendar
                        </button>
                    </div>

                    <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <h3 className="text-slate-900 font-medium text-sm">No classes today</h3>
                        <p className="text-slate-500 text-xs mt-1">Enjoy your free time or prepare for upcoming sessions!</p>
                        <button className="mt-4 px-5 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors">
                            Schedule Session
                        </button>
                    </div>
                </div>

                <div className="glass-card rounded-2xl p-5 shadow-sm">
                    <h2 className="text-base font-semibold text-slate-900 mb-4">Quick Actions</h2>
                    <div className="space-y-2">
                        <button className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-left group">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <PlayCircle className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">Upload Lecture</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-left group">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                <HelpCircle className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">Solve Doubts</span>
                        </button>
                        <button className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-left group">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                <Users className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">Batch Performance</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
