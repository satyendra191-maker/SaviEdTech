'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    Users, Video, BookOpen, GraduationCap, 
    Calendar, MessageSquare, Award, Star,
    ChevronRight, ChevronLeft, MoreVertical, Plus, Clock,
    LayoutDashboard, Search, Bell, Settings,
    FileText, UserCheck, BarChart3, TrendingUp,
    Zap, HeartHandshake, ShieldCheck, Activity,
    Bot, Sparkles, Filter, Download, 
    CheckCircle2, AlertCircle, Share2, Printer
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { 
    QuickStat, 
    LiveClassCard, 
    ActionHubItem, 
    MetricStrip 
} from '@/components/faculty-dashboard/faculty-dashboard-shared';
import { FacultyDirectory, SubjectPolicyPanel } from '@/components/faculty-dashboard/faculty-directory';

export default function FacultyDashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 border-t-indigo-600 shadow-xl"></div>
            </div>
        }>
            <FacultyDashboardContent />
        </Suspense>
    );
}

function FacultyDashboardContent() {
    const supabase = getSupabaseBrowserClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentSubject = searchParams.get('subject');
    const currentFacultyId = searchParams.get('facultyId');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    
    // Mock data for 50 faculties per subject
    const mockFaculties = Array.from({ length: 50 }, (_, i) => ({
        id: `fac-${i}`,
        name: `${currentSubject || 'Physics'} Spec ${i + 1}`,
        code: `${(currentSubject || 'PH').substring(0, 2).toUpperCase()}${100 + i}`,
        is_active: i % 3 === 0
    }));

    const getSubjectColor = () => {
        switch (currentSubject?.toLowerCase()) {
            case 'physics': return 'from-indigo-600 to-blue-700';
            case 'chemistry': return 'from-emerald-600 to-teal-700';
            case 'mathematics': return 'from-blue-600 to-sky-700';
            case 'biology': return 'from-rose-600 to-pink-700';
            default: return 'from-slate-800 to-slate-950';
        }
    };

    const getRoleLabel = () => {
        if (!currentSubject) return 'Head of Academics';
        if (currentFacultyId) return `${currentSubject} Associate Faculty`;
        return `${currentSubject} Department Lead`;
    };

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, [currentSubject, currentFacultyId]);

    const handleBackToDepartment = () => {
        router.push(`/admin/faculty?subject=${currentSubject}`);
    };

    return (
        <div className="space-y-8 pb-12">
            {/* dynamic Header */}
            <div className={`relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br ${getSubjectColor()} p-8 text-white shadow-2xl transition-all duration-700`}>
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-6">
                        {currentFacultyId ? (
                            <button 
                                onClick={handleBackToDepartment}
                                className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all group"
                            >
                                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <div className="w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] flex items-center justify-center shadow-2xl">
                                {currentSubject ? <Star className="w-10 h-10 text-amber-300" /> : <GraduationCap className="w-10 h-10 text-white" />}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl lg:text-4xl font-black tracking-tight">
                                    {currentFacultyId ? mockFaculties.find(f => f.id === currentFacultyId)?.name : (currentSubject ? `${currentSubject} Command Center` : 'Main Academic Command')}
                                </h1>
                                <div className="px-3 py-1 bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-white/30">
                                    {getRoleLabel()}
                                </div>
                            </div>
                            <p className="mt-2 text-white/70 font-medium max-w-xl flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-300" />
                                {currentFacultyId 
                                    ? `Personalized workstation for ${mockFaculties.find(f => f.id === currentFacultyId)?.name}.`
                                    : (currentSubject 
                                        ? `Orchestrating the performance of 50 ${currentSubject} faculties and their combined student base.` 
                                        : 'Central command for specialized student tracking, departmental sync, and educational oversight.')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Switcher: Individual Dashboard vs Department Directory */}
            {currentSubject && !currentFacultyId ? (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <SubjectPolicyPanel subject={currentSubject} />
                    
                    <div className="grid gap-6 lg:grid-cols-4">
                        <QuickStat icon={Users} label="Total Faculty" value="50" trend="Full Capacity" color="indigo" />
                        <QuickStat icon={Activity} label="Active Classes" value="12" trend="Current Load" color="emerald" />
                        <QuickStat icon={MessageSquare} label="Avg Doubt Resp" value="12m" trend="-2m this week" color="blue" />
                        <QuickStat icon={BarChart3} label="Dept Accuracy" value="94.2%" trend="+0.5%" color="rose" />
                    </div>

                    <FacultyDirectory subject={currentSubject} faculties={mockFaculties} />
                </div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-12 animate-in fade-in duration-700">
                    {/* The existing individual dashboard content goes here */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <QuickStat icon={Users} label="Assign. Students" value="482" trend="+12 this week" color="indigo" />
                            <QuickStat icon={Video} label="My Lectures" value="3" trend="Next in 42m" color="emerald" />
                            <QuickStat icon={GraduationCap} label="Eval Queue" value="8" trend="High Priority" color="amber" trendType="down" />
                            <QuickStat icon={TrendingUp} label="Reach Index" value="92.4%" trend="+1.2%" color="rose" />
                        </div>

                        <section className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                            <h2 className="text-xl font-black text-slate-900 mb-8">Personal Teaching Timeline</h2>
                            <div className="space-y-4">
                                <LiveClassCard title="Advanced Concepts" time="10:00 AM" batch="Elite 1" students={42} type="live" />
                                <LiveClassCard title="Problem Solving" time="02:30 PM" batch="Alpha" students={89} type="upcoming" />
                            </div>
                        </section>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                            <Bot className="absolute top-0 right-0 p-6 opacity-[0.05] w-40 h-40" />
                            <h2 className="text-2xl font-black mb-6">Faculty Hub</h2>
                            <div className="space-y-4">
                                <ActionHubItem icon={MessageSquare} label="My Doubt Queue" description="4 Pending Doubts" color="indigo" />
                                <ActionHubItem icon={Award} label="Draft Test" description="JEE Practice #12" color="rose" />
                                <ActionHubItem icon={Bot} label="AI Sync" description="Sync content with dept" color="sky" />
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                            <h2 className="text-lg font-black text-slate-900 mb-6">Personal Vitals</h2>
                            <div className="space-y-4">
                                <MetricStrip label="Completion" value={14} max={20} color="indigo" />
                                <MetricStrip label="Student Rating" value={4.9} max={5} color="emerald" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
