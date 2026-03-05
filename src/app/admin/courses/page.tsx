'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable, StatusBadge, ActionButton } from '@/components/admin/DataTable';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    Plus,
    BookOpen,
    Layers,
    FolderTree,
    FileText,
    ChevronRight,
    X,
} from 'lucide-react';
import type { Database } from '@/types/supabase';

type Exam = Database['public']['Tables']['exams']['Row'];
type Subject = Database['public']['Tables']['subjects']['Row'];
type Chapter = Database['public']['Tables']['chapters']['Row'];
type Topic = Database['public']['Tables']['topics']['Row'];

type ViewMode = 'exams' | 'subjects' | 'chapters' | 'topics';
type DialogMode = 'create' | 'edit' | 'view' | null;
type ItemType = Exam | Subject | Chapter | Topic;

interface Breadcrumb {
    id: string;
    name: string;
    type: ViewMode;
}

export default function CoursesPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('exams');
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<DialogMode>(null);
    const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);

    // Data states
    const [exams, setExams] = useState<Exam[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);

    const supabase = createBrowserSupabaseClient();

    // Get parent ID from breadcrumbs
    const getParentId = () => {
        if (breadcrumbs.length === 0) return null;
        return breadcrumbs[breadcrumbs.length - 1].id;
    };

    // Fetch data based on current view
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            switch (viewMode) {
                case 'exams': {
                    const { data } = await supabase
                        .from('exams')
                        .select('*')
                        .order('created_at', { ascending: false });
                    setExams(data || []);
                    break;
                }
                case 'subjects': {
                    const parentId = getParentId();
                    const { data } = await supabase
                        .from('subjects')
                        .select('*')
                        .eq('exam_id', parentId)
                        .order('display_order', { ascending: true });
                    setSubjects(data || []);
                    break;
                }
                case 'chapters': {
                    const parentId = getParentId();
                    const { data } = await supabase
                        .from('chapters')
                        .select('*')
                        .eq('subject_id', parentId)
                        .order('display_order', { ascending: true });
                    setChapters(data || []);
                    break;
                }
                case 'topics': {
                    const parentId = getParentId();
                    const { data } = await supabase
                        .from('topics')
                        .select('*')
                        .eq('chapter_id', parentId)
                        .order('display_order', { ascending: true });
                    setTopics(data || []);
                    break;
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [viewMode, breadcrumbs, supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Navigation handlers
    const handleNavigate = (item: Exam | Subject | Chapter, nextView: ViewMode) => {
        setBreadcrumbs((prev) => [...prev, { id: item.id, name: item.name, type: viewMode }]);
        setViewMode(nextView);
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            setBreadcrumbs([]);
            setViewMode('exams');
        } else {
            setBreadcrumbs((prev) => prev.slice(0, index + 1));
            setViewMode(breadcrumbs[index].type === 'exams' ? 'subjects' :
                breadcrumbs[index].type === 'subjects' ? 'chapters' : 'topics');
        }
    };

    // CRUD handlers
    const handleCreate = () => {
        setSelectedItem(null);
        setDialogMode('create');
        setDialogOpen(true);
    };

    const handleEdit = (item: object) => {
        setSelectedItem(item as ItemType);
        setDialogMode('edit');
        setDialogOpen(true);
    };

    const handleView = (item: object) => {
        setSelectedItem(item as ItemType);
        setDialogMode('view');
        setDialogOpen(true);
    };

    const handleDelete = async (item: object) => {
        if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) return;

        try {
            const typedItem = item as ItemType;
            const { error } = await supabase
                .from(viewMode)
                .delete()
                .eq('id', typedItem.id);

            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Failed to delete item. Please try again.');
        }
    };

    const handleSave = async (formData: FormData) => {
        try {
            const data: Record<string, unknown> = {};
            formData.forEach((value, key) => {
                if (key === 'is_active') {
                    data[key] = value === 'on';
                } else if (key === 'subjects') {
                    data[key] = value ? String(value).split(',').map(s => s.trim()) : [];
                } else if (['duration_minutes', 'total_marks', 'display_order', 'estimated_hours', 'estimated_minutes', 'weightage_percent'].includes(key)) {
                    data[key] = value ? Number(value) : null;
                } else {
                    data[key] = value;
                }
            });

            // Add parent reference
            const parentId = getParentId();
            if (viewMode === 'subjects' && parentId) data.exam_id = parentId;
            if (viewMode === 'chapters' && parentId) data.subject_id = parentId;
            if (viewMode === 'topics' && parentId) data.chapter_id = parentId;

            if (dialogMode === 'create') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from(viewMode) as any).insert(data);
            } else if (dialogMode === 'edit' && selectedItem) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from(viewMode) as any).update(data).eq('id', selectedItem.id);
            }

            setDialogOpen(false);
            await fetchData();
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Failed to save item. Please try again.');
        }
    };

    // Column definitions for each view mode
    const getExamColumns = () => [
        { key: 'name', header: 'Exam Name', sortable: true },
        { key: 'code', header: 'Code', sortable: true, width: '120px' },
        {
            key: 'subjects', header: 'Subjects', render: (row: object) => {
                const exam = row as Exam;
                return <span className="text-sm text-slate-600">{(exam.subjects || []).length} subjects</span>;
            }
        },
        {
            key: 'duration_minutes', header: 'Duration', render: (row: object) => {
                const exam = row as Exam;
                return <span className="text-sm text-slate-600">{exam.duration_minutes || '-'} min</span>;
            }, width: '100px'
        },
        {
            key: 'total_marks', header: 'Total Marks', render: (row: object) => {
                const exam = row as Exam;
                return <span className="text-sm text-slate-600">{exam.total_marks || '-'}</span>;
            }, width: '100px'
        },
        {
            key: 'is_active', header: 'Status', render: (row: object) => {
                const exam = row as Exam;
                return <StatusBadge status={exam.is_active ? 'Active' : 'Inactive'} variant={exam.is_active ? 'success' : 'warning'} />;
            }, width: '100px'
        },
        {
            key: 'actions', header: '', render: (row: object) => {
                const exam = row as Exam;
                return (
                    <button
                        onClick={() => handleNavigate(exam, 'subjects')}
                        className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                        View Subjects <ChevronRight className="w-4 h-4" />
                    </button>
                );
            }, width: '140px'
        },
    ];

    const getSubjectColumns = () => [
        { key: 'name', header: 'Subject Name', sortable: true },
        { key: 'code', header: 'Code', sortable: true, width: '120px' },
        {
            key: 'faculty_id', header: 'Faculty', render: (row: object) => {
                const subject = row as Subject;
                return <span className="text-sm text-slate-600">{subject.faculty_id || 'Not assigned'}</span>;
            }
        },
        { key: 'display_order', header: 'Order', sortable: true, width: '80px' },
        {
            key: 'is_active', header: 'Status', render: (row: object) => {
                const subject = row as Subject;
                return <StatusBadge status={subject.is_active ? 'Active' : 'Inactive'} variant={subject.is_active ? 'success' : 'warning'} />;
            }, width: '100px'
        },
        {
            key: 'actions', header: '', render: (row: object) => {
                const subject = row as Subject;
                return (
                    <button
                        onClick={() => handleNavigate(subject, 'chapters')}
                        className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                        View Chapters <ChevronRight className="w-4 h-4" />
                    </button>
                );
            }, width: '140px'
        },
    ];

    const getChapterColumns = () => [
        { key: 'name', header: 'Chapter Name', sortable: true },
        { key: 'code', header: 'Code', sortable: true, width: '120px' },
        {
            key: 'estimated_hours', header: 'Est. Hours', render: (row: object) => {
                const chapter = row as Chapter;
                return <span className="text-sm text-slate-600">{chapter.estimated_hours || '-'} hrs</span>;
            }, width: '100px'
        },
        {
            key: 'difficulty_level', header: 'Difficulty', render: (row: object) => {
                const chapter = row as Chapter;
                return <StatusBadge
                    status={chapter.difficulty_level || 'N/A'}
                    variant={chapter.difficulty_level === 'easy' ? 'success' : chapter.difficulty_level === 'medium' ? 'warning' : 'error'}
                />;
            }, width: '100px'
        },
        { key: 'display_order', header: 'Order', sortable: true, width: '80px' },
        {
            key: 'is_active', header: 'Status', render: (row: object) => {
                const chapter = row as Chapter;
                return <StatusBadge status={chapter.is_active ? 'Active' : 'Inactive'} variant={chapter.is_active ? 'success' : 'warning'} />;
            }, width: '100px'
        },
        {
            key: 'actions', header: '', render: (row: object) => {
                const chapter = row as Chapter;
                return (
                    <button
                        onClick={() => handleNavigate(chapter, 'topics')}
                        className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                        View Topics <ChevronRight className="w-4 h-4" />
                    </button>
                );
            }, width: '140px'
        },
    ];

    const getTopicColumns = () => [
        { key: 'name', header: 'Topic Name', sortable: true },
        { key: 'code', header: 'Code', sortable: true, width: '120px' },
        {
            key: 'estimated_minutes', header: 'Est. Minutes', render: (row: object) => {
                const topic = row as Topic;
                return <span className="text-sm text-slate-600">{topic.estimated_minutes || '-'} min</span>;
            }, width: '100px'
        },
        {
            key: 'weightage_percent', header: 'Weightage', render: (row: object) => {
                const topic = row as Topic;
                return <span className="text-sm text-slate-600">{topic.weightage_percent ? `${topic.weightage_percent}%` : '-'}</span>;
            }, width: '100px'
        },
        { key: 'display_order', header: 'Order', sortable: true, width: '80px' },
        {
            key: 'is_active', header: 'Status', render: (row: object) => {
                const topic = row as Topic;
                return <StatusBadge status={topic.is_active ? 'Active' : 'Inactive'} variant={topic.is_active ? 'success' : 'warning'} />;
            }, width: '100px'
        },
    ];

    const getColumns = () => {
        switch (viewMode) {
            case 'exams': return getExamColumns();
            case 'subjects': return getSubjectColumns();
            case 'chapters': return getChapterColumns();
            case 'topics': return getTopicColumns();
        }
    };

    const getData = () => {
        switch (viewMode) {
            case 'exams': return exams as unknown as object[];
            case 'subjects': return subjects as unknown as object[];
            case 'chapters': return chapters as unknown as object[];
            case 'topics': return topics as unknown as object[];
        }
    };

    const getTitle = () => {
        switch (viewMode) {
            case 'exams': return 'All Exams';
            case 'subjects': return `Subjects - ${breadcrumbs[breadcrumbs.length - 1]?.name || ''}`;
            case 'chapters': return `Chapters - ${breadcrumbs[breadcrumbs.length - 1]?.name || ''}`;
            case 'topics': return `Topics - ${breadcrumbs[breadcrumbs.length - 1]?.name || ''}`;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Course Management</h1>
                    <p className="text-slate-500">Manage exams, subjects, chapters, and topics</p>
                </div>
                <ActionButton icon={Plus} onClick={handleCreate} variant="primary">
                    Add {viewMode.slice(0, -1)}
                </ActionButton>
            </div>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm">
                <button
                    onClick={() => handleBreadcrumbClick(-1)}
                    className="text-slate-500 hover:text-primary-600 transition-colors"
                >
                    Exams
                </button>
                {breadcrumbs.map((crumb, index) => (
                    <span key={crumb.id} className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                        <button
                            onClick={() => handleBreadcrumbClick(index)}
                            className="text-slate-500 hover:text-primary-600 transition-colors"
                        >
                            {crumb.name}
                        </button>
                    </span>
                ))}
            </nav>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={BookOpen} label="Total Exams" value={exams.length} />
                <StatCard icon={Layers} label="Total Subjects" value={subjects.length} />
                <StatCard icon={FolderTree} label="Total Chapters" value={chapters.length} />
                <StatCard icon={FileText} label="Total Topics" value={topics.length} />
            </div>

            {/* Data Table */}
            <DataTable
                data={getData()}
                columns={getColumns()}
                keyExtractor={(row) => (row as ItemType).id}
                title={getTitle()}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                searchKeys={['name', 'code', 'description']}
                actions={
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors text-sm font-medium"
                    >
                        <span className="sr-only">Refresh</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                }
            />

            {/* Dialog */}
            {dialogOpen && (
                <CourseDialog
                    mode={dialogMode}
                    viewMode={viewMode}
                    item={selectedItem}
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

interface CourseDialogProps {
    mode: DialogMode;
    viewMode: ViewMode;
    item: ItemType | null;
    onClose: () => void;
    onSave: (formData: FormData) => void;
}

function CourseDialog({ mode, viewMode, item, onClose, onSave }: CourseDialogProps) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onSave(formData);
    };

    const isView = mode === 'view';
    const title = `${mode === 'create' ? 'Add' : mode === 'edit' ? 'Edit' : 'View'} ${viewMode.slice(0, -1)}`;

    const fields: Record<ViewMode, { name: string; label: string; type: string; required?: boolean; options?: string[] }[]> = {
        exams: [
            { name: 'name', label: 'Exam Name', type: 'text', required: true },
            { name: 'code', label: 'Code', type: 'text', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'duration_minutes', label: 'Duration (minutes)', type: 'number' },
            { name: 'total_marks', label: 'Total Marks', type: 'number' },
            { name: 'subjects', label: 'Subjects (comma-separated)', type: 'text' },
            { name: 'is_active', label: 'Active', type: 'checkbox' },
        ],
        subjects: [
            { name: 'name', label: 'Subject Name', type: 'text', required: true },
            { name: 'code', label: 'Code', type: 'text', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'display_order', label: 'Display Order', type: 'number' },
            { name: 'color', label: 'Color', type: 'text' },
            { name: 'icon', label: 'Icon', type: 'text' },
            { name: 'is_active', label: 'Active', type: 'checkbox' },
        ],
        chapters: [
            { name: 'name', label: 'Chapter Name', type: 'text', required: true },
            { name: 'code', label: 'Code', type: 'text', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'estimated_hours', label: 'Estimated Hours', type: 'number' },
            { name: 'difficulty_level', label: 'Difficulty', type: 'select', options: ['easy', 'medium', 'hard'] },
            { name: 'display_order', label: 'Display Order', type: 'number' },
            { name: 'is_active', label: 'Active', type: 'checkbox' },
        ],
        topics: [
            { name: 'name', label: 'Topic Name', type: 'text', required: true },
            { name: 'code', label: 'Code', type: 'text', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'estimated_minutes', label: 'Estimated Minutes', type: 'number' },
            { name: 'weightage_percent', label: 'Weightage %', type: 'number' },
            { name: 'display_order', label: 'Display Order', type: 'number' },
            { name: 'is_active', label: 'Active', type: 'checkbox' },
        ],
    };

    const getFieldValue = (fieldName: string) => {
        if (!item) return '';
        const val = item[fieldName as keyof ItemType];
        if (fieldName === 'is_active') {
            return val ? 'on' : '';
        }
        if (fieldName === 'subjects' && Array.isArray(val)) {
            return val.join(', ');
        }
        return val ?? '';
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {fields[viewMode].map((field) => (
                        <div key={field.name}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    name={field.name}
                                    defaultValue={String(getFieldValue(field.name))}
                                    disabled={isView}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                />
                            ) : field.type === 'select' ? (
                                <select
                                    name={field.name}
                                    defaultValue={String(getFieldValue(field.name))}
                                    disabled={isView}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                >
                                    <option value="">Select {field.label}</option>
                                    {field.options?.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            ) : field.type === 'checkbox' ? (
                                <input
                                    type="checkbox"
                                    name={field.name}
                                    defaultChecked={getFieldValue(field.name) === 'on'}
                                    disabled={isView}
                                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                                />
                            ) : (
                                <input
                                    type={field.type}
                                    name={field.name}
                                    defaultValue={String(getFieldValue(field.name))}
                                    disabled={isView}
                                    required={field.required}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                />
                            )}
                        </div>
                    ))}

                    {!isView && (
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                {mode === 'create' ? 'Create' : 'Update'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
