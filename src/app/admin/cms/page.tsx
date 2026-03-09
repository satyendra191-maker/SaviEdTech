'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Edit, Eye, Plus, Search, Trash2 } from 'lucide-react';

interface CMSPage {
    id: string;
    slug: string;
    title: string;
    hero_badge?: string;
    hero_title?: string;
    hero_description?: string;
    is_published: boolean;
    updated_at: string;
}

export default function CMSManagementPage() {
    const [pages, setPages] = useState<CMSPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        try {
            const response = await fetch('/api/admin/cms');
            if (response.ok) {
                const data = await response.json();
                setPages(data);
            }
        } catch (error) {
            console.error('Failed to fetch CMS pages:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPages = pages.filter(page =>
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const defaultPages: CMSPage[] = [
        { id: 'home', slug: 'home', title: 'Homepage', is_published: true, updated_at: new Date().toISOString() },
        { id: 'courses', slug: 'courses', title: 'Courses', is_published: true, updated_at: new Date().toISOString() },
        { id: 'faculty', slug: 'faculty', title: 'Faculty', is_published: true, updated_at: new Date().toISOString() },
        { id: 'blog', slug: 'blog', title: 'Blog', is_published: true, updated_at: new Date().toISOString() },
        { id: 'careers', slug: 'careers', title: 'Career', is_published: true, updated_at: new Date().toISOString() },
        { id: 'contact', slug: 'contact', title: 'Contact', is_published: true, updated_at: new Date().toISOString() },
    ];

    const displayPages = pages.length > 0 ? filteredPages : defaultPages;

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">CMS Page Management</h1>
                    <p className="text-slate-600">Manage your website content</p>
                </div>
                <Link
                    href="/admin/cms/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
                >
                    <Plus className="h-4 w-4" />
                    New Page
                </Link>
            </div>

            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search pages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Page Title</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Slug</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Status</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Last Updated</th>
                            <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {displayPages.map((page) => (
                            <tr key={page.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <span className="font-medium text-slate-900">{page.title}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <code className="text-sm bg-slate-100 px-2 py-1 rounded">{page.slug}</code>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                        page.is_published 
                                            ? 'bg-emerald-100 text-emerald-700' 
                                            : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {page.is_published ? 'Published' : 'Draft'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {new Date(page.updated_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link
                                            href={`/${page.slug}`}
                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                            title="View Page"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                        <Link
                                            href={`/admin/cms/${page.slug}`}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Edit Page"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
