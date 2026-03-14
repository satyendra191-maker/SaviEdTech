'use client';

import { useCallback, useEffect, useState } from 'react';
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
    AlertCircle
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
}

interface CronLog {
    id: string;
    job_name: string;
    status: string;
    details: any;
    duration_ms: number;
    executed_at: string;
}

// AUTOMATED JOBS - All jobs are now automated via unified cron
const AUTOMATED_CRON_JOBS: CronJob[] = [
    {
        id: 'unified-core',
        name: 'Core Automation (Daily 2AM)',
        description: 'Study Reminders, Notifications, Analytics, Leaderboard, Payments, Health, Gamification',
        endpoint: '/api/cron/unified',
        isAutomated: true,
        category: 'Core - Automated',
        lastStatus: 'pending',
    },
    {
        id: 'content-automation',
        name: 'Content Automation',
        description: 'Content Moderation, Translation, Lecture Publisher',
        endpoint: '/api/cron/unified',
        isAutomated: true,
        category: 'Content - Automated',
        lastStatus: 'pending',
    },
    {
        id: 'academic-automation',
        name: 'Academic Automation',
        description: 'Assignments, Attendance, Certificates, DPP',
        endpoint: '/api/cron/unified',
        isAutomated: true,
        category: 'Academic - Automated',
        lastStatus: 'pending',
    },
    {
        id: 'finance-automation',
        name: 'Finance Automation',
        description: 'GST Accounts, Refund Processing, Financial Automation',
        endpoint: '/api/cron/unified',
        isAutomated: true,
        category: 'Finance - Automated',
        lastStatus: 'pending',
    },
    {
        id: 'user-automation',
        name: 'User Automation',
        description: 'Inactive Users, Lead Management, Subscriptions, Referrals',
        endpoint: '/api/cron/unified',
        isAutomated: true,
        category: 'Users - Automated',
        lastStatus: 'pending',
    },
    {
        id: 'marketing-automation',
        name: 'Marketing Automation',
        description: 'Email, Engagement, Push Notifications, Marketing',
        endpoint: '/api/cron/unified',
        isAutomated: true,
        category: 'Marketing - Automated',
        lastStatus: 'pending',
    },
    {
        id: 'platform-automation',
        name: 'Platform Automation',
        description: 'Health Monitor, Security, Database Maintenance',
        endpoint: '/api/cron/unified',
        isAutomated: true,
        category: 'Platform - Automated',
        lastStatus: 'pending',
    },
];

// NON-AUTOMATED JOBS - Jobs that can be triggered manually if needed
const MANUAL_JOBS: CronJob[] = [
    { id: 'ai-content', name: 'AI Content Generation', description: 'Generate AI study content', endpoint: '/api/cron/ai-content', isAutomated: false, category: 'Manual' },
    { id: 'certificate-generator', name: 'Certificate Generator', description: 'Generate certificates', endpoint: '/api/cron/certificate-generator', isAutomated: false, category: 'Manual' },
    { id: 'database-backup', name: 'Database Backup', description: 'Backup database', endpoint: '/api/cron/database-backup', isAutomated: false, category: 'Manual' },
];

export default function CronJobsPage() {
    const supabase = getSupabaseBrowserClient();
    const [jobs, setJobs] = useState<CronJob[]>([...AUTOMATED_CRON_JOBS, ...MANUAL_JOBS]);
    const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
    const [jobLogs, setJobLogs] = useState<Record<string, CronLog[]>>({});
    const [showLogs, setShowLogs] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState<'all' | 'automated' | 'manual'>('automated');
    const [loading, setLoading] = useState(true);
    const [lastCronRun, setLastCronRun] = useState<any>(null);

    const fetchJobLogs = useCallback(async () => {
        if (!supabase) return;
        
        setLoading(true);
        try {
            // Fetch all cron job logs
            const { data: logs } = await supabase
                .from('cron_job_logs')
                .select('*')
                .order('executed_at', { ascending: false })
                .limit(100);

            if (logs) {
                // Group logs by job
                const grouped: Record<string, CronLog[]> = {};
                logs.forEach((log: any) => {
                    if (!grouped[log.job_name]) {
                        grouped[log.job_name] = [];
                    }
                    grouped[log.job_name].push(log);
                });
                setJobLogs(grouped);

                // Update job statuses
                setJobs(prev => prev.map(job => {
                    const jobLogs = grouped[job.id] || [];
                    const latestLog = jobLogs[0];
                    return {
                        ...job,
                        lastRun: latestLog?.executed_at,
                        lastStatus: latestLog?.status as 'success' | 'failed' | 'pending',
                        duration: latestLog?.duration_ms,
                    };
                }));

                // Get last unified cron run
                const unifiedLogs = grouped['unified'] || [];
                if (unifiedLogs.length > 0) {
                    setLastCronRun(unifiedLogs[0]);
                }
            }
        } catch (e) {
            console.error('Error fetching logs:', e);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchJobLogs();
        
        // Refresh every 30 seconds
        const interval = setInterval(fetchJobLogs, 30000);
        return () => clearInterval(interval);
    }, [fetchJobLogs]);

    const runJob = async (job: CronJob) => {
        setRunningJobs(prev => new Set(prev).add(job.id));
        
        try {
            const response = await fetch(`${job.endpoint}`, {
                method: 'GET',
            });
            
            if (response.ok) {
                alert(`✅ ${job.name} completed!`);
                fetchJobLogs();
            } else {
                const data = await response.json();
                alert(`❌ ${job.name} failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            alert(`❌ Error running ${job.name}: ${error}`);
        } finally {
            setRunningJobs(prev => {
                const next = new Set(prev);
                next.delete(job.id);
                return next;
            });
        }
    };

    const filteredJobs = jobs.filter(job => {
        if (filter === 'automated') return job.isAutomated;
        if (filter === 'manual') return !job.isAutomated;
        return true;
    });

    const getStatusIcon = (status?: string) => {
        if (status === 'success') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
        if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
    };

    const getStatusBadge = (status?: string) => {
        if (status === 'success') return 'bg-emerald-100 text-emerald-700';
        if (status === 'failed') return 'bg-red-100 text-red-700';
        return 'bg-amber-100 text-amber-700';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Clock className="w-6 h-6" />
                        Cron Jobs Manager
                    </h1>
                    <p className="text-sm text-slate-500">Track and manage automated background tasks</p>
                </div>
                <button
                    onClick={fetchJobLogs}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Status
                </button>
            </div>

            {/* Last Run Status */}
            {lastCronRun && (
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center gap-3">
                        <Activity className="w-6 h-6" />
                        <div>
                            <p className="font-semibold">Last Unified Cron Run</p>
                            <p className="text-sm text-white/80">
                                {new Date(lastCronRun.executed_at).toLocaleString()} • 
                                {lastCronRun.status === 'success' ? ' ✅ Success' : ' ❌ Failed'}
                                {lastCronRun.duration_ms ? ` • ${lastCronRun.duration_ms}ms` : ''}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{AUTOMATED_CRON_JOBS.length}</p>
                            <p className="text-xs text-white/80">Automated Jobs</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Server className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{MANUAL_JOBS.length}</p>
                            <p className="text-xs text-white/80">Manual Jobs</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{jobs.length}</p>
                            <p className="text-xs text-white/80">Total Jobs</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setFilter('automated')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        filter === 'automated' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Automated ({AUTOMATED_CRON_JOBS.length})
                </button>
                <button
                    onClick={() => setFilter('manual')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        filter === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    Manual ({MANUAL_JOBS.length})
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    All Jobs
                </button>
            </div>

            {/* Jobs List */}
            <div className="space-y-4">
                {filteredJobs.map(job => (
                    <div
                        key={job.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-slate-900">{job.name}</h3>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                        job.isAutomated 
                                            ? 'bg-emerald-100 text-emerald-700' 
                                            : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {job.isAutomated ? 'AUTO' : 'MANUAL'}
                                    </span>
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                                        {job.category}
                                    </span>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusBadge(job.lastStatus)}`}>
                                        {job.lastStatus?.toUpperCase() || 'PENDING'}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mb-2">{job.description}</p>
                                <div className="flex items-center gap-4 text-xs text-slate-400">
                                    {job.lastRun && (
                                        <span>Last run: {new Date(job.lastRun).toLocaleString()}</span>
                                    )}
                                    {job.duration && (
                                        <span>Duration: {job.duration}ms</span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {!job.isAutomated && (
                                    <button
                                        onClick={() => runJob(job)}
                                        disabled={runningJobs.has(job.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {runningJobs.has(job.id) ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Play className="w-4 h-4" />
                                        )}
                                        Run
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowLogs(prev => ({ ...prev, [job.id]: !prev[job.id] }));
                                        if (!showLogs[job.id]) fetchJobLogs();
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Logs Section */}
                        {showLogs[job.id] && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-medium text-slate-700 mb-2">Execution History</h4>
                                {jobLogs[job.id]?.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {jobLogs[job.id].slice(0, 10).map((log, idx) => (
                                            <div key={idx} className="flex items-center gap-3 text-xs bg-slate-50 p-2 rounded-lg">
                                                {log.status === 'success' ? (
                                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-500" />
                                                )}
                                                <span className="text-slate-600">
                                                    {new Date(log.executed_at).toLocaleString()}
                                                </span>
                                                <span className="text-slate-400">
                                                    {log.duration_ms}ms
                                                </span>
                                                <span className="text-slate-500 flex-1 truncate">
                                                    {log.details?.message || '-'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400">No execution history yet</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
