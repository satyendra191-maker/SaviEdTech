'use client';

import { 
    Users, Video, BookOpen, GraduationCap, 
    Calendar, MessageSquare, Award, Star,
    ChevronRight, MoreVertical, Plus, Clock,
    LayoutDashboard, Search, Bell, Settings,
    FileText, UserCheck, BarChart3, TrendingUp,
    Zap, HeartHandshake, ShieldCheck, Activity,
    Target, Sparkles, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export function QuickStat({ icon: Icon, label, value, trend, color, trendType = 'up' }: any) {
    const colorMap = {
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
    } as any;

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm group hover:scale-[1.02] transition-all duration-300">
            <div className={`w-12 h-12 ${colorMap[color]} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-6 group-hover:scale-110 shadow-sm border`}>
                <Icon className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{label}</p>
            <div className="flex items-end justify-between mt-1">
                <p className="text-3xl font-black text-slate-900">{value}</p>
                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    trendType === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                }`}>
                    {trendType === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                    {trend}
                </div>
            </div>
        </div>
    );
}

export function LiveClassCard({ title, time, batch, students, status, type = 'live' }: any) {
    return (
        <div className={`p-5 rounded-3xl border ${
            type === 'live' 
                ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white shadow-md' 
                : 'border-slate-100 bg-slate-50/50'
        } flex items-center justify-between group cursor-pointer hover:border-indigo-300 transition-all duration-300 relative overflow-hidden`}>
            {type === 'live' && (
                <div className="absolute top-0 right-0">
                    <div className="bg-indigo-600 text-[9px] font-black text-white px-3 py-1 rounded-bl-xl uppercase tracking-tighter animate-pulse">
                        Live Now
                    </div>
                </div>
            )}
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border ${
                    type === 'live' ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-white text-slate-400'
                }`}>
                    {type === 'live' ? <Video className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{title}</h3>
                    <div className="flex items-center gap-3 mt-1.5 font-medium">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1.5 bg-white border border-slate-100 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-indigo-400" /> {time}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1.5 bg-white border border-slate-100 px-2 py-0.5 rounded-full">
                            <Users className="w-3 h-3 text-indigo-400" /> {batch}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1.5 bg-white border border-slate-100 px-2 py-0.5 rounded-full">
                            <Target className="w-3 h-3 text-indigo-400" /> {students} Students
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {type === 'live' ? (
                    <button className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-all hover:scale-105 active:scale-95 group-hover:bg-indigo-700">
                        Join Class
                    </button>
                ) : (
                    <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}

export function ActionHubItem({ icon: Icon, label, description, color }: any) {
    const bgColor = {
        indigo: 'bg-indigo-50 border-indigo-100/50',
        emerald: 'bg-emerald-50 border-emerald-100/50',
        rose: 'bg-rose-50 border-rose-100/50',
        amber: 'bg-amber-50 border-amber-100/50',
        sky: 'bg-sky-50 border-sky-100/50',
    }[color as 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky'] || 'bg-slate-50 border-slate-100';

    const iconColor = {
        indigo: 'text-indigo-600',
        emerald: 'text-emerald-600',
        rose: 'text-rose-600',
        amber: 'text-amber-600',
        sky: 'text-sky-600',
    }[color as 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky'] || 'text-slate-600';

    return (
        <button className={`w-full text-left p-4 rounded-3xl border ${bgColor} hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 group`}>
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100 ${iconColor} group-hover:rotate-12 transition-transform`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-xs font-black text-slate-900 tracking-tight">{label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium leading-tight">{description}</p>
                </div>
            </div>
        </button>
    );
}

export function MetricStrip({ label, value, max, color }: any) {
    const percent = Math.min(100, (value / max) * 100);
    const colorClass = {
        indigo: 'bg-indigo-500',
        emerald: 'bg-emerald-500',
        rose: 'bg-rose-500',
        amber: 'bg-amber-500',
    }[color as 'indigo' | 'emerald' | 'rose' | 'amber'] || 'bg-slate-500';

    return (
        <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-900">{value} / {max}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                <div 
                    className={`h-full ${colorClass} rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,0,0,0.1)]`} 
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
