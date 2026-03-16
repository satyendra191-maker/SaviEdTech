'use client';

import Link from 'next/link';
import { 
    BookOpen, 
    Users, 
    Video, 
    TrendingUp, 
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    Play,
    Brain,
    FlaskConical,
    GraduationCap,
    Calendar,
    BarChart3,
    Award,
    Target,
    Lightbulb,
    FileText,
    MessageSquare,
    ChevronRight
} from 'lucide-react';

interface FacultyCourse {
    id: string;
    title: string;
    description: string;
    class_level: string;
    lessons?: { count: number }[];
    enrollments?: { count: number }[];
}

interface FacultyAssignment {
    id: string;
    title: string;
    description: string;
    due_date: string;
    submissions?: { count: number }[];
}

interface FacultyLiveClass {
    id: string;
    title: string;
    start_time: string;
    course_id: string;
    status: string;
}

interface FacultyStudent {
    id: string;
    full_name: string;
    email: string;
    class_level: string;
}

interface FacultyProfile {
    role?: string;
    full_name?: string;
    email?: string;
}

interface FacultyData {
    id: string;
    user_id: string;
    subject: string;
    qualification: string;
    experience_years: number;
}

interface FacultyDashboardProps {
    faculty: FacultyData | null;
    courses: FacultyCourse[];
    assignments: FacultyAssignment[];
    liveClasses: FacultyLiveClass[];
    students: FacultyStudent[];
    profile: FacultyProfile | null;
}

const SUBJECT_CONFIG: Record<string, { gradient: string; color: string; icon: string }> = {
    physics: { gradient: 'from-blue-500 to-cyan-400', color: 'text-blue-600', icon: '⚛️' },
    chemistry: { gradient: 'from-green-500 to-emerald-400', color: 'text-green-600', icon: '🧪' },
    mathematics: { gradient: 'from-purple-500 to-pink-400', color: 'text-purple-600', icon: '📐' },
    biology: { gradient: 'from-amber-500 to-orange-400', color: 'text-amber-600', icon: '🧬' }
};

export function FacultyDashboard({ faculty, courses, assignments, liveClasses, students, profile }: FacultyDashboardProps) {
    const subject = faculty?.subject?.toLowerCase() || '';
    const config = SUBJECT_CONFIG[subject] || SUBJECT_CONFIG.physics;
    const totalStudents = courses.reduce((acc, c) => acc + (c.enrollments?.[0]?.count || 0), 0);
    const pendingAssignments = assignments.filter(a => new Date(a.due_date) > new Date()).length;
    const completedSubmissions = assignments.reduce((acc, a) => acc + (a.submissions?.[0]?.count || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">
                        Welcome back, {profile?.full_name?.split(' ')[0] || 'Faculty'}! 👋
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Here's what's happening in your {faculty?.subject || 'courses'} today
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link 
                        href="/faculty/ai-tutor"
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
                    >
                        <Brain className="w-4 h-4" />
                        AI Assistant
                    </Link>
                    <Link 
                        href="/faculty/courses/new"
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 rounded-xl font-medium border border-slate-200 hover:bg-slate-50 transition-all"
                    >
                        <BookOpen className="w-4 h-4" />
                        New Course
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    icon={GraduationCap}
                    label="Total Students"
                    value={totalStudents.toString()}
                    color="blue"
                    trend="+12%"
                />
                <StatCard 
                    icon={BookOpen}
                    label="Active Courses"
                    value={courses.length.toString()}
                    color="purple"
                />
                <StatCard 
                    icon={FileText}
                    label="Pending Assignments"
                    value={pendingAssignments.toString()}
                    color="amber"
                />
                <StatCard 
                    icon={CheckCircle}
                    label="Submissions"
                    value={completedSubmissions.toString()}
                    color="green"
                />
            </div>

            {liveClasses.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Video className="w-5 h-5" />
                                Upcoming Live Class
                            </h2>
                            <p className="text-indigo-100 mt-1">{liveClasses[0]?.title}</p>
                            <p className="text-indigo-200 text-sm mt-2">
                                {new Date(liveClasses[0]?.start_time || '').toLocaleDateString('en-IN', {
                                    weekday: 'long',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                        <Link 
                            href={`/faculty/live-class/${liveClasses[0]?.id}`}
                            className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:shadow-xl transition-all"
                        >
                            <Play className="w-4 h-4" />
                            Start Class
                        </Link>
                    </div>
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">Your Courses</h2>
                            <Link href="/faculty/courses" className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                                View All <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {courses.length > 0 ? courses.map((course) => (
                                <Link 
                                    key={course.id}
                                    href={`/faculty/courses/${course.id}`}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                                >
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
                            )) : (
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

                    <div className="bg-white rounded-2xl p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">Recent Assignments</h2>
                            <Link href="/faculty/assignments" className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                                View All <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {assignments.length > 0 ? assignments.slice(0, 5).map((assignment) => {
                                const isDue = new Date(assignment.due_date) < new Date();
                                return (
                                    <div key={assignment.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDue ? 'bg-red-100' : 'bg-amber-100'}`}>
                                            {isDue ? (
                                                <AlertCircle className="w-5 h-5 text-red-500" />
                                            ) : (
                                                <Clock className="w-5 h-5 text-amber-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-slate-800 truncate">{assignment.title}</h3>
                                            <p className="text-sm text-slate-500">
                                                Due: {new Date(assignment.due_date).toLocaleDateString('en-IN')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-slate-800">{assignment.submissions?.[0]?.count || 0}</p>
                                            <p className="text-xs text-slate-500">submitted</p>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-8">
                                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">No assignments</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
                        <div className="space-y-2">
                            <QuickAction icon={Video} label="Schedule Live Class" href="/faculty/live-class/new" color="indigo" />
                            <QuickAction icon={FileText} label="Create Assignment" href="/faculty/assignments/new" color="amber" />
                            <QuickAction icon={FlaskConical} label="Add Experiment" href="/faculty/experiments/new" color="green" />
                            <QuickAction icon={Brain} label="Generate Questions" href="/faculty/ai-questions" color="purple" />
                            <QuickAction icon={MessageSquare} label="Send Announcement" href="/faculty/announcements/new" color="blue" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">AI Tools</h2>
                        <div className="space-y-3">
                            <AIToolCard 
                                icon={Lightbulb}
                                title="Question Generator"
                                description="AI-powered question creation"
                            />
                            <AIToolCard 
                                icon={FileText}
                                title="Content Creator"
                                description="Generate lesson notes"
                            />
                            <AIToolCard 
                                icon={Brain}
                                title="Doubt Solver"
                                description="Solve student questions"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Top Students</h2>
                        <div className="space-y-3">
                            {students.slice(0, 5).map((student, index) => (
                                <div key={student.id} className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                        index === 0 ? 'bg-amber-100 text-amber-700' :
                                        index === 1 ? 'bg-slate-100 text-slate-700' :
                                        'bg-orange-100 text-orange-700'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 truncate">{student.full_name}</p>
                                        <p className="text-xs text-slate-500">{student.class_level}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Link href="/faculty/leaderboard" className="block text-center text-indigo-600 text-sm font-medium mt-4 pt-4 border-t border-slate-100">
                            View Leaderboard →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, trend }: { 
    icon: any; 
    label: string; 
    value: string; 
    color: string;
    trend?: string;
}) {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
        green: 'bg-green-50 text-green-600'
    };

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
                <Icon className="w-6 h-6" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-sm text-slate-500 flex items-center gap-1">
                {label}
                {trend && <span className="text-green-500 text-xs font-medium">{trend}</span>}
            </p>
        </div>
    );
}

function QuickAction({ icon: Icon, label, href, color }: { 
    icon: any; 
    label: string; 
    href: string;
    color: string;
}) {
    const colorClasses: Record<string, string> = {
        indigo: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
        amber: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
        green: 'bg-green-50 text-green-600 hover:bg-green-100',
        purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
        blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
    };

    return (
        <Link href={href} className={`flex items-center gap-3 p-3 rounded-xl ${colorClasses[color]} transition-colors`}>
            <Icon className="w-5 h-5" />
            <span className="font-medium text-slate-700">{label}</span>
            <ArrowRight className="w-4 h-4 ml-auto text-slate-400" />
        </Link>
    );
}

function AIToolCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
    return (
        <div className="p-3 rounded-xl bg-white border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="font-medium text-slate-800 text-sm">{title}</p>
                    <p className="text-xs text-slate-500">{description}</p>
                </div>
            </div>
        </div>
    );
}
