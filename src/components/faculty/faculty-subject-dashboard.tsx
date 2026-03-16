'use client';

import Link from 'next/link';
import { 
    BookOpen, Users, Video, TrendingUp, Clock, CheckCircle, AlertCircle,
    ArrowRight, Play, Brain, FlaskConical, GraduationCap, Calendar,
    BarChart3, Award, Target, Lightbulb, FileText, MessageSquare,
    ChevronRight, Atom, Calculator, Microscope, FlaskConical as ChemistryIcon,
    Menu, X, Bell, Search, Home, Settings, LogOut, Flame, Beaker,
    Eye, PenTool, Box, ClipboardList, FileSignature, Presentation,
    Mic, Camera, Monitor, MessageCircle, UsersRound, CheckSquare,
    Square, FileAudio, FileVideo, Upload, Download, Edit3, Trash2,
    MoreVertical, Zap, Bookmark, Layers, LucideIcon
} from 'lucide-react';

type ModuleIcon = LucideIcon;

interface Course { id: string; title: string; description: string; class_level: string; lessons?: { count: number }[]; enrollments?: { count: number }[]; }
interface Experiment { id: string; title: string; subject: string; materials?: string; procedure?: string; class_level?: string; }
interface Simulation { id: string; title: string; subject: string; class_level?: string; simulation_url?: string; }
interface Journal { id: string; student_id: string; experiment_id: string; observations?: string; conclusion?: string; status?: string; submitted_at?: string; student?: { full_name?: string }; experiment?: { title?: string }; }
interface Assignment { id: string; title: string; description: string; due_date: string; submissions?: { count: number }[]; }
interface DPP { id: string; title: string; subject: string; class_level?: string; questions_count?: number; due_date?: string; status?: string; }
interface Note { id: string; title: string; subject: string; class_level?: string; topic?: string; created_at?: string; }
interface Module { id: string; title: string; subject: string; class_level?: string; lessons_count?: number; is_published?: boolean; }
interface LiveClass { id: string; title: string; start_time: string; course_id: string; status: string; duration?: number; meeting_url?: string; }
interface Attendance { id: string; live_class_id: string; student_id: string; status: 'present' | 'absent' | 'late'; marked_at?: string; student?: { full_name?: string }; }
interface LiveClassTool { id: string; name: string; type: 'whiteboard' | 'poll' | 'quiz' | 'chat' | 'screen' | 'document'; icon: string; }
interface Student { id: string; full_name: string; email: string; class_level: string; }
interface Profile { role?: string; full_name?: string; email?: string; }
interface FacultyData { id: string; user_id: string; subject: string; qualification: string; experience_years: number; }

interface Props {
    subject: string;
    subjectName: string;
    icon: string;
    gradient: string;
    faculty: FacultyData | null;
    courses: Course[];
    experiments: Experiment[];
    simulations?: Simulation[];
    journals?: Journal[];
    assignments: Assignment[];
    dpp?: DPP[];
    notes?: Note[];
    modules?: Module[];
    liveClasses: LiveClass[];
    attendance?: Attendance[];
    students: Student[];
    profile: Profile | null;
}

const SUBJECT_CONFIG: Record<string, { icon: any; color: string; bgGradient: string }> = {
    physics: { icon: Atom, color: 'text-blue-600', bgGradient: 'from-blue-500 to-cyan-400' },
    chemistry: { icon: ChemistryIcon, color: 'text-green-600', bgGradient: 'from-green-500 to-emerald-400' },
    mathematics: { icon: Calculator, color: 'text-purple-600', bgGradient: 'from-purple-500 to-pink-400' },
    biology: { icon: Microscope, color: 'text-amber-600', bgGradient: 'from-amber-500 to-orange-400' }
};

export function FacultySubjectDashboard({ subject, subjectName, icon, gradient, faculty, courses, experiments, simulations = [], journals = [], assignments, dpp = [], notes = [], modules = [], liveClasses, attendance = [], students, profile }: Props) {
    const config = SUBJECT_CONFIG[subject] || SUBJECT_CONFIG.physics;
    const IconComponent = config.icon;
    const totalStudents = courses.reduce((acc, c) => acc + (c.enrollments?.[0]?.count || 0), 0);
    const totalLessons = courses.reduce((acc, c) => acc + (c.lessons?.[0]?.count || 0), 0);
    const pendingAssignments = assignments.filter(a => new Date(a.due_date) > new Date()).length;
    const pendingJournals = journals.filter(j => j.status === 'submitted').length;
    const reviewedJournals = journals.filter(j => j.status === 'reviewed').length;
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;

    return (
        <div className="space-y-4 lg:space-y-6 pb-20 lg:pb-6">
            {/* Header - Mobile First */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-4 lg:p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl lg:text-3xl backdrop-blur-sm">
                            {icon}
                        </div>
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold">{subjectName} Faculty</h1>
                            <p className="text-blue-100 text-sm">{profile?.full_name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 lg:hidden rounded-lg bg-white/20">
                            <Bell className="w-5 h-5" />
                        </button>
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                            <Flame className="w-4 h-4" />
                            <span className="text-sm font-medium">15 Day Streak</span>
                        </div>
                    </div>
                </div>
                
                {/* Quick Stats Row - Scrollable on Mobile */}
                <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                    <MiniStat label="Students" value={totalStudents} />
                    <MiniStat label="Courses" value={courses.length} />
                    <MiniStat label="Lessons" value={totalLessons} />
                    <MiniStat label="Pending" value={pendingAssignments} />
                </div>
            </div>

            {/* Upcoming Live Class */}
            {liveClasses.length > 0 && (
                <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Video className="w-5 h-5 text-blue-500" />
                            Upcoming Live Class
                        </h2>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Live Soon</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-slate-800">{liveClasses[0]?.title}</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {new Date(liveClasses[0]?.start_time || '').toLocaleDateString('en-IN', {
                                    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                        </div>
                        <Link href={`/faculty/live-class/${liveClasses[0]?.id}`} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                            <Play className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            )}

            {/* Quick Actions - Horizontal Scroll on Mobile */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                <QuickActionCard icon={BookOpen} label="New Course" href={`/faculty/${subject}/courses/new`} color="blue" />
                <QuickActionCard icon={FileText} label="Assignment" href={`/faculty/${subject}/assignments/new`} color="amber" />
                <QuickActionCard icon={ClipboardList} label="DPP" href={`/faculty/${subject}/dpp/new`} color="red" />
                <QuickActionCard icon={FileSignature} label="Notes" href={`/faculty/${subject}/notes/new`} color="cyan" />
                <QuickActionCard icon={Layers} label="Modules" href={`/faculty/${subject}/modules/new`} color="orange" />
                <QuickActionCard icon={FlaskConical} label="Experiment" href={`/faculty/${subject}/experiments/new`} color="green" />
                <QuickActionCard icon={Brain} label="AI Questions" href={`/faculty/${subject}/ai-questions`} color="purple" />
                <QuickActionCard icon={Video} label="Live Class" href={`/faculty/${subject}/live-class/new`} color="indigo" />
            </div>

            {/* Live Class Tools Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 lg:p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Presentation className="w-5 h-5" />
                        Live Class Tools
                    </h2>
                    <Link href={`/faculty/${subject}/live-class/new`} className="text-sm text-indigo-200 hover:text-white">
                        Schedule New →
                    </Link>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    <LiveTool icon={Monitor} label="Screen Share" />
                    <LiveTool icon={Square} label="Whiteboard" />
                    <LiveTool icon={ClipboardList} label="Polls" />
                    <LiveTool icon={Brain} label="Quiz" />
                    <LiveTool icon={MessageCircle} label="Chat" />
                    <LiveTool icon={FileAudio} label="Audio" />
                    <LiveTool icon={Camera} label="Camera" />
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
                {/* Courses Section */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-800">My Courses</h2>
                        <Link href={`/faculty/${subject}/courses`} className="text-blue-600 text-sm font-medium">
                            View All →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {courses.length > 0 ? courses.slice(0, 4).map((course) => (
                            <Link key={course.id} href={`/faculty/${subject}/courses/${course.id}`}
                                className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl`}>
                                    {icon}
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
                            <EmptyState icon={BookOpen} message="No courses yet. Create your first course!" />
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4 lg:space-y-6">
                    {/* Experiments */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">Experiments</h2>
                            <Link href={`/faculty/${subject}/experiments`} className="text-blue-600 text-sm font-medium">All →</Link>
                        </div>
                        <div className="space-y-2">
                            {experiments.length > 0 ? experiments.slice(0, 3).map((exp) => (
                                <Link key={exp.id} href={`/faculty/${subject}/experiments/${exp.id}`}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                        <Beaker className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 text-sm truncate">{exp.title}</p>
                                    </div>
                                </Link>
                            )) : (
                                <EmptyState icon={FlaskConical} message="No experiments" small />
                            )}
                        </div>
                    </div>

                    {/* Simulations */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <Box className="w-5 h-5 text-purple-500" />
                                Simulations
                            </h2>
                            <Link href={`/faculty/${subject}/simulations`} className="text-blue-600 text-sm font-medium">All →</Link>
                        </div>
                        <div className="space-y-2">
                            {simulations.length > 0 ? simulations.slice(0, 3).map((sim) => (
                                <Link key={sim.id} href={`/simulations/${sim.id}`} target="_blank"
                                    className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                        <Eye className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 text-sm truncate">{sim.title}</p>
                                        <p className="text-xs text-purple-600">{sim.class_level}</p>
                                    </div>
                                    <Play className="w-4 h-4 text-purple-400" />
                                </Link>
                            )) : (
                                <EmptyState icon={Box} message="No simulations" small />
                            )}
                        </div>
                        <Link href={`/faculty/${subject}/simulations/new`} className="mt-3 flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-purple-200 rounded-xl text-purple-600 text-sm font-medium hover:bg-purple-50">
                            <Eye className="w-4 h-4" /> Add Simulation
                        </Link>
                    </div>

                    {/* Journals */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <PenTool className="w-5 h-5 text-amber-500" />
                                Student Journals
                            </h2>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">{pendingJournals} Pending</span>
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">{reviewedJournals} Reviewed</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {journals.length > 0 ? journals.slice(0, 3).map((journal) => (
                                <Link key={journal.id} href={`/faculty/${subject}/journals/${journal.id}`}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                        journal.status === 'submitted' ? 'bg-amber-100' : journal.status === 'reviewed' ? 'bg-green-100' : 'bg-slate-200'
                                    }`}>
                                        <PenTool className={`w-5 h-5 ${
                                            journal.status === 'submitted' ? 'text-amber-600' : journal.status === 'reviewed' ? 'text-green-600' : 'text-slate-600'
                                        }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 text-sm truncate">{journal.experiment?.title || 'Experiment'}</p>
                                        <p className="text-xs text-slate-500">{journal.student?.full_name || 'Student'}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                        journal.status === 'submitted' ? 'bg-amber-100 text-amber-700' : 
                                        journal.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                        {journal.status || 'draft'}
                                    </span>
                                </Link>
                            )) : (
                                <EmptyState icon={PenTool} message="No journals submitted" small />
                            )}
                        </div>
                        <Link href={`/faculty/${subject}/journals`} className="mt-3 flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-amber-200 rounded-xl text-amber-600 text-sm font-medium hover:bg-amber-50">
                            <Eye className="w-4 h-4" /> Review All Journals
                        </Link>
                    </div>

                    {/* Assignments */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">Assignments</h2>
                            <Link href={`/faculty/${subject}/assignments`} className="text-blue-600 text-sm font-medium">All →</Link>
                        </div>
                        <div className="space-y-2">
                            {assignments.length > 0 ? assignments.slice(0, 3).map((assign) => {
                                const isDue = new Date(assign.due_date) < new Date();
                                return (
                                    <div key={assign.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                        <div className={`w-10 h-10 rounded-lg ${isDue ? 'bg-red-100' : 'bg-amber-100'} flex items-center justify-center`}>
                                            {isDue ? <AlertCircle className="w-5 h-5 text-red-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-800 text-sm truncate">{assign.title}</p>
                                            <p className="text-xs text-slate-500">Due: {new Date(assign.due_date).toLocaleDateString('en-IN')}</p>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <EmptyState icon={FileText} message="No assignments" small />
                            )}
                        </div>
                    </div>

                    {/* Top Students */}
                    <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800">Top Students</h2>
                            <Link href={`/faculty/${subject}/leaderboard`} className="text-blue-600 text-sm font-medium">All →</Link>
                        </div>
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

                {/* Additional Sections: DPP, Notes, Modules, Attendance */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* DPP */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-red-500" />
                            Daily Practice (DPP)
                        </h3>
                        <div className="space-y-2">
                            {dpp.slice(0, 2).map((d) => (
                                <Link key={d.id} href={`/faculty/${subject}/dpp/${d.id}`} className="block p-2 rounded-lg bg-red-50 hover:bg-red-100">
                                    <p className="font-medium text-slate-800 text-sm truncate">{d.title}</p>
                                    <p className="text-xs text-slate-500">{d.questions_count || 0} questions</p>
                                </Link>
                            ))}
                        </div>
                        <Link href={`/faculty/${subject}/dpp`} className="block text-center text-red-600 text-sm font-medium mt-3 pt-3 border-t border-red-100">
                            + Create DPP
                        </Link>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <FileSignature className="w-5 h-5 text-cyan-500" />
                            Notes
                        </h3>
                        <div className="space-y-2">
                            {notes.slice(0, 2).map((n) => (
                                <Link key={n.id} href={`/faculty/${subject}/notes/${n.id}`} className="block p-2 rounded-lg bg-cyan-50 hover:bg-cyan-100">
                                    <p className="font-medium text-slate-800 text-sm truncate">{n.title}</p>
                                    <p className="text-xs text-slate-500">{n.topic}</p>
                                </Link>
                            ))}
                        </div>
                        <Link href={`/faculty/${subject}/notes`} className="block text-center text-cyan-600 text-sm font-medium mt-3 pt-3 border-t border-cyan-100">
                            + Create Notes
                        </Link>
                    </div>

                    {/* Modules */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-orange-500" />
                            Modules
                        </h3>
                        <div className="space-y-2">
                            {modules.slice(0, 2).map((m) => (
                                <Link key={m.id} href={`/faculty/${subject}/modules/${m.id}`} className="block p-2 rounded-lg bg-orange-50 hover:bg-orange-100">
                                    <p className="font-medium text-slate-800 text-sm truncate">{m.title}</p>
                                    <p className="text-xs text-slate-500">{m.lessons_count || 0} lessons</p>
                                </Link>
                            ))}
                        </div>
                        <Link href={`/faculty/${subject}/modules`} className="block text-center text-orange-600 text-sm font-medium mt-3 pt-3 border-t border-orange-100">
                            + Create Module
                        </Link>
                    </div>

                    {/* Attendance */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <UsersRound className="w-5 h-5 text-green-500" />
                            Attendance
                        </h3>
                        <div className="flex gap-2 mb-3">
                            <div className="flex-1 text-center p-2 bg-green-50 rounded-lg">
                                <p className="text-xl font-bold text-green-600">{presentCount}</p>
                                <p className="text-xs text-green-600">Present</p>
                            </div>
                            <div className="flex-1 text-center p-2 bg-red-50 rounded-lg">
                                <p className="text-xl font-bold text-red-600">{absentCount}</p>
                                <p className="text-xs text-red-600">Absent</p>
                            </div>
                        </div>
                        <Link href={`/faculty/${subject}/attendance`} className="block text-center text-green-600 text-sm font-medium pt-3 border-t border-green-100">
                            Take Attendance →
                        </Link>
                    </div>
                </div>
            </div>

            {/* AI Tools Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 lg:p-6 border border-indigo-100">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-indigo-600" />
                    AI Tools for {subjectName}
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <AITool icon={Lightbulb} title="Question Generator" desc="Create MCQs & more" />
                    <AITool icon={FileText} title="Notes Generator" desc="AI-powered notes" />
                    <AITool icon={Brain} title="Doubt Solver" desc="Solve student doubts" />
                    <AITool icon={Video} title="Lecture Summary" desc="Summarize videos" />
                </div>
            </div>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex-shrink-0 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-blue-100 text-xs">{label}</p>
        </div>
    );
}

function QuickActionCard({ icon: Icon, label, href, color }: { icon: any; label: string; href: string; color: string }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600',
        green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-600', indigo: 'bg-indigo-50 text-indigo-600'
    };
    return (
        <Link href={href} className={`flex-shrink-0 flex flex-col items-center gap-2 p-4 rounded-xl ${colors[color]} min-w-[100px]`}>
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium text-center">{label}</span>
        </Link>
    );
}

function EmptyState({ icon: Icon, message, small }: { icon: any; message: string; small?: boolean }) {
    return (
        <div className={`text-center ${small ? 'py-4' : 'py-8'}`}>
            <Icon className={`mx-auto mb-2 ${small ? 'w-8 h-8' : 'w-12 h-12'} text-slate-300`} />
            <p className="text-slate-500 text-sm">{message}</p>
        </div>
    );
}

function AITool({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
    return (
        <Link href="#" className="p-4 bg-white rounded-xl border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-2">
                <Icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-medium text-slate-800 text-sm">{title}</p>
            <p className="text-xs text-slate-500">{desc}</p>
        </Link>
    );
}

function LiveTool({ icon: Icon, label }: { icon: any; label: string }) {
    return (
        <button className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm min-w-[80px] transition-all">
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
}
