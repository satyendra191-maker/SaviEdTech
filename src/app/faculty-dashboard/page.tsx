'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    PlayCircle,
    BookOpen,
    HelpCircle,
    GraduationCap,
    Users,
    Video,
    FileText,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface FacultyStats {
    totalLectures: number;
    totalQuestions: number;
    totalTests: number;
    totalStudents: number;
}

interface RecentLecture {
    id: string;
    title: string;
    subject: string;
    subjects: { name: string } | null;
    views: number;
    completion_rate: number;
    created_at: string;
}

interface PendingTask {
    id: string;
    type: string;
    title: string;
    due_date: string;
}

export default function FacultyDashboardPage() {
    const { user, isLoading: authLoading } = useAuth();
    const supabase = useMemo(() => getSupabaseBrowserClient(), []);
    const [stats, setStats] = useState<FacultyStats>({
        totalLectures: 0,
        totalQuestions: 0,
        totalTests: 0,
        totalStudents: 0,
    });
    const [recentLectures, setRecentLectures] = useState<RecentLecture[]>([]);
    const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        if (!supabase || !user) return;

        try {
            // Fetch faculty stats
            const [
                lecturesResult,
                questionsResult,
                testsResult,
                studentsResult,
                recentLecturesResult,
                pendingTasksResult,
            ] = await Promise.all([
                supabase.from('lectures').select('id', { count: 'exact', head: true }).eq('faculty_id', user.id),
                supabase.from('questions').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
                supabase.from('tests').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
                supabase.from('lecture_progress').select('user_id', { count: 'exact', head: true }).eq('lectures.faculty_id', user.id),
                supabase
                    .from('lectures')
                    .select('id, title, subjects(name), views, completion_rate, created_at')
                    .eq('faculty_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5),
                supabase
                    .from('content_uploads')
                    .select('id, upload_type, title, due_date')
                    .eq('assigned_to', user.id)
                    .eq('status', 'pending')
                    .order('due_date', { ascending: true })
                    .limit(5),
            ]);

            setStats({
                totalLectures: lecturesResult.count || 0,
                totalQuestions: questionsResult.count || 0,
                totalTests: testsResult.count || 0,
                totalStudents: studentsResult.count || 0,
            });

            setRecentLectures((recentLecturesResult.data || []) as RecentLecture[]);
            setPendingTasks((pendingTasksResult.data || []) as PendingTask[]);
        } catch (error) {
            console.error('Error fetching faculty dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase, user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchDashboardData();
        }
    }, [authLoading, user, fetchDashboardData]);

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600"></div>
                    <p className="font-medium text-slate-600">Loading faculty dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Quick Actions - Mobile Friendly */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link
                    href="/admin/lectures"
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl text-white shadow-lg hover:shadow-xl transition-all"
                >
                    <PlayCircle className="w-8 h-8 mb-2" />
                    <span className="font-semibold">Add Lecture</span>
                </Link>
                <Link
                    href="/admin/questions"
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg hover:shadow-xl transition-all"
                >
                    <HelpCircle className="w-8 h-8 mb-2" />
                    <span className="font-semibold">Add Questions</span>
                </Link>
                <Link
                    href="/admin/tests"
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-lg hover:shadow-xl transition-all"
                >
                    <GraduationCap className="w-8 h-8 mb-2" />
                    <span className="font-semibold">Create Test</span>
                </Link>
                <Link
                    href="/admin/ai-content"
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white shadow-lg hover:shadow-xl transition-all"
                >
                    <FileText className="w-8 h-8 mb-2" />
                    <span className="font-semibold">AI Content</span>
                </Link>
            </div>

            {/* Stats Cards - Mobile Responsive */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl">
                            <PlayCircle className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.totalLectures}</p>
                            <p className="text-sm text-slate-500">Total Lectures</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl">
                            <HelpCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.totalQuestions}</p>
                            <p className="text-sm text-slate-500">Questions</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl">
                            <GraduationCap className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.totalTests}</p>
                            <p className="text-sm text-slate-500">Tests Created</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-xl">
                            <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.totalStudents}</p>
                            <p className="text-sm text-slate-500">Students</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Lectures */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">Recent Lectures</h2>
                        <Link href="/admin/lectures" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                            View All
                        </Link>
                    </div>
                    {recentLectures.length > 0 ? (
                        <div className="space-y-3">
                            {recentLectures.map((lecture) => (
                                <Link
                                    key={lecture.id}
                                    href={`/admin/lectures/${lecture.id}`}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 truncate">{lecture.title}</p>
                                        <p className="text-sm text-slate-500">{lecture.subjects?.name || 'General'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <TrendingUp className="w-4 h-4" />
                                        <span>{lecture.completion_rate || 0}%</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <PlayCircle className="w-12 h-12 mx-auto mb-2" />
                            <p>No lectures yet</p>
                        </div>
                    )}
                </div>

                {/* Pending Tasks */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">Pending Tasks</h2>
                        <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full">
                            {pendingTasks.length} pending
                        </span>
                    </div>
                    {pendingTasks.length > 0 ? (
                        <div className="space-y-3">
                            {pendingTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 text-amber-500" />
                                        <div>
                                            <p className="font-medium text-slate-900">{task.title}</p>
                                            <p className="text-sm text-slate-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                            <p>All tasks completed!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
