'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
    Bot, 
    Send, 
    Mic, 
    Camera, 
    Paperclip, 
    MoreVertical,
    Trash2,
    Copy,
    ThumbsUp,
    ThumbsDown,
    Sparkles,
    X,
    Volume2,
    VolumeX,
    RefreshCw,
    Image,
    FileText,
    ChevronLeft,
    Clock,
    MessageSquare
} from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sources?: string[];
    steps?: string[];
}

const recentConversations = [
    { id: '1', title: 'Explain quantum mechanics basics', time: '2 min ago', messages: 5 },
    { id: '2', title: 'Solve calculus problem', time: '15 min ago', messages: 8 },
    { id: '3', title: 'Chemistry notes generation', time: '1 hour ago', messages: 15 },
    { id: '4', title: 'Python code review', time: '2 hours ago', messages: 6 },
    { id: '5', title: 'Biology concept explanation', time: 'Yesterday', messages: 20 },
];

const suggestedQuestions = [
    "Explain photosynthesis in simple terms",
    "Solve: Find the derivative of x³ + 2x²",
    "Write a Python function for factorial",
    "Summarize the chapter on Neural Networks",
];

export default function SaviTechAIChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hello! I'm SaviTech AI, your intelligent learning assistant. Ask me anything - I can help with academics, solve problems, generate content, or answer questions. How can I assist you today?",
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Simulate AI response
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I understand your question. Let me provide a comprehensive answer based on the topic. This is a simulated response to demonstrate the chat interface. In production, this would connect to the actual AI backend.",
                timestamp: new Date(),
                steps: [
                    "Analyzing your question",
                    "Searching knowledge base",
                    "Generating response"
                ]
            };
            setMessages(prev => [...prev, aiResponse]);
            setIsLoading(false);
        }, 1500);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const startListening = () => {
        setIsListening(true);
        setTimeout(() => setIsListening(false), 3000);
    };

    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex">
            {/* Conversations Sidebar */}
            <aside className={`
                fixed md:relative z-40 left-0 top-0 h-screen bg-slate-900 border-r border-white/10
                transition-all duration-300 w-80
                ${showSidebar ? 'translate-x-0' : '-translate-x-full md:-translate-x-full'}
            `}>
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <Link href="/savitech-ai" className="flex items-center gap-2 text-slate-400 hover:text-white">
                            <ChevronLeft className="w-5 h-5" />
                            <span>Back</span>
                        </Link>
                        <button className="p-2 hover:bg-white/10 rounded-lg">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                    <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all">
                        <Sparkles className="w-5 h-5" />
                        New Chat
                    </button>
                </div>

                <div className="p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent</p>
                    <div className="space-y-2">
                        {recentConversations.map((conv) => (
                            <button
                                key={conv.id}
                                className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                            >
                                <MessageSquare className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{conv.title}</p>
                                    <p className="text-xs text-slate-500 mt-1">{conv.time} · {conv.messages} messages</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col h-screen">
                {/* Header */}
                <header className="h-16 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowSidebar(!showSidebar)}
                            className="p-2 hover:bg-white/10 rounded-lg md:hidden"
                        >
                            <MessageSquare className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h1 className="font-semibold">AI Chat</h1>
                                <p className="text-xs text-slate-400">Online</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-white/10 rounded-lg">
                            <Copy className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-white/10 rounded-lg">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                        <div 
                            key={message.id} 
                            className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`
                                w-8 h-8 rounded-xl flex items-center justify-center shrink-0
                                ${message.role === 'assistant' 
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600' 
                                    : 'bg-slate-700'
                                }
                            `}>
                                {message.role === 'assistant' 
                                    ? <Bot className="w-4 h-4 text-white" />
                                    : <span className="text-sm font-medium">You</span>
                                }
                            </div>
                            <div className={`flex-1 max-w-3xl ${message.role === 'user' ? 'text-right' : ''}`}>
                                <div className={`
                                    inline-block p-4 rounded-2xl 
                                    ${message.role === 'user' 
                                        ? 'bg-purple-600 text-white' 
                                        : 'bg-slate-800 text-white'
                                    }
                                `}>
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                    
                                    {message.steps && message.steps.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-white/10">
                                            <p className="text-xs text-slate-400 mb-2">Processing steps:</p>
                                            <div className="space-y-1">
                                                {message.steps.map((step, i) => (
                                                    <p key={i} className="text-xs text-slate-300 flex items-center gap-2">
                                                        <span className="w-4 h-4 rounded-full bg-purple-500/30 flex items-center justify-center">{i + 1}</span>
                                                        {step}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {message.role === 'assistant' && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <button className="p-1.5 hover:bg-white/10 rounded-lg" title="Copy">
                                            <Copy className="w-4 h-4 text-slate-400" />
                                        </button>
                                        <button className="p-1.5 hover:bg-white/10 rounded-lg" title="Good response">
                                            <ThumbsUp className="w-4 h-4 text" />
                                        -slate-400</button>
                                        <button className="p-1.5 hover:bg-white/10 rounded-lg" title="Bad response">
                                            <ThumbsDown className="w-4 h-4 text-slate-400" />
                                        </button>
                                        <button className="p-1.5 hover:bg-white/10 rounded-lg" title="Speak">
                                            <Volume2 className="w-4 h-4 text-slate-400" />
                                        </button>
                                    </div>
                                )}
                                <p className="text-xs text-slate-500 mt-2">
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-slate-800 rounded-2xl p-4">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Suggested Questions */}
                {messages.length === 1 && (
                    <div className="px-4 pb-2">
                        <p className="text-xs text-slate-400 mb-2">Try asking:</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                                    className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-slate-900/50">
                    <div className="max-w-3xl mx-auto">
                        <div className="relative bg-slate-800 rounded-2xl border border-white/10 focus-within:border-purple-500/50 transition-colors">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Ask me anything..."
                                className="w-full bg-transparent px-4 py-4 pr-24 text-white placeholder:text-slate-500 resize-none focus:outline-none"
                                rows={1}
                                style={{ minHeight: '56px', maxHeight: '200px' }}
                            />
                            <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                <button className="p-2 hover:bg-white/10 rounded-lg">
                                    <Paperclip className="w-5 h-5 text-slate-400" />
                                </button>
                                <button className="p-2 hover:bg-white/10 rounded-lg">
                                    <Image className="w-5 h-5 text-slate-400" />
                                </button>
                                <button 
                                    onClick={startListening}
                                    className={`p-2 rounded-lg ${isListening ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-slate-400'}`}
                                >
                                    <Mic className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="p-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 text-center mt-2">
                            AI can make mistakes. Verify important information.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
