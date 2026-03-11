'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
    Sparkles, 
    X, 
    Send, 
    Mic, 
    Image, 
    Paperclip,
    Bot,
    ChevronRight,
    Minimize2,
    Maximize2
} from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export function FloatingAIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: "Hi! I'm SaviTech AI. How can I help you today?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Simulate AI response
        setTimeout(() => {
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I understand your question. Let me help you with that. This is a quick response from SaviTech AI.",
            };
            setMessages(prev => [...prev, aiResponse]);
            setIsLoading(false);
        }, 1000);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (isMinimized) {
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg shadow-purple-500/25 flex items-center justify-center hover:scale-110 transition-transform"
            >
                <Sparkles className="w-6 h-6 text-white" />
            </button>
        );
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg shadow-purple-500/25 flex items-center justify-center hover:scale-110 transition-all animate-pulse"
            >
                <Sparkles className="w-6 h-6 text-white" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-indigo-600">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white text-sm">SaviTech AI</h3>
                        <p className="text-xs text-white/70">Online</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setIsMinimized(true)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Minimize2 className="w-4 h-4 text-white" />
                    </button>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="h-64 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                    <div 
                        key={message.id}
                        className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        {message.role === 'assistant' && (
                            <div className="w-6 h-6 rounded-md bg-purple-500 flex items-center justify-center shrink-0">
                                <Bot className="w-3 h-3 text-white" />
                            </div>
                        )}
                        <div className={`
                            max-w-[80%] px-3 py-2 rounded-xl text-sm
                            ${message.role === 'user' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-slate-800 text-white'
                            }
                        `}>
                            {message.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-md bg-purple-500 flex items-center justify-center">
                            <Bot className="w-3 h-3 text-white" />
                        </div>
                        <div className="bg-slate-800 px-3 py-2 rounded-xl">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Links */}
            <div className="px-4 pb-2">
                <Link 
                    href="/savitech-ai/chat"
                    className="flex items-center justify-center gap-2 text-xs text-purple-400 hover:text-purple-300"
                >
                    Open Full Chat <ChevronRight className="w-3 h-3" />
                </Link>
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask anything..."
                        className="w-full pr-20 pl-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button className="p-1.5 hover:bg-white/10 rounded-lg">
                            <Paperclip className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="p-1.5 hover:bg-white/10 rounded-lg">
                            <Image className="w-4 h-4 text-slate-400" />
                        </button>
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="p-1.5 bg-purple-600 rounded-lg disabled:opacity-50"
                        >
                            <Send className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
