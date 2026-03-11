'use client';

import Link from 'next/link';
import { 
    Bot, 
    ChevronLeft,
    Brain,
    Wand2,
    FileText,
    Code,
    Megaphone,
    Sparkles,
    ArrowRight,
    CheckCircle,
    Clock,
    Zap,
    BookOpen,
    Calculator,
    Lightbulb,
    PenTool,
    Search,
    MessageSquare,
    Video,
    Download,
    Play,
    Star
} from 'lucide-react';

const aiTools = [
    {
        id: 'question-solver',
        name: 'AI Question Solver',
        description: 'Upload or capture questions and get step-by-step solutions instantly',
        features: ['Camera capture', 'OCR recognition', 'Detailed solutions', 'Multiple formats'],
        href: '/ai-question-solver',
        icon: Brain,
        color: 'from-blue-500 to-cyan-500',
        popular: true,
    },
    {
        id: 'content-generator',
        name: 'AI Content Generator',
        description: 'Generate educational content, notes, and study materials',
        features: ['Auto-generate notes', 'Chapter summaries', 'Key points extraction', 'Multiple languages'],
        href: '/ai-content-generator',
        icon: Wand2,
        color: 'from-purple-500 to-pink-500',
        popular: true,
    },
    {
        id: 'summary-generator',
        name: 'AI Summary Generator',
        description: 'Summarize documents, chapters, and lengthy content quickly',
        features: ['Quick summaries', 'Bullet points', 'Key concepts', 'TL;DR versions'],
        href: '/ai-summary',
        icon: FileText,
        color: 'from-amber-500 to-orange-500',
    },
    {
        id: 'code-assistant',
        name: 'AI Code Assistant',
        description: 'Get help with programming, code reviews, and debugging',
        features: ['Code generation', 'Debug help', 'Code review', 'Multiple languages'],
        href: '/ai-code',
        icon: Code,
        color: 'from-green-500 to-emerald-500',
    },
    {
        id: 'marketing',
        name: 'AI Marketing Assistant',
        description: 'Create marketing content, campaigns, and strategies',
        features: ['Content ideas', 'Campaign plans', 'Social media', 'SEO optimization'],
        href: '/ai-marketing',
        icon: Megaphone,
        color: 'from-red-500 to-rose-500',
    },
    {
        id: 'voice-doubt',
        name: 'AI Voice Doubt Teacher',
        description: 'Speak your doubts and get instant audio explanations',
        features: ['Voice input', 'Audio responses', 'Multiple languages', '24/7 available'],
        href: '/ai-voice-doubt',
        icon: MessageSquare,
        color: 'from-cyan-500 to-teal-500',
    },
    {
        id: 'adaptive',
        name: 'AI Adaptive Learning',
        description: 'Personalized learning path based on your performance',
        features: ['Custom path', 'Difficulty adjustment', 'Progress tracking', 'Weak area focus'],
        href: '/ai-adaptive',
        icon: BookOpen,
        color: 'from-indigo-500 to-purple-500',
    },
    {
        id: 'video-lecture',
        name: 'AI Video Lectures',
        description: 'Generate AI-powered video lessons with whiteboard teaching',
        features: ['Auto subtitles', 'Speed control', 'Summary generation', 'Chapter markers'],
        href: '/ai-video-lectures',
        icon: Video,
        color: 'from-pink-500 to-rose-500',
    },
    {
        id: 'rank-simulator',
        name: 'AI Rank Simulator',
        description: 'Predict your All India Rank with precision analysis',
        features: ['Rank prediction', 'Percentile analysis', 'Competition insights', 'Trend analysis'],
        href: '/ai-rank-simulator',
        icon: Calculator,
        color: 'from-violet-500 to-purple-500',
    },
    {
        id: 'knowledge-graph',
        name: 'AI Knowledge Graph',
        description: 'Visual concept mapping and dependency tracking',
        features: ['Concept visualization', 'Topic connections', 'Mastery tracking', 'Prerequisites'],
        href: '/ai-knowledge-graph',
        icon: Lightbulb,
        color: 'from-rose-500 to-red-500',
    },
];

const categories = [
    { name: 'All Tools', count: 10, active: true },
    { name: 'Learning', count: 6 },
    { name: 'Content', count: 3 },
    { name: 'Productivity', count: 4 },
];

export default function SaviTechAIToolsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/savitech-ai" className="flex items-center gap-2 text-slate-400 hover:text-white">
                            <ChevronLeft className="w-5 h-5" />
                            <span>Back</span>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">AI Tools</h1>
                            <p className="text-slate-400 text-sm">Powerful AI tools for learning and productivity</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search */}
                <div className="mb-8">
                    <div className="relative max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search AI tools..."
                            className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-white/10 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-slate-500"
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {categories.map((category, index) => (
                        <button
                            key={index}
                            className={`
                                px-4 py-2 rounded-xl text-sm font-medium transition-all
                                ${category.active 
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' 
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }
                            `}
                        >
                            {category.name}
                            <span className="ml-2 text-xs opacity-70">({category.count})</span>
                        </button>
                    ))}
                </div>

                {/* Popular Tag */}
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-amber-400">Popular tools this week</span>
                </div>

                {/* Tools Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {aiTools.map((tool, index) => {
                        const Icon = tool.icon;
                        return (
                            <Link
                                key={tool.id}
                                href={tool.href}
                                className="group bg-slate-900/50 border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all hover:-translate-y-1"
                            >
                                {tool.popular && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1 rounded-full mb-4">
                                        <Star className="w-3 h-3" />
                                        Popular
                                    </span>
                                )}
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-7 h-7 text-white" />
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2 group-hover:text-purple-400 transition-colors">{tool.name}</h3>
                                <p className="text-sm text-slate-400 mb-4">{tool.description}</p>
                                <div className="flex flex-wrap gap-2">
                                    {tool.features.slice(0, 3).map((feature, i) => (
                                        <span 
                                            key={i}
                                            className="text-xs px-2 py-1 bg-slate-800 rounded-lg text-slate-300"
                                        >
                                            {feature}
                                        </span>
                                    ))}
                                    {tool.features.length > 3 && (
                                        <span className="text-xs px-2 py-1 bg-slate-800 rounded-lg text-slate-400">
                                            +{tool.features.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Feature Highlights */}
                <div className="mt-12 grid md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-500/20 rounded-2xl p-6">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                            <Zap className="w-6 h-6 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
                        <p className="text-sm text-slate-400">Get instant responses within seconds. Our AI processes queries faster than ever.</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border border-blue-500/20 rounded-2xl p-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                            <CheckCircle className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">High Accuracy</h3>
                        <p className="text-sm text-slate-400">98.5% accuracy rate with continuous learning and improvement.</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-500/20 rounded-2xl p-6">
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                            <Clock className="w-6 h-6 text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">24/7 Available</h3>
                        <p className="text-sm text-slate-400">Access AI assistance anytime, anywhere. We're always here to help.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
