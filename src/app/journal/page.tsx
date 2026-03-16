'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import Link from 'next/link';
import { 
    PenTool, Plus, Play, Clock, CheckCircle, AlertCircle, 
    ChevronRight, FileText, Search, Eye, Download, Upload
} from 'lucide-react';

export default function JournalPage() {
    const [loading, setLoading] = useState(true);
    const [journals, setJournals] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [experiments, setExperiments] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const supabase = getSupabaseBrowserClient();
            const { data: { user: authUser } } = await supabase.auth.getUser();
            
            if (authUser) {
                setUser(authUser);
                
                const [journalsRes, experimentsRes] = await Promise.all([
                    supabase.from('journals')
                        .select('*, experiment:experiments(title, subject), student:profiles(full_name)')
                        .eq('student_id', authUser.id)
                        .order('created_at', { ascending: false }),
                    supabase.from('experiments')
                        .select('*')
                        .eq('is_active', true)
                        .order('created_at', { ascending: false })
                        .limit(10)
                ]);

                setJournals(journalsRes.data || []);
                setExperiments(experimentsRes.data || []);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const pendingCount = journals.filter(j => j.status === 'submitted').length;
    const approvedCount = journals.filter(j => j.status === 'approved').length;
    const draftCount = journals.filter(j => j.status === 'draft').length;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-green-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 lg:pb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-4 lg:p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">📓</div>
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold">My Experiment Journal</h1>
                            <p className="text-green-100 text-sm">Document your lab experiments</p>
                        </div>
                    </div>
                </div>
                
                {/* Stats */}
                <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                    <MiniStat label="Total" value={journals.length} />
                    <MiniStat label="Draft" value={draftCount} />
                    <MiniStat label="Pending" value={pendingCount} />
                    <MiniStat label="Approved" value={approvedCount} />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 overflow-x-auto pb-2">
                <Link href="/journal/new" className="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">
                    <Plus className="w-4 h-4" /> New Entry
                </Link>
                <Link href="/experiments" className="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-white text-slate-700 rounded-xl font-medium border border-slate-200 hover:bg-slate-50">
                    <PenTool className="w-4 h-4" /> Browse Experiments
                </Link>
            </div>

            {/* Journals List */}
            <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">My Journal Entries</h2>
                
                {journals.length > 0 ? (
                    <div className="space-y-3">
                        {journals.map((journal) => (
                            <Link key={journal.id} href={`/journal/${journal.id}`}
                                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    journal.status === 'approved' ? 'bg-green-100' : 
                                    journal.status === 'submitted' ? 'bg-amber-100' : 'bg-slate-200'
                                }`}>
                                    <PenTool className={`w-6 h-6 ${
                                        journal.status === 'approved' ? 'text-green-600' : 
                                        journal.status === 'submitted' ? 'text-amber-600' : 'text-slate-600'
                                    }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-slate-800">{journal.experiment?.title || 'Experiment'}</h3>
                                    <p className="text-sm text-slate-500">
                                        {new Date(journal.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                        journal.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                        journal.status === 'submitted' ? 'bg-amber-100 text-amber-700' : 
                                        journal.status === 'reviewed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                        {journal.status || 'draft'}
                                    </span>
                                    {journal.pdf_url && (
                                        <a href={journal.pdf_url} target="_blank" rel="noopener noreferrer" 
                                            className="block mt-2 text-green-600 text-xs font-medium">
                                            <Download className="w-4 h-4 inline mr-1" /> PDF
                                        </a>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <PenTool className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 mb-4">No journal entries yet</p>
                        <Link href="/journal/new" className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">
                            <Plus className="w-4 h-4" /> Create Your First Entry
                        </Link>
                    </div>
                )}
            </div>

            {/* Available Experiments */}
            <div className="bg-white rounded-2xl p-4 lg:p-6 border border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5 text-green-500" />
                    Start New Experiment
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {experiments.slice(0, 6).map((exp) => (
                        <Link key={exp.id} href={`/journal/new?experiment=${exp.id}`}
                            className="p-4 rounded-xl bg-green-50 border border-green-100 hover:bg-green-100 transition-colors">
                            <h3 className="font-medium text-slate-800 mb-1">{exp.title}</h3>
                            <p className="text-sm text-green-600">{exp.subject} • {exp.class_level}</p>
                        </Link>
                    ))}
                </div>
                <Link href="/experiments" className="block text-center text-green-600 font-medium mt-4 pt-4 border-t border-green-100">
                    View All Experiments →
                </Link>
            </div>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex-shrink-0 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-green-100 text-xs">{label}</p>
        </div>
    );
}
