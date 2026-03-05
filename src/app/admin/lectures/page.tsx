'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DataTable, StatusBadge, ActionButton } from '@/components/admin/DataTable';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    Plus,
    PlayCircle,
    Clock,
    Eye,
    ThumbsUp,
    Upload,
    X,
    FileText,
    Video,
    Image as ImageIcon,
    Paperclip,
    Check,
} from 'lucide-react';
import type { Database } from '@/types/supabase';

type Lecture = Database['public']['Tables']['lectures']['Row'];
type Faculty = Database['public']['Tables']['faculties']['Row'];
type Topic = Database['public']['Tables']['topics']['Row'];
type Subject = Database['public']['Tables']['subjects']['Row'];
type Chapter = Database['public']['Tables']['chapters']['Row'];

type DialogMode = 'create' | 'edit' | 'view' | null;

export default function LecturesPage() {
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<DialogMode>(null);
    const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

    const supabase = createBrowserSupabaseClient();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [{ data: lecturesData }, { data: facultiesData }, { data: topicsData }] = await Promise.all([
                supabase.from('lectures').select('*, faculties(*), topics(*, chapters(*, subjects(*)))').order('created_at', { ascending: false }),
                supabase.from('faculties').select('*').eq('is_active', true),
                supabase.from('topics').select('*, chapters(*, subjects(*))').eq('is_active', true),
            ]);
            setLectures(lecturesData || []);
            setFaculties(facultiesData || []);
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
        setSelectedLecture(null);
        setDialogMode('create');
        setDialogOpen(true);
    };

    const handleEdit = (item: object) => {
        setSelectedLecture(item as Lecture);
        setDialogMode('edit');
        setDialogOpen(true);
    };

    const handleView = (item: object) => {
        setSelectedLecture(item as Lecture);
        setDialogMode('view');
        setDialogOpen(true);
    };

    const handleDelete = async (item: object) => {
        if (!confirm('Are you sure you want to delete this lecture? This action cannot be undone.')) return;

        try {
            const lecture = item as Lecture;
            const { error } = await supabase.from('lectures').delete().eq('id', lecture.id);
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error('Error deleting lecture:', error);
            alert('Failed to delete lecture. Please try again.');
        }
    };

    const handleSave = async (formData: FormData) => {
        try {
            const data: Record<string, unknown> = {};
            formData.forEach((value, key) => {
                if (key === 'is_published') {
                    data[key] = value === 'on';
                } else if (['video_duration', 'view_count', 'like_count'].includes(key)) {
                    data[key] = value ? Number(value) : 0;
                } else if (key === 'tags') {
                    data[key] = value ? String(value).split(',').map(s => s.trim()) : [];
                } else if (key === 'attachments') {
                    // Handled separately
                } else {
                    data[key] = value;
                }
            });

            if (dialogMode === 'create') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from('lectures') as any).insert(data);
            } else if (dialogMode === 'edit' && selectedLecture) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from('lectures') as any).update(data).eq('id', selectedLecture.id);
            }

            setDialogOpen(false);
            await fetchData();
        } catch (error) {
            console.error('Error saving lecture:', error);
            alert('Failed to save lecture. Please try again.');
        }
    };

    const columns = [
        {
            key: 'title',
            header: 'Lecture Title',
            sortable: true,
            render: (row: object) => {
                const lecture = row as Lecture;
                return (
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                            {lecture.thumbnail_url ? (
                                <img src={lecture.thumbnail_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-300">
                                    <Video className="w-4 h-4 text-slate-500" />
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-slate-900">{lecture.title}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{lecture.description}</p>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'faculty',
            header: 'Faculty',
            render: (row: object) => {
                const lecture = row as Lecture & { faculties: Faculty | null };
                return <span className="text-sm text-slate-600">{lecture.faculties?.name || 'N/A'}</span>;
            }
        },
        {
            key: 'topic',
            header: 'Topic',
            render: (row: object) => {
                const lecture = row as Lecture & { topics: (Topic & { chapters: (Chapter & { subjects: Subject | null }) | null }) | null };
                const topicName = lecture.topics?.name || 'N/A';
                const subjectName = lecture.topics?.chapters?.subjects?.name;
                return (
                    <div>
                        <p className="text-sm text-slate-900">{topicName}</p>
                        {subjectName && <p className="text-xs text-slate-500">{subjectName}</p>}
                    </div>
                );
            }
        },
        {
            key: 'video_duration',
            header: 'Duration',
            render: (row: object) => {
                const lecture = row as Lecture;
                const minutes = Math.floor((lecture.video_duration || 0) / 60);
                const seconds = (lecture.video_duration || 0) % 60;
                return <span className="text-sm text-slate-600">{minutes}:{seconds.toString().padStart(2, '0')}</span>;
            },
            width: '80px'
        },
        {
            key: 'stats',
            header: 'Stats',
            render: (row: object) => {
                const lecture = row as Lecture;
                return (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {lecture.view_count || 0}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {lecture.like_count || 0}</span>
                    </div>
                );
            },
            width: '120px'
        },
        {
            key: 'is_published',
            header: 'Status',
            render: (row: object) => {
                const lecture = row as Lecture;
                return (
                    <StatusBadge
                        status={lecture.is_published ? 'Published' : 'Draft'}
                        variant={lecture.is_published ? 'success' : 'warning'}
                    />
                );
            },
            width: '100px'
        },
        {
            key: 'scheduled_at',
            header: 'Schedule',
            render: (row: object) => {
                const lecture = row as Lecture;
                return (
                    <span className="text-sm text-slate-600">
                        {lecture.scheduled_at
                            ? new Date(lecture.scheduled_at).toLocaleDateString()
                            : 'Not scheduled'}
                    </span>
                );
            },
            width: '120px'
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Lecture Management</h1>
                    <p className="text-slate-500">Manage video lectures and educational content</p>
                </div>
                <ActionButton icon={Plus} onClick={handleCreate} variant="primary">
                    Add Lecture
                </ActionButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={PlayCircle} label="Total Lectures" value={lectures.length} />
                <StatCard icon={Eye} label="Total Views" value={lectures.reduce((acc, l) => acc + (l.view_count || 0), 0)} />
                <StatCard icon={ThumbsUp} label="Total Likes" value={lectures.reduce((acc, l) => acc + (l.like_count || 0), 0)} />
                <StatCard icon={Video} label="Published" value={lectures.filter(l => l.is_published).length} />
            </div>

            {/* Data Table */}
            <DataTable
                data={lectures as unknown as object[]}
                columns={columns}
                keyExtractor={(row) => (row as Lecture).id}
                title="All Lectures"
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                searchKeys={['title', 'description']}
            />

            {/* Dialog */}
            {dialogOpen && (
                <LectureDialog
                    mode={dialogMode}
                    lecture={selectedLecture}
                    faculties={faculties}
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

interface LectureDialogProps {
    mode: DialogMode;
    lecture: Lecture | null;
    faculties: Faculty[];
    topics: Topic[];
    onClose: () => void;
    onSave: (formData: FormData) => void;
}

function LectureDialog({ mode, lecture, faculties, topics, onClose, onSave }: LectureDialogProps) {
    const [activeTab, setActiveTab] = useState('basic');
    const [uploading, setUploading] = useState(false);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    const supabase = createBrowserSupabaseClient();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onSave(formData);
    };

    const handleFileUpload = async (file: File, type: 'video' | 'thumbnail') => {
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `lectures/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('content')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('content')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isCreate = mode === 'create';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                        {isCreate ? 'Add New Lecture' : isEdit ? 'Edit Lecture' : 'View Lecture'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-slate-200">
                    <div className="flex gap-6">
                        {['basic', 'content', 'settings'].map((tab) => (
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

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    defaultValue={lecture?.title || ''}
                                    disabled={isView}
                                    required
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    defaultValue={lecture?.description || ''}
                                    disabled={isView}
                                    rows={4}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Faculty *</label>
                                    <select
                                        name="faculty_id"
                                        defaultValue={lecture?.faculty_id || ''}
                                        disabled={isView}
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                    >
                                        <option value="">Select Faculty</option>
                                        {faculties.map((f) => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Topic *</label>
                                    <select
                                        name="topic_id"
                                        defaultValue={lecture?.topic_id || ''}
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

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma-separated)</label>
                                <input
                                    type="text"
                                    name="tags"
                                    defaultValue={lecture?.tags?.join(', ') || ''}
                                    disabled={isView}
                                    placeholder="physics, mechanics, formulas"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'content' && (
                        <div className="space-y-6">
                            {/* Video Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Video</label>
                                <input
                                    type="hidden"
                                    name="video_url"
                                    defaultValue={lecture?.video_url || ''}
                                />
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
                                    {lecture?.video_url ? (
                                        <div className="space-y-2">
                                            <Video className="w-12 h-12 text-primary-600 mx-auto" />
                                            <p className="text-sm text-slate-600">Video uploaded</p>
                                            <a href={lecture.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline">View video</a>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                                            <p className="text-sm text-slate-600">Upload video file</p>
                                        </div>
                                    )}
                                    {!isView && (
                                        <input
                                            ref={videoInputRef}
                                            type="file"
                                            accept="video/*"
                                            disabled={uploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const url = await handleFileUpload(file, 'video');
                                                    if (url) {
                                                        const input = document.querySelector('input[name="video_url"]') as HTMLInputElement;
                                                        if (input) input.value = url;
                                                    }
                                                }
                                            }}
                                            className="mt-4"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Thumbnail Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Thumbnail</label>
                                <input
                                    type="hidden"
                                    name="thumbnail_url"
                                    defaultValue={lecture?.thumbnail_url || ''}
                                />
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-primary-400 transition-colors">
                                    {lecture?.thumbnail_url ? (
                                        <div className="space-y-2">
                                            <img src={lecture.thumbnail_url} alt="Thumbnail" className="h-24 mx-auto object-cover rounded" />
                                            <p className="text-sm text-slate-600">Thumbnail uploaded</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <ImageIcon className="w-12 h-12 text-slate-400 mx-auto" />
                                            <p className="text-sm text-slate-600">Upload thumbnail image</p>
                                        </div>
                                    )}
                                    {!isView && (
                                        <input
                                            ref={thumbnailInputRef}
                                            type="file"
                                            accept="image/*"
                                            disabled={uploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const url = await handleFileUpload(file, 'thumbnail');
                                                    if (url) {
                                                        const input = document.querySelector('input[name="thumbnail_url"]') as HTMLInputElement;
                                                        if (input) input.value = url;
                                                    }
                                                }
                                            }}
                                            className="mt-4"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Video Duration */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Video Duration (seconds)</label>
                                <input
                                    type="number"
                                    name="video_duration"
                                    defaultValue={lecture?.video_duration || ''}
                                    disabled={isView}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    name="is_published"
                                    defaultChecked={lecture?.is_published || false}
                                    disabled={isView}
                                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                                />
                                <label className="text-sm font-medium text-slate-700">Publish immediately</label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Date</label>
                                <input
                                    type="datetime-local"
                                    name="scheduled_at"
                                    defaultValue={lecture?.scheduled_at ? new Date(lecture.scheduled_at).toISOString().slice(0, 16) : ''}
                                    disabled={isView}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty Level</label>
                                <select
                                    name="difficulty_level"
                                    defaultValue={lecture?.difficulty_level || ''}
                                    disabled={isView}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50"
                                >
                                    <option value="">Select Difficulty</option>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Lecture Notes (HTML supported)</label>
                                <textarea
                                    name="lecture_notes"
                                    defaultValue={lecture?.lecture_notes || ''}
                                    disabled={isView}
                                    rows={8}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all disabled:bg-slate-50 font-mono text-sm"
                                    placeholder="<h3>Key Points</h3><ul><li>Point 1</li></ul>"
                                />
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
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
                            form="lecture-form"
                            onClick={(e) => {
                                const form = document.querySelector('form');
                                if (form) {
                                    e.preventDefault();
                                    handleSubmit({ preventDefault: () => { }, currentTarget: form } as React.FormEvent<HTMLFormElement>);
                                }
                            }}
                            disabled={uploading}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                            {uploading ? 'Uploading...' : isCreate ? 'Create Lecture' : 'Update Lecture'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
