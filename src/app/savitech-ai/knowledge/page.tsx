'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    Bot, 
    Upload, 
    FileText, 
    Search, 
    Sparkles, 
    ChevronLeft,
    File,
    Image,
    Video,
    Clock,
    CheckCircle,
    AlertCircle,
    BookOpen,
    Brain,
    Lightbulb,
    ArrowRight,
    Trash2,
    Download,
    Eye,
    MoreVertical,
    Filter,
    SortDesc
} from 'lucide-react';

const uploadedDocuments = [
    { id: '1', name: 'Physics Chapter 1 - Mechanics.pdf', type: 'pdf', size: '2.4 MB', date: '2 hours ago', status: 'analyzed', summary: 'Covers Newtonian mechanics, laws of motion, and energy conservation...' },
    { id: '2', name: 'Chemistry Organic Notes.pdf', type: 'pdf', size: '1.8 MB', date: '1 day ago', status: 'analyzed', summary: 'Comprehensive notes on organic reaction mechanisms...' },
    { id: '3', name: 'Math Formula Sheet.jpg', type: 'image', size: '450 KB', date: '2 days ago', status: 'analyzed', summary: 'Key formulas for calculus and algebra...' },
    { id: '4', name: 'Biology Cell Structure.pdf', type: 'pdf', size: '3.2 MB', date: '3 days ago', status: 'processing', summary: null },
    { id: '5', name: 'Lecture Recording.mp4', type: 'video', size: '156 MB', date: '1 week ago', status: 'analyzed', summary: 'Video lecture on neural networks and deep learning...' },
];

const knowledgeInsights = [
    { title: 'Most analyzed topic', value: 'Physics - Mechanics', icon: Brain },
    { title: 'Total pages processed', value: '2,450', icon: FileText },
    { title: 'Summaries generated', value: '156', icon: BookOpen },
    { title: 'Study time saved', value: '48 hours', icon: Clock },
];

export default function SaviTechAIKnowledgePage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        // Handle file upload
    };

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
                                <h1 className="text-2xl font-bold">Knowledge Center</h1>
                                <p className="text-slate-400 text-sm">Upload & analyze documents</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowUploadModal(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                        >
                            <Upload className="w-5 h-5" />
                            Upload Document
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative max-w-2xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search documents, summaries, or topics..."
                            className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-white/10 rounded-2xl focus:outline-none focus:border-purple-500/50 text-white placeholder:text-slate-500"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {knowledgeInsights.map((insight, index) => {
                        const Icon = insight.icon;
                        return (
                            <div key={index} className="bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <Icon className="w-5 h-5 text-purple-400" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold">{insight.value}</p>
                                <p className="text-sm text-slate-400">{insight.title}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Upload Area */}
                <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                        mb-8 border-2 border-dashed rounded-2xl p-8 text-center transition-all
                        ${isDragging 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : 'border-white/10 hover:border-white/20'
                        }
                    `}
                >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Drop files here to upload</h3>
                    <p className="text-slate-400 mb-4">Supports PDF, Images, Videos, and Documents</p>
                    <div className="flex justify-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                            <FileText className="w-4 h-4" /> PDF
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Image className="w-4 h-4" /> Images
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Video className="w-4 h-4" /> Videos
                        </span>
                    </div>
                </div>

                {/* Documents List */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Your Documents</h2>
                        <div className="flex items-center gap-2">
                            <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700">
                                <Filter className="w-4 h-4" />
                                Filter
                            </button>
                            <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700">
                                <SortDesc className="w-4 h-4" />
                                Sort
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {uploadedDocuments.map((doc) => (
                            <div 
                                key={doc.id}
                                className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 hover:border-purple-500/30 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                                        {doc.type === 'pdf' && <FileText className="w-6 h-6 text-white" />}
                                        {doc.type === 'image' && <Image className="w-6 h-6 text-white" />}
                                        {doc.type === 'video' && <Video className="w-6 h-6 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="font-semibold">{doc.name}</h3>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                                                    <span>{doc.size}</span>
                                                    <span>·</span>
                                                    <span>{doc.date}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {doc.status === 'analyzed' ? (
                                                    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Analyzed
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Processing
                                                    </span>
                                                )}
                                                <button className="p-2 hover:bg-white/10 rounded-lg">
                                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                                </button>
                                            </div>
                                        </div>
                                        {doc.summary && (
                                            <div className="mt-3 p-3 bg-slate-800/50 rounded-xl">
                                                <div className="flex items-start gap-2">
                                                    <Lightbulb className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                                                    <p className="text-sm text-slate-300">{doc.summary}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-3">
                                            <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors">
                                                <Eye className="w-3 h-3" />
                                                View
                                            </button>
                                            <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors">
                                                <Brain className="w-3 h-3" />
                                                Analyze
                                            </button>
                                            <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors">
                                                <Sparkles className="w-3 h-3" />
                                                Summarize
                                            </button>
                                            <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 transition-colors">
                                                <Download className="w-3 h-3" />
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
