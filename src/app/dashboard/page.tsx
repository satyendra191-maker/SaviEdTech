'use client';

import { useEffect, useState } from 'react';
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
    Loader2,
    AlertCircle,
    Star,
    Users,
    PlayCircle,
    HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { StreakDisplay, AchievementBadge, UserPointsDisplay } from '@/components/gamification';
import { CompactLeaderboard } from '@/components/gamification/Leaderboard';
import { formatTimeAgo, formatUpcomingDate } from '@/lib/utils';

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
    achievements: Array<{
        id: string;
        badge_type: string;
        earned_at: string;
    }>;
}

export default function DashboardPage() {
    const { user, role, isLoading: authLoading } = useAuth();
    const router = useRouter();

    if (authLoading) {
        return <DashboardSkeleton />;
    }

    if (!user) {
        return null;
    }

    // Role-based component switching
    switch (role) {
        case 'faculty':
            return <FacultyDashboard user={user} />;
        case 'admin':
        case 'super_admin':
            router.push(role === 'super_admin' ? '/super-admin' : '/admin');
            return null;
        case 'parent':
            router.push('/dashboard/parent');
            return null;
        default:
            return <StudentDashboard user={user} />;
    }
}

function StudentDashboard({ user }: { user: any }) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const supabase = getSupabaseBrowserClient();

                // Fetch profile and student profile
                const [{ data: profile }, { data: studentProfile }] = await Promise.all([
                    supabase.from('profiles').select('full_name, exam_target').eq('id', user.id).maybeSingle(),
                    supabase.from('student_profiles').select('*').eq('id', user.id).maybeSingle()
                ]);

                // Fetch recent lectures with progress
                const { data: recentLectures } = await supabase
                    .from('lecture_progress')
                    .select(`
                        progress_percent,
                        last_watched_at,
                        lectures:lecture_id (
                            id,
                            title,
                            thumbnail_url,
                            subjects:topic_id (name),
                            faculties:faculty_id (name)
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('last_watched_at', { ascending: false })
                    .limit(2);

                // Fetch upcoming tests
                const { data: upcomingTests } = await supabase
                    .from('tests')
                    .select('id, title, scheduled_at, duration_minutes, question_count')
                    .gte('scheduled_at', new Date().toISOString())
                    .eq('is_published', true)
                    .order('scheduled_at', { ascending: true })
                    .limit(2);

                // Fetch today's DPP
                const today = new Date().toISOString().split('T')[0];
                const { data: todayDPP } = await supabase
                    .from('dpp_sets')
                    .select('id, title, subject_id, total_questions, time_limit_minutes, subjects:subject_id (name)')
                    .eq('scheduled_date', today)
                    .eq('is_published', true)
                    .maybeSingle();

                // Fetch today's daily challenge
                const { data: dailyChallenge } = await supabase
                    .from('daily_challenges')
                    .select('id, title, total_participants, closes_at')
                    .eq('challenge_date', today)
                    .maybeSingle();

                // Fetch student progress stats
                const { data: progressStats } = await supabase
                    .from('student_progress')
                    .select('accuracy_percent, tests_taken')
                    .eq('user_id', user.id);

                // Calculate aggregated stats
                const progressData = (progressStats || []) as { tests_taken: number; accuracy_percent: number }[];
                const totalTests = progressData.reduce((acc, curr) => acc + (curr.tests_taken || 0), 0);
                const avgAccuracy = progressData.length > 0
                    ? (progressData.reduce((acc, curr) => acc + (curr.accuracy_percent || 0), 0) / progressData.length).toFixed(1)
                    : '0';

                // Format study time
                const studentData = studentProfile as { total_study_minutes?: number; rank_prediction?: number | null } | null;
                const totalMinutes = studentData?.total_study_minutes || 0;
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                const studyTimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                // Format rank
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
                    achievements: [], // Will be populated from gamification system
                });
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError('Failed to load dashboard data. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
    }, [user.id]);

    if (loading) {
        return <DashboardSkeleton />;
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

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome back, {displayName}!</h1>
                    <p className="text-slate-500">Here's your learning progress today</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl">
                    <Flame className="w-5 h-5" />
                    <span className="font-semibold">{streakDays} Day Streak</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Target}
                    label="Predicted Rank"
                    value={data?.stats.predictedRank || 'N/A'}
                    trend="Top 0.1%"
                    color="blue"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Accuracy"
                    value={data?.stats.accuracy || '0%'}
                    trend="+2.3%"
                    color="green"
                />
                <StatCard
                    icon={Clock}
                    label="Study Time"
                    value={data?.stats.studyTime || '0m'}
                    trend="Today"
                    color="purple"
                />
                <StatCard
                    icon={Trophy}
                    label="Tests Taken"
                    value={data?.stats.testsTaken.toString() || '0'}
                    trend="This month"
                    color="amber"
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Continue Learning */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Continue Learning</h2>
                            <Link href="/dashboard/lectures" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                                View All <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {data?.recentLectures && data.recentLectures.length > 0 ? (
                                data.recentLectures.map((lecture) => (
                                    <ContinueLearningCard
                                        key={lecture.id}
                                        title={lecture.title}
                                        subject={lecture.subject}
                                        faculty={lecture.faculty}
                                        progress={lecture.progress}
                                        thumbnail={lecture.thumbnail_url || ''}
                                        lastWatched={formatTimeAgo(lecture.last_watched_at)}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-500">
                                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                    <p>No lectures watched yet. Start learning today!</p>
                                    <Link
                                        href="/dashboard/lectures"
                                        className="inline-block mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                    >
                                        Browse Lectures
                                    </Link>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Today's DPP */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary-600" />
                                <h2 className="text-lg font-semibold text-slate-900">Today's DPP</h2>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                                Available Now
                            </span>
                        </div>

                        {data?.todayDPP ? (
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                <div>
                                    <h3 className="font-semibold text-slate-900">{data.todayDPP.title}</h3>
                                    <p className="text-sm text-slate-500">{data.todayDPP.total_questions} Questions • {data.todayDPP.time_limit_minutes} Minutes</p>
                                </div>
                                <Link
                                    href="/dashboard/dpp"
                                    className="px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
                                >
                                    Start Now
                                </Link>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-slate-500">
                                <p>No DPP available for today. Check back tomorrow!</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Daily Challenge */}
                    <section className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy className="w-5 h-5" />
                            <h2 className="text-lg font-semibold">Daily Challenge</h2>
                        </div>
                        <p className="text-white/90 mb-4">
                            Test your skills with today's question and compete with students nationwide!
                        </p>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-white/80">
                                {data?.dailyChallenge?.total_participants.toLocaleString() || '0'} students attempted
                            </span>
                        </div>
                        <Link
                            href="/dashboard/challenge"
                            className="block w-full py-3 bg-white text-orange-600 font-semibold rounded-xl text-center hover:bg-white/90 transition-colors"
                        >
                            Attempt Now
                        </Link>
                    </section>

                    {/* Upcoming Tests */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-primary-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Upcoming Tests</h2>
                        </div>

                        <div className="space-y-3">
                            {data?.upcomingTests && data.upcomingTests.length > 0 ? (
                                data.upcomingTests.map((test) => (
                                    <UpcomingTestCard
                                        key={test.id}
                                        title={test.title}
                                        date={formatUpcomingDate(test.scheduled_at)}
                                        duration={`${test.duration_minutes} Minutes`}
                                        questions={test.question_count.toString()}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-4 text-slate-500">
                                    <p className="text-sm">No upcoming tests scheduled</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Gamification Stats */}
                    {user && (
                        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-primary-600" />
                                    <h2 className="text-lg font-semibold text-slate-900">Your Progress</h2>
                                </div>
                                <Link
                                    href="/dashboard/analytics"
                                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    View All
                                </Link>
                            </div>

                            {/* Streak & Points Row */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Flame className="w-4 h-4 text-orange-600" />
                                        <span className="text-xs font-medium text-orange-700">Streak</span>
                                    </div>
                                    <StreakDisplay userId={user.id} variant="minimal" />
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Star className="w-4 h-4 text-purple-600" />
                                        <span className="text-xs font-medium text-purple-700">Points</span>
                                    </div>
                                    <UserPointsDisplay userId={user.id} />
                                </div>
                            </div>

                            {/* Achievements */}
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-slate-700 mb-2">Achievements</h3>
                                <AchievementBadge userId={user.id} variant="compact" />
                            </div>
                        </section>
                    )}

                    {/* Mini Leaderboard */}
                    {user && (
                        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-primary-600" />
                                    <h2 className="text-lg font-semibold text-slate-900">Leaderboard</h2>
                                </div>
                            </div>
                            <CompactLeaderboard userId={user.id} limit={5} />
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-48"></div>
                </div>
                <div className="h-10 bg-slate-200 rounded w-32"></div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                        <div className="w-10 h-10 bg-slate-200 rounded-xl mb-3"></div>
                        <div className="h-8 bg-slate-200 rounded w-24 mb-1"></div>
                        <div className="h-4 bg-slate-200 rounded w-20"></div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="h-6 bg-slate-200 rounded w-32 mb-4"></div>
                        <div className="space-y-4">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                                    <div className="w-24 h-16 bg-slate-200 rounded-lg"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-slate-200 rounded w-32"></div>
                                        <div className="h-3 bg-slate-200 rounded w-48"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-slate-200 rounded-2xl p-6 h-48"></div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="h-6 bg-slate-200 rounded w-32 mb-4"></div>
                        <div className="space-y-3">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="h-16 bg-slate-200 rounded-xl"></div>
                            ))}
                        </div>
                    </div>
                </div>
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
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-sm text-slate-500">{label}</div>
            <div className="text-xs text-green-600 font-medium mt-1">{trend}</div>
        </div>
    );
}

function ContinueLearningCard({
    title,
    subject,
    faculty,
    progress,
    thumbnail,
    lastWatched,
}: {
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
        <div className="flex gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
            <div className="w-24 h-16 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Play className="w-8 h-8 text-slate-400 group-hover:text-primary-600 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${subjectColors[subject] || 'bg-gray-100 text-gray-700'}`}>
                        {subject}
                    </span>
                    <span className="text-xs text-slate-500">{lastWatched}</span>
                </div>
                <h3 className="font-medium text-slate-900 truncate">{title}</h3>
                <p className="text-sm text-slate-500">{faculty}</p>
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary-600 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs text-slate-500">{progress}%</span>
                </div>
            </div>
        </div>
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
        <div className="p-3 border border-slate-100 rounded-xl hover:border-primary-200 transition-colors">
            <h3 className="font-medium text-slate-900 text-sm">{title}</h3>
            <p className="text-xs text-slate-500 mt-1">{date}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                <span>{duration}</span>
                <span>•</span>
                <span>{questions} Questions</span>
            </div>
        </div>
    );
}

function FacultyDashboard({ user }: { user: any }) {
    const displayName = user?.full_name?.split(' ')[0] || 'Faculty';
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome back, {displayName}!</h1>
                    <p className="text-slate-500">Here's an overview of your teaching sessions</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl shadow-sm">
                    <Users className="w-5 h-5" />
                    <span className="font-semibold">Professional Faculty</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={PlayCircle}
                    label="My Lectures"
                    value="12"
                    trend="+2 this week"
                    color="blue"
                />
                <StatCard
                    icon={HelpCircle}
                    label="Student Doubts"
                    value="8"
                    trend="Requires attention"
                    color="amber"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Student Mastery"
                    value="72%"
                    trend="+4.2%"
                    color="green"
                />
                <StatCard
                    icon={Clock}
                    label="Class Hours"
                    value="124h"
                    trend="This year"
                    color="purple"
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Schedule */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-slate-900">Teaching Schedule</h2>
                        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                            Manage Calendar
                        </button>
                    </div>

                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <h3 className="text-slate-900 font-medium">No classes today</h3>
                        <p className="text-slate-500 text-sm mt-1">Enjoy your free time or prepare for upcoming sessions!</p>
                        <button className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                            Schedule Session
                        </button>
                    </div>
                </div>

                {/* Right sidebar for faculty */}
                <div className="space-y-6">
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
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
                    </section>
                </div>
            </div>
        </div>
    );
}

