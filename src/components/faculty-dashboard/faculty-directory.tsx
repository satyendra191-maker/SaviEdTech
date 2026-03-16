'use client';

import { 
    Users, Search, Filter, Mail, Phone, 
    BookOpen, Award, MoreVertical, ShieldCheck,
    ChevronRight, ExternalLink, Activity, Star
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

interface FacultyDirectoryProps {
    subject: string;
    faculties: any[];
}

export function FacultyDirectory({ subject, faculties }: FacultyDirectoryProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFaculties = faculties.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-900 leading-tight">Faculty Directory</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{subject} Department • {faculties.length} Educators</p>
                </div>
                <div className="relative group max-w-sm w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search by name or code..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredFaculties.map((faculty, i) => (
                    <Link 
                        key={faculty.id || i}
                        href={`/admin/faculty?subject=${subject}&facultyId=${faculty.id}`}
                        className="group bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl font-black text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    {faculty.name.charAt(0)}
                                </div>
                                {faculty.is_active && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 truncate">{faculty.name}</h3>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{faculty.code}</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Students</p>
                                <p className="text-xs font-black text-slate-900">{Math.floor(Math.random() * 500) + 100}</p>
                            </div>
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Rating</p>
                                <p className="text-xs font-black text-slate-900">4.9/5</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    {[1,2,3].map(j => (
                                        <div key={j} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-600">
                                            {j}
                                        </div>
                                    ))}
                                </div>
                                <span className="text-[10px] text-slate-500 font-bold">In-class now</span>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                                <Activity className="w-3 h-3" />
                                Active
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export function SubjectPolicyPanel({ subject }: { subject: string }) {
    return (
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                <ShieldCheck className="w-64 h-64" />
            </div>
            
            <div className="relative space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 text-indigo-400" />
                            Departmental Governance
                        </h2>
                        <p className="text-xs text-white/50 font-bold uppercase tracking-[0.2em] mt-1">Multi-Faculty Policy & Access Protocol</p>
                    </div>
                    <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Subject: {subject}</span>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <PolicyCard 
                        title="Isolation Policy" 
                        desc="Each of the 50 faculties operates in an isolated secure tunnel. Student data, doubt queues, and lecture metrics are faculty-specific."
                        status="Active"
                    />
                    <PolicyCard 
                        title="Aggregation Layer" 
                        desc="Academic Heads can view aggregate performance of all 50 faculties, spotting trends and optimizing resource allocation."
                        status="Enabled"
                    />
                    <PolicyCard 
                        title="Resource Balancing" 
                        desc="Automated distributing of the student load across the 50 faculties to ensure optimal doubt-response times."
                        status="Optimizing"
                    />
                </div>

                <div className="pt-6 border-t border-white/10">
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white text-slate-950 px-6 py-3 rounded-2xl hover:bg-slate-100 transition-all active:scale-95">
                        Update Policy Rules
                        <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function PolicyCard({ title, desc, status }: any) {
    return (
        <div className="p-5 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 group-hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-white/90">{title}</h3>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter bg-indigo-500/10 px-2 py-0.5 rounded-lg">{status}</span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed font-medium">{desc}</p>
        </div>
    );
}
