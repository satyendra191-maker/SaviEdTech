'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Bot,
    Send,
    Upload,
    FileText,
    Image,
    Video,
    File,
    X,
    Loader2,
    Sparkles,
    Users,
    BookOpen,
    PlayCircle,
    GraduationCap,
    CreditCard,
    FileCode,
    Briefcase,
    BarChart3,
    Settings,
    CheckCircle,
    AlertCircle,
    Wand2,
    Brain,
    Database,
    PenTool,
    Calculator,
    FolderOpen,
    Trash2,
    Download,
    Eye,
    Edit,
    Plus,
    Save,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    Shield,
    Target,
    MessageSquare,
    Zap,
    HelpCircle,
    Link,
    ExternalLink,
} from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    actions?: AIAction[];
    loading?: boolean;
}

interface AIAction {
    id: string;
    type: 'create' | 'update' | 'delete' | 'view' | 'generate' | 'export' | 'upload' | 'edit';
    label: string;
    icon: string;
    data?: any;
}

interface TaskCategory {
    id: string;
    name: string;
    icon: typeof Users;
    tasks: string[];
}

const TASK_CATEGORIES: TaskCategory[] = [
    {
        id: 'students',
        name: 'Student Management',
        icon: Users,
        tasks: [
            'Add new student', 'View all students', 'Update student profile',
            'Activate/deactivate student', 'View student progress', 'Export student data',
            'Manage student subscriptions', 'View performance analytics', 'Send notification to students'
        ]
    },
    {
        id: 'courses',
        name: 'Course Management',
        icon: BookOpen,
        tasks: [
            'Create new course', 'Update course details', 'Publish/unpublish course',
            'Add modules to course', 'Set course pricing', 'View course analytics',
            'Manage course categories', 'Duplicate course', 'Delete course'
        ]
    },
    {
        id: 'lectures',
        name: 'Lecture Management',
        icon: PlayCircle,
        tasks: [
            'Upload new lecture', 'Generate AI lecture', 'Edit lecture content',
            'Schedule lecture', 'Add lecture notes', 'Attach resources',
            'Publish lecture', 'Delete lecture', 'View lecture analytics'
        ]
    },
    {
        id: 'questions',
        name: 'Question Bank',
        icon: HelpCircle,
        tasks: [
            'Add new question', 'Generate AI questions', 'Import questions from file',
            'Update question', 'Delete question', 'Organize by topic',
            'Create question paper', 'Export questions', 'View question analytics'
        ]
    },
    {
        id: 'tests',
        name: 'Test Management',
        icon: GraduationCap,
        tasks: [
            'Create mock test', 'Generate AI test', 'Schedule test',
            'Publish test results', 'View test analytics', 'Manage test settings',
            'Create DPP', 'Generate chapter test', 'View attempt history'
        ]
    },
    {
        id: 'payments',
        name: 'Payments & Finance',
        icon: CreditCard,
        tasks: [
            'View payment history', 'Process refund', 'Generate invoice',
            'View financial reports', 'Export GST reports', 'View donation records',
            'Manage subscriptions', 'View revenue analytics', 'Generate receipts'
        ]
    },
    {
        id: 'leads',
        name: 'Lead Management',
        icon: FileText,
        tasks: [
            'View all leads', 'Add new lead', 'Update lead status',
            'Convert lead to student', 'Export leads', 'View lead analytics',
            'Send follow-up email', 'Assign lead to manager', 'Delete lead'
        ]
    },
    {
        id: 'careers',
        name: 'Career & HR',
        icon: Briefcase,
        tasks: [
            'Post new job', 'View applications', 'Update job status',
            'Schedule interview', 'Send offer letter', 'View career analytics',
            'Manage departments', 'View employee list', 'Post internship'
        ]
    },
    {
        id: 'cms',
        name: 'Content Management',
        icon: FileCode,
        tasks: [
            'Create new page', 'Edit page content', 'Manage blog posts',
            'Upload media files', 'Manage menu', 'Update footer/header',
            'Create announcement', 'Manage FAQ', 'SEO settings'
        ]
    },
    {
        id: 'reports',
        name: 'Reports & Analytics',
        icon: BarChart3,
        tasks: [
            'Generate student report', 'Generate revenue report', 'Export GST',
            'Create custom report', 'View analytics dashboard', 'Schedule reports',
            'Compare performance', 'View trends', 'Download data'
        ]
    },
    {
        id: 'settings',
        name: 'System Settings',
        icon: Settings,
        tasks: [
            'Manage admin users', 'Configure API keys', 'Set up webhooks',
            'Manage roles & permissions', 'System maintenance', 'Backup database',
            'Configure notifications', 'Manage integrations', 'View system logs'
        ]
    },
    {
        id: 'video-knowledge',
        name: 'Video Learning',
        icon: Video,
        tasks: [
            'Upload video lecture', 'Process video content', 'Extract video transcript',
            'Generate quiz from video', 'Create notes from video', 'Video content analysis',
            'Subtitle generation', 'Video chapters', 'Key moment extraction'
        ]
    }
];

export default function AIAdminAssistantPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCategory, setShowCategory] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [contentUrls, setContentUrls] = useState<string[]>([]);
    const [urlInput, setUrlInput] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (messages.length === 0) {
            const welcomeMessage: ChatMessage = {
                id: 'welcome',
                role: 'assistant',
                content: `Hello! I'm your **SaviEduTech AI Admin Assistant**. I can help you manage your entire platform with simple commands.

**What I can do:**
- 👥 **Student Management** - Add, update, view students
- 📚 **Course & Lecture Management** - Create, publish, manage content
- 📝 **Question Bank** - Add questions, generate AI questions
- 📊 **Tests & Exams** - Create mock tests, schedule exams
- 💳 **Payments & Finance** - View reports, generate invoices, GST
- 📋 **Leads & Careers** - Manage inquiries and job postings
- 🎨 **CMS** - Create pages, manage content
- 📈 **Analytics** - Generate reports and insights
- 🎬 **Video Learning** - Upload videos, extract transcripts, generate quizzes

**How to use:**
1. Type what you want to do (e.g., "Add a new student" or "Show me revenue report")
2. Or click on a task category below for quick actions
3. You can also **upload files or videos** to boost my knowledge base

Try saying: *"Show me all students"* or *"Upload a video lecture"*`,
                timestamp: new Date()
            };
            setMessages([welcomeMessage]);
        }
    }, []);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/ai/admin-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: input,
                    context: uploadedFiles.length > 0 ? 'Additional knowledge from uploaded files' : undefined
                })
            });

            const data = await response.json();

            const aiResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response || data.message || 'I processed your request. Is there anything else you need?',
                timestamp: new Date(),
                actions: data.actions || []
            };

            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'I encountered an error processing your request. Please try again or rephrase your command.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskSelect = (task: string) => {
        setInput(task);
        setShowCategory(null);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newFiles = Array.from(files);
        setUploadedFiles(prev => [...prev, ...newFiles]);
        setUploadProgress(0);

        const formData = new FormData();
        newFiles.forEach(file => formData.append('files', file));

        try {
            const response = await fetch('/api/ai/knowledge-upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                const successMessage: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `📚 I've successfully processed ${newFiles.length} file(s)! My knowledge base is now enhanced with:\n\n${newFiles.map(f => `- ${f.name}`).join('\n')}\n\nI can now generate more accurate content based on these materials.`,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, successMessage]);
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploadProgress(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const addContentUrl = async () => {
        if (!urlInput.trim()) return;

        const url = urlInput.trim();
        setContentUrls(prev => [...prev, url]);
        setUrlInput('');
        setShowUrlInput(false);

        try {
            const response = await fetch('/api/ai/knowledge-from-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (response.ok) {
                const data = await response.json();
                const successMessage: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `🔗 I've successfully added content from URL!\n\n**Source:** ${url}\n\n**Content Type:** ${data.contentType || 'Unknown'}\n**Status:** ${data.status || 'Processed'}\n\nI can now use this knowledge to answer questions and generate content.`,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, successMessage]);
            }
        } catch (error) {
            console.error('URL processing failed:', error);
            const errorMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `⚠️ Could not process the URL: ${url}\n\nPlease make sure the URL is publicly accessible and contains educational content (video, PDF, article, etc.)`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const removeUrl = (index: number) => {
        setContentUrls(prev => prev.filter((_, i) => i !== index));
    };

    const quickActions = [
        { icon: Users, label: 'Add Student', action: 'Add new student' },
        { icon: BookOpen, label: 'Create Course', action: 'Create a new course' },
        { icon: PlayCircle, label: 'Upload Lecture', action: 'Upload new lecture' },
        { icon: GraduationCap, label: 'Create Test', action: 'Create mock test' },
        { icon: BarChart3, label: 'View Reports', action: 'Show financial reports' },
        { icon: Brain, label: 'Generate AI Content', action: 'Generate AI questions' }
    ];

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-4">
            {/* Left Sidebar - Task Categories */}
            <div className="w-80 flex-shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-purple-600 to-indigo-600">
                    <div className="flex items-center gap-2 text-white">
                        <Bot className="w-5 h-5" />
                        <h2 className="font-semibold">AI Admin Tasks</h2>
                    </div>
                    <p className="text-xs text-white/70 mt-1">Click a task or type your request</p>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {TASK_CATEGORIES.map(category => (
                        <div key={category.id} className="border border-slate-100 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setShowCategory(showCategory === category.id ? null : category.id)}
                                className="w-full flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                            >
                                <category.icon className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-medium text-slate-700 flex-1">{category.name}</span>
                                {showCategory === category.id ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                            </button>
                            {showCategory === category.id && (
                                <div className="bg-white border-t border-slate-100">
                                    {category.tasks.map((task, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleTaskSelect(task)}
                                            className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                        >
                                            {task}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Upload Section */}
                <div className="p-3 border-t border-slate-200">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.mp4,.mov,.avi,.mkv,.webm,.m4v"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:border-purple-500 hover:text-purple-600 transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Upload Knowledge (Files & Videos)
                    </button>
                    <p className="text-xs text-slate-400 mt-1 text-center">
                        PDF, DOC, PPT, TXT, MP4, MOV, AVI, MKV
                    </p>
                    {uploadProgress !== null && (
                        <div className="mt-2">
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-600 transition-all"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                    {uploadedFiles.length > 0 && (
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                            {uploadedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">
                                    {file.type.startsWith('video/') ? (
                                        <Video className="w-3 h-3 text-purple-500" />
                                    ) : (
                                        <File className="w-3 h-3" />
                                    )}
                                    <span className="flex-1 truncate">{file.name}</span>
                                    <button onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-slate-900">SaviEduTech AI Admin</h1>
                            <p className="text-xs text-slate-500">Powered by advanced AI • {quickActions.length} quick actions available</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {quickActions.slice(0, 3).map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleTaskSelect(action.action)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors"
                            >
                                <action.icon className="w-3 h-3" />
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map(message => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-xl p-4 ${
                                    message.role === 'user'
                                        ? 'bg-purple-600 text-white'
                                        : message.role === 'system'
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                        : 'bg-slate-50 text-slate-800 border border-slate-200'
                                }`}
                            >
                                {message.loading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Processing...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                                        {message.actions && message.actions.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {message.actions.map(action => (
                                                    <button
                                                        key={action.id}
                                                        className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs border border-slate-200 hover:bg-purple-50 hover:border-purple-300 transition-colors"
                                                    >
                                                        {action.type === 'create' && <Plus className="w-3 h-3 text-green-600" />}
                                                        {action.type === 'edit' && <Edit className="w-3 h-3 text-blue-600" />}
                                                        {action.type === 'delete' && <Trash2 className="w-3 h-3 text-red-600" />}
                                                        {action.type === 'view' && <Eye className="w-3 h-3 text-purple-600" />}
                                                        {action.type === 'generate' && <Wand2 className="w-3 h-3 text-amber-600" />}
                                                        {action.type === 'export' && <Download className="w-3 h-3 text-slate-600" />}
                                                        {action.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mt-2 text-xs opacity-60">
                                            {message.timestamp.toLocaleTimeString()}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-200 space-y-3">
                    {/* URL Input Section */}
                    {showUrlInput && (
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addContentUrl()}
                                placeholder="Paste URL (YouTube, PDF, article, etc.)"
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                                onClick={addContentUrl}
                                className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => setShowUrlInput(false)}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Main Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder="Ask me anything... (e.g., 'Add a new student' or 'Show revenue report')"
                            className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled={loading}
                        />
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            multiple
                            accept=".pdf,.doc,.docx,.txt"
                            className="hidden"
                        />
                        <button
                            onClick={() => setShowUrlInput(!showUrlInput)}
                            className="p-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                            title="Add content from URL"
                        >
                            <Link className="w-5 h-5 text-slate-600" />
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                            title="Attach file"
                        >
                            <Upload className="w-5 h-5 text-slate-600" />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Content URLs */}
                    {contentUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {contentUrls.map((url, idx) => (
                                <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs">
                                    <Link className="w-3 h-3" />
                                    <span className="max-w-[200px] truncate">{new URL(url).hostname}</span>
                                    <button onClick={() => removeUrl(idx)} className="ml-1 hover:text-red-500">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <p className="text-xs text-slate-500 mt-2 text-center">
                        AI may make mistakes. Verify important actions before execution.
                    </p>
                </div>
            </div>
        </div>
    );
}
