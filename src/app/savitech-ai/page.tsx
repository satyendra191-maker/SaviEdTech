'use client';

import Link from 'next/link';
import { 
    Bot, 
    MessageSquare, 
    Brain, 
    Sparkles, 
    ArrowRight, 
    TrendingUp,
    Clock,
    FileText,
    Zap,
    Wand2,
    BarChart3,
    Workflow,
    BookOpen,
    Code,
    Megaphone,
    Play,
    Users,
    Activity,
    Target,
    Lightbulb,
    Star,
    ChevronRight
} from 'lucide-react';

const stats = [
    { label: 'Total Queries', value: '12,450', change: '+12%', icon: MessageSquare, color: 'from-blue-500 to-cyan-500' },
    { label: 'AI Responses', value: '98.5%', change: '+2%', icon: Bot, color: 'from-purple-500 to-indigo-500' },
    { label: 'Time Saved', value: '480h', change: '+25%', icon: Clock, color: 'from-amber-500 to-orange-500' },
    { label: 'Active Users', value: '2,340', change: '+18%', icon: Users, color: 'from-green-500 to-emerald-500' },
];

const recentChats = [
    { id: 1, title: 'Explain quantum mechanics basics', time: '2 min ago', preview: 'Can you explain the fundamental concepts...' },
    { id: 2, title: 'Solve this calculus problem', time: '15 min ago', preview: 'Find the derivative of f(x) = x^3 + 2x^2...' },
    { id: 3, title: 'Generate study notes for Chemistry', time: '1 hour ago', preview: 'Create comprehensive notes on organic...' },
    { id: 4, title: 'AI Code: Binary search implementation', time: '2 hours ago', preview: 'Write a binary search algorithm in Python...' },
];

const quickActions = [
    { name: 'Ask AI', description: 'Get instant answers', href: '/savitech-ai/chat', icon: Brain, color: 'from-purple-500 to-indigo-500', popular: true },
    { name: 'Upload Document', description: 'Analyze & summarize', href: '/savitech-ai/knowledge', icon: FileText, color: 'from-blue-500 to-cyan-500' },
    { name: 'Create Workflow', description: 'Automate tasks', href: '/savitech-ai/workflows', icon: Workflow, color: 'from-amber-500 to-orange-500' },
    { name: 'View Analytics', description: 'Track insights', href: '/savitech-ai/analytics', icon: BarChart3, color: 'from-green-500 to-emerald-500' },
];

const aiTools = [
    { name: 'Question Solver', description: 'Solve any academic question', href: '/ai-question-solver', icon: Brain, color: 'from-blue-500 to-cyan-500' },
    { name: 'Content Generator', description: 'Create educational content', href: '/ai-content-generator', icon: Wand2, color: 'from-purple-500 to-pink-500' },
    { name: 'Summary Generator', description: 'Summarize documents & notes', href: '/ai-summary', icon: FileText, color: 'from-amber-500 to-orange-500' },
    { name: 'Code Assistant', description: 'Programming help & code review', href: '/ai-code', icon: Code, color: 'from-green-500 to-emerald-500' },
    { name: 'Marketing AI', description: 'Marketing automation', href: '/ai-marketing', icon: Megaphone, color: 'from-red-500 to-rose-500' },
];

const insights = [
    { title: 'Most used: Physics', value: '34%', icon: Target },
    { title: 'Avg response time', value: '1.2s', icon: Zap },
    { title: 'Accuracy rate', value: '98.5%', icon: Lightbulb },
    { title: 'User satisfaction', value: '4.8/5', icon: Star },
];

export default function SaviTechAIDashboard() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Welcome to SaviTech AI</h1>
                            <p className="text-slate-400 mt-1">Your intelligent learning companion</p>
                        </div>
                        <Link 
                            href="/savitech-ai/chat"
                            className="hidden sm:flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                        >
                            <Sparkles className="w-5 h-5" />
                            Start Conversation
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div 
                                key={index}
                                className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 hover:border-purple-500/30 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                                        {stat.change}
                                    </span>
                                </div>
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-sm text-slate-400">{stat.label}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Quick Actions */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {quickActions.map((action, index) => {
                            const Icon = action.icon;
                            return (
                                <Link
                                    key={index}
                                    href={action.href}
                                    className="group relative bg-slate-900/50 border border-white/10 rounded-2xl p-5 hover:border-purple-500/30 transition-all hover:-translate-y-1"
                                >
                                    {action.popular && (
                                        <span className="absolute -top-2 -right-2 text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1 rounded-full">
                                            Popular
                                        </span>
                                    )}
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="font-semibold mb-1">{action.name}</h3>
                                    <p className="text-sm text-slate-400">{action.description}</p>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Chats & Insights */}
                <div className="grid lg:grid-cols-3 gap-6 mb-8">
                    {/* Recent Conversations */}
                    <div className="lg:col-span-2 bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Recent Conversations</h2>
                            <Link href="/savitech-ai/chat" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                View all <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {recentChats.map((chat) => (
                                <Link
                                    key={chat.id}
                                    href={`/savitech-ai/chat?conversation=${chat.id}`}
                                    className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shrink-0">
                                        <MessageSquare className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="font-medium truncate">{chat.title}</h3>
                                            <span className="text-xs text-slate-500 shrink-0">{chat.time}</span>
                                        </div>
                                        <p className="text-sm text-slate-400 truncate mt-1">{chat.preview}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Insights */}
                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                        <h2 className="text-lg font-semibold mb-4">AI Insights</h2>
                        <div className="space-y-4">
                            {insights.map((insight, index) => {
                                const Icon = insight.icon;
                                return (
                                    <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
                                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400">{insight.title}</p>
                                            <p className="text-lg font-bold">{insight.value}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* AI Tools Grid */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">AI Tools</h2>
                        <Link href="/savitech-ai/ai-tools" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
                            View all tools <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {aiTools.map((tool, index) => {
                            const Icon = tool.icon;
                            return (
                                <Link
                                    key={index}
                                    href={tool.href}
                                    className="group bg-slate-900/50 border border-white/10 rounded-2xl p-5 hover:border-purple-500/30 transition-all hover:-translate-y-1"
                                >
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="font-semibold mb-1">{tool.name}</h3>
                                    <p className="text-xs text-slate-400">{tool.description}</p>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Mobile Floating Action Button */}
            <Link
                href="/savitech-ai/chat"
                className="fixed bottom-6 right-6 z-40 sm:hidden w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg shadow-purple-500/25 flex items-center justify-center"
            >
                <Sparkles className="w-6 h-6 text-white" />
            </Link>
        </div>
    );
}
