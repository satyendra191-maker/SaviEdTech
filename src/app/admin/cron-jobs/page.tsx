'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
    Play, 
    Pause, 
    RefreshCw, 
    CheckCircle, 
    XCircle, 
    Clock, 
    Zap,
    Settings,
    Eye,
    EyeOff,
    Server
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
    status?: 'success' | 'failed' | 'running' | 'pending';
    duration?: number;
}

const AUTOMATED_CRON_JOBS: CronJob[] = [
    {
        id: 'unified',
        name: 'Unified Cron (Daily 2AM)',
        description: 'Auto-runs 9 critical tasks: Study Reminders, New Lectures, Daily Challenge, Student Analytics, Leaderboard, Lead Processing, Payment Verification, Database Health, Gamification',
        endpoint: '/api/cron/unified',
        isAutomated: true,
        category: 'Core - Automated',
    },
];

const NON_AUTOMATED_CRON_JOBS: CronJob[] = [
    // Content
    { id: 'ai-content', name: 'AI Content Generation', description: 'Generate AI-powered study content', endpoint: '/api/cron/ai-content', isAutomated: false, category: 'Content' },
    { id: 'ai-learning-path', name: 'AI Learning Path', description: 'Create personalized learning paths', endpoint: '/api/cron/ai-learning-path', isAutomated: false, category: 'Content' },
    { id: 'content-moderation', name: 'Content Moderation', description: 'Review and moderate user-generated content', endpoint: '/api/cron/content-moderation', isAutomated: false, category: 'Content' },
    { id: 'content-translation', name: 'Content Translation', description: 'Translate content to multiple languages', endpoint: '/api/cron/content-translation', isAutomated: false, category: 'Content' },
    { id: 'lecture-publisher', name: 'Lecture Publisher', description: 'Auto-publish scheduled lectures', endpoint: '/api/cron/lecture-publisher', isAutomated: false, category: 'Content' },
    { id: 'notes-generator', name: 'Notes Generator', description: 'Generate study notes from lectures', endpoint: '/api/cron/notes-generator', isAutomated: false, category: 'Content' },
    { id: 'video-generation', name: 'Video Generation', description: 'Generate video content', endpoint: '/api/cron/video-generation', isAutomated: false, category: 'Content' },
    
    // Academic
    { id: 'assignment-automation', name: 'Assignment Automation', description: 'Create and distribute assignments', endpoint: '/api/cron/assignment-automation', isAutomated: false, category: 'Academic' },
    { id: 'attendance-tracking', name: 'Attendance Tracking', description: 'Track student attendance', endpoint: '/api/cron/attendance-tracking', isAutomated: false, category: 'Academic' },
    { id: 'biweekly-test-scheduler', name: 'Biweekly Test Scheduler', description: 'Schedule biweekly mock tests', endpoint: '/api/cron/biweekly-test-scheduler', isAutomated: false, category: 'Academic' },
    { id: 'certificate-generator', name: 'Certificate Generator', description: 'Generate completion certificates', endpoint: '/api/cron/certificate-generator', isAutomated: false, category: 'Academic' },
    { id: 'dpp-generator', name: 'DPP Generator', description: 'Generate Daily Practice Papers', endpoint: '/api/cron/dpp-generator', isAutomated: false, category: 'Academic' },
    { id: 'exam-engine', name: 'Exam Engine', description: 'Manage exam schedules and results', endpoint: '/api/cron/exam-engine', isAutomated: false, category: 'Academic' },
    { id: 'pyq-updater', name: 'PYQ Updater', description: 'Update Previous Year Questions', endpoint: '/api/cron/pyq-updater', isAutomated: false, category: 'Academic' },
    { id: 'quiz-analytics', name: 'Quiz Analytics', description: 'Analyze quiz performance', endpoint: '/api/cron/quiz-analytics', isAutomated: false, category: 'Academic' },
    { id: 'test-runner', name: 'Test Runner', description: 'Execute automated tests', endpoint: '/api/cron/test-runner', isAutomated: false, category: 'Academic' },
    { id: 'webinar-scheduler', name: 'Webinar Scheduler', description: 'Schedule upcoming webinars', endpoint: '/api/cron/webinar-scheduler', isAutomated: false, category: 'Academic' },
    { id: 'doubt-clearing', name: 'Doubt Clearing', description: 'Process student doubts', endpoint: '/api/cron/doubt-clearing', isAutomated: false, category: 'Academic' },
    { id: 'review-automation', name: 'Review Automation', description: 'Automate content reviews', endpoint: '/api/cron/review-automation', isAutomated: false, category: 'Academic' },
    { id: 'revision-updater', name: 'Revision Updater', description: 'Update revision schedules', endpoint: '/api/cron/revision-updater', isAutomated: false, category: 'Academic' },
    { id: 'scholarship-management', name: 'Scholarship Management', description: 'Manage scholarship applications', endpoint: '/api/cron/scholarship-management', isAutomated: false, category: 'Academic' },
    { id: 'daily-challenge', name: 'Daily Challenge', description: 'Create daily challenges', endpoint: '/api/cron/daily-challenge', isAutomated: false, category: 'Academic' },
    
    // Finance
    { id: 'course-bundling', name: 'Course Bundling', description: 'Bundle courses for sales', endpoint: '/api/cron/course-bundling', isAutomated: false, category: 'Finance' },
    { id: 'financial-automation', name: 'Financial Automation', description: 'Process financial transactions', endpoint: '/api/cron/financial-automation', isAutomated: false, category: 'Finance' },
    { id: 'gst-accounts', name: 'GST Accounts', description: 'GST calculations and filing', endpoint: '/api/cron/gst-accounts', isAutomated: false, category: 'Finance' },
    { id: 'pricing-automation', name: 'Pricing Automation', description: 'Dynamic pricing adjustments', endpoint: '/api/cron/pricing-automation', isAutomated: false, category: 'Finance' },
    { id: 'refund-processing', name: 'Refund Processing', description: 'Process refund requests', endpoint: '/api/cron/refund-processing', isAutomated: false, category: 'Finance' },
    
    // Users
    { id: 'inactive-users', name: 'Inactive Users', description: 'Track and re-engage inactive users', endpoint: '/api/cron/inactive-users', isAutomated: false, category: 'Users' },
    { id: 'lead-management', name: 'Lead Management', description: 'Process and convert leads', endpoint: '/api/cron/lead-management', isAutomated: false, category: 'Users' },
    { id: 'subscription-expiry', name: 'Subscription Expiry', description: 'Check expiring subscriptions', endpoint: '/api/cron/subscription-expiry', isAutomated: false, category: 'Users' },
    { id: 'referral-processing', name: 'Referral Processing', description: 'Process referral rewards', endpoint: '/api/cron/referral-processing', isAutomated: false, category: 'Users' },
    { id: 'course-expiry', name: 'Course Expiry', description: 'Check expiring course access', endpoint: '/api/cron/course-expiry', isAutomated: false, category: 'Users' },
    
    // Marketing
    { id: 'email-notifications', name: 'Email Notifications', description: 'Send email campaigns', endpoint: '/api/cron/email-notifications', isAutomated: false, category: 'Marketing' },
    { id: 'engagement', name: 'User Engagement', description: 'Boost user engagement', endpoint: '/api/cron/engagement', isAutomated: false, category: 'Marketing' },
    { id: 'marketing-automation', name: 'Marketing Automation', description: 'Run marketing campaigns', endpoint: '/api/cron/marketing-automation', isAutomated: false, category: 'Marketing' },
    { id: 'push-notifications', name: 'Push Notifications', description: 'Send push notifications', endpoint: '/api/cron/push-notifications', isAutomated: false, category: 'Marketing' },
    { id: 'seo-automation', name: 'SEO Automation', description: 'Automate SEO tasks', endpoint: '/api/cron/seo-automation', isAutomated: false, category: 'Marketing' },
    { id: 'social-media-automation', name: 'Social Media', description: 'Post to social media', endpoint: '/api/cron/social-media-automation', isAutomated: false, category: 'Marketing' },
    { id: 'growth-analytics', name: 'Growth Analytics', description: 'Track growth metrics', endpoint: '/api/cron/growth-analytics', isAutomated: false, category: 'Marketing' },
    { id: 'gov-notifications', name: 'Gov Notifications', description: 'Send government updates', endpoint: '/api/cron/gov-notifications', isAutomated: false, category: 'Marketing' },
    { id: 'whatsapp-sms-automation', name: 'WhatsApp/SMS', description: 'Send WhatsApp and SMS', endpoint: '/api/cron/whatsapp-sms-automation', isAutomated: false, category: 'Marketing' },
    
    // Platform
    { id: 'database-backup', name: 'Database Backup', description: 'Backup database', endpoint: '/api/cron/database-backup', isAutomated: false, category: 'Platform' },
    { id: 'database-maintenance', name: 'Database Maintenance', description: 'Optimize database', endpoint: '/api/cron/database-maintenance', isAutomated: false, category: 'Platform' },
    { id: 'database-optimization', name: 'Database Optimization', description: 'Index and optimize', endpoint: '/api/cron/database-optimization', isAutomated: false, category: 'Platform' },
    { id: 'health-monitor', name: 'Health Monitor', description: 'Monitor system health', endpoint: '/api/cron/health-monitor', isAutomated: false, category: 'Platform' },
    { id: 'performance-alerts', name: 'Performance Alerts', description: 'Check performance metrics', endpoint: '/api/cron/performance-alerts', isAutomated: false, category: 'Platform' },
    { id: 'performance-optimization', name: 'Performance Optimization', description: 'Optimize performance', endpoint: '/api/cron/performance-optimization', isAutomated: false, category: 'Platform' },
    { id: 'platform-auditor', name: 'Platform Auditor', description: 'Audit platform status', endpoint: '/api/cron/platform-auditor', isAutomated: false, category: 'Platform' },
    { id: 'rank-prediction', name: 'Rank Prediction', description: 'Update rank predictions', endpoint: '/api/cron/rank-prediction', isAutomated: false, category: 'Platform' },
    { id: 'security-monitoring', name: 'Security Monitoring', description: 'Monitor security', endpoint: '/api/cron/security-monitoring', isAutomated: false, category: 'Platform' },
    { id: 'system-health', name: 'System Health', description: 'System health check', endpoint: '/api/cron/system-health', isAutomated: false, category: 'Platform' },
    { id: 'system-maintenance', name: 'System Maintenance', description: 'General maintenance', endpoint: '/api/cron/system-maintenance', isAutomated: false, category: 'Platform' },
    { id: 'supabase-health', name: 'Supabase Health', description: 'Check Supabase status', endpoint: '/api/cron/supabase-health', isAutomated: false, category: 'Platform' },
    { id: 'automated-testing', name: 'Automated Testing', description: 'Run automated tests', endpoint: '/api/cron/automated-testing', isAutomated: false, category: 'Platform' },
    { id: 'student-analytics', name: 'Student Analytics', description: 'Update student analytics', endpoint: '/api/cron/student-analytics', isAutomated: false, category: 'Platform' },
    { id: 'gamification', name: 'Gamification', description: 'Update points and badges', endpoint: '/api/cron/gamification', isAutomated: false, category: 'Platform' },
    { id: 'auth-check', name: 'Auth Check', description: 'Verify authentication status', endpoint: '/api/cron/auth-check', isAutomated: false, category: 'Platform' },
    { id: 'live-class-automation', name: 'Live Class Automation', description: 'Manage live class schedules', endpoint: '/api/cron/live-class-automation', isAutomated: false, category: 'Academic' },
];

const ALL_JOBS = [...AUTOMATED_CRON_JOBS, ...NON_AUTOMATED_CRON_JOBS];

export default function CronJobsPage() {
    const supabase = getSupabaseBrowserClient();
    const [jobs, setJobs] = useState<CronJob[]>(ALL_JOBS);
    const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
    const [jobLogs, setJobLogs] = useState<Record<string, any[]>>({});
    const [showLogs, setShowLogs] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState<'all' | 'automated' | 'manual'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [cronSecret, setCronSecret] = useState('');
    const [showSecret, setShowSecret] = useState(false);

    const categories = ['all', ...new Set(NON_AUTOMATED_CRON_JOBS.map(j => j.category))];

    const fetchJobLogs = useCallback(async (jobId: string) => {
        if (!supabase) return;
        
        const { data } = await supabase
            .from('cron_job_logs')
            .select('*')
            .eq('job_name', jobId)
            .order('executed_at', { ascending: false })
            .limit(10);
        
        if (data) {
            setJobLogs(prev => ({ ...prev, [jobId]: data }));
        }
    }, [supabase]);

    useEffect(() => {
        // Fetch logs for automated jobs
        AUTOMATED_CRON_JOBS.forEach(job => {
            fetchJobLogs(job.id);
        });
    }, [fetchJobLogs]);

    const runJob = async (job: CronJob) => {
        if (!cronSecret) {
            alert('Please enter CRON_SECRET to run jobs manually');
            return;
        }

        setRunningJobs(prev => new Set(prev).add(job.id));
        
        try {
            const response = await fetch(`${job.endpoint}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${cronSecret}`,
                },
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert(`✅ ${job.name} completed successfully!`);
                fetchJobLogs(job.id);
            } else {
                alert(`❌ ${job.name} failed: ${result.error || 'Unknown error'}`);
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
        if (filter === 'automated' && !job.isAutomated) return false;
        if (filter === 'manual' && job.isAutomated) return false;
        if (categoryFilter !== 'all' && job.category !== categoryFilter) return false;
        return true;
    });

    const automatedCount = AUTOMATED_CRON_JOBS.length;
    const manualCount = NON_AUTOMATED_CRON_JOBS.length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Cron Jobs Manager</h1>
                    <p className="text-sm text-slate-500">Manage automated and manual background tasks</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2">
                        <Server className="w-4 h-4 text-slate-400" />
                        <input
                            type={showSecret ? "text" : "password"}
                            placeholder="Enter CRON_SECRET"
                            value={cronSecret}
                            onChange={(e) => setCronSecret(e.target.value)}
                            className="text-sm border-none outline-none w-40 bg-transparent"
                        />
                        <button
                            onClick={() => setShowSecret(!showSecret)}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{automatedCount}</p>
                            <p className="text-xs text-white/80">Automated Jobs</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{manualCount}</p>
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
            <div className="flex flex-wrap gap-3">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        All Jobs
                    </button>
                    <button
                        onClick={() => setFilter('automated')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            filter === 'automated' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Automated
                    </button>
                    <button
                        onClick={() => setFilter('manual')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            filter === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Manual
                    </button>
                </div>
                
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>
                            {cat === 'all' ? 'All Categories' : cat}
                        </option>
                    ))}
                </select>
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
                                        {job.isAutomated ? 'AUTOMATED' : 'MANUAL'}
                                    </span>
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                                        {job.category}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mb-2">{job.description}</p>
                                <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                                    {job.endpoint}
                                </code>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {!job.isAutomated && (
                                    <button
                                        onClick={() => runJob(job)}
                                        disabled={runningJobs.has(job.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {runningJobs.has(job.id) ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Running...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4" />
                                                Run Now
                                            </>
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowLogs(prev => ({ ...prev, [job.id]: !prev[job.id] }));
                                        if (!showLogs[job.id]) fetchJobLogs(job.id);
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <Clock className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Logs Section */}
                        {showLogs[job.id] && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-medium text-slate-700 mb-2">Recent Runs</h4>
                                {jobLogs[job.id]?.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {jobLogs[job.id].map((log: any, idx: number) => (
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
                                                    {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                                                </span>
                                                <span className="text-slate-500 flex-1 truncate">
                                                    {log.details?.message || '-'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400">No recent logs available</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
