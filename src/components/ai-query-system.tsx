'use client';

import { useEffect, useRef, useState } from 'react';
import {
    BookOpen,
    Brain,
    Calculator,
    Dna,
    FlaskConical,
    Loader2,
    RefreshCw,
    Send,
    Sparkles,
    TriangleAlert,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SUBJECTS = [
    { id: 'physics', name: 'Physics', icon: <FlaskConical className="h-4 w-4" />, color: 'blue' },
    { id: 'chemistry', name: 'Chemistry', icon: <Brain className="h-4 w-4" />, color: 'emerald' },
    { id: 'mathematics', name: 'Mathematics', icon: <Calculator className="h-4 w-4" />, color: 'amber' },
    { id: 'biology', name: 'Biology', icon: <Dna className="h-4 w-4" />, color: 'red' },
    { id: 'general', name: 'Platform Help', icon: <Zap className="h-4 w-4" />, color: 'violet' },
] as const;

interface AssistantReply {
    response: string | null;
    error: string | null;
    fallback: boolean;
    retryable: boolean;
    cached: boolean;
    sources: string[];
}

interface QueryPayload {
    query: string;
    subject: string;
}

const EMPTY_REPLY: AssistantReply = {
    response: null,
    error: null,
    fallback: false,
    retryable: false,
    cached: false,
    sources: [],
};

function getSubjectClass(color: string, active: boolean): string {
    if (!active) {
        return 'bg-white/5 text-slate-400 hover:bg-white/10';
    }

    if (color === 'blue') return 'bg-blue-500 text-white shadow-lg shadow-blue-500/20';
    if (color === 'emerald') return 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20';
    if (color === 'amber') return 'bg-amber-500 text-white shadow-lg shadow-amber-500/20';
    if (color === 'red') return 'bg-red-500 text-white shadow-lg shadow-red-500/20';
    return 'bg-violet-500 text-white shadow-lg shadow-violet-500/20';
}

export function AIQuerySystem() {
    const [query, setQuery] = useState('');
    const [subject, setSubject] = useState('physics');
    const [isLoading, setIsLoading] = useState(false);
    const [reply, setReply] = useState<AssistantReply>(EMPTY_REPLY);
    const [lastPayload, setLastPayload] = useState<QueryPayload | null>(null);
    const responseRef = useRef<HTMLDivElement>(null);

    const submitQuery = async (payload: QueryPayload) => {
        setIsLoading(true);
        setReply(EMPTY_REPLY);
        setLastPayload(payload);

        try {
            const res = await fetch('/api/ai/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            const resolvedResponse = typeof data.response === 'string'
                ? data.response
                : typeof data.fallbackMessage === 'string'
                    ? data.fallbackMessage
                    : null;

            if (!res.ok && !resolvedResponse) {
                throw new Error(
                    typeof data.error === 'string'
                        ? data.error
                        : 'SaviEdu AI could not respond right now.'
                );
            }

            if (!resolvedResponse) {
                throw new Error('No response was returned by the assistant.');
            }

            setReply({
                response: resolvedResponse,
                error: res.ok ? null : typeof data.error === 'string' ? data.error : null,
                fallback: Boolean(data.fallback),
                retryable: Boolean(data.retryable || data.fallback || !res.ok),
                cached: Boolean(data.cached),
                sources: Array.isArray(data.sources)
                    ? data.sources.filter((source: unknown): source is string => typeof source === 'string')
                    : [],
            });
        } catch (error) {
            setReply({
                response: null,
                error: error instanceof Error ? error.message : 'SaviEdu AI could not respond right now.',
                fallback: false,
                retryable: true,
                cached: false,
                sources: [],
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const normalizedQuery = query.trim();
        if (!normalizedQuery || isLoading) {
            return;
        }

        await submitQuery({ query: normalizedQuery, subject });
    };

    const handleRetry = async () => {
        if (!lastPayload || isLoading) {
            return;
        }

        await submitQuery(lastPayload);
    };

    useEffect(() => {
        if ((reply.response || reply.error) && responseRef.current) {
            responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [reply]);

    return (
        <div className="mx-auto mt-12 w-full max-w-2xl px-4 sm:px-0">
            <div className="group relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-md sm:p-6">
                <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-primary-500/20 blur-3xl transition-all duration-700 group-hover:bg-primary-500/30" />

                <div className="relative z-10">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500/20">
                            <Sparkles className="h-6 w-6 text-primary-300 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Ask SaviEdu AI</h3>
                            <p className="text-sm text-slate-400">
                                Academic doubts, study guidance, and platform navigation help.
                            </p>
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                        {SUBJECTS.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setSubject(item.id)}
                                className={cn(
                                    'rounded-full px-3 py-2 text-xs font-semibold transition-all',
                                    'inline-flex min-h-[40px] items-center gap-2',
                                    getSubjectClass(item.color, subject === item.id)
                                )}
                            >
                                {item.icon}
                                {item.name}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="relative">
                        <textarea
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Ask an academic doubt or a platform question. Example: Explain electrostatics simply, or how do I find mock tests?"
                            className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/5 py-4 pl-4 pr-14 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                            disabled={isLoading}
                            maxLength={800}
                        />

                        <button
                            type="submit"
                            disabled={isLoading || !query.trim()}
                            className="absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-900 shadow-xl transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Send AI query"
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </button>
                    </form>

                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                        <span>Connected to lectures, practice, tests, and platform help.</span>
                        <span>{query.trim().length}/800</span>
                    </div>

                    {(reply.response || reply.error) && (
                        <div
                            ref={responseRef}
                            aria-live="polite"
                            className={cn(
                                'mt-6 rounded-2xl border p-5 transition-all animate-in fade-in slide-in-from-top-4 duration-500',
                                reply.error && !reply.response
                                    ? 'border-red-500/30 bg-red-500/10 text-red-100'
                                    : 'border-white/10 bg-white/5 text-slate-200'
                            )}
                        >
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                                    {reply.fallback ? (
                                        <TriangleAlert className="h-4 w-4 text-amber-300" />
                                    ) : (
                                        <BookOpen className="h-4 w-4 text-primary-400" />
                                    )}
                                    {reply.fallback ? 'Fallback Guidance' : 'Faculty Response'}
                                </div>

                                {reply.cached && (
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                                        Cached
                                    </span>
                                )}
                            </div>

                            {reply.error && reply.response && (
                                <p className="mb-3 text-sm text-amber-200">
                                    {reply.error}
                                </p>
                            )}

                            {reply.response ? (
                                <p className="whitespace-pre-wrap text-sm leading-7 sm:text-[15px]">
                                    {reply.response}
                                </p>
                            ) : (
                                <p className="text-sm leading-7">{reply.error}</p>
                            )}

                            {reply.sources.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {reply.sources.map((source) => (
                                        <span
                                            key={source}
                                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300"
                                        >
                                            {source}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {reply.retryable && (
                                <button
                                    type="button"
                                    onClick={handleRetry}
                                    disabled={isLoading}
                                    className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                                    Retry
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button
                    type="button"
                    onClick={() => {
                        setQuery("Explain photoelectric effect simply for JEE.");
                        setSubject('physics');
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white"
                >
                    <Sparkles className="h-3 w-3" />
                    Explain photoelectric effect
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setQuery('How should I use the dashboard for mock tests and lectures?');
                        setSubject('general');
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white"
                >
                    <Sparkles className="h-3 w-3" />
                    How do I use mock tests?
                </button>
            </div>
        </div>
    );
}
