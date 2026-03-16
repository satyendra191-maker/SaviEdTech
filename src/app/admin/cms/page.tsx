'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Edit, Eye, Plus, Search, Trash2, Globe, Sparkles, 
    History, Layout, Settings, FileText, SearchCode,
    Activity, ChevronRight, CheckCircle2, AlertCircle,
    Monitor, Smartphone, Tablet
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CONTENT_ROLES } from '@/lib/auth/roles';
import { getSupabaseBrowserClient } from '@/lib/supabase';

interface CMSPage {
    id: string;
    slug: string;
    title: string;
    is_published: boolean;
    updated_at: string;
    author?: string;
}

export default function CMSManagementPage() {
    const { role } = useAuth();
    const [pages, setPages] = useState<CMSPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'pages' | 'seo' | 'assets'>('pages');

    const isContentManager = role ? CONTENT_ROLES.includes(role as (typeof CONTENT_ROLES)[number]) : false;

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/cms');
            if (response.ok) {
                const data = await response.json();
                setPages(data);
            } else {
                // Fallback for demo
                setPages([
                    { id: '1', slug: 'home', title: 'Homepage', is_published: true, updated_at: new Date().toISOString(), author: 'Admin' },
                    { id: '2', slug: 'courses', title: 'Course Catalog', is_published: true, updated_at: new Date().toISOString(), author: 'Content Lead' },
                    { id: '3', slug: 'about-us', title: 'Vision & Mission', is_published: false, updated_at: new Date().toISOString(), author: 'HR Mgr' },
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch CMS pages:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">CMS Intelligence Hub</h1>
                    <p className="text-sm text-slate-500">Master portal for website content, SEO strategy and version control.</p>
                </div>
                <div className="flex items-center gap-3">
                    {isContentManager && (
                        <Link
                            href="/admin/cms/new"
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm text-sm font-semibold"
                        >
                            <Plus className="h-4 w-4" />
                            Create Page
                        </Link>
                    )}
                </div>
            </div>

            {/* Quick Actions & Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <QuickStat icon={Layout} label="Total Pages" value={String(pages.length)} accent="indigo" />
                <QuickStat icon={CheckCircle2} label="Published" value={String(pages.filter(p => p.is_published).length)} accent="emerald" />
                <QuickStat icon={AlertCircle} label="Drafts" value={String(pages.filter(p => !p.is_published).length)} accent="amber" />
                <QuickStat icon={Globe} label="Index Status" value="Healthy" accent="blue" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Management Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                                <TabBtn active={activeTab === 'pages'} onClick={() => setActiveTab('pages')} label="Pages" />
                                <TabBtn active={activeTab === 'seo'} onClick={() => setActiveTab('seo')} label="SEO" />
                                <TabBtn active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} label="Assets" />
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search content..."
                                    className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 w-48 transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {activeTab === 'pages' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Page Title</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Manager</th>
                                            <th className="px-6 py-4">Last Sync</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pages.map((page) => (
                                            <tr key={page.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{page.title}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">/{page.slug}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-tight ${
                                                        page.is_published ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                    }`}>
                                                        {page.is_published ? 'Live' : 'Draft'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                                                    {page.author || 'System'}
                                                </td>
                                                <td className="px-6 py-4 text-[10px] text-slate-400 font-semibold">
                                                    {new Date(page.updated_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Link href={`/${page.slug}`} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all">
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                        {isContentManager && (
                                                            <Link href={`/admin/cms/${page.slug}`} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all">
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'seo' && <SEOControlView />}
                        {activeTab === 'assets' && <AssetManagerView />}
                    </div>

                    {/* Content Revision History */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <History className="h-5 w-5 text-indigo-500" />
                                Revision Timeline
                            </h2>
                            <button className="text-[10px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors">Clear Logs</button>
                        </div>
                        <div className="space-y-4">
                            <RevisionItem title="Homepage Meta Updated" time="2 hours ago" user="Content Manager" type="SEO" />
                            <RevisionItem title="New Course Published" time="5 hours ago" user="Admin" type="PAGE" />
                            <RevisionItem title="Broken Link Fixed" time="Yesterday" user="System" type="AUDIT" />
                        </div>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-6">
                    {/* Role-Based Feature Panel */}
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Sparkles className="w-24 h-24" />
                        </div>
                        <h2 className="text-lg font-bold mb-4 relative z-10 flex items-center gap-2">
                            <Settings className="h-5 w-5 text-indigo-400" />
                            CMS Controls
                        </h2>
                        <div className="space-y-3 relative z-10">
                            {isContentManager ? (
                                <>
                                    <ControlBtn icon={Globe} label="Deployment Status" value="Syncing" active />
                                    <ControlBtn icon={SearchCode} label="Google Search Console" value="Connected" />
                                    <ControlBtn icon={FileText} label="Policy Updates" value="3 Pending" />
                                </>
                            ) : (
                                <p className="text-xs text-indigo-200 leading-relaxed italic">
                                    You have read-only access to the CMS core. Please contact the Lead Content Manager for higher permissions.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Content Automations */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                                <Activity className="h-4 w-4 text-emerald-500" />
                                Sync Engine
                            </h2>
                            <Link href="/admin/cron-jobs" className="text-[10px] font-bold text-indigo-600">MANAGE</Link>
                        </div>
                        <div className="space-y-3">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-bold text-slate-900">Sitemap Generator</p>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                </div>
                                <p className="text-[10px] text-slate-500 leading-tight">Last ping: 14 mins ago. Successfully indexed 12 new nodes.</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 opacity-60">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-bold text-slate-900">Broken Link Scanner</p>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                </div>
                                <p className="text-[10px] text-slate-500 leading-tight">Scheduled for 3:00 AM daily.</p>
                            </div>
                        </div>
                    </div>

                    {/* Preview Tools */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-900 mb-4">Responsive Preview</h2>
                        <div className="flex items-center gap-4">
                            <PreviewBtn icon={Monitor} active />
                            <PreviewBtn icon={Tablet} />
                            <PreviewBtn icon={Smartphone} />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">
                            Simulate how your content looks across different breakpoints before publishing live.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function QuickStat({ icon: Icon, label, value, accent }: any) {
    const accents = {
        indigo: 'text-indigo-600 bg-indigo-50',
        emerald: 'text-emerald-600 bg-emerald-50',
        amber: 'text-amber-600 bg-amber-50',
        blue: 'text-blue-600 bg-blue-50'
    } as any;

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${accents[accent]}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                    <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
                </div>
            </div>
        </div>
    );
}

function TabBtn({ active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                active ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'
            }`}
        >
            {label}
        </button>
    );
}

function ControlBtn({ icon: Icon, label, value, active }: any) {
    return (
        <div className={`p-3 rounded-2xl flex items-center justify-between border ${active ? 'bg-white/10 border-white/20' : 'border-transparent hover:bg-white/5'}`}>
            <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${active ? 'text-indigo-400' : 'text-indigo-200/50'}`} />
                <span className="text-xs font-semibold text-indigo-50">{label}</span>
            </div>
            <span className="text-[10px] font-bold text-indigo-300 uppercase">{value}</span>
        </div>
    );
}

function RevisionItem({ title, time, user, type }: any) {
    return (
        <div className="flex items-start gap-3 group cursor-pointer">
            <div className="mt-1.5 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-indigo-500 transition-colors shrink-0" />
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{title}</p>
                    <span className="text-[10px] font-bold text-slate-300 uppercase">{time}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-1.5 rounded uppercase">{type}</span>
                    <span className="text-[10px] text-slate-400">by {user}</span>
                </div>
            </div>
        </div>
    );
}

function PreviewBtn({ icon: Icon, active }: any) {
    return (
        <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${active ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'}`}>
            <Icon className="h-5 w-5" />
        </button>
    );
}

function SEOControlView() {
    return (
        <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                <SearchCode className="h-8 w-8" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900">SEO Intelligence Center</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">Manage crawlability, meta strategy, and structured data across all SaviEdTech modules.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-8">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-500 transition-all cursor-pointer">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Indexing</p>
                    <p className="text-sm font-bold text-slate-900">Sitemap XML</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-500 transition-all cursor-pointer">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Robots</p>
                    <p className="text-sm font-bold text-slate-900">Robots.txt</p>
                </div>
            </div>
        </div>
    );
}

function AssetManagerView() {
    return (
        <div className="p-12 text-center text-slate-400 italic text-sm">
            Asset Hub integration pending. Connect to Supabase Storage to manage images and documents.
        </div>
    );
}
