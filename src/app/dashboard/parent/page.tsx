'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    User, BookOpen, ClipboardCheck, TrendingUp, AlertTriangle,
    Clock, Award, Target, ArrowRight, Loader2, Phone,
    ChevronDown, Calendar, Bell, BarChart3, Flame,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface LinkedStudent {
    id: string;
    student_id: string;
    student_name: string | null;
    student_phone: string;
    verification_status: string;
}

interface StudentProgress {
    lectureCompletion: number;
    dppAttempts: number;
    dppAccuracy: number;
    testCount: number;
    avgTestScore: number;
    rank: number | null;
    streak: number;
    weakTopics: { topic: string; accuracy: number }[];
}

export default function ParentDashboardPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const supabase = getSupabaseBrowserClient();

    const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null);
    const [progress, setProgress] = useState<StudentProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!supabase) {
            setError('Unable to connect to database. Please refresh the page.');
            setLoading(false);
            return;
        }

        if (process.env.NODE_ENV === 'development') {
            fetchLinkedStudents();
            return;
        }

        if (!authLoading && user) {
            fetchLinkedStudents();
        } else if (!authLoading && !user) {
            router.push('/login');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading, router, supabase]);

    const fetchLinkedStudents = async () => {
        if (!user || !supabase) return;

        setError(null);

        const { data, error } = await supabase
            .from('parent_links')
            .select('id, student_id, student_name, student_phone, verification_status')
            .eq('parent_id', user.id)
            .eq('verification_status', 'approved')
            .order('created_at', { ascending: false }) as { data: LinkedStudent[] | null; error: any };

        if (!error && data && data.length > 0) {
            setLinkedStudents(data);
            setSelectedStudent(data[0]);
            fetchStudentProgress(data[0].student_id);
        }
        setLoading(false);
    };

    const fetchStudentProgress = async (studentId: string) => {
        setLoading(true);
        setError(null);

        try {
            const [
                studentProfileRes,
                lectureProgressRes,
                dppAttemptsRes,
                testAttemptsRes,
                weakTopicsRes
            ] = await Promise.all([
                supabase.from('student_profiles').select('*').eq('id', studentId).maybeSingle(),
                supabase.from('lecture_progress').select('*').eq('user_id', studentId),
                supabase.from('dpp_attempts').select('*').eq('user_id', studentId),
                supabase.from('test_attempts').select('*').eq('user_id', studentId),
                supabase
                    .from('topic_mastery')
                    .select('accuracy_percent, topics:topic_id (name)')
                    .eq('user_id', studentId)
                    .in('strength_status', ['weak', 'average'])
                    .order('accuracy_percent', { ascending: true })
                    .limit(5)
            ]);

            if (studentProfileRes.error) throw studentProfileRes.error;

            const profile = studentProfileRes.data;
            const lectureProgress = lectureProgressRes.data || [];
            const dppAttempts = dppAttemptsRes.data || [];
            const testAttempts = testAttemptsRes.data || [];
            const weakTopicsData = weakTopicsRes.data || [];

            const completedLectures = lectureProgress.filter((l: any) => l.is_completed).length;
            const totalLectures = lectureProgress.length || 1;
            const lectureCompletion = Math.round((completedLectures / totalLectures) * 100);

            const dppCount = dppAttempts.length;
            const dppCorrect = dppAttempts.filter((d: any) => d.is_correct).length;
            const dppAccuracy = dppCount > 0 ? Math.round((dppCorrect / dppCount) * 100) : 0;

            const testCount = testAttempts.length;
            const avgScore = testCount > 0
                ? Math.round(testAttempts.reduce((sum: number, t: any) => sum + (t.score || 0), 0) / testCount)
                : 0;

            const weakTopics = weakTopicsData.map((item: any) => ({
                topic: item.topics?.name || 'Unknown',
                accuracy: item.accuracy_percent || 0
            }));

            setProgress({
                lectureCompletion,
                dppAttempts: dppCount,
                dppAccuracy,
                testCount,
                avgTestScore: avgScore,
                rank: profile?.rank_prediction ?? null,
                streak: profile?.study_streak ?? 0,
                weakTopics
            });
        } catch (err) {
            console.error('Error fetching progress:', err);
            setError('Failed to load student progress');
        } finally {
            setLoading(false);
        }
    };

    const handleStudentChange = (student: LinkedStudent) => {
        setSelectedStudent(student);
        fetchStudentProgress(student.student_id);
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    if (linkedStudents.length === 0) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="max-w-sm mx-auto text-center animate-card-slide-up">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <User className="w-9 h-9 text-primary-600" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">No Linked Students</h1>
                    <p className="text-slate-500 text-sm mb-6">
                        Link your child's account to monitor their learning progress and performance.
                    </p>
                    <Link
                        href="/parent/verify"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors text-sm"
                    >
                        Link a Student <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 max-w-4xl mx-auto">
            {/* ────── Student Header Card ────── */}
            <section className="animate-card-slide-up">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 p-5 sm:p-6 text-white shadow-lg">
                    <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/5 rounded-full blur-2xl" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold">
                                        {selectedStudent?.student_name || 'Student'}
                                    </h1>
                                    <p className="text-white/60 text-xs mt-0.5">
                                        {progress?.rank ? `Predicted Rank: #${progress.rank}` : 'Parent Dashboard'}
                                    </p>
                                </div>
                            </div>
                            {progress && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-xl">
                                    <Flame className="w-4 h-4 text-amber-300" />
                                    <span className="font-bold text-sm">{progress.streak}</span>
                                    <span className="text-white/60 text-[10px]">days</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ────── Student Selector ────── */}
            {linkedStudents.length > 1 && (
                <section className="animate-card-slide-up stagger-1">
                    <div className="glass-card rounded-2xl p-4 shadow-sm">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Select Student
                        </label>
                        <div className="relative">
                            <select
                                value={selectedStudent?.id}
                                onChange={(e) => {
                                    const student = linkedStudents.find(s => s.id === e.target.value);
                                    if (student) handleStudentChange(student);
                                }}
                                className="w-full appearance-none px-4 py-2.5 pr-10 border border-slate-200 rounded-xl bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all"
                            >
                                {linkedStudents.map((student) => (
                                    <option key={student.id} value={student.id}>
                                        {student.student_name || student.student_phone}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </section>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                    {error}
                </div>
            )}

            {progress && (
                <>
                    {/* ────── Performance Metric Cards ────── */}
                    <section className="animate-card-slide-up stagger-1">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <PerformanceCard
                                icon={BookOpen}
                                label="Lectures"
                                value={`${progress.lectureCompletion}%`}
                                progress={progress.lectureCompletion}
                                gradient="from-blue-500 to-cyan-500"
                                iconBg="bg-blue-100"
                                iconColor="text-blue-600"
                            />
                            <PerformanceCard
                                icon={ClipboardCheck}
                                label="DPP Accuracy"
                                value={`${progress.dppAccuracy}%`}
                                progress={progress.dppAccuracy}
                                gradient="from-emerald-500 to-teal-500"
                                iconBg="bg-emerald-100"
                                iconColor="text-emerald-600"
                                subtitle={`${progress.dppAttempts} attempts`}
                            />
                            <PerformanceCard
                                icon={Target}
                                label="Test Score"
                                value={`${progress.avgTestScore}%`}
                                progress={progress.avgTestScore}
                                gradient="from-violet-500 to-purple-500"
                                iconBg="bg-violet-100"
                                iconColor="text-violet-600"
                                subtitle={`${progress.testCount} tests`}
                            />
                            <PerformanceCard
                                icon={Award}
                                label="Streak"
                                value={`${progress.streak}`}
                                gradient="from-amber-500 to-orange-500"
                                iconBg="bg-amber-100"
                                iconColor="text-amber-600"
                                subtitle={progress.rank ? `Rank #${progress.rank}` : 'Keep going!'}
                            />
                        </div>
                    </section>

                    {/* ────── Alerts Section ────── */}
                    <section className="animate-card-slide-up stagger-2">
                        <div className="glass-card rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                    <Bell className="w-4 h-4 text-amber-600" />
                                </div>
                                <h2 className="text-sm font-semibold text-slate-900">Alerts & Insights</h2>
                            </div>

                            <div className="space-y-2">
                                {progress.lectureCompletion < 50 && (
                                    <AlertItem
                                        type="warning"
                                        message={`Lecture completion is at ${progress.lectureCompletion}%. Encourage more video lessons.`}
                                    />
                                )}
                                {progress.dppAccuracy < 60 && progress.dppAttempts > 0 && (
                                    <AlertItem
                                        type="warning"
                                        message={`DPP accuracy is ${progress.dppAccuracy}%. More practice needed.`}
                                    />
                                )}
                                {progress.avgTestScore < 50 && progress.testCount > 0 && (
                                    <AlertItem
                                        type="error"
                                        message={`Average test score is ${progress.avgTestScore}%. Focus on weak topics.`}
                                    />
                                )}
                                {progress.streak === 0 && (
                                    <AlertItem
                                        type="info"
                                        message="Study streak is at 0. Encourage daily practice to build consistency."
                                    />
                                )}
                                {progress.lectureCompletion >= 50 && progress.dppAccuracy >= 60 && progress.streak > 0 && (
                                    <AlertItem
                                        type="success"
                                        message="Good progress! Keep up the momentum."
                                    />
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ────── Weak Topics ────── */}
                    <section className="animate-card-slide-up stagger-3">
                        <div className="glass-card rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-900">Topics Needing Attention</h2>
                                    <p className="text-[11px] text-slate-400">Focus areas for improvement</p>
                                </div>
                            </div>

                            {progress.weakTopics.length > 0 ? (
                                <div className="space-y-3">
                                    {progress.weakTopics.map((topic, index) => (
                                        <div key={index}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-slate-700">{topic.topic}</span>
                                                <span className={`text-xs font-bold ${topic.accuracy < 40 ? 'text-red-600' : topic.accuracy < 60 ? 'text-amber-600' : 'text-emerald-600'}`}>{topic.accuracy}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${topic.accuracy < 40 ? 'bg-gradient-to-r from-red-500 to-red-400' : topic.accuracy < 60 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
                                                    style={{ width: `${topic.accuracy}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-500">
                                    <TrendingUp className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                                    <p className="text-xs">Great progress! No weak topics identified.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ────── Quick Actions ────── */}
                    <section className="animate-card-slide-up stagger-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                href="/parent/verify"
                                className="glass-card rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-200 transition-colors">
                                    <Phone className="w-5 h-5 text-primary-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-900">Manage Links</p>
                                    <p className="text-[10px] text-slate-400">Add or remove students</p>
                                </div>
                            </Link>
                            <Link
                                href="/dashboard/analytics"
                                className="glass-card rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 transition-colors">
                                    <BarChart3 className="w-5 h-5 text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-900">Full Analytics</p>
                                    <p className="text-[10px] text-slate-400">Detailed progress reports</p>
                                </div>
                            </Link>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

/* ─── Sub-components ─── */
function PerformanceCard({
    icon: Icon,
    label,
    value,
    progress,
    gradient,
    iconBg,
    iconColor,
    subtitle,
}: {
    icon: typeof BookOpen;
    label: string;
    value: string;
    progress?: number;
    gradient: string;
    iconBg: string;
    iconColor: string;
    subtitle?: string;
}) {
    return (
        <div className="glass-card rounded-2xl p-4 shadow-sm stat-card-hover">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span className="text-xl font-bold text-slate-900 animate-count-up">{value}</span>
            </div>
            {typeof progress === 'number' && (
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div
                        className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                </div>
            )}
            <p className="text-xs font-medium text-slate-600">{label}</p>
            {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
    );
}

function AlertItem({
    type,
    message,
}: {
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
}) {
    const styles = {
        success: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
        warning: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
        error: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', dot: 'bg-red-500' },
        info: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    };

    const s = styles[type];

    return (
        <div className={`flex items-start gap-2.5 p-3 rounded-xl ${s.bg} border ${s.border}`}>
            <div className={`w-2 h-2 ${s.dot} rounded-full mt-1 flex-shrink-0`} />
            <p className={`text-xs font-medium ${s.text}`}>{message}</p>
        </div>
    );
}
