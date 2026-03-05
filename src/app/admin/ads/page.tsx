'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    Plus,
    Image,
    Clock,
    Calendar,
    Target,
    Eye,
    AlertCircle,
    Trash2,
    Edit,
} from 'lucide-react';

interface PopupAd {
    id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    button_text: string | null;
    button_url: string | null;
    display_duration_seconds: number;
    start_date: string | null;
    end_date: string | null;
    priority: number;
    max_impressions: number | null;
    current_impressions: number;
    is_active: boolean;
    created_at: string;
}

export default function AdsPage() {
    const supabase = createBrowserSupabaseClient();
    const [ads, setAds] = useState<PopupAd[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAds = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('popup_ads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAds((data as PopupAd[]) || []);
        } catch (error) {
            console.error('Error fetching ads:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchAds();
    }, [fetchAds]);

    const handleToggleActive = async (ad: PopupAd) => {
        try {
            await supabase
                .from('popup_ads')
                .update({ is_active: !ad.is_active } as never)
                .eq('id', ad.id);
            fetchAds();
        } catch (error) {
            console.error('Error updating ad:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Popup Ads</h1>
                    <p className="text-slate-600 mt-1">Manage popup advertisements with countdown timer</p>
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                    <Plus className="w-5 h-5" />
                    Create Ad
                </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <p className="font-medium">How Popup Ads Work:</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                        <li>Ads display for a minimum of 10 seconds (configurable)</li>
                        <li>Close button is disabled until countdown completes</li>
                        <li>Each user sees the popup once per session</li>
                    </ul>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Image} label="Total Ads" value={ads.length} />
                <StatCard icon={Target} label="Active" value={ads.filter(a => a.is_active).length} />
                <StatCard icon={Calendar} label="Scheduled" value={ads.filter(a => a.start_date || a.end_date).length} />
                <StatCard icon={Eye} label="Impressions" value={ads.reduce((sum, a) => sum + (a.current_impressions || 0), 0)} />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Duration</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                            ) : ads.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No ads found</td></tr>
                            ) : (
                                ads.map((ad) => (
                                    <tr key={ad.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{ad.title}</div>
                                            {ad.content && <div className="text-sm text-slate-500 truncate max-w-xs">{ad.content}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Clock className="w-4 h-4" />
                                                {ad.display_duration_seconds}s
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleActive(ad)}
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${ad.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-slate-100 text-slate-800'
                                                    }`}
                                            >
                                                {ad.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button className="p-1 text-slate-400 hover:text-primary-600">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button className="p-1 text-slate-400 hover:text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-xl font-bold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    );
}
