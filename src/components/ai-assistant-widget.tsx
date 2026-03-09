'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { AIQuerySystem } from '@/components/ai-query-system';

interface AIAssistantWidgetProps {
    variant?: 'hero' | 'footer';
    messages?: string[];
}

export function AIAssistantWidget({
    variant = 'footer',
}: AIAssistantWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerClasses = variant === 'footer'
        ? 'w-full'
        : 'mx-auto w-full max-w-md';
    const panelClasses = variant === 'footer'
        ? 'rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md'
        : 'rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md';

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-slate-100 shadow-lg"
            >
                SaviTech AI
            </button>

            {isOpen ? (
                <div className="fixed inset-0 z-[70] bg-slate-950/70 p-4 backdrop-blur-sm">
                    <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                                    SaviTech AI
                                </p>
                                <h3 className="text-lg font-bold text-white">Unified Academic Assistant</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
                                aria-label="Close AI assistant"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-2 py-2 sm:px-4">
                            <AIQuerySystem />
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
