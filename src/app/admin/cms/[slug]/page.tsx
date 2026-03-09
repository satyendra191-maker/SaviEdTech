'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft, Eye } from 'lucide-react';

interface CMSPageData {
    slug: string;
    title: string;
    hero_badge?: string;
    hero_title?: string;
    hero_description?: string;
    seo_title?: string;
    seo_description?: string;
    is_published: boolean;
}

export default function CMSEditorPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const isNew = slug === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<CMSPageData>({
        slug: isNew ? '' : slug,
        title: '',
        hero_badge: '',
        hero_title: '',
        hero_description: '',
        seo_title: '',
        seo_description: '',
        is_published: true,
    });

    useEffect(() => {
        if (!isNew) {
            fetchPageData();
        }
    }, [slug, isNew]);

    const fetchPageData = async () => {
        try {
            const response = await fetch(`/api/admin/cms/${slug}`);
            if (response.ok) {
                const data = await response.json();
                setFormData(data);
            }
        } catch (error) {
            console.error('Failed to fetch page:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const response = await fetch('/api/admin/cms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                router.push('/admin/cms');
            } else {
                alert('Failed to save page');
            }
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save page');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/admin/cms')}
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {isNew ? 'Create New Page' : `Edit: ${formData.title}`}
                        </h1>
                        <p className="text-slate-600">Manage page content</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isNew && (
                        <a
                            href={`/${formData.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                        >
                            <Eye className="h-4 w-4" />
                            Preview
                        </a>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Page'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
                    
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Page Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">URL Slug</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                required
                                disabled={!isNew}
                            />
                            <p className="mt-1 text-sm text-slate-500">URL: /{formData.slug}</p>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_published}
                                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                                    className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                                />
                                <span className="text-sm font-medium text-slate-700">Published</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Hero Section</h2>
                    
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Hero Badge</label>
                            <input
                                type="text"
                                value={formData.hero_badge || ''}
                                onChange={(e) => setFormData({ ...formData, hero_badge: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="e.g., SaviEduTech Driven Learning Platform"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Hero Title</label>
                            <input
                                type="text"
                                value={formData.hero_title || ''}
                                onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Main headline"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Hero Description</label>
                            <textarea
                                value={formData.hero_description || ''}
                                onChange={(e) => setFormData({ ...formData, hero_description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="Subtitle or description"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">SEO Settings</h2>
                    
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SEO Title</label>
                            <input
                                type="text"
                                value={formData.seo_title || ''}
                                onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SEO Description</label>
                            <textarea
                                value={formData.seo_description || ''}
                                onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
