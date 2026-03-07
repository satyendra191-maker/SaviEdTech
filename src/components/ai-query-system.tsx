'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, BookOpen, Brain, Zap, FlaskConical, Calculator, Dna } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUBJECTS = [
    { id: 'physics', name: 'Physics', icon: <FlaskConical className="w-4 h-4" />, color: 'blue' },
    { id: 'chemistry', name: 'Chemistry', icon: <Brain className="w-4 h-4" />, color: 'emerald' },
    { id: 'mathematics', name: 'Mathematics', icon: <Calculator className="w-4 h-4" />, color: 'amber' },
    { id: 'biology', name: 'Biology', icon: <Dna className="w-4 h-4" />, color: 'red' },
    { id: 'general', name: 'General', icon: <Zap className="w-4 h-4" />, color: 'purple' },
];

export function AIQuerySystem() {
    const [query, setQuery] = useState('');
    const [subject, setSubject] = useState('physics');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const responseRef = useRef<HTMLDivElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            const res = await fetch('/api/ai/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, subject }),
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setResponse(data.response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'AI could not respond now.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (response && responseRef.current) {
            responseRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [response]);

    return (
        <div className="w-full max-w-2xl mx-auto mt-12">
            <div className="relative p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl overflow-hidden group">
                {/* Glow effect */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/20 rounded-full blur-3xl group-hover:bg-primary-500/30 transition-all duration-700" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-primary-400 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Ask Anything</h3>
                            <p className="text-sm text-slate-400">Powered by SaviEdu AI Faculty</p>
                        </div>
                    </div>

                    {/* Subject Selector */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {SUBJECTS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setSubject(s.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all",
                                subject === s.id 
                                    ? s.color === 'blue' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                                      : s.color === 'emerald' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                      : s.color === 'amber' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                                      : s.color === 'red' ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                                      : "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                                )}
                            >
                                {s.icon}
                                {s.name}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="relative">
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Type your question here (e.g., Explain Newton's 2nd law in simple terms)"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-4 pr-14 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none h-24"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !query.trim()}
                            className="absolute right-3 bottom-3 p-3 bg-white text-slate-900 rounded-xl hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </form>

                    {/* Response Area */}
                    {(response || error) && (
                        <div 
                            ref={responseRef}
                            className={cn(
                                "mt-6 p-5 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-500",
                                error ? "bg-red-500/10 border-red-500/20 text-red-200" : "bg-white/5 border-white/10 text-slate-200"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <BookOpen className="w-4 h-4 text-primary-400" />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Faculty Response</span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {error || response}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Quick Suggestions */}
            <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button 
                    onClick={() => { setQuery("Explain photoelectric effect simply"); setSubject("physics"); }}
                    className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10"
                >
                    <Sparkles className="w-3 h-3" /> "Explain photoelectric effect..."
                </button>
                <button 
                    onClick={() => { setQuery("How to study Organic Chemistry efficiently?"); setSubject("chemistry"); }}
                    className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10"
                >
                    <Sparkles className="w-3 h-3" /> "How to study Organic Chemistry..."
                </button>
            </div>
        </div>
    );
}
