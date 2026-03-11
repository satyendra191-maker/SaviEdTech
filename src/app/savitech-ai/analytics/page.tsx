'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    Bot, 
    ChevronLeft,
    TrendingUp,
    TrendingDown,
    Users,
    MessageSquare,
    Clock,
    Zap,
    Brain,
    Target,
    BarChart3,
    Activity,
    Calendar,
    Download,
    Filter,
    Eye,
    ArrowUpRight,
    ArrowDownRight,
    Star,
    ThumbsUp,
    FileText,
    Lightbulb
} from 'lucide-react';

const stats = [
    { label: 'Total Queries', value: '12,450', change: '+12.5%', trend: 'up', icon: MessageSquare },
    { label: 'Avg Response Time', value: '1.2s', change: '-0.3s', trend: 'down', icon: Clock },
    { label: 'User Satisfaction', value: '4.8/5', change: '+0.2', trend: 'up', icon: Star },
    { label: 'Accuracy Rate', value: '98.5%', change: '+1.5%', trend: 'up', icon: Target },
];

const weeklyData = [
    { day: 'Mon', queries: 245, responses: 242 },
    { day: 'Tue', queries: 312, responses: 308 },
    { day: 'Wed', queries: 287, responses: 285 },
    { day: 'Thu', queries: 356, responses: 352 },
    { day: 'Fri', queries: 298, responses: 295 },
    { day: 'Sat', queries: 412, responses: 408 },
    { day: 'Sun', queries: 189, responses: 187 },
];

const topicData = [
    { name: 'Physics', queries: 4234, percentage: 34 },
    { name: 'Mathematics', queries: 3567, percentage: 29 },
    { name: 'Chemistry', queries: 2456, percentage: 20 },
    { name: 'Biology', queries: 1234, percentage: 10 },
    { name: 'Other', queries: 959, percentage: 7 },
];

const recentInteractions = [
    { id: 1, query: 'Explain quantum entanglement', type: 'Concept', time: '2 min ago', rating: 5 },
    { id: 2, query: 'Solve derivative problem', type: 'Problem', time: '5 min ago', rating: 4 },
    { id: 3, query: 'Generate chemistry notes', type: 'Content', time: '12 min ago', rating: 5 },
    { id: 4, query: 'Explain neural networks', type: 'Concept', time: '18 min ago', rating: 4 },
    { id: 5, query: 'Python code review', type: 'Code', time: '25 min ago', rating: 5 },
];

export default function SaviTechAIAnalyticsPage() {
    const [timeRange, setTimeRange] = useState('7d');

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
                                <h1 className="text-2xl font-bold">Analytics</h1>
                                <p className="text-slate-400 text-sm">Track AI performance and insights</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <select 
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-500/50"
                            >
                                <option value="24h">Last 24 hours</option>
                                <option value="7d">Last 7 days</option>
                                <option value="30d">Last 30 days</option>
                                <option value="90d">Last 90 days</option>
                            </select>
                            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition-colors">
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div key={index} className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <Icon className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <span className={`flex items-center gap-1 text-xs font-medium ${
                                        stat.trend === 'up' ? 'text-green-400' : 'text-green-400'
                                    } bg-green-400/10 px-2 py-1 rounded-full`}>
                                        {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {stat.change}
                                    </span>
                                </div>
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-sm text-slate-400">{stat.label}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Charts Section */}
                <div className="grid lg:grid-cols-3 gap-6 mb-8">
                    {/* Weekly Activity Chart */}
                    <div className="lg:col-span-2 bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                        <h2 className="text-lg font-semibold mb-4">Weekly Activity</h2>
                        <div className="h-64 flex items-end justify-between gap-2">
                            {weeklyData.map((day, index) => (
                                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="w-full flex flex-col gap-1">
                                        <div 
                                            className="w-full bg-gradient-to-t from-purple-600 to-indigo-500 rounded-t-lg"
                                            style={{ height: `${(day.queries / 412) * 180}px` }}
                                        />
                                        <div 
                                            className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg opacity-60"
                                            style={{ height: `${(day.responses / 412) * 180}px` }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-400">{day.day}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full" />
                                <span className="text-xs text-slate-400">Queries</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" />
                                <span className="text-xs text-slate-400">Responses</span>
                            </div>
                        </div>
                    </div>

                    {/* Topic Distribution */}
                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                        <h2 className="text-lg font-semibold mb-4">Topic Distribution</h2>
                        <div className="space-y-4">
                            {topicData.map((topic, index) => (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm">{topic.name}</span>
                                        <span className="text-sm text-slate-400">{topic.queries.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all"
                                            style={{ width: `${topic.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                    {/* Response Time */}
                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                        <h2 className="text-lg font-semibold mb-4">Response Performance</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-800/50 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-amber-400" />
                                    <span className="text-sm text-slate-400">Avg Response</span>
                                </div>
                                <p className="text-2xl font-bold">1.2s</p>
                                <p className="text-xs text-green-400 mt-1">-15% from last week</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Brain className="w-4 h-4 text-purple-400" />
                                    <span className="text-sm text-slate-400">Processing</span>
                                </div>
                                <p className="text-2xl font-bold">0.4s</p>
                                <p className="text-xs text-green-400 mt-1">-20% from last week</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm text-slate-400">Uptime</span>
                                </div>
                                <p className="text-2xl font-bold">99.9%</p>
                                <p className="text-xs text-green-400 mt-1">Excellent</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <ThumbsUp className="w-4 h-4 text-green-400" />
                                    <span className="text-sm text-slate-400">Satisfaction</span>
                                </div>
                                <p className="text-2xl font-bold">96%</p>
                                <p className="text-xs text-green-400 mt-1">+2% from last week</p>
                            </div>
                        </div>
                    </div>

                    {/* User Engagement */}
                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                        <h2 className="text-lg font-semibold mb-4">User Engagement</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-purple-400" />
                                    <span className="text-sm">Active Users</span>
                                </div>
                                <span className="font-bold">2,340</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="w-5 h-5 text-blue-400" />
                                    <span className="text-sm">Avg Messages/User</span>
                                </div>
                                <span className="font-bold">5.3</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-amber-400" />
                                    <span className="text-sm">Returning Users</span>
                                </div>
                                <span className="font-bold">78%</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-green-400" />
                                    <span className="text-sm">Documents Analyzed</span>
                                </div>
                                <span className="font-bold">1,245</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Interactions */}
                <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Recent Interactions</h2>
                        <button className="text-sm text-purple-400 hover:text-purple-300">View All</button>
                    </div>
                    <div className="space-y-3">
                        {recentInteractions.map((interaction) => (
                            <div 
                                key={interaction.id}
                                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <Lightbulb className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{interaction.query}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-400">{interaction.type}</span>
                                            <span className="text-xs text-slate-500">·</span>
                                            <span className="text-xs text-slate-400">{interaction.time}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star 
                                            key={i} 
                                            className={`w-4 h-4 ${i < interaction.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} 
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
