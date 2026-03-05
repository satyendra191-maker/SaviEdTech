'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable, StatusBadge, ActionButton } from '@/components/admin/DataTable';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    Plus,
    HelpCircle,
    CheckCircle,
    XCircle,
    Clock,
    BarChart3,
    X,
    Save,
    Trash2,
} from 'lucide-react';
import type { Database } from '@/types/supabase';

type Question = Database['public']['Tables']['questions']['Row'];
type Topic = Database['public']['Tables']['topics']['Row'];
type Chapter = Database['public']['Tables']['chapters']['Row'];
type Subject = Database['public']['Tables']['subjects']['Row'];

type QuestionType = 'MCQ' | 'NUMERICAL' | 'ASSERTION_REASON';
type DialogMode = 'create' | 'edit' | 'view' | null;

interface QuestionOption {
    id: string;
    option_text: string;
    option_label: string;
    is_correct?: boolean;
}

export default function QuestionsPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<DialogMode>(null);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

    const supabase = createBrowserSupabaseClient();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [{ data: questionsData }, { data: topicsData }] = await Promise.all([
                supabase.from('questions').select('*, topics(*, chapters(*, subjects(*)))').order('created_at', { ascending: false }),
                supabase.from('topics').select('*, chapters(*, subjects(*))').eq('is_active', true),
            ]);
            setQuestions(questionsData || []);
            setTopics(topicsData || []);
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
        setSelectedQuestion(null);
        setDialogMode('create');
        setDialogOpen(true);
    };

    const handleEdit = (item: object) => {
        setSelectedQuestion(item as Question);
        setDialogMode('edit');
        setDialogOpen(true);
    };

    const handleView = (item: object) => {
        setSelectedQuestion(item as Question);
        setDialogMode('view');
        setDialogOpen(true);
    };

    const handleDelete = async (item: object) => {
        if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) return;

        try {
            const question = item as Question;
            const { error } = await supabase.from('questions').delete().eq('id', question.id);
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting question:', error);
            alert('Failed to delete question. Please try again.');
        }
    };

    const handleSave = async (formData: FormData) => {
        try {
            const data: Record<string, unknown> = {};
            formData.forEach((value, key) => {
                if (key === 'is_published') {
                    data[key] = value === 'on';
                } else if (['marks', 'negative_marks', 'estimated_time_minutes', 'attempt_count', 'correct_count'].includes(key)) {
                    data[key] = value ? Number(value) : 0;
                } else if (key === 'tags') {
                    data[key] = value ? String(value).split(',').map(s => s.trim()) : [];
                } else if (key === 'options') {
                    try {
                        data[key] = JSON.parse(String(value));
                    } catch {
                        data[key] = [];
                    }
                } else {
                    data[key] = value;
                }
            });

            if (dialogMode === 'create') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from('questions') as any).insert(data);
            } else if (dialogMode === 'edit' && selectedQuestion) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from('questions') as any).update(data).eq('id', selectedQuestion.id);
            }

            setDialogOpen(false);
            await fetchData();
        } catch (error) {
            console.error('Error saving question:', error);
            alert('Failed to save question. Please try again.');
        }
    };

    const columns = [
        {
            key: 'question',
            header: 'Question',
            sortable: true,
            render: (row: object) => {
                const question = row as Question;
                return (
                    <div className="max-w-md">
                        <p className="text-sm text-slate-900 line-clamp-2" dangerouslySetInnerHTML={{ __html: question.question_text }} />
                    </div>
                );
            }
        },
        {
            key: 'type',
            header: 'Type',
            render: (row: object) => {
                const question = row as Question;
                const typeColors: Record<string, 'default' | 'info' | 'warning'> = {
                    'MCQ': 'info',
                    'NUMERICAL': 'warning',
                    'ASSERTION_REASON': 'default',
                };
                return <StatusBadge status={question.question_type} variant={typeColors[question.question_type] || 'default'} />;
            },
            width: '100px'
        },
        {
            key: 'topic',
            header: 'Topic',
            render: (row: object) => {
                const question = row as Question & { topics: (Topic & { chapters: (Chapter & { subjects: Subject | null }) | null }) | null };
                const topicName = question.topics?.name || 'N/A';
                const subjectName = question.topics?.chapters?.subjects?.name;
                return (
                    <div>
                        <p className="text-sm text-slate-900">{topicName}</p>
                        {subjectName && <p className="text-xs text-slate-500">{subjectName}</p>}
                    </div>
                );
            }
        },
        {
            key: 'difficulty',
            header: 'Difficulty',
            render: (row: object) => {
                const question = row as Question;
                return (
                    <StatusBadge
                        status={question.difficulty_level || 'N/A'}
                        variant={question.difficulty_level === 'easy' ? 'success' : question.difficulty_level === 'medium' ? 'warning' : 'error'}
                    />
                );
            },
            width: '100px'
        },
        {
            key: 'marks',
            header: 'Marks',
            render: (row: object) => {
                const question = row as Question;
                return (
                    <div className="text-sm">
                        <span className="text-green-600">+{question.marks || 0}</span>
                        <span className="text-red-500 ml-1">-{question.negative_marks || 0}</span>
                    </div>
                );
            },
            width: '80px'
        },
        {
            key: 'stats',
            header: 'Stats',
            render: (row: object) => {
                const question = row as Question;
                const successRate = question.success_rate ? `${(question.success_rate * 100).toFixed(1)}%` : 'N/A';
                return (
                    <div className="text-sm text-slate-600">
                        <div className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {successRate}</div>
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {question.average_solve_time?.toFixed(1) || '-'} min</div>
                    </div>
                );
            },
            width: '120px'
        },
        {
            key: 'is_published',
            header: 'Status',
            render: (row: object) => {
                const question = row as Question;
                return (
                    <StatusBadge
                        status={question.is_published ? 'Published' : 'Draft'}
                        variant={question.is_published ? 'success' : 'warning'}
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
                    <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
                    <p className="text-slate-500">Manage MCQ, numerical, and assertion-reason questions</p>
                </div>
                <div className="flex gap-2">
                    <ActionButton icon={Plus} onClick={handleCreate} variant="primary">
                        Add Question
                    </ActionButton>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard icon={HelpCircle} label="Total Questions" value={questions.length} />
                <StatCard icon={CheckCircle} label="Published" value={questions.filter(q => q.is_published).length} />
                <StatCard icon={XCircle} label="Drafts" value={questions.filter(q => !q.is_published).length} />
                <StatCard icon={BarChart3} label="MCQ" value={questions.filter(q => q.question_type === 'MCQ').length} />
                <StatCard icon={Clock} label="Numerical" value={questions.filter(q => q.question_type === 'NUMERICAL').length} />
            </div>

            {/* Data Table */}
            <DataTable
                data={questions as unknown as object[]}
                columns={columns}
                keyExtractor={(row) => (row as Question).id}
                title="All Questions"
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                searchKeys={['question_text', 'solution_text']}
            />

            {/* Dialog */}
            {dialogOpen && (
                <QuestionDialog
                    mode={dialogMode}
                    question={selectedQuestion}
                    topics={topics}
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

interface QuestionDialogProps {
    mode: DialogMode;
    question: Question | null;
    topics: Topic[];
    onClose: () => void;
    onSave: (formData: FormData) => void;
}

function QuestionDialog({ mode, question, topics, onClose, onSave }: QuestionDialogProps) {
    const [questionType, setQuestionType] = useState<QuestionType>(question?.question_type || 'MCQ');
    const [options, setOptions] = useState<QuestionOption[]>([
        { id: '1', option_label: 'A', option_text: '', is_correct: false },
        { id: '2', option_label: 'B', option_text: '', is_correct: false },
        { id: '3', option_label: 'C', option_text: '', is_correct: false },
        { id: '4', option_label: 'D', option_text: '', is_correct: false },
    ]);

    const isView = mode === 'view';

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        if (questionType === 'MCQ') {
            formData.set('options', JSON.stringify(options));
            const correctOption = options.find(o => o.is_correct);
            if (correctOption) {
                formData.set('correct_answer', correctOption.option_label);
            }
        }

        onSave(formData);
    };

    const addOption = () => {
        const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
        const nextLabel = labels[options.length] || String.fromCharCode(65 + options.length);
        setOptions([...options, { id: Date.now().toString(), option_label: nextLabel, option_text: '', is_correct: false }]);
    };

    const removeOption = (id: string) => {
        if (options.length <= 2) {
            alert('MCQ must have at least 2 options');
            return;
        }
        setOptions(options.filter(o => o.id !== id));
    };

    const updateOption = (id: string, text: string) => {
        setOptions(options.map(o => o.id === id ? { ...o, option_text: text } : o));
    };

    const setCorrectOption = (id: string) => {
        setOptions(options.map(o => ({ ...o, is_correct: o.id === id })));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                        {mode === 'create' ? 'Add New Question' : mode === 'edit' ? 'Edit Question' : 'View Question'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Question Type *</label>
                            <select
                                name="question_type"
                                value={questionType}
                                onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                                disabled={isView || mode === 'edit'}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                            >
                                <option value="MCQ">Multiple Choice (MCQ)</option>
                                <option value="NUMERICAL">Numerical</option>
                                <option value="ASSERTION_REASON">Assertion and Reason</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Topic *</label>
                            <select
                                name="topic_id"
                                defaultValue={question?.topic_id || ''}
                                disabled={isView}
                                required
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                            >
                                <option value="">Select Topic</option>
                                {topics.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Question Text *</label>
                        <textarea
                            name="question_text"
                            defaultValue={question?.question_text || ''}
                            disabled={isView}
                            required
                            rows={4}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                            placeholder="Enter question text"
                        />
                    </div>

                    {questionType === 'MCQ' && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Options *</label>
                            <div className="space-y-2">
                                {options.map((option) => (
                                    <div key={option.id} className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCorrectOption(option.id)}
                                            disabled={isView}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${option.is_correct
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {option.option_label}
                                        </button>
                                        <input
                                            type="text"
                                            value={option.option_text}
                                            onChange={(e) => updateOption(option.id, e.target.value)}
                                            disabled={isView}
                                            placeholder={`Option ${option.option_label}`}
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                        />
                                        {!isView && (
                                            <button
                                                type="button"
                                                onClick={() => removeOption(option.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {!isView && (
                                <button
                                    type="button"
                                    onClick={addOption}
                                    className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    + Add Option
                                </button>
                            )}
                        </div>
                    )}

                    {questionType !== 'MCQ' && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Correct Answer {questionType === 'NUMERICAL' && '(Number)'}
                            </label>
                            <input
                                type={questionType === 'NUMERICAL' ? 'number' : 'text'}
                                name="correct_answer"
                                defaultValue={question?.correct_answer || ''}
                                disabled={isView}
                                required
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                            />
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Solution Text *</label>
                        <textarea
                            name="solution_text"
                            defaultValue={question?.solution_text || ''}
                            disabled={isView}
                            required
                            rows={6}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                            placeholder="Enter detailed solution"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Marks</label>
                            <input
                                type="number"
                                name="marks"
                                defaultValue={question?.marks || 4}
                                disabled={isView}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Negative Marks</label>
                            <input
                                type="number"
                                step="0.25"
                                name="negative_marks"
                                defaultValue={question?.negative_marks || 1}
                                disabled={isView}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Time (minutes)</label>
                            <input
                                type="number"
                                name="estimated_time_minutes"
                                defaultValue={question?.estimated_time_minutes || 2}
                                disabled={isView}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                            <select
                                name="difficulty_level"
                                defaultValue={question?.difficulty_level || 'medium'}
                                disabled={isView}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
                            <input
                                type="text"
                                name="tags"
                                defaultValue={question?.tags?.join(', ') || ''}
                                disabled={isView}
                                placeholder="physics, mechanics, formulas"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hint</label>
                        <input
                            type="text"
                            name="hint"
                            defaultValue={question?.hint || ''}
                            disabled={isView}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                            placeholder="Optional hint for students"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            name="is_published"
                            defaultChecked={question?.is_published || false}
                            disabled={isView}
                            className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                        />
                        <label className="text-sm font-medium text-slate-700">Publish immediately</label>
                    </div>
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
                            {mode === 'create' ? 'Create Question' : 'Update Question'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
