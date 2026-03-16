'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    LayoutDashboard, BookOpen, PlayCircle, GraduationCap, 
    FileText, Plus, Zap, BarChart3, Clock, CheckCircle,
    ChevronRight, MoreHorizontal, Search, Settings,
    Video, Database, Sparkles, Filter, Star, Activity
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';

export default function ContentDashboardPage() {
    const supabase = getSupabaseBrowserClient();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        lectures: 0,
        tests: 0,
        questions: 0,
        dpp: 0
    });

    useEffect(() => {
        fetchContentStats();
    }, []);

    const fetchContentStats = async () => {
        setLoading(true);
        try {
            const [lecturesRes, testsRes, questionsRes, dppRes] = await Promise.all([
                supabase.from('lectures').select('id', { count: 'exact', head: true }),
                supabase.from('tests').select('id', { count: 'exact', head: true }),
                supabase.from('questions').select('id', { count: 'exact', head: true }),
                supabase.from('dpp_sets').select('id', { count: 'exact', head: true })
            ]);

            setStats({
                lectures: lecturesRes.count || 0,
                tests: testsRes.count || 0,
                questions: questionsRes.count || 0,
                dpp: dppRes.count || 0
            });
        } catch (error) {
            console.error('Content stats fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Content Hub & CMS</h1>
                    <p className="text-sm text-slate-500">Create and curate curriculum, assessments, and learning resources.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/lectures" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm font-semibold">
                        <Plus className="w-4 h-4" />
                        Create Lesson
                    </Link>
                </div>
            </div>

            {/* Subject-Wise Repository */}
            <div className="flex items-center justify-between mt-8 mb-4">
                <h2 className="text-xl font-bold text-slate-900">Subject-Wise Repository</h2>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-0 focus:border-indigo-500">
                        <option>All Streams</option>
                        <option>IIT-JEE</option>
                        <option>NEET-UG</option>
                        <option>Foundation</option>
                    </select>
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <Link href="/admin/courses?subject=physics" className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-500 transition-all group shadow-sm">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Zap className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900">Physics</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">12 Courses • 1.2K Lectures</p>
                </Link>
                <Link href="/admin/courses?subject=chemistry" className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-emerald-500 transition-all group shadow-sm">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <Star className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900">Chemistry</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">10 Courses • 980 Lectures</p>
                </Link>
                <Link href="/admin/courses?subject=maths" className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-blue-500 transition-all group shadow-sm">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900">Mathematics</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">15 Courses • 2.1K Lectures</p>
                </Link>
                <Link href="/admin/courses?subject=biology" className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-rose-500 transition-all group shadow-sm">
                    <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-rose-600 group-hover:text-white transition-all">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900">Biology</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">8 Courses • 850 Lectures</p>
                </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content Modules */}
                <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
                    <ModuleCard 
                        icon={BookOpen} 
                        title="Course Curriculum" 
                        desc="Structure topics, chapters and modules for various competitive exams."
                        count={stats.lectures}
                        href="/admin/courses"
                        color="indigo"
                    />
                    <ModuleCard 
                        icon={GraduationCap} 
                        title="Assessment Engine" 
                        desc="Create mock tests, full-length papers and manage test schedules."
                        count={stats.tests}
                        href="/admin/tests"
                        color="emerald"
                    />
                    <ModuleCard 
                        icon={Database} 
                        title="Question Bank" 
                        desc="Manage 10,000+ questions with metadata, solutions and difficulty levels."
                        count={stats.questions}
                        href="/admin/questions"
                        color="amber"
                    />
                    <ModuleCard 
                        icon={Sparkles} 
                        title="Daily Practice (DPP)" 
                        desc="Curate daily sets for students to build consistent study habits."
                        count={stats.dpp}
                        href="/admin/challenges"
                        color="violet"
                    />
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Action Panel */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            Creative Tools
                        </h2>
                        <div className="space-y-3">
                            <ToolLink icon={LayoutDashboard} label="AI Content Generator" href="/admin/ai-content" active />
                            <ToolLink icon={FileText} label="Study Material PDF" href="/admin/cms" />
                            <ToolLink icon={Video} label="Video Processing" href="/admin/youtube" />
                            <ToolLink icon={Settings} label="Content Settings" href="/admin/settings" />
                        </div>
                    </div>

                    {/* Quality Audit */}
                    <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CheckCircle className="w-24 h-24" />
                        </div>
                        <h2 className="font-bold mb-1 relative z-10">Quality Audit</h2>
                        <p className="text-xs text-white/60 mb-4 relative z-10">32 questions flagged for review</p>
                        <Link href="/admin/questions?status=flagged" className="block w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-center text-xs font-bold transition-all relative z-10">
                            Review Flagged Content
                        </Link>
                    </div>

                    {/* Content Automations (Cron Jobs) */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-slate-900 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                Content Discovery
                            </h2>
                            <Link href="/admin/cron-jobs" className="text-[10px] font-bold text-indigo-600 uppercase">Manage</Link>
                        </div>
                        <div className="space-y-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[11px] font-bold text-slate-900">Lecture Publisher</p>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                </div>
                                <p className="text-[10px] text-slate-500 leading-tight">Processes and publishes scheduled video lectures.</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 opacity-60">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[11px] font-bold text-slate-900">Translation Bot</p>
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                </div>
                                <p className="text-[10px] text-slate-500 leading-tight">AI-based question translation processing.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Add Activity icon to the list of imports if missing, but it was already used in faculty.
// I'll ensure Activity is imported in this file too.

function ContentStat({ icon: Icon, label, value, color, bg }: any) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
    );
}

function ModuleCard({ icon: Icon, title, desc, count, href, color }: any) {
    const colors = {
        indigo: 'border-indigo-100 hover:border-indigo-500 bg-indigo-50/50',
        emerald: 'border-emerald-100 hover:border-emerald-500 bg-emerald-50/50',
        amber: 'border-amber-100 hover:border-amber-500 bg-amber-50/50',
        violet: 'border-violet-100 hover:border-violet-500 bg-violet-50/50',
    } as any;

    return (
        <Link href={href} className={`block p-5 rounded-2xl border transition-all group ${colors[color] || ''}`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
                <div className="px-2.5 py-1 bg-white rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                    {count} Files
                </div>
            </div>
            <h3 className="font-bold text-slate-900 mb-1.5 group-hover:text-indigo-600 transition-colors">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">{desc}</p>
            <div className="flex items-center text-xs font-bold text-indigo-600 gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                Manage Hub <ChevronRight className="w-4 h-4" />
            </div>
        </Link>
    );
}

function ToolLink({ icon: Icon, label, href, active }: any) {
    return (
        <Link 
            href={href} 
            className={`flex items-center justify-between p-3 rounded-xl transition-all ${active ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
        >
            <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="text-xs font-semibold">{label}</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 opacity-40`} />
        </Link>
    );
}
