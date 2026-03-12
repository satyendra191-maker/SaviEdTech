'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    MessageCircle,
    X,
    Home,
    PlayCircle,
    BookOpen,
    ClipboardList,
    Trophy,
    Settings,
    Brain,
    HelpCircle,
    FileText,
    Calendar,
    Target,
    Users,
    BarChart3,
    CreditCard,
    Landmark,
    BookMarked,
    Sparkles,
    GraduationCap,
    LogOut,
    ChevronRight,
    Send,
    Menu,
    Bot,
    Briefcase,
    FileCode,
    Database,
    Image,
    ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface MobileMenuWidgetProps {
    role?: 'student' | 'parent' | 'admin';
}

const studentMenuItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Lectures', href: '/dashboard/lectures', icon: PlayCircle },
    { name: 'Practice', href: '/dashboard/practice', icon: BookOpen },
    { name: 'DPP', href: '/dashboard/dpp', icon: FileText },
    { name: 'Tests', href: '/dashboard/tests', icon: ClipboardList },
    { name: 'Challenge', href: '/dashboard/challenge', icon: Trophy },
    { name: 'Revision', href: '/dashboard/revision', icon: BookMarked },
    { name: 'Planner', href: '/dashboard/planner', icon: Calendar },
    { name: 'Analytics', href: '/dashboard/analytics', icon: Target },
    { name: 'Doubts', href: '/dashboard/doubts', icon: HelpCircle },
    { name: 'AI Tutor', href: '/ai-tutor', icon: Brain },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const parentMenuItems = [
    { name: 'Home', href: '/dashboard/parent', icon: Home },
    { name: 'Progress', href: '/dashboard/parent', icon: Trophy },
    { name: 'Tests', href: '/dashboard/tests', icon: ClipboardList },
    { name: 'Analytics', href: '/dashboard/analytics', icon: Target },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const adminMenuItems = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'AI Assistant', href: '/admin/ai-assistant', icon: Bot },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Students', href: '/admin/students', icon: Users },
    { name: 'Courses', href: '/admin/courses', icon: BookOpen },
    { name: 'Lectures', href: '/admin/lectures', icon: PlayCircle },
    { name: 'Questions', href: '/admin/questions', icon: HelpCircle },
    { name: 'Tests', href: '/admin/tests', icon: GraduationCap },
    { name: 'Online Exams', href: '/admin/online-exams', icon: ShieldCheck },
    { name: 'Careers', href: '/admin/careers', icon: Briefcase },
    { name: 'Leads', href: '/admin/leads', icon: FileText },
    { name: 'CMS', href: '/admin/cms', icon: FileCode },
    { name: 'AI Content', href: '/admin/ai-content', icon: Sparkles },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    { name: 'Finance', href: '/admin/finance', icon: Landmark },
    { name: 'Daily Challenge', href: '/admin/challenges', icon: Trophy },
    { name: 'Popup Ads', href: '/admin/ads', icon: Image },
    { name: 'Backups', href: '/admin/backups', icon: Database },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function MobileMenuWidget({ role = 'student' }: MobileMenuWidgetProps) {
    const { signOut } = useAuth();
    const pathname = usePathname();

    // ── Widget mode: 'closed' | 'menu' | 'ai-chat' ──
    const [mode, setMode] = useState<'closed' | 'menu' | 'ai-chat'>('closed');

    // ── Draggable position ──
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<HTMLButtonElement>(null);
    const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, moved: false });

    // ── AI Chat state ──
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
        { role: 'ai', text: 'Hi! I\'m your AI Tutor. Ask me anything about your subjects — Physics, Chemistry, Maths, or Biology. I\'m here to help!' },
    ]);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const menuItems = role === 'admin' ? adminMenuItems : role === 'parent' ? parentMenuItems : studentMenuItems;

    // ── Persist position from localStorage ──
    useEffect(() => {
        const saved = localStorage.getItem('ai-widget-pos');
        if (saved) {
            try {
                const p = JSON.parse(saved);
                setPosition({ x: p.x || 0, y: p.y || 0 });
            } catch { /* ignore */ }
        }
    }, []);

    // ── Auto-scroll chat ──
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // ── Drag handlers (touch + mouse) ──
    const handleDragStart = useCallback((clientX: number, clientY: number) => {
        dragStartRef.current = {
            x: position.x,
            y: position.y,
            startX: clientX,
            startY: clientY,
            moved: false,
        };
        setIsDragging(true);
    }, [position]);

    const handleDragMove = useCallback((clientX: number, clientY: number) => {
        if (!isDragging) return;

        const dx = clientX - dragStartRef.current.startX;
        const dy = clientY - dragStartRef.current.startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            dragStartRef.current.moved = true;
        }

        const newX = dragStartRef.current.x + dx;
        const newY = dragStartRef.current.y + dy;

        // Clamp to viewport
        const maxX = window.innerWidth - 60;
        const maxY = window.innerHeight - 140;
        setPosition({
            x: Math.max(-maxX + 60, Math.min(0, newX)),
            y: Math.max(-maxY + 60, Math.min(0, newY)),
        });
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        localStorage.setItem('ai-widget-pos', JSON.stringify(position));
    }, [position]);

    // Mouse events
    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
        const onMouseUp = () => handleDragEnd();

        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    // ── AI Chat send handler ──
    const handleSendMessage = async () => {
        const text = chatInput.trim();
        if (!text || isAiLoading) return;

        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text }]);
        setIsAiLoading(true);

        try {
            const response = await fetch('/api/ai-tutor/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });

            if (response.ok) {
                const data = await response.json();
                setChatMessages(prev => [...prev, { role: 'ai', text: data.reply || data.message || 'I\'m thinking... Could you rephrase that?' }]);
            } else {
                setChatMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I couldn\'t process that. Try asking a specific subject question!' }]);
            }
        } catch {
            setChatMessages(prev => [...prev, { role: 'ai', text: 'Connection issue. Please check your network and try again.' }]);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleFABClick = () => {
        if (!dragStartRef.current.moved) {
            setMode(mode === 'closed' ? 'ai-chat' : 'closed');
        }
        dragStartRef.current.moved = false;
    };

    return (
        <>
            {/* ── Floating Action Button (Draggable) ── */}
            <button
                ref={dragRef}
                onClick={handleFABClick}
                onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY); }}
                onTouchStart={(e) => { const t = e.touches[0]; handleDragStart(t.clientX, t.clientY); }}
                onTouchMove={(e) => { const t = e.touches[0]; handleDragMove(t.clientX, t.clientY); }}
                onTouchEnd={handleDragEnd}
                className={`fixed z-50 lg:hidden w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all ${
                    mode !== 'closed'
                        ? 'bg-slate-800 scale-90'
                        : 'bg-gradient-to-br from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800'
                } ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab active:scale-95'}`}
                style={{
                    bottom: `${80 - position.y}px`,
                    right: `${16 - position.x}px`,
                    touchAction: 'none',
                }}
                aria-label={mode !== 'closed' ? 'Close widget' : 'Open AI Tutor'}
            >
                {mode !== 'closed' ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <MessageCircle className="w-6 h-6 text-white" />
                )}
            </button>

            {/* ── Mode toggle pills (visible when open) ── */}
            {mode !== 'closed' && (
                <div
                    className="fixed z-50 lg:hidden flex gap-2 animate-card-fade-in"
                    style={{
                        bottom: `${140 - position.y}px`,
                        right: `${16 - position.x}px`,
                    }}
                >
                    <button
                        onClick={() => setMode('ai-chat')}
                        className={`px-3 py-2 rounded-full text-xs font-bold shadow-lg transition-all ${
                            mode === 'ai-chat'
                                ? 'bg-violet-600 text-white'
                                : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                    >
                        💬 AI Chat
                    </button>
                    <button
                        onClick={() => setMode('menu')}
                        className={`px-3 py-2 rounded-full text-xs font-bold shadow-lg transition-all ${
                            mode === 'menu'
                                ? 'bg-violet-600 text-white'
                                : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                    >
                        <Menu className="w-3.5 h-3.5 inline mr-1" /> Menu
                    </button>
                </div>
            )}

            {/* ── AI Chat Panel ── */}
            {mode === 'ai-chat' && (
                <div className="fixed inset-0 z-40 lg:hidden flex flex-col">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMode('closed')} />

                    <div className="relative mt-auto mx-4 mb-36 bg-white rounded-2xl shadow-2xl max-h-[60vh] flex flex-col overflow-hidden animate-card-slide-up">
                        {/* Chat header */}
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-violet-600 to-indigo-700 text-white flex-shrink-0">
                            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Brain className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold">AI Tutor</h3>
                                <p className="text-[10px] text-white/70">Ask anything about your subjects</p>
                            </div>
                        </div>

                        {/* Chat messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                                        msg.role === 'user'
                                            ? 'bg-violet-600 text-white rounded-br-md'
                                            : 'bg-slate-100 text-slate-800 rounded-bl-md'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isAiLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                                        <div className="flex gap-1.5">
                                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat input */}
                        <div className="p-3 border-t border-slate-100 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Ask about Physics, Chemistry, Maths..."
                                    className="flex-1 rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!chatInput.trim() || isAiLoading}
                                    className="flex-shrink-0 w-10 h-10 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 rounded-xl flex items-center justify-center transition-all active:scale-95"
                                >
                                    <Send className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Menu Drawer ── */}
            {mode === 'menu' && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMode('closed')} />

                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-hidden animate-card-slide-up">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <h2 className="text-base font-bold text-slate-900">Quick Navigation</h2>
                            <button
                                onClick={() => setMode('closed')}
                                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto max-h-[65vh]">
                            <div className="grid grid-cols-3 gap-2.5">
                                {menuItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setMode('closed')}
                                            className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 ${
                                                isActive
                                                    ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            <div className={`p-2 rounded-xl ${isActive ? 'bg-primary-100' : 'bg-slate-200'}`}>
                                                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-slate-600'}`} />
                                            </div>
                                            <span className="text-[11px] font-medium mt-1.5 text-center leading-tight">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => { signOut(); setMode('closed'); }}
                                className="w-full mt-5 flex items-center justify-center gap-2 p-3.5 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="text-sm font-semibold">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
