'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    Bot, 
    Workflow, 
    ChevronLeft,
    Play,
    Pause,
    Settings,
    MoreVertical,
    Plus,
    Clock,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    FileText,
    Users,
    Brain,
    BarChart3,
    Mail,
    Calendar,
    Zap,
    ArrowRight,
    Trash2,
    Copy,
    Eye
} from 'lucide-react';

const workflows = [
    { 
        id: '1', 
        name: 'Daily Study Report', 
        description: 'Generate daily study progress reports for students',
        status: 'active',
        lastRun: '2 hours ago',
        runs: 156,
        successRate: '98%',
        icon: FileText,
        color: 'from-blue-500 to-cyan-500'
    },
    { 
        id: '2', 
        name: 'Student Performance Analysis', 
        description: 'Analyze student performance and generate insights',
        status: 'active',
        lastRun: '5 hours ago',
        runs: 89,
        successRate: '95%',
        icon: BarChart3,
        color: 'from-purple-500 to-indigo-500'
    },
    { 
        id: '3', 
        name: 'Weekly Summary Generator', 
        description: 'Create weekly learning summaries for parents',
        status: 'paused',
        lastRun: '3 days ago',
        runs: 45,
        successRate: '100%',
        icon: Calendar,
        color: 'from-amber-500 to-orange-500'
    },
    { 
        id: '4', 
        name: 'Marketing Campaign Report', 
        description: 'Generate marketing performance reports',
        status: 'active',
        lastRun: '1 day ago',
        runs: 32,
        successRate: '92%',
        icon: TrendingUp,
        color: 'from-green-500 to-emerald-500'
    },
    { 
        id: '5', 
        name: 'Doubt Resolution Follow-up', 
        description: 'Auto-follow-up on unresolved student doubts',
        status: 'active',
        lastRun: '4 hours ago',
        runs: 234,
        successRate: '89%',
        icon: MessageCircle,
        color: 'from-red-500 to-rose-500'
    },
    { 
        id: '6', 
        name: 'Email Notification System', 
        description: 'Automated email notifications for updates',
        status: 'error',
        lastRun: '30 min ago',
        runs: 12,
        successRate: '75%',
        icon: Mail,
        color: 'from-pink-500 to-rose-500'
    },
];

const workflowTemplates = [
    { name: 'Student Performance Report', description: 'Comprehensive performance analysis', icon: Users },
    { name: 'Content Generation', description: 'Generate educational content', icon: Brain },
    { name: 'Marketing Analytics', description: 'Marketing campaign reports', icon: TrendingUp },
    { name: 'Notification Automation', description: 'Automated messaging', icon: Mail },
];

export default function SaviTechAIWorkflowsPage() {
    const [showCreateModal, setShowCreateModal] = useState(false);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/savitech-ai" className="flex items-center gap-2 text-slate-400 hover:text-white">
                                <ChevronLeft className="w-5 h-5" />
                                <span>Back</span>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold">Workflow Automation</h1>
                                <p className="text-slate-400 text-sm">Automate tasks with AI-powered workflows</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            Create Workflow
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold">5</p>
                        <p className="text-sm text-slate-400">Active Workflows</p>
                    </div>
                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Play className="w-5 h-5 text-blue-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold">568</p>
                        <p className="text-sm text-slate-400">Total Runs</p>
                    </div>
                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-purple-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold">94%</p>
                        <p className="text-sm text-slate-400">Success Rate</p>
                    </div>
                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-amber-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold">12h</p>
                        <p className="text-sm text-slate-400">Time Saved</p>
                    </div>
                </div>

                {/* Quick Templates */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-4">Quick Start Templates</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {workflowTemplates.map((template, index) => {
                            const Icon = template.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={() => setShowCreateModal(true)}
                                    className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 hover:border-purple-500/30 transition-all text-left"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mb-4">
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="font-semibold mb-1">{template.name}</h3>
                                    <p className="text-xs text-slate-400">{template.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Active Workflows */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Your Workflows</h2>
                    </div>

                    <div className="space-y-4">
                        {workflows.map((workflow) => {
                            const Icon = workflow.icon;
                            return (
                                <div 
                                    key={workflow.id}
                                    className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 hover:border-purple-500/30 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${workflow.color} flex items-center justify-center shrink-0`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{workflow.name}</h3>
                                                    <p className="text-sm text-slate-400 mt-1">{workflow.description}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {workflow.status === 'active' && (
                                                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                                                            <Play className="w-3 h-3" />
                                                            Active
                                                        </span>
                                                    )}
                                                    {workflow.status === 'paused' && (
                                                        <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
                                                            <Pause className="w-3 h-3" />
                                                            Paused
                                                        </span>
                                                    )}
                                                    {workflow.status === 'error' && (
                                                        <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Error
                                                        </span>
                                                    )}
                                                    <button className="p-2 hover:bg-white/10 rounded-lg">
                                                        <MoreVertical className="w-4 h-4 text-slate-400" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 mt-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <Clock className="w-4 h-4" />
                                                    Last run: {workflow.lastRun}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <Play className="w-4 h-4" />
                                                    {workflow.runs} runs
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <CheckCircle className="w-4 h-4" />
                                                    {workflow.successRate} success
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-4">
                                                <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors">
                                                    <Play className="w-3 h-3" />
                                                    Run Now
                                                </button>
                                                <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors">
                                                    <Eye className="w-3 h-3" />
                                                    View Details
                                                </button>
                                                <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors">
                                                    <Settings className="w-3 h-3" />
                                                    Configure
                                                </button>
                                                <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors">
                                                    <Copy className="w-3 h-3" />
                                                    Duplicate
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MessageCircle(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>;
}
