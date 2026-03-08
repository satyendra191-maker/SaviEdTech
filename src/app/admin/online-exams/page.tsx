'use client';

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Flag, Plus, Save, Search, ShieldCheck, Trash2, Video, X } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { AdminOnlineExamOverview } from '@/lib/online-exams/types';

type ExamMode = 'jee' | 'neet' | 'cbse_board';

interface QuestionRow {
    id: string;
    question_text: string;
    question_type: string;
}

interface ExamForm {
    id?: string | null;
    title: string;
    description: string;
    examMode: ExamMode;
    durationMinutes: number;
    startTime: string;
    endTime: string;
    instructionsText: string;
    isPublished: boolean;
    proctoringEnabled: boolean;
    desktopOnly: boolean;
    warningThreshold: number;
    autoSubmitThreshold: number;
    retentionDays: number;
    sections: Array<{ name: string; subjectName: string }>;
    selectedQuestionIds: string[];
}

interface AdminOnlineExamDetail {
    exam: {
        id: string;
        title: string | null;
        description: string | null;
        exam_mode: ExamMode;
        duration_minutes: number | null;
        start_time: string | null;
        end_time: string | null;
        instructions: string[] | null;
        is_published: boolean | null;
        proctoring_enabled: boolean | null;
        desktop_only: boolean | null;
        warning_threshold: number | null;
        auto_submit_threshold: number | null;
        snapshot_retention_days: number | null;
    };
    sections: Array<{ name: string; subjectName: string }>;
    selectedQuestionIds: string[];
}

const DEFAULT_FORM: ExamForm = {
    id: null,
    title: '',
    description: '',
    examMode: 'jee',
    durationMinutes: 180,
    startTime: '',
    endTime: '',
    instructionsText: 'Read every question carefully.',
    isPublished: false,
    proctoringEnabled: true,
    desktopOnly: true,
    warningThreshold: 3,
    autoSubmitThreshold: 5,
    retentionDays: 30,
    sections: [
        { name: 'Physics', subjectName: 'Physics' },
        { name: 'Chemistry', subjectName: 'Chemistry' },
        { name: 'Mathematics', subjectName: 'Mathematics' },
    ],
    selectedQuestionIds: [],
};

export default function AdminOnlineExamsPage() {
    const supabase = useMemo(() => getSupabaseBrowserClient(), []);
    const [overview, setOverview] = useState<AdminOnlineExamOverview | null>(null);
    const [questions, setQuestions] = useState<QuestionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [questionSearch, setQuestionSearch] = useState('');
    const [form, setForm] = useState<ExamForm>(DEFAULT_FORM);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [overviewResponse, questionsResponse] = await Promise.all([
                fetch('/api/admin/online-exams', {
                    credentials: 'include',
                    cache: 'no-store',
                }),
                supabase
                    ?.from('questions')
                    .select('id, question_text, question_type')
                    .eq('is_published', true)
                    .limit(150),
            ]);

            const payload = await overviewResponse.json().catch(() => null);
            if (!overviewResponse.ok) {
                throw new Error(payload?.error || 'Failed to load online exam admin data.');
            }

            setOverview(payload.data as AdminOnlineExamOverview);
            setQuestions((questionsResponse?.data || []) as QuestionRow[]);
        } catch (loadError) {
            console.error('Failed to load admin online exams:', loadError);
            setError(loadError instanceof Error ? loadError.message : 'Failed to load online exam admin data.');
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const filteredQuestions = useMemo(() => {
        const term = questionSearch.trim().toLowerCase();
        if (!term) {
            return questions;
        }

        return questions.filter((question) =>
            [question.question_text, question.question_type].some((value) => value?.toLowerCase().includes(term))
        );
    }, [questionSearch, questions]);

    async function openEditDialog(examId: string) {
        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/admin/online-exams?examId=${examId}`, {
                credentials: 'include',
                cache: 'no-store',
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to load exam details.');
            }

            const detail = payload.data as AdminOnlineExamDetail;

            setForm({
                id: detail.exam.id,
                title: detail.exam.title || '',
                description: detail.exam.description || '',
                examMode: detail.exam.exam_mode || 'jee',
                durationMinutes: detail.exam.duration_minutes || 180,
                startTime: toDatetimeLocal(detail.exam.start_time),
                endTime: toDatetimeLocal(detail.exam.end_time),
                instructionsText: Array.isArray(detail.exam.instructions) ? detail.exam.instructions.join('\n') : '',
                isPublished: Boolean(detail.exam.is_published),
                proctoringEnabled: detail.exam.proctoring_enabled !== false,
                desktopOnly: detail.exam.desktop_only !== false,
                warningThreshold: detail.exam.warning_threshold || 3,
                autoSubmitThreshold: detail.exam.auto_submit_threshold || 5,
                retentionDays: detail.exam.snapshot_retention_days || 30,
                sections: (detail.sections || []).map((section) => ({
                    name: section.name,
                    subjectName: section.subjectName,
                })),
                selectedQuestionIds: detail.selectedQuestionIds || [],
            });
            setDialogOpen(true);
        } catch (editError) {
            console.error('Failed to open exam editor:', editError);
            setError(editError instanceof Error ? editError.message : 'Failed to open exam editor.');
        } finally {
            setSaving(false);
        }
    }

    async function saveExam() {
        setSaving(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/online-exams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'upsert_exam',
                    payload: {
                        id: form.id,
                        title: form.title,
                        description: form.description,
                        examMode: form.examMode,
                        durationMinutes: form.durationMinutes,
                        startTime: fromDatetimeLocal(form.startTime),
                        endTime: fromDatetimeLocal(form.endTime),
                        instructions: normalizeLines(form.instructionsText),
                        isPublished: form.isPublished,
                        proctoringEnabled: form.proctoringEnabled,
                        desktopOnly: form.desktopOnly,
                        warningThreshold: form.warningThreshold,
                        autoSubmitThreshold: form.autoSubmitThreshold,
                        retentionDays: form.retentionDays,
                        sections: form.sections.map((section, index) => ({
                            name: section.name,
                            subjectName: section.subjectName,
                            instructions: [],
                            displayOrder: index,
                        })),
                        selectedQuestionIds: form.selectedQuestionIds,
                    },
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to save online exam.');
            }

            setDialogOpen(false);
            setForm(DEFAULT_FORM);
            setQuestionSearch('');
            await fetchData();
        } catch (saveError) {
            console.error('Failed to save exam:', saveError);
            setError(saveError instanceof Error ? saveError.message : 'Failed to save online exam.');
        } finally {
            setSaving(false);
        }
    }

    async function deleteExam(examId: string) {
        if (!window.confirm('Delete this online exam?')) {
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/online-exams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'delete_exam',
                    examId,
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to delete online exam.');
            }

            await fetchData();
        } catch (deleteError) {
            console.error('Failed to delete exam:', deleteError);
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete online exam.');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
                    <p className="text-sm text-slate-500">Loading online exam admin center...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Online Exam Control Center</h1>
                    <p className="text-sm text-slate-500">Manage CBT schedules, question pools, and proctoring alerts.</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setForm(DEFAULT_FORM);
                        setDialogOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                    <Plus className="h-4 w-4" />
                    New Online Exam
                </button>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Total Exams" value={String(overview?.exams.length || 0)} icon={ShieldCheck} />
                <SummaryCard label="Active Attempts" value={String(overview?.activeAttempts || 0)} icon={Video} />
                <SummaryCard label="Flagged Attempts" value={String(overview?.flaggedAttempts || 0)} icon={Flag} />
                <SummaryCard label="Question Pool" value={String(questions.length)} icon={Search} />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Configured Exams</h2>
                <div className="mt-5 space-y-4">
                    {overview?.exams.length ? overview.exams.map((exam) => (
                        <article key={exam.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
                                            {exam.examMode.replace('_', ' ')}
                                        </span>
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                            exam.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                            {exam.isPublished ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                    <h3 className="mt-3 text-lg font-semibold text-slate-900">{exam.title}</h3>
                                    <p className="mt-2 text-sm text-slate-500">{exam.description || 'No description available.'}</p>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex flex-wrap justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void openEditDialog(exam.id)}
                                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void deleteExam(exam.id)}
                                            className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="mr-2 inline h-4 w-4" />
                                            Delete
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <Metric label="Attempts" value={String(exam.attemptsCount)} />
                                        <Metric label="Live" value={String(exam.activeAttemptsCount)} />
                                        <Metric label="Flagged" value={String(exam.flaggedAttemptsCount)} />
                                        <Metric label="Avg Score" value={exam.averageScore.toFixed(1)} />
                                    </div>
                                </div>
                            </div>
                        </article>
                    )) : (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                            No online exams configured yet.
                        </div>
                    )}
                </div>
            </div>

            {dialogOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
                    <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Online Exam Editor</h2>
                                <p className="text-sm text-slate-500">Configure schedule, proctoring, sections, and the question pool.</p>
                            </div>
                            <button type="button" onClick={() => setDialogOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="grid flex-1 gap-0 overflow-hidden xl:grid-cols-[0.85fr_1.15fr]">
                            <div className="overflow-y-auto border-r border-slate-200 p-6">
                                <div className="space-y-4">
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-medium text-slate-700">Exam Title</span>
                                        <input
                                            value={form.title}
                                            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-primary-500"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
                                        <textarea
                                            value={form.description}
                                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                            rows={3}
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-primary-500"
                                        />
                                    </label>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="block">
                                            <span className="mb-2 block text-sm font-medium text-slate-700">Exam Mode</span>
                                            <select
                                                value={form.examMode}
                                                onChange={(event) => setForm((current) => ({ ...current, examMode: event.target.value as ExamMode }))}
                                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-primary-500"
                                            >
                                                <option value="jee">JEE</option>
                                                <option value="neet">NEET</option>
                                                <option value="cbse_board">CBSE Board</option>
                                            </select>
                                        </label>

                                        <label className="block">
                                            <span className="mb-2 block text-sm font-medium text-slate-700">Duration (minutes)</span>
                                            <input
                                                type="number"
                                                value={form.durationMinutes}
                                                onChange={(event) => setForm((current) => ({ ...current, durationMinutes: Number(event.target.value || 0) }))}
                                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-primary-500"
                                            />
                                        </label>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="block">
                                            <span className="mb-2 block text-sm font-medium text-slate-700">Start Time</span>
                                            <input
                                                type="datetime-local"
                                                value={form.startTime}
                                                onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-primary-500"
                                            />
                                        </label>

                                        <label className="block">
                                            <span className="mb-2 block text-sm font-medium text-slate-700">End Time</span>
                                            <input
                                                type="datetime-local"
                                                value={form.endTime}
                                                onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-primary-500"
                                            />
                                        </label>
                                    </div>

                                    <label className="block">
                                        <span className="mb-2 block text-sm font-medium text-slate-700">Instructions</span>
                                        <textarea
                                            value={form.instructionsText}
                                            onChange={(event) => setForm((current) => ({ ...current, instructionsText: event.target.value }))}
                                            rows={5}
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-primary-500"
                                        />
                                    </label>

                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <ToggleButton label="Published" checked={form.isPublished} onClick={() => setForm((current) => ({ ...current, isPublished: !current.isPublished }))} />
                                        <ToggleButton label="AI Proctoring" checked={form.proctoringEnabled} onClick={() => setForm((current) => ({ ...current, proctoringEnabled: !current.proctoringEnabled }))} />
                                        <ToggleButton label="Desktop Only" checked={form.desktopOnly} onClick={() => setForm((current) => ({ ...current, desktopOnly: !current.desktopOnly }))} />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <NumericField label="Warnings" value={form.warningThreshold} onChange={(value) => setForm((current) => ({ ...current, warningThreshold: value }))} />
                                        <NumericField label="Auto-submit" value={form.autoSubmitThreshold} onChange={(value) => setForm((current) => ({ ...current, autoSubmitThreshold: value }))} />
                                        <NumericField label="Retention Days" value={form.retentionDays} onChange={(value) => setForm((current) => ({ ...current, retentionDays: value }))} />
                                    </div>

                                    <div>
                                        <div className="mb-3 flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-700">Sections</span>
                                            <button
                                                type="button"
                                                onClick={() => setForm((current) => ({
                                                    ...current,
                                                    sections: [...current.sections, { name: '', subjectName: '' }],
                                                }))}
                                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                Add Section
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {form.sections.map((section, index) => (
                                                <div key={`${section.name}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                                                        <input
                                                            value={section.name}
                                                            onChange={(event) => updateSection(setForm, index, 'name', event.target.value)}
                                                            placeholder="Section name"
                                                            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-primary-500"
                                                        />
                                                        <input
                                                            value={section.subjectName}
                                                            onChange={(event) => updateSection(setForm, index, 'subjectName', event.target.value)}
                                                            placeholder="Subject name"
                                                            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-primary-500"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setForm((current) => ({
                                                                ...current,
                                                                sections: current.sections.filter((_, sectionIndex) => sectionIndex !== index),
                                                            }))}
                                                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex h-full flex-col p-6">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={questionSearch}
                                        onChange={(event) => setQuestionSearch(event.target.value)}
                                        placeholder="Search questions"
                                        className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 outline-none focus:border-primary-500"
                                    />
                                </div>
                                <div className="mt-5 flex-1 overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="space-y-3">
                                        {filteredQuestions.map((question) => {
                                            const selected = form.selectedQuestionIds.includes(question.id);
                                            return (
                                                <label
                                                    key={question.id}
                                                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                                                        selected
                                                            ? 'border-primary-300 bg-primary-50'
                                                            : 'border-slate-200 bg-white hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selected}
                                                        onChange={() => toggleQuestion(setForm, question.id)}
                                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <div>
                                                        <p className="text-xs uppercase tracking-wide text-slate-400">{question.question_type}</p>
                                                        <p className="mt-2 text-sm font-medium text-slate-900">
                                                            {question.question_text.length > 170
                                                                ? `${question.question_text.slice(0, 170)}...`
                                                                : question.question_text}
                                                        </p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setDialogOpen(false)}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void saveExam()}
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? 'Saving...' : form.id ? 'Update Exam' : 'Create Exam'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function SummaryCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon: typeof ShieldCheck;
}) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-2xl font-semibold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
        </div>
    );
}

function ToggleButton({
    label,
    checked,
    onClick,
}: {
    label: string;
    checked: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-3xl border px-4 py-4 text-left ${
                checked
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
        >
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-1 text-xs uppercase tracking-wide">{checked ? 'Enabled' : 'Disabled'}</p>
        </button>
    );
}

function NumericField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
            <input
                type="number"
                value={value}
                onChange={(event) => onChange(Number(event.target.value || 0))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-primary-500"
            />
        </label>
    );
}

function updateSection(
    setForm: Dispatch<SetStateAction<ExamForm>>,
    index: number,
    field: 'name' | 'subjectName',
    value: string
) {
    setForm((current) => ({
        ...current,
        sections: current.sections.map((section, sectionIndex) => (
            sectionIndex === index ? { ...section, [field]: value } : section
        )),
    }));
}

function toggleQuestion(
    setForm: Dispatch<SetStateAction<ExamForm>>,
    questionId: string
) {
    setForm((current) => {
        const exists = current.selectedQuestionIds.includes(questionId);
        return {
            ...current,
            selectedQuestionIds: exists
                ? current.selectedQuestionIds.filter((id) => id !== questionId)
                : [...current.selectedQuestionIds, questionId],
        };
    });
}

function normalizeLines(value: string): string[] {
    return value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

function toDatetimeLocal(value: string | null): string {
    return value ? new Date(value).toISOString().slice(0, 16) : '';
}

function fromDatetimeLocal(value: string): string | null {
    return value ? new Date(value).toISOString() : null;
}
