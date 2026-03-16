'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { 
    Play, 
    RefreshCw, 
    CheckCircle, 
    XCircle, 
    Clock, 
    Zap,
    Server,
    Eye,
    Activity,
    AlertCircle,
    Cpu,
    ShieldCheck,
    BarChart3,
    Terminal,
    ChevronRight,
    Command,
    ExternalLink
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';

interface CronJob {
    id: string;
    name: string;
    description: string;
    endpoint: string;
    isAutomated: boolean;
    category: string;
    lastRun?: string;
    lastStatus?: 'success' | 'failed' | 'pending';
    duration?: number;
    color?: string;
}

interface CronLog {
    id: string;
    job_name: string;
    status: string;
    details: any;
    duration_ms: number;
    executed_at: string;
}

const CATEGORY_COLORS = {
    'Core': 'bg-indigo-500',
    'Content': 'bg-amber-500',
    'Academic': 'bg-violet-500',
    'Finance': 'bg-emerald-500',
    'Users': 'bg-blue-500',
    'Marketing': 'bg-rose-500',
    'Platform': 'bg-slate-500',
} as any;

const AUTOMATED_CRON_JOBS: CronJob[] = [
    { id: 'unified-core', name: 'Core Automation', description: 'Daily 2AM: Reminders, Notifications, Analytics, Payments', endpoint: '/api/cron/unified', isAutomated: true, category: 'Core', color: 'indigo' },
    { id: 'content-automation', name: 'Content Engine', description: 'Moderation, Translation, Lecture Auto-Publish', endpoint: '/api/cron/unified', isAutomated: true, category: 'Content', color: 'amber' },
    { id: 'academic-automation', name: 'Academic Sync', description: 'Assignments, Attendance Audit, Certificates, DPP', endpoint: '/api/cron/unified', isAutomated: true, category: 'Academic', color: 'violet' },
    { id: 'finance-automation', name: 'Finance Audit', description: 'GST Reconciliation, Refund processing, Ledgers', endpoint: '/api/cron/unified', isAutomated: true, category: 'Finance', color: 'emerald' },
    { id: 'user-automation', name: 'User Lifecycle', description: 'Leads, Inactive handling, Subscription status', endpoint: '/api/cron/unified', isAutomated: true, category: 'Users', color: 'blue' },
];

const MANUAL_JOBS: CronJob[] = [
    { id: 'ai-content', name: 'AI Generation', description: 'Manually trigger bulk AI study material generation', endpoint: '/api/cron/ai-content', isAutomated: false, category: 'Content' },
    { id: 'database-backup', name: 'Cloud Backup', description: 'Force snapshot of production database clusters', endpoint: '/api/cron/database-backup', isAutomated: false, category: 'Platform' },
    { id: 'notify-students', name: 'Push Broadcast', description: 'Send urgent platform-wide push notification to all students', endpoint: '/api/cron/notify', isAutomated: false, category: 'Users' },
    { id: 'attendance-report', name: 'Attendance Audit', description: 'Generate and email daily attendance summary to Academic Head', endpoint: '/api/cron/attendance', isAutomated: false, category: 'Academic' },
];

export default function AutonomousSystemsPage() {
    const supabase = getSupabaseBrowserClient();
    const [jobs, setJobs] = useState<CronJob[]>([...AUTOMATED_CRON_JOBS, ...MANUAL_JOBS]);
    const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
    const [jobLogs, setJobLogs] = useState<Record<string, CronLog[]>>({});
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [systemPulse, setSystemPulse] = useState(98);

    const fetchLogs = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const { data: logs } = await supabase
                .from('cron_job_logs')
                .select('*')
                .order('executed_at', { ascending: false })
                .limit(50);

            if (logs) {
                const grouped: Record<string, CronLog[]> = {};
                logs.forEach((log: any) => {
                    if (!grouped[log.job_name]) grouped[log.job_name] = [];
                    grouped[log.job_name].push(log);
                });
                setJobLogs(grouped);
                setJobs(prev => prev.map(job => {
                    const l = (grouped[job.id] || [])[0];
                    return { ...job, lastRun: l?.executed_at, lastStatus: l?.status as any, duration: l?.duration_ms };
                }));
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [supabase]);

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 45000);
        return () => clearInterval(interval);
    }, [fetchLogs]);

    const runJob = async (job: CronJob) => {
        setRunningJobs(prev => new Set(prev).add(job.id));
        try {
            const res = await fetch(job.endpoint);
            if (res.ok) fetchLogs();
        } catch (e) { console.error(e); }
        finally {
            setRunningJobs(prev => {
                const n = new Set(prev);
                n.delete(job.id);
                return n;
            });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Cpu className="h-8 w-8 text-indigo-600" />
                        Autonomous Command Center
                    </h1>
                    <p className="text-sm text-slate-500 font-medium max-w-xl">
                        Monitor and control the platform's A.I. nervous system. Background automations handle scaling, moderation, and financial integrity 24/7.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">System Operational</span>
                    </div>
                </div>
            </div>

            {/* Platform Vitals */}
            <div className="grid gap-6 md:grid-cols-3">
                <VitalCard 
                    title="Health Score" 
                    value={`${systemPulse}%`} 
                    sub="Composite Uptime" 
                    icon={Activity} 
                    graph={[40, 70, 45, 90, 65, 80, 75]}
                    color="indigo" 
                />
                <VitalCard 
                    title="Job Velocity" 
                    value="42/hr" 
                    sub="Avg Automations" 
                    icon={Zap} 
                    graph={[20, 30, 80, 50, 90, 60, 40]}
                    color="emerald" 
                />
                <VitalCard 
                    title="Error Rate" 
                    value="0.02%" 
                    sub="Critical Failure" 
                    icon={AlertCircle} 
                    graph={[10, 5, 8, 3, 2, 4, 1]}
                    color="rose" 
                />
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Active Systems Grid */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <Command className="h-5 w-5 text-slate-400" />
                            System Components
                        </h2>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                             Sorted by Priority
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {jobs.map(job => (
                            <JobRow 
                                key={job.id} 
                                job={job} 
                                isRunning={runningJobs.has(job.id)}
                                onRun={() => runJob(job)}
                                isActive={activeJobId === job.id}
                                onToggle={() => setActiveJobId(activeJobId === job.id ? null : job.id)}
                                logs={jobLogs[job.id] || []}
                            />
                        ))}
                    </div>
                </div>

                {/* Automation Log Feed */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden min-h-[500px]">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Terminal className="w-32 h-32" />
                        </div>
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
                            <BarChart3 className="h-5 w-5 text-indigo-400" />
                            Real-time Activity
                        </h2>
                        <div className="space-y-4 relative z-10">
                            {(jobLogs['unified-core'] || []).slice(0, 8).map((log, i) => (
                                <ActivityItem key={i} log={log} />
                            ))}
                        </div>
                        <button className="w-full mt-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-300 transition-all border border-white/5">
                            View Full Audit Trail
                        </button>
                    </div>

                    {/* Infrastructure Card */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Cluster Info</h2>
                        <ClusterMetric label="DB Nodes" value="3 Active" />
                        <ClusterMetric label="Memory Load" value="4.2 GB / 8 GB" />
                        <ClusterMetric label="Storage" value="82% Used" />
                        <Link href="/admin/settings" className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 group">
                            Infrastructure Settings
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VitalCard({ title, value, sub, icon: Icon, graph, color }: any) {
    const colors = {
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100',
    } as any;

    return (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-2xl ${colors[color]}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="flex items-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                    {graph.map((h: number, i: number) => (
                        <div key={i} className={`w-1 rounded-full ${color === 'rose' ? 'bg-rose-400' : color === 'emerald' ? 'bg-emerald-400' : 'bg-indigo-400'}`} style={{ height: `${h * 0.2}px` }} />
                    ))}
                </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{title}</p>
            <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-3">{sub}</p>
        </div>
    );
}

function JobRow({ job, isRunning, onRun, isActive, onToggle, logs }: any) {
    const statusColor = job.lastStatus === 'success' ? 'bg-emerald-500' : job.lastStatus === 'failed' ? 'bg-rose-500' : 'bg-amber-400';
    
    return (
        <div className={`bg-white rounded-3xl border transition-all ${isActive ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-200'}`}>
            <div className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 ${CATEGORY_COLORS[job.category] || 'bg-slate-500'} rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0`}>
                    <Server className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-black text-slate-900 truncate">{job.name}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${job.isAutomated ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            {job.isAutomated ? 'Autonomous' : 'Manual'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{job.description}</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                    <div className="hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Last Run</p>
                        <p className="text-xs font-bold text-slate-700 leading-none">{job.lastRun ? new Date(job.lastRun).toLocaleTimeString() : 'Never'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {!job.isAutomated && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRun(); }}
                                disabled={isRunning}
                                className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-indigo-600 transition-all disabled:opacity-50"
                            >
                                {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                            </button>
                        )}
                        <button 
                            onClick={onToggle}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {isActive && (isActive && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Logs</h4>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-slate-400">Endpoint:</span>
                             <code className="text-[10px] font-bold bg-slate-50 px-2 py-0.5 rounded text-indigo-500">{job.endpoint}</code>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {logs.length > 0 ? logs.map((log: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-100 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    <div>
                                        <p className="text-[11px] font-black text-slate-900 leading-none">{log.status.toUpperCase()}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-medium">{new Date(log.executed_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="text-[10px] font-bold text-slate-400">{log.duration_ms}ms</p>
                                    <button className="p-1 px-2 border border-slate-200 rounded-lg text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                                        DETAILS
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-6">
                                <Activity className="w-8 h-8 text-slate-100 mx-auto mb-2" />
                                <p className="text-xs text-slate-300 font-medium">No execution history found in current buffer.</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ActivityItem({ log }: { log: CronLog }) {
    return (
        <div className="flex items-start gap-3 group">
            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${log.status === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]'}`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors uppercase truncate">{log.job_name.replace('-', ' ')}</p>
                    <span className="text-[9px] font-black text-white/30 shrink-0 uppercase">{log.status === 'success' ? 'SYNC' : 'FAIL'}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] text-white/40 leading-tight">Automation pulse heartbeat confirmed.</p>
                    <span className="text-[8px] font-black text-white/20 shrink-0">{new Date(log.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
        </div>
    );
}

function ClusterMetric({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 mb-2">
            <span className="text-xs font-bold text-slate-600">{label}</span>
            <span className="text-xs font-black text-slate-900">{value}</span>
        </div>
    );
}
