'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Bot, 
    MessageSquare, 
    BookOpen, 
    Workflow, 
    BarChart3, 
    Wrench, 
    Settings,
    ChevronRight,
    Sparkles,
    Zap,
    Brain,
    FileText,
    Wand2,
    Code,
    Megaphone,
    ChevronLeft,
    X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
    { name: 'Dashboard', href: '/savitech-ai', icon: Bot },
    { name: 'AI Chat', href: '/savitech-ai/chat', icon: MessageSquare },
    { name: 'Knowledge', href: '/savitech-ai/knowledge', icon: BookOpen },
    { name: 'Workflows', href: '/savitech-ai/workflows', icon: Workflow },
    { name: 'Analytics', href: '/savitech-ai/analytics', icon: BarChart3 },
    { name: 'AI Tools', href: '/savitech-ai/ai-tools', icon: Wrench },
];

const aiTools = [
    { name: 'Question Solver', href: '/ai-question-solver', icon: Brain, color: 'from-blue-500 to-cyan-500' },
    { name: 'Content Generator', href: '/ai-content-generator', icon: Wand2, color: 'from-purple-500 to-pink-500' },
    { name: 'Summary Generator', href: '/ai-summary', icon: FileText, color: 'from-amber-500 to-orange-500' },
    { name: 'Code Assistant', href: '/ai-code', icon: Code, color: 'from-green-500 to-emerald-500' },
    { name: 'Marketing AI', href: '/ai-marketing', icon: Megaphone, color: 'from-red-500 to-rose-500' },
];

export function SaviTechAISidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="fixed left-4 top-20 z-40 p-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all md:hidden"
            >
                <Sparkles className="w-5 h-5" />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900 via-purple-900/90 to-slate-900 z-50 
                transition-all duration-300 border-r border-white/10
                ${isCollapsed ? 'w-20' : 'w-72'}
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
            `}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <Link href="/savitech-ai" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        {!isCollapsed && (
                            <div>
                                <h1 className="text-white font-bold text-lg">SaviTech AI</h1>
                                <p className="text-xs text-purple-300">Intelligence System</p>
                            </div>
                        )}
                    </Link>
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden md:flex p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </button>
                    <button 
                        onClick={() => setIsMobileOpen(false)}
                        className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Navigation */}
                <nav className="p-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || 
                            (item.href !== '/savitech-ai' && pathname.startsWith(item.href));
                        
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`
                                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                                    ${isActive 
                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25' 
                                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                    }
                                `}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-300' : ''}`} />
                                {!isCollapsed && (
                                    <>
                                        <span className="font-medium">{item.name}</span>
                                        {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Quick Tools Section */}
                {!isCollapsed && (
                    <div className="p-4 border-t border-white/10">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Tools</p>
                        <div className="space-y-2">
                            {aiTools.map((tool) => {
                                const Icon = tool.icon;
                                return (
                                    <Link
                                        key={tool.name}
                                        href={tool.href}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center`}>
                                            <Icon className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-sm">{tool.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                    <Link
                        href="/savitech-ai/settings"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <Settings className="w-5 h-5" />
                        {!isCollapsed && <span className="font-medium">Settings</span>}
                    </Link>
                </div>
            </aside>
        </>
    );
}

export function SaviTechAILayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-950">
            <SaviTechAISidebar />
            <main className="md:ml-72 min-h-screen transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
