'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable, StatusBadge, ActionButton } from '@/components/admin/DataTable';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    Plus,
    GraduationCap,
    Clock,
    Calendar,
    Users,
    FileText,
    X,
    Save,
    Search,
    Check,
} from 'lucide-react';
import type { Database } from '@/types/supabase';

type Test = Database['public']['Tables']['tests']['Row'];
type Exam = Database['public']['Tables']['exams']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];

type TestType = 'full_mock' | 'subject_test' | 'chapter_test' | 'custom';
type DialogMode = 'create' | 'edit' | 'view' | null;

export default function TestsPage() {
    const [tests, setTests] = useState<Test[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<DialogMode>(null);
    const [selectedTest, setSelectedTest] = useState<Test | null>(null);

    const supabase = createBrowserSupabaseClient();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [{ data: testsData }, { data: examsData }, { data: questionsData }] = await Promise.all([
                supabase.from('tests').select('*, exams(*)').order('created_at', { ascending: false }),
                supabase.from('exams').select('*').eq('is_active', true),
                supabase.from('questions').select('*').eq('is_published', true),
            ]);
            setTests(testsData || []);
            setExams(examsData || []);
            setAvailableQuestions(questionsData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreate = () => {
        setSelectedTest(null);
        setDialogMode('create');
        setDialogOpen(true);
    };

    const handleEdit = (item: object) => {
        setSelectedTest(item as Test);
        setDialogMode('edit');
        setDialogOpen(true);
    };

    const handleView = (item: object) => {
        setSelectedTest(item as Test);
        setDialogMode('view');
        setDialogOpen(true);
    };

    const handleDelete = async (item: object) => {
        if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) return;

        try {
            const test = item as Test;
            const { error } = await supabase.from('tests').delete().eq('id', test.id);
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting test:', error);
            alert('Failed to delete test. Please try again.');
        }
    };

    const handleSave = async (formData: FormData) => {
        try {
            const data: Record<string, unknown> = {};
            formData.forEach((value, key) => {
                if (['is_published', 'allow_multiple_attempts', 'show_result_immediately'].includes(key)) {
                    data[key] = value === 'on';
                } else if (['duration_minutes', 'total_marks', 'negative_marking', 'passing_percent', 'question_count'].includes(key)) {
                    data[key] = value ? Number(value) : 0;
                } else if (key === 'selected_questions') {
                    data[key] = value ? String(value).split(',') : [];
                } else {
                    data[key] = value;
                }
            });

            if (dialogMode === 'create') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from('tests') as any).insert(data);
            } else if (dialogMode === 'edit' && selectedTest) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from('tests') as any).update(data).eq('id', selectedTest.id);
            }

            setDialogOpen(false);
            await fetchData();
        } catch (error) {
            console.error('Error saving test:', error);
            alert('Failed to save test. Please try again.');
        }
    };

    const columns = [
        {
            key: 'title',
            header: 'Test Title',
            sortable: true,
            render: (row: object) => {
                const test = row as Test & { exams: Exam | null };
                return (
                    <div>
                        <p className="font-medium text-slate-900">{test.title}</p>
                        <p className="text-xs text-slate-500">{test.exams?.name || 'No exam'}</p>
                    </div>
                );
            }
        },
        {
            key: 'type',
            header: 'Type',
            render: (row: object) => {
                const test = row as Test;
                const typeLabels: Record<string, string> = {
                    'full_mock': 'Full Mock',
                    'subject_test': 'Subject Test',
                    'chapter_test': 'Chapter Test',
                    'custom': 'Custom',
                };
                return <StatusBadge status={typeLabels[test.test_type] || test.test_type} variant="info" />;
            },
            width: '120px'
        },
        {
            key: 'duration',
            header: 'Duration',
            render: (row: object) => {
                const test = row as Test;
                const hours = Math.floor((test.duration_minutes || 0) / 60);
                const mins = (test.duration_minutes || 0) % 60;
                return <span className="text-sm text-slate-600">{hours}h {mins}m</span>;
            },
            width: '100px'
        },
        {
            key: 'questions',
            header: 'Questions',
            render: (row: object) => (
                <span className="text-sm text-slate-600">{(row as Test).question_count || 0}</span>
            ),
            width: '80px'
        },
        {
            key: 'marks',
            header: 'Total Marks',
            render: (row: object) => (
                <span className="text-sm text-slate-600">{(row as Test).total_marks || 0}</span>
            ),
            width: '100px'
        },
        {
            key: 'schedule',
            header: 'Schedule',
            render: (row: object) => {
                const test = row as Test;
                const startDate = test.start_time ? new Date(test.start_time).toLocaleDateString() : 'Not scheduled';
                return <span className="text-sm text-slate-600">{startDate}</span>;
            },
            width: '120px'
        },
        {
            key: 'is_published',
            header: 'Status',
            render: (row: object) => {
                const test = row as Test;
                return (
                    <StatusBadge
                        status={test.is_published ? 'Published' : 'Draft'}
                        variant={test.is_published ? 'success' : 'warning'}
                    />
                );
            },
            width: '100px'
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Test Management</h1>
                    <p className="text-slate-500">Create and manage tests, quizzes, and mock exams</p>
                </div>
                <ActionButton icon={Plus} onClick={handleCreate} variant="primary">
                    Create Test
                </ActionButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={GraduationCap} label="Total Tests" value={tests.length} />
                <StatCard icon={Check} label="Published" value={tests.filter(t => t.is_published).length} />
                <StatCard icon={Calendar} label="Scheduled" value={tests.filter(t => t.start_time).length} />
                <StatCard icon={FileText} label="Questions" value={tests.reduce((acc, t) => acc + (t.question_count || 0), 0)} />
            </div>

            {/* Data Table */}
            <DataTable
                data={tests as unknown as object[]}
                columns={columns}
                keyExtractor={(row) => (row as Test).id}
                title="All Tests"
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                searchKeys={['title', 'description']}
            />

            {/* Dialog */}
            {dialogOpen && (
                <TestDialog
                    mode={dialogMode}
                    test={selectedTest}
                    exams={exams}
                    availableQuestions={availableQuestions}
                    onClose={() => setDialogOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <p className="text-sm text-slate-500">{label}</p>
                </div>
            </div>
        </div>
    );
}

interface TestDialogProps {
    mode: DialogMode;
    test: Test | null;
    exams: Exam[];
    availableQuestions: Question[];
    onClose: () => void;
    onSave: (formData: FormData) => void;
}

function TestDialog({ mode, test, exams, onClose, onSave }: TestDialogProps) {
    const [activeTab, setActiveTab] = useState('basic');
    const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
    const isView = mode === 'view';

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.set('selected_questions', selectedQuestions.join(','));
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                        {mode === 'create' ? 'Create New Test' : mode === 'edit' ? 'Edit Test' : 'View Test'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 border-b border-slate-200">
                    <div className="flex gap-6">
                        {['basic', 'settings', 'questions'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Test Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    defaultValue={test?.title || ''}
                                    disabled={isView}
                                    required
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    defaultValue={test?.description || ''}
                                    disabled={isView}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Exam</label>
                                    <select
                                        name="exam_id"
                                        defaultValue={test?.exam_id || ''}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    >
                                        <option value="">Select Exam</option>
                                        {exams.map((e) => (
                                            <option key={e.id} value={e.id}>{e.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Test Type</label>
                                    <select
                                        name="test_type"
                                        defaultValue={test?.test_type || 'custom'}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    >
                                        <option value="full_mock">Full Mock</option>
                                        <option value="subject_test">Subject Test</option>
                                        <option value="chapter_test">Chapter Test</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                                    <input
                                        type="number"
                                        name="duration_minutes"
                                        defaultValue={test?.duration_minutes || 180}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Marks</label>
                                    <input
                                        type="number"
                                        name="total_marks"
                                        defaultValue={test?.total_marks || 300}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Question Count</label>
                                    <input
                                        type="number"
                                        name="question_count"
                                        defaultValue={test?.question_count || 75}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Negative Marking</label>
                                    <input
                                        type="number"
                                        step="0.25"
                                        name="negative_marking"
                                        defaultValue={test?.negative_marking || 1}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Passing %</label>
                                    <input
                                        type="number"
                                        name="passing_percent"
                                        defaultValue={test?.passing_percent || 35}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        name="start_time"
                                        defaultValue={test?.start_time ? new Date(test.start_time).toISOString().slice(0, 16) : ''}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                                    <input
                                        type="datetime-local"
                                        name="end_time"
                                        defaultValue={test?.end_time ? new Date(test.end_time).toISOString().slice(0, 16) : ''}
                                        disabled={isView}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="is_published"
                                        defaultChecked={test?.is_published || false}
                                        disabled={isView}
                                        className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                                    />
                                    <label className="text-sm font-medium text-slate-700">Publish test</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="allow_multiple_attempts"
                                        defaultChecked={test?.allow_multiple_attempts || false}
                                        disabled={isView}
                                        className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                                    />
                                    <label className="text-sm font-medium text-slate-700">Allow multiple attempts</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="show_result_immediately"
                                        defaultChecked={test?.show_result_immediately || true}
                                        disabled={isView}
                                        className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                                    />
                                    <label className="text-sm font-medium text-slate-700">Show result immediately</label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'questions' && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-sm text-slate-600">
                                    Selected {selectedQuestions.length} questions.
                                    Question selection will be implemented with a searchable question picker.
                                </p>
                            </div>
                        </div>
                    )}
                </form>

                {!isView && (
                    <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={() => {
                                const form = document.querySelector('form');
                                if (form) form.requestSubmit();
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {mode === 'create' ? 'Create Test' : 'Update Test'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
