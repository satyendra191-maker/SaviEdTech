'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { 
    BookOpen, Users, Video, TrendingUp, Clock, CheckCircle, AlertCircle,
    ArrowRight, Play, Brain, FlaskConical, GraduationCap, Calendar,
    BarChart3, Award, Target, Lightbulb, FileText, MessageSquare,
    ChevronRight, Atom, Calculator, Microscope, FlaskConical as ChemistryIcon,
    Menu, X, Bell, Search, Home, Settings, LogOut, Flame, Beaker, Plus
} from 'lucide-react';

const SUBJECT_CONFIG: Record<string, { icon: any; color: string; gradient: string; name: string }> = {
    physics: { icon: Atom, color: 'text-blue-600', gradient: 'from-blue-500 to-cyan-400', name: 'Physics' },
    chemistry: { icon: ChemistryIcon, color: 'text-green-600', gradient: 'from-green-500 to-emerald-400', name: 'Chemistry' },
    mathematics: { icon: Calculator, color: 'text-purple-600', gradient: 'from-purple-500 to-pink-400', name: 'Mathematics' },
    biology: { icon: Microscope, color: 'text-amber-600', gradient: 'from-amber-500 to-orange-400', name: 'Biology' }
};

const SUBJECTS = [
    { id: 'physics', name: 'Physics', icon: '⚛️', gradient: 'from-blue-600 to-cyan-500' },
    { id: 'chemistry', name: 'Chemistry', icon: '🧪', gradient: 'from-green-500 to-emerald-400' },
    { id: 'mathematics', name: 'Mathematics', icon: '📐', gradient: 'from-purple-500 to-pink-400' },
    { id: 'biology', name: 'Biology', icon: '🧬', gradient: 'from-amber-500 to-orange-400' }
];

export default function FacultyDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [liveClasses, setLiveClasses] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const supabase = getSupabaseBrowserClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setLoading(false); return; }

            const [profileRes, coursesRes, assignmentsRes, liveClassesRes, studentsRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('courses').select('*, lessons(count), enrollments(count)').order('created_at', { ascending: false }).limit(10),
                supabase.from('assignments').select('*, submissions(count)').order('due_date', { ascending: true }).limit(10),
                supabase.from('live_classes').select('*').gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(5),
                supabase.from('profiles').select('id, full_name, email, class_level').eq('role', 'student').order('created_at', { ascending: false }).limit(20)
            ]);

            setProfile(profileRes.data);
            setCourses(coursesRes.data || []);
            setAssignments(assignmentsRes.data || []);
            setLiveClasses(liveClassesRes.data || []);
            setStudents(studentsRes.data || []);
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Loading faculty dashboard...</p>
                </div>
            </div>
        );
    }

    const totalStudents = courses.reduce((acc, c) => acc + (c.enrollments?.[0]?.count || 0), 0);
    const totalLessons = courses.reduce((acc, c) => acc + (c.lessons?.[0]?.count || 0), 0);
    const pendingAssignments = assignments.filter(a => new Date(a.due_date) > new Date()).length;

    return (
        <div className="space-y-4 lg:space-y-6 pb-20 lg:pb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 lg:p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl lg:text-3xl">
                            🎓
                        </div>
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold">Faculty Dashboard</h1>
                            <p className="text-indigo-100 text-sm">Welcome back, {profile?.full_name || 'Faculty'}!</p>
                        </div>
                    </div>
                    <button className="p-2 lg:hidden rounded-lg bg-white/20">
                        <Bell className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                    <MiniStat label="Students" value={totalStudents} />
                    <MiniStat label="Courses" value={courses.length} />
                    <MiniStat label="Lessons" value={totalLessons} />
                    <MiniStat label="Pending" value={pendingAssignments} />
                </div>
            </div>

            {/* Subject Cards */}
            <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-3 px-1">Select Subject</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {SUBJECTS.map((subject) => (
                        <Link key={subject.id} href={`/faculty/${subject.id}`}
                            className="p-4 lg:p-6 rounded-2xl bg-white border border-slate-200 hover:shadow-lg hover:border-indigo-200 transition-all group">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${subject.gradient} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
                                {subject.icon}
                            </div>
                            <h3 className="font-semibold text-slate-800">{subject.name}</h3>
                            <p className="text-sm text-slate-500 mt-1">View dashboard →</p>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 overflow-x-auto pb-2">
                <QuickAction icon={Plus} label="New Course" href="/faculty/courses/new" />
                <QuickAction icon={FileText} label="Assignment" href="/faculty/assignments/new" />
                <QuickAction icon={FlaskConical} label="Experiment" href="/faculty/experiments/new" />
                <QuickAction icon={Brain} label="AI Tools" href="/faculty/ai-tools" />
                <QuickAction icon={Video} label="Live Class" href="/faculty/live-class/new" />
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
                <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                    {/* Courses */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">All Courses</h2>
                            <Link href="/faculty/courses" className="text-indigo-600 text-sm font-medium">View All →</Link>
                        </div>
                        <div className="space-y-3">
                            {courses.length > 0 ? courses.slice(0, 5).map((course) => {
                                const subjectKey = course.subject?.toLowerCase() || 'physics';
                                const config = SUBJECT_CONFIG[subjectKey] || SUBJECT_CONFIG.physics;
                                return (
                                    <Link key={course.id} href={`/faculty/courses/${course.id}`}
                                        className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white text-xl`}>
                                            {config.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-slate-800 truncate">{course.title}</h3>
                                            <p className="text-sm text-slate-500">{course.class_level} • {course.lessons?.[0]?.count || 0} lessons</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-slate-800">{course.enrollments?.[0]?.count || 0}</p>
                                            <p className="text-xs text-slate-500">students</p>
                                        </div>
                                    </Link>
                                );
                            }) : (
                                <div className="text-center py-8">
                                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">No courses yet</p>
                                    <Link href="/faculty/courses/new" className="text-indigo-600 text-sm font-medium mt-2 inline-block">
                                        Create your first course
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assignments */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">Recent Assignments</h2>
                            <Link href="/faculty/assignments" className="text-indigo-600 text-sm font-medium">View All →</Link>
                        </div>
                        <div className="space-y-3">
                            {assignments.slice(0, 5).map((assign) => {
                                const isDue = new Date(assign.due_date) < new Date();
                                return (
                                    <div key={assign.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                                        <div className={`w-10 h-10 rounded-lg ${isDue ? 'bg-red-100' : 'bg-amber-100'} flex items-center justify-center`}>
                                            {isDue ? <AlertCircle className="w-5 h-5 text-red-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-800 truncate">{assign.title}</p>
                                            <p className="text-sm text-slate-500">Due: {new Date(assign.due_date).toLocaleDateString('en-IN')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-slate-800">{assign.submissions?.[0]?.count || 0}</p>
                                            <p className="text-xs text-slate-500">submitted</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4 lg:space-y-6">
                    {/* Live Classes */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">Upcoming Live</h2>
                        </div>
                        <div className="space-y-3">
                            {liveClasses.length > 0 ? liveClasses.map((lc) => (
                                <div key={lc.id} className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                                    <p className="font-medium text-slate-800 text-sm">{lc.title}</p>
                                    <p className="text-xs text-indigo-600 mt-1">
                                        {new Date(lc.start_time).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            )) : (
                                <p className="text-slate-500 text-sm text-center py-4">No upcoming live classes</p>
                            )}
                        </div>
                    </div>

                    {/* Top Students */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Top Students</h2>
                        <div className="space-y-2">
                            {students.slice(0, 5).map((student, idx) => (
                                <div key={student.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                        idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-100 text-slate-700' : 'bg-orange-100 text-orange-700'
                                    }`}>{idx + 1}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 text-sm truncate">{student.full_name}</p>
                                        <p className="text-xs text-slate-500">{student.class_level}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex-shrink-0 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-indigo-100 text-xs">{label}</p>
        </div>
    );
}

function QuickAction({ icon: Icon, label, href }: { icon: any; label: string; href: string }) {
    return (
        <Link href={href} className="flex-shrink-0 flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all min-w-[100px]">
            <Icon className="w-6 h-6 text-indigo-600" />
            <span className="text-xs font-medium text-center">{label}</span>
        </Link>
    );
}
