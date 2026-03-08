'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    User, BookOpen, ClipboardCheck, TrendingUp, AlertTriangle,
    Clock, Award, Target, ArrowRight, Loader2, Phone
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
        if (!authLoading && user) {
            fetchLinkedStudents();
        } else if (!authLoading && !user) {
            router.push('/login');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading]);

    const fetchLinkedStudents = async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('parent_links')
            .select('*')
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
            // Fetch student profile
            const { data: studentProfile } = await supabase
                .from('student_profiles')
                .select('*')
                .eq('id', studentId)
                .single() as { data: any };

            const profile = studentProfile as any;

            // Fetch lecture progress
            const { data: lectureProgress } = await supabase
                .from('lecture_progress')
                .select('*')
                .eq('user_id', studentId) as { data: any[] | null };

            const completedLectures = lectureProgress?.filter((l: any) => l.completed)?.length || 0;
            const totalLectures = lectureProgress?.length || 1;
            const lectureCompletion = Math.round((completedLectures / totalLectures) * 100);

            // Fetch DPP attempts
            const { data: dppAttempts } = await supabase
                .from('dpp_attempts')
                .select('*')
                .eq('user_id', studentId) as { data: any[] | null };

            const dppCount = dppAttempts?.length || 0;
            const dppCorrect = dppAttempts?.filter((d: any) => d.is_correct)?.length || 0;
            const dppAccuracy = dppCount > 0 ? Math.round((dppCorrect / dppCount) * 100) : 0;

            // Fetch test attempts
            const { data: testAttempts } = await supabase
                .from('test_attempts')
                .select('*')
                .eq('user_id', studentId) as { data: any[] | null };

            const testCount = testAttempts?.length || 0;
            const avgScore = testCount > 0 
                ? Math.round(testAttempts!.reduce((sum: number, t: any) => sum + (t.score || 0), 0) / testCount)
                : 0;

            // Fetch weak topics
            const { data: weakTopicsData } = await supabase
                .from('topic_mastery')
                .select(`
                    accuracy_percent,
                    topics:topic_id (name)
                `)
                .eq('user_id', studentId)
                .in('strength_status', ['weak', 'average'])
                .order('accuracy_percent', { ascending: true })
                .limit(5);

            const weakTopics = (weakTopicsData || []).map((item: any) => ({
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
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    if (linkedStudents.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="max-w-md mx-auto px-4 text-center">
                    <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <User className="w-10 h-10 text-primary-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-3">No Linked Students</h1>
                    <p className="text-slate-600 mb-6">
                        You haven't linked any students yet. Request a link to monitor your child's progress.
                    </p>
                    <Link
                        href="/parent/verify"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
                    >
                        Link a Student
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Parent Dashboard</h1>
                    <p className="text-slate-600">Monitor your child's learning progress</p>
                </div>

                {/* Student Selector */}
                {linkedStudents.length > 1 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Select Student
                        </label>
                        <select
                            value={selectedStudent?.id}
                            onChange={(e) => {
                                const student = linkedStudents.find(s => s.id === e.target.value);
                                if (student) handleStudentChange(student);
                            }}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                        >
                            {linkedStudents.map((student) => (
                                <option key={student.id} value={student.id}>
                                    {student.student_name || student.student_phone}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
                        {error}
                    </div>
                )}

                {progress && (
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Lecture Completion */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <BookOpen className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <span className="text-2xl font-bold text-slate-900">{progress.lectureCompletion}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div 
                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                        style={{ width: `${progress.lectureCompletion}%` }}
                                    />
                                </div>
                                <div className="mt-2 text-sm text-slate-600">Lecture Completion</div>
                            </div>

                            {/* DPP Progress */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                        <ClipboardCheck className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <span className="text-2xl font-bold text-slate-900">{progress.dppAttempts}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div 
                                        className="bg-emerald-500 h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min(progress.dppAccuracy, 100)}%` }}
                                    />
                                </div>
                                <div className="mt-2 text-sm text-slate-600">
                                    DPP Attempts ({progress.dppAccuracy}% accuracy)
                                </div>
                            </div>

                            {/* Test Performance */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <Target className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <span className="text-2xl font-bold text-slate-900">{progress.avgTestScore}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div 
                                        className="bg-purple-500 h-2 rounded-full transition-all"
                                        style={{ width: `${progress.avgTestScore}%` }}
                                    />
                                </div>
                                <div className="mt-2 text-sm text-slate-600">
                                    Avg Test Score ({progress.testCount} tests)
                                </div>
                            </div>

                            {/* Study Streak */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                        <Award className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <span className="text-2xl font-bold text-slate-900">{progress.streak}</span>
                                </div>
                                <div className="text-sm text-slate-600">Day Study Streak</div>
                                {progress.rank && (
                                    <div className="mt-2 text-sm font-medium text-primary-600">
                                        Predicted Rank: #{progress.rank}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Weak Topics */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-slate-900">Topics Needing Attention</h2>
                                    <p className="text-sm text-slate-500">Focus areas for improvement</p>
                                </div>
                            </div>
                            
                            {progress.weakTopics.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {progress.weakTopics.map((topic, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                                <span className="font-medium text-slate-900">{topic.topic}</span>
                                            </div>
                                            <span className="text-sm font-medium text-red-600">{topic.accuracy}%</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500">
                                    <TrendingUp className="w-12 h-12 mx-auto mb-3 text-green-500" />
                                    <p>Great progress! No weak topics identified.</p>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-4">
                            <Link
                                href="/parent/verify"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                Manage Linked Students
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
