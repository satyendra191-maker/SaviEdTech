'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import Link from 'next/link';
import { 
    Eye, FlaskConical, PenTool, Plus, Play, Clock, CheckCircle, 
    AlertCircle, ChevronRight, Box, Beaker, FileText, Search, Bell
} from 'lucide-react';

export default function SimulationsPage() {
    const [loading, setLoading] = useState(true);
    const [simulations, setSimulations] = useState<any[]>([]);
    const [subjectFilter, setSubjectFilter] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            const supabase = getSupabaseBrowserClient();
            let query = supabase.from('simulations').select('*').eq('is_active', true).order('created_at', { ascending: false });
            
            if (subjectFilter !== 'all') {
                query = query.ilike('subject', subjectFilter);
            }
            
            const { data } = await query;
            setSimulations(data || []);
            setLoading(false);
        };
        fetchData();
    }, [subjectFilter]);

    const subjects = [
        { id: 'all', name: 'All', icon: '🌟' },
        { id: 'physics', name: 'Physics', icon: '⚛️' },
        { id: 'chemistry', name: 'Chemistry', icon: '🧪' },
        { id: 'biology', name: 'Biology', icon: '🧬' },
        { id: 'mathematics', name: 'Mathematics', icon: '📐' }
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 lg:pb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-4 lg:p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">🔬</div>
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold">Virtual Simulations</h1>
                            <p className="text-purple-100 text-sm">Interactive 3D learning experiences</p>
                        </div>
                    </div>
                </div>
                
                {/* Subject Filter */}
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                    {subjects.map((subj) => (
                        <button
                            key={subj.id}
                            onClick={() => setSubjectFilter(subj.id)}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                subjectFilter === subj.id 
                                    ? 'bg-white text-purple-600 shadow-lg' 
                                    : 'bg-white/20 text-white hover:bg-white/30'
                            }`}
                        >
                            <span className="mr-1">{subj.icon}</span> {subj.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Simulations Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {simulations.length > 0 ? simulations.map((sim) => (
                    <Link key={sim.id} href={`/simulations/${sim.id}`}
                        className="bg-white rounded-2xl p-4 border border-slate-200 hover:shadow-lg hover:border-purple-200 transition-all group">
                        <div className="aspect-video bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                            <Box className="w-16 h-16 text-purple-400 group-hover:scale-110 transition-transform" />
                            <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/10 transition-colors flex items-center justify-center">
                                <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                        <h3 className="font-semibold text-slate-800 mb-1">{sim.title}</h3>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">{sim.subject} • {sim.class_level}</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                Launch →
                            </span>
                        </div>
                    </Link>
                )) : (
                    <div className="col-span-full text-center py-12">
                        <Box className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No simulations available for {subjectFilter}</p>
                        <Link href="/experiments" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700">
                            <FlaskConical className="w-4 h-4" /> Try Experiments Instead
                        </Link>
                    </div>
                )}
            </div>

            {/* Features */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Simulation Features</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FeatureCard icon={Eye} title="3D Visualization" desc="Interactive 3D models" color="purple" />
                    <FeatureCard icon={Beaker} title="Virtual Labs" desc="Safe experiment simulation" color="green" />
                    <FeatureCard icon={PenTool} title="Hands-on Practice" desc="Real-time interaction" color="blue" />
                    <FeatureCard icon={FileText} title="Auto-Evaluation" desc="Instant feedback" color="amber" />
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
    const colors: Record<string, string> = {
        purple: 'bg-purple-100 text-purple-600',
        green: 'bg-green-100 text-green-600',
        blue: 'bg-blue-100 text-blue-600',
        amber: 'bg-amber-100 text-amber-600'
    };
    return (
        <div className="p-4 rounded-xl bg-slate-50">
            <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="font-medium text-slate-800">{title}</p>
            <p className="text-sm text-slate-500">{desc}</p>
        </div>
    );
}
