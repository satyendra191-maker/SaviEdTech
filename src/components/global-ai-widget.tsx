'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Sparkles, MessageSquare } from 'lucide-react';
import { AIQuerySystem } from '@/components/ai-query-system';

export function GlobalAIWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    
    const dragRef = useRef<HTMLDivElement>(null);
    const initialPos = useRef({ x: 0, y: 0 });
    const offset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        // Init position at bottom right
        if (typeof window !== 'undefined') {
            setPosition({
                x: window.innerWidth - 80,
                y: window.innerHeight - 80
            });
        }
        
        const handleResize = () => {
            setPosition(prev => ({
                x: Math.min(Math.max(20, prev.x), window.innerWidth - 80),
                y: Math.min(Math.max(20, prev.y), window.innerHeight - 80)
            }));
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handlePointerDown = (e: React.PointerEvent) => {
        // Only allow drag on the main button
        if (isOpen) return;
        
        setIsDragging(true);
        initialPos.current = { x: e.clientX, y: e.clientY };
        offset.current = { x: position.x, y: position.y };
        
        if (dragRef.current) {
            dragRef.current.setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        
        const dx = e.clientX - initialPos.current.x;
        const dy = e.clientY - initialPos.current.y;
        
        setPosition({
            x: Math.min(Math.max(20, offset.current.x + dx), window.innerWidth - 80),
            y: Math.min(Math.max(20, offset.current.y + dy), window.innerHeight - 80)
        });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        if (dragRef.current) {
            dragRef.current.releasePointerCapture(e.pointerId);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        // Prevent click if we dragged
        const dx = Math.abs(e.clientX - initialPos.current.x);
        const dy = Math.abs(e.clientY - initialPos.current.y);
        
        if (dx < 5 && dy < 5) {
            setIsOpen(true);
        }
    };

    if (isOpen) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-950/70 p-4 backdrop-blur-sm sm:p-6 md:p-12 animate-in fade-in duration-200">
                <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                                    SaviTech AI
                                </p>
                                <h3 className="text-lg font-bold text-white leading-tight">Universal Superbrain</h3>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 active:scale-95"
                            aria-label="Close AI assistant"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900/50">
                        <AIQuerySystem />
                    </div>
                </div>
            </div>
        );
    }

    // Draggable Floating Button
    return (
        <div
            ref={dragRef}
            className={`fixed z-[90] flex h-14 w-14 cursor-pointer items-center justify-center rounded-full shadow-2xl shadow-violet-500/40 transition-transform ${isDragging ? 'scale-110 cursor-grabbing' : 'hover:scale-105 active:scale-95 cursor-grab'} bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-2 border-white/20`}
            style={{ 
                left: position.x, 
                top: position.y,
                touchAction: 'none' 
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={handleClick}
        >
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-300 animate-pulse" />
            <MessageSquare className="h-6 w-6" />
        </div>
    );
}
