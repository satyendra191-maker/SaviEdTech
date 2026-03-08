'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ElementType, type FormEvent } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    AlertCircle,
    Calendar,
    Clock,
    Edit,
    Eye,
    Image,
    Plus,
    Save,
    Target,
    Trash2,
    XCircle,
} from 'lucide-react';

type PopupFrequency = 'once_per_session' | 'daily' | 'weekly';
type PopupPlacement = 'homepage' | 'student_dashboard';

interface PopupAd {
    id: string;
    title: string;
    content: string | null;
    ad_title: string | null;
    ad_message: string | null;
    image_url: string | null;
    button_text: string | null;
    button_url: string | null;
    display_duration_seconds: number;
    display_frequency: PopupFrequency;
    placements: PopupPlacement[];
    start_date: string | null;
    end_date: string | null;
    priority: number;
    max_impressions: number | null;
    current_impressions: number;
    is_active: boolean;
    created_at: string;
}

interface PopupAdFormState {
    title: string;
    message: string;
    imageUrl: string;
    buttonText: string;
    buttonUrl: string;
    displayDurationSeconds: string;
    displayFrequency: PopupFrequency;
    placements: PopupPlacement[];
    startDate: string;
    endDate: string;
    priority: string;
    maxImpressions: string;
    isActive: boolean;
}

const DEFAULT_FORM: PopupAdFormState = {
    title: '',
    message: '',
    imageUrl: '',
    buttonText: '',
    buttonUrl: '',
    displayDurationSeconds: '10',
    displayFrequency: 'once_per_session',
    placements: ['homepage', 'student_dashboard'],
    startDate: '',
    endDate: '',
    priority: '0',
    maxImpressions: '',
    isActive: true,
};

const PLACEMENT_OPTIONS: Array<{ value: PopupPlacement; label: string }> = [
    { value: 'homepage', label: 'Homepage' },
    { value: 'student_dashboard', label: 'Student Dashboard' },
];

const FREQUENCY_OPTIONS: Array<{ value: PopupFrequency; label: string; description: string }> = [
    { value: 'once_per_session', label: 'Once per session', description: 'The default popup rule for logged-in users.' },
    { value: 'daily', label: 'Daily', description: 'At most once per day per user in addition to the session cap.' },
    { value: 'weekly', label: 'Weekly', description: 'At most once per week per user in addition to the session cap.' },
];

function toDateTimeLocal(value: string | null): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoString(value: string): string | null {
    if (!value) {
        return null;
    }

    return new Date(value).toISOString();
}

function buildFormState(ad?: PopupAd | null): PopupAdFormState {
    if (!ad) {
        return DEFAULT_FORM;
    }

    return {
        title: ad.ad_title || ad.title || '',
        message: ad.ad_message || ad.content || '',
        imageUrl: ad.image_url || '',
        buttonText: ad.button_text || '',
        buttonUrl: ad.button_url || '',
        displayDurationSeconds: String(ad.display_duration_seconds || 10),
        displayFrequency: ad.display_frequency || 'once_per_session',
        placements: ad.placements?.length ? ad.placements : ['homepage', 'student_dashboard'],
        startDate: toDateTimeLocal(ad.start_date),
        endDate: toDateTimeLocal(ad.end_date),
        priority: String(ad.priority || 0),
        maxImpressions: ad.max_impressions ? String(ad.max_impressions) : '',
        isActive: ad.is_active,
    };
}

export default function AdsPage() {
    const supabase = useMemo(() => createBrowserSupabaseClient(), []);
    const [ads, setAds] = useState<PopupAd[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [form, setForm] = useState<PopupAdFormState>(DEFAULT_FORM);
    const [editingAdId, setEditingAdId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchAds = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('popup_ads')
                .select(`
                    id,
                    title,
                    content,
                    ad_title,
                    ad_message,
                    image_url,
                    button_text,
                    button_url,
                    display_duration_seconds,
                    display_frequency,
                    placements,
                    start_date,
                    end_date,
                    priority,
                    max_impressions,
                    current_impressions,
                    is_active,
                    created_at
                `)
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            setAds(((data || []) as PopupAd[]).map((ad) => ({
                ...ad,
                placements: ad.placements?.length ? ad.placements : ['homepage', 'student_dashboard'],
                display_frequency: ad.display_frequency || 'once_per_session',
            })));
        } catch (fetchError) {
            console.error('Error fetching popup ads:', fetchError);
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load popup ads.');
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        void fetchAds();
    }, [fetchAds]);

    useEffect(() => {
        async function loadCurrentUser() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            setCurrentUserId(user?.id || null);
        }

        void loadCurrentUser();
    }, [supabase]);

    const resetForm = (clearMessages = true) => {
        setForm(DEFAULT_FORM);
        setEditingAdId(null);
        if (clearMessages) {
            setError(null);
            setSuccess(null);
        }
    };

    const handleInputChange = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = event.target;
        setForm((current) => ({
            ...current,
            [name]: type === 'checkbox'
                ? (event.target as HTMLInputElement).checked
                : value,
        }));
    };

    const handlePlacementToggle = (placement: PopupPlacement) => {
        setForm((current) => {
            const placements = current.placements.includes(placement)
                ? current.placements.filter((item) => item !== placement)
                : [...current.placements, placement];

            return {
                ...current,
                placements: placements.length > 0 ? placements : current.placements,
            };
        });
    };

    const handleEdit = (ad: PopupAd) => {
        setForm(buildFormState(ad));
        setEditingAdId(ad.id);
        setError(null);
        setSuccess(null);
    };

    const handleToggleActive = async (ad: PopupAd) => {
        setError(null);
        setSuccess(null);

        try {
            const { error: updateError } = await supabase
                .from('popup_ads')
                .update({
                    is_active: !ad.is_active,
                    updated_at: new Date().toISOString(),
                } as never)
                .eq('id', ad.id);

            if (updateError) {
                throw updateError;
            }

            setSuccess(`Popup ad ${!ad.is_active ? 'activated' : 'deactivated'}.`);
            await fetchAds();
        } catch (updateError) {
            console.error('Error updating ad status:', updateError);
            setError(updateError instanceof Error ? updateError.message : 'Failed to update ad status.');
        }
    };

    const handleDelete = async (adId: string) => {
        if (!window.confirm('Delete this popup ad? This action cannot be undone.')) {
            return;
        }

        setError(null);
        setSuccess(null);

        try {
            const { error: deleteError } = await supabase
                .from('popup_ads')
                .delete()
                .eq('id', adId);

            if (deleteError) {
                throw deleteError;
            }

            if (editingAdId === adId) {
                resetForm(false);
            }

            setSuccess('Popup ad deleted.');
            await fetchAds();
        } catch (deleteError) {
            console.error('Error deleting popup ad:', deleteError);
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete popup ad.');
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            if (!form.title.trim()) {
                throw new Error('Ad title is required.');
            }

            if (!form.message.trim()) {
                throw new Error('Ad message is required.');
            }

            if (form.placements.length === 0) {
                throw new Error('Select at least one placement.');
            }

            const startDate = toIsoString(form.startDate);
            const endDate = toIsoString(form.endDate);

            if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
                throw new Error('End date must be after the start date.');
            }

            const payload = {
                title: form.title.trim(),
                content: form.message.trim(),
                ad_title: form.title.trim(),
                ad_message: form.message.trim(),
                image_url: form.imageUrl.trim() || null,
                button_text: form.buttonText.trim() || null,
                button_url: form.buttonUrl.trim() || null,
                display_duration_seconds: Math.max(Number(form.displayDurationSeconds) || 10, 10),
                display_frequency: form.displayFrequency,
                placements: form.placements,
                start_date: startDate,
                end_date: endDate,
                priority: Number(form.priority) || 0,
                max_impressions: form.maxImpressions ? Number(form.maxImpressions) : null,
                is_active: form.isActive,
                created_by: currentUserId,
                updated_at: new Date().toISOString(),
            };

            if (editingAdId) {
                const { error: updateError } = await supabase
                    .from('popup_ads')
                    .update(payload as never)
                    .eq('id', editingAdId);

                if (updateError) {
                    throw updateError;
                }

                setSuccess('Popup ad updated.');
            } else {
                const { error: insertError } = await supabase
                    .from('popup_ads')
                    .insert({
                        ...payload,
                        created_at: new Date().toISOString(),
                    } as never);

                if (insertError) {
                    throw insertError;
                }

                setSuccess('Popup ad created.');
            }

            resetForm(false);
            await fetchAds();
        } catch (submitError) {
            console.error('Error saving popup ad:', submitError);
            setError(submitError instanceof Error ? submitError.message : 'Failed to save popup ad.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Popup Ads</h1>
                    <p className="mt-1 text-slate-600">
                        Control popup content, schedule, placements, and session frequency.
                    </p>
                </div>

                <button
                    onClick={() => resetForm()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
                >
                    <Plus className="h-5 w-5" />
                    New Popup
                </button>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                    <div className="space-y-1">
                        <p className="font-semibold">Popup rules</p>
                        <p>Ads appear for authenticated users on the homepage and student dashboard only.</p>
                        <p>Close stays locked for at least 10 seconds and popups never appear inside mock-test sessions.</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    {success}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editingAdId ? 'Edit Popup Ad' : 'Create Popup Ad'}
                            </h2>
                            <p className="text-sm text-slate-500">
                                Keep the message concise so it fits cleanly on mobile devices.
                            </p>
                        </div>

                        {editingAdId && (
                            <button
                                type="button"
                                onClick={() => resetForm()}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                            >
                                <XCircle className="h-4 w-4" />
                                Cancel Edit
                            </button>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            <span>Ad Title</span>
                            <input
                                name="title"
                                value={form.title}
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                                placeholder="Daily Challenge Live"
                                maxLength={120}
                                required
                            />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            <span>Display Duration</span>
                            <input
                                name="displayDurationSeconds"
                                value={form.displayDurationSeconds}
                                onChange={handleInputChange}
                                type="number"
                                min={10}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                            />
                        </label>
                    </div>

                    <label className="space-y-2 text-sm font-medium text-slate-700">
                        <span>Ad Message</span>
                        <textarea
                            name="message"
                            value={form.message}
                            onChange={handleInputChange}
                            rows={5}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                            placeholder="Tell students or parents what is live right now."
                            maxLength={500}
                            required
                        />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            <span>Image URL</span>
                            <input
                                name="imageUrl"
                                value={form.imageUrl}
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                                placeholder="https://..."
                            />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            <span>CTA Text</span>
                            <input
                                name="buttonText"
                                value={form.buttonText}
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                                placeholder="Open now"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            <span>CTA URL</span>
                            <input
                                name="buttonUrl"
                                value={form.buttonUrl}
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                                placeholder="/challenge or https://..."
                            />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            <span>Priority</span>
                            <input
                                name="priority"
                                value={form.priority}
                                onChange={handleInputChange}
                                type="number"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            <span>Start Date</span>
                            <input
                                name="startDate"
                                value={form.startDate}
                                onChange={handleInputChange}
                                type="datetime-local"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                            />
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            <span>End Date</span>
                            <input
                                name="endDate"
                                value={form.endDate}
                                onChange={handleInputChange}
                                type="datetime-local"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            <span>Frequency</span>
                            <select
                                name="displayFrequency"
                                value={form.displayFrequency}
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                            >
                                {FREQUENCY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500">
                                {FREQUENCY_OPTIONS.find((option) => option.value === form.displayFrequency)?.description}
                            </p>
                        </label>

                        <label className="space-y-2 text-sm font-medium text-slate-700">
                            <span>Max Impressions</span>
                            <input
                                name="maxImpressions"
                                value={form.maxImpressions}
                                onChange={handleInputChange}
                                type="number"
                                min={1}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                                placeholder="Optional"
                            />
                        </label>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-700">Placement</p>
                        <div className="flex flex-wrap gap-3">
                            {PLACEMENT_OPTIONS.map((option) => {
                                const isSelected = form.placements.includes(option.value);
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handlePlacementToggle(option.value)}
                                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                                            isSelected
                                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                        <input
                            name="isActive"
                            checked={form.isActive}
                            onChange={handleInputChange}
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        Mark this popup as active immediately
                    </label>

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : editingAdId ? 'Update Popup' : 'Create Popup'}
                    </button>
                </form>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard icon={Image} label="Total Ads" value={ads.length} />
                        <StatCard icon={Target} label="Active" value={ads.filter((ad) => ad.is_active).length} />
                        <StatCard icon={Calendar} label="Scheduled" value={ads.filter((ad) => ad.start_date || ad.end_date).length} />
                        <StatCard icon={Eye} label="Impressions" value={ads.reduce((sum, ad) => sum + (ad.current_impressions || 0), 0)} />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">Preview Rules</h2>
                        <div className="mt-4 space-y-3 text-sm text-slate-600">
                            <div className="flex items-center gap-3">
                                <Clock className="h-4 w-4 text-primary-600" />
                                Close unlocks after 10 seconds or the configured longer duration.
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-primary-600" />
                                Scheduling uses start and end dates without removing existing campaigns.
                            </div>
                            <div className="flex items-center gap-3">
                                <Target className="h-4 w-4 text-primary-600" />
                                Placements currently support homepage and student dashboard.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ad</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Placement</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Frequency</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                                        Loading popup ads...
                                    </td>
                                </tr>
                            ) : ads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                                        No popup ads found yet.
                                    </td>
                                </tr>
                            ) : (
                                ads.map((ad) => (
                                    <tr key={ad.id} className="align-top">
                                        <td className="px-5 py-4">
                                            <div className="space-y-1">
                                                <p className="font-semibold text-slate-900">{ad.ad_title || ad.title}</p>
                                                <p className="max-w-sm text-sm text-slate-500">
                                                    {ad.ad_message || ad.content}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    Duration: {Math.max(ad.display_duration_seconds || 10, 10)}s
                                                </p>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {ad.placements.map((placement) => (
                                                    <span
                                                        key={`${ad.id}-${placement}`}
                                                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                                                    >
                                                        {placement === 'homepage' ? 'Homepage' : 'Student Dashboard'}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            <p>{ad.start_date ? new Date(ad.start_date).toLocaleString() : 'Immediate'}</p>
                                            <p>{ad.end_date ? `Until ${new Date(ad.end_date).toLocaleString()}` : 'No end date'}</p>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {FREQUENCY_OPTIONS.find((option) => option.value === ad.display_frequency)?.label || ad.display_frequency}
                                        </td>

                                        <td className="px-5 py-4">
                                            <button
                                                onClick={() => handleToggleActive(ad)}
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                    ad.is_active
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}
                                            >
                                                {ad.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(ad)}
                                                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary-700"
                                                    aria-label="Edit popup ad"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(ad.id)}
                                                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                                    aria-label="Delete popup ad"
                                                >
                                                    <Trash2 className="h-4 w-4" />
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

function StatCard({
    icon: Icon,
    label,
    value,
}: {
    icon: ElementType;
    label: string;
    value: string | number;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                    <Icon className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-xl font-bold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    );
}
