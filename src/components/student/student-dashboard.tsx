'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { 
    BookOpen, Video, GraduationCap, Award, Clock, CheckCircle, 
    AlertCircle, Play, Brain, FlaskConical, BarChart3, Target,
    Flame, Trophy, Zap, Bell, Search, Home, Settings, LogOut,
    Calendar, MessageSquare, FileText, Download, Upload, ChevronRight,
    PenTool, Box, Mic, Headphones, Sparkles, Users, Wallet, CreditCard,
    TrendingUp, TrendingDown, Bookmark, Star, Clock3, Lightbulb
} from 'lucide-react';

interface StudentData {
    profile: any;
    courses: any[];
    progress: any[];
    assignments: any[];
    liveClasses: any[];
    experiments: any[];
    journals: any[];
    dpp: any[];
    notes: any[];
    quizzes: any[];
    achievements: any[];
}

export default function StudentDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<StudentData | null>(null);
    const [showAI, setShowAI] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            setLoading(false);
            return;
        }

        const [profileRes, coursesRes, progressRes, assignmentsRes, liveClassesRes, 
                experimentsRes, journalsRes, dppRes, notesRes, quizzesRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('enrollments').select('*, course:courses(*)').eq('user_id', user.id).limit(5),
            supabase.from('student_progress').select('*').eq('student_id', user.id).limit(10),
            supabase.from('assignments').select('*').order('due_date', { ascending: true }).limit(5),
            supabase.from('live_classes').select('*').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(3),
            supabase.from('experiments').select('*').eq('is_active', true).limit(6),
            supabase.from('journals').select('*, experiment:experiments(title)').eq('student_id', user.id).order('created_at', { ascending: false }).limit(5),
            supabase.from('dpp').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
            supabase.from('generated_notes').select('*').order('created_at', { ascending: false }).limit(5),
            supabase.from('quiz_submissions').select('*, quiz:quizzes(*)').eq('student_id', user.id).order('submitted_at', { ascending: false }).limit(5),
        ]);

        setData({
            profile: profileRes.data,
            courses: coursesRes.data || [],
            progress: progressRes.data || [],
            assignments: assignmentsRes.data || [],
            liveClasses: liveClassesRes.data || [],
            experiments: experimentsRes.data || [],
            journals: journalsRes.data || [],
            dpp: dppRes.data || [],
            notes: notesRes.data || [],
            quizzes: quizzesRes.data || [],
            achievements: []
        });
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (!data?.profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">Please login to access your dashboard</p>
                    <Link href="/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Login</Link>
                </div>
            </div>
        );
    }

    const enrolledCourses = data.courses.length;
    const completedLessons = data.progress.filter(p => p.progress_percent === 100).length;
    const pendingAssignments = data.assignments.filter(a => new Date(a.due_date) > new Date()).length;
    const upcomingLive = data.liveClasses.length;

    return (
        <div className="space-y-4 pb-24 lg:pb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 lg:p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">🎓</div>
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold">Welcome back, {data.profile?.full_name?.split(' ')[0] || 'Student'}!</h1>
                            <p className="text-indigo-100 text-sm">{data.profile?.class_level} • {data.profile?.exam_target}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg">
                            <Flame className="w-4 h-4" />
                            <span className="text-sm font-medium">🔥 15 Day Streak</span>
                        </div>
                    </div>
                </div>
                
                {/* Stats Row */}
                <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                    <MiniStat icon={BookOpen} value={enrolledCourses} label="Courses" />
                    <MiniStat icon={CheckCircle} value={completedLessons} label="Completed" />
                    <MiniStat icon={FileText} value={pendingAssignments} label="Pending" />
                    <MiniStat icon={Video} value={upcomingLive} label="Live Classes" />
                </div>
            </div>

            {/* AI Tutor Floating Button */}
            <button 
                onClick={() => setShowAI(!showAI)}
                className="fixed bottom-20 lg:bottom-6 right-4 z-50 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all animate-pulse"
            >
                <Brain className="w-6 h-6" />
            </button>

            {/* Quick Actions */}
            <div className="flex gap-2 overflow-x-auto pb-2 px-1">
                <QuickAction icon={BookOpen} label="My Courses" href="/courses" color="blue" />
                <QuickAction icon={Video} label="Live Classes" href="/dashboard/live-class" color="red" />
                <QuickAction icon={FlaskConical} label="Experiments" href="/experiments" color="green" />
                <QuickAction icon={Box} label="Simulations" href="/simulations" color="purple" />
                <QuickAction icon={PenTool} label="Journals" href="/journal" color="amber" />
                <QuickAction icon={Brain} label="AI Tutor" href="/ai-tutor" color="indigo" />
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-3 gap-4">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Continue Learning */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">Continue Learning</h2>
                            <Link href="/courses" className="text-indigo-600 text-sm font-medium">View All →</Link>
                        </div>
                        <div className="space-y-3">
                            {data.courses.slice(0, 3).map((enrollment: any) => (
                                <Link key={enrollment.id} href={`/courses/${enrollment.course?.id}`}
                                    className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl flex-shrink-0">
                                        📚
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-slate-800 truncate">{enrollment.course?.title || 'Course'}</h3>
                                        <p className="text-sm text-slate-500">{enrollment.course?.subject}</p>
                                        <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: '45%' }}></div>
                                        </div>
                                    </div>
                                    <Play className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                                </Link>
                            ))}
                            {data.courses.length === 0 && (
                                <div className="text-center py-8">
                                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">No courses enrolled</p>
                                    <Link href="/courses" className="text-indigo-600 text-sm font-medium mt-2 inline-block">
                                        Browse Courses
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Live Classes */}
                    {data.liveClasses.length > 0 && (
                        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 lg:p-6 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Video className="w-5 h-5" />
                                    Upcoming Live Classes
                                </h2>
                                <span className="px-2 py-1 bg-white/20 rounded-full text-xs">Live Now</span>
                            </div>
                            <div className="space-y-3">
                                {data.liveClasses.slice(0, 2).map((lc: any) => (
                                    <div key={lc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/20 backdrop-blur">
                                        <div>
                                            <p className="font-medium">{lc.title}</p>
                                            <p className="text-sm text-red-100">
                                                {new Date(lc.start_time).toLocaleDateString('en-IN', { 
                                                    weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                                })}
                                            </p>
                                        </div>
                                        <Link href={`/dashboard/live-class/${lc.id}`} 
                                            className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-50">
                                            <Play className="w-5 h-5" />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Assignments */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">Pending Assignments</h2>
                            <Link href="/dashboard/assignments" className="text-indigo-600 text-sm font-medium">View All →</Link>
                        </div>
                        <div className="space-y-3">
                            {data.assignments.slice(0, 4).map((assign: any) => {
                                const isDue = new Date(assign.due_date) < new Date();
                                return (
                                    <div key={assign.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDue ? 'bg-red-100' : 'bg-amber-100'}`}>
                                            {isDue ? <AlertCircle className="w-5 h-5 text-red-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-800 truncate">{assign.title}</p>
                                            <p className="text-sm text-slate-500">Due: {new Date(assign.due_date).toLocaleDateString('en-IN')}</p>
                                        </div>
                                        <Link href={`/dashboard/assignments/${assign.id}`} className="text-indigo-600 text-sm font-medium">
                                            Submit →
                                        </Link>
                                    </div>
                                );
                            })}
                            {data.assignments.length === 0 && (
                                <p className="text-center text-slate-500 py-4">No pending assignments</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    {/* DPP & Quizzes */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Daily Practice</h2>
                        <div className="space-y-3">
                            <Link href="/dashboard/dpp" className="flex items-center gap-3 p-3 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-800">DPP - Daily Practice</p>
                                    <p className="text-xs text-red-600">{data.dpp.length} available</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-red-400" />
                            </Link>
                            <Link href="/dashboard/tests" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Brain className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-800">Mock Tests</p>
                                    <p className="text-xs text-blue-600">{data.quizzes.length} attempts</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-blue-400" />
                            </Link>
                        </div>
                    </div>

                    {/* Experiments & Simulations */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Lab & Simulations</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/experiments" className="p-4 rounded-xl bg-green-50 text-center hover:bg-green-100 transition-colors">
                                <FlaskConical className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                <p className="font-medium text-slate-800 text-sm">Experiments</p>
                            </Link>
                            <Link href="/simulations" className="p-4 rounded-xl bg-purple-50 text-center hover:bg-purple-100 transition-colors">
                                <Box className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                                <p className="font-medium text-slate-800 text-sm">3D Simulations</p>
                            </Link>
                        </div>
                    </div>

                    {/* Journal */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">My Journal</h2>
                            <span className="text-sm text-green-600">{data.journals.filter((j: any) => j.status === 'approved').length} approved</span>
                        </div>
                        <Link href="/journal" className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors">
                            <PenTool className="w-8 h-8 text-amber-600" />
                            <div className="flex-1">
                                <p className="font-medium text-slate-800">Experiment Journal</p>
                                <p className="text-xs text-amber-600">{data.journals.length} entries</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-amber-400" />
                        </Link>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">My Notes</h2>
                            <Link href="/notes" className="text-indigo-600 text-sm font-medium">View All →</Link>
                        </div>
                        <div className="space-y-2">
                            {data.notes.slice(0, 3).map((note: any) => (
                                <div key={note.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                                    <FileText className="w-5 h-5 text-slate-400" />
                                    <p className="text-sm text-slate-600 truncate flex-1">{note.topic_name || 'Note'}</p>
                                </div>
                            ))}
                            {data.notes.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-2">No notes yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Tutor Panel */}
            {showAI && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAI(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Brain className="w-6 h-6 text-purple-600" />
                                SaviTech AI Tutor
                            </h2>
                            <button onClick={() => setShowAI(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="space-y-3">
                            <Link href="/ai-tutor" className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 hover:bg-purple-100">
                                <Brain className="w-8 h-8 text-purple-600" />
                                <div>
                                    <p className="font-medium text-slate-800">AI Tutor</p>
                                    <p className="text-sm text-slate-500">Get instant help</p>
                                </div>
                            </Link>
                            <Link href="/savitech-ai/chat" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100">
                                <MessageSquare className="w-8 h-8 text-blue-600" />
                                <div>
                                    <p className="font-medium text-slate-800">AI Chat</p>
                                    <p className="text-sm text-slate-500">Chat with AI</p>
                                </div>
                            </Link>
                            <Link href="/savitech-ai/ai-tools" className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100">
                                <Sparkles className="w-8 h-8 text-green-600" />
                                <div>
                                    <p className="font-medium text-slate-800">AI Tools</p>
                                    <p className="text-sm text-slate-500">Question generator, notes & more</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MiniStat({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
    return (
        <div className="flex-shrink-0 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-indigo-100 text-xs">{label}</p>
        </div>
    );
}

function QuickAction({ icon: Icon, label, href, color }: { icon: any; label: string; href: string; color: string }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
        red: 'bg-red-50 text-red-600 hover:bg-red-100',
        green: 'bg-green-50 text-green-600 hover:bg-green-100',
        purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
        amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
        indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
    };
    return (
        <Link href={href} className={`flex-shrink-0 flex flex-col items-center gap-1 p-3 rounded-xl ${colors[color]} min-w-[80px]`}>
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium text-center">{label}</span>
        </Link>
    );
}
