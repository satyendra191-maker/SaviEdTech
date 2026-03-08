'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    MessageCircle,
    Plus,
    Search,
    Clock,
    CheckCircle,
    AlertCircle,
    Send,
    X,
    Loader2,
    User,
    BookOpen,
    ImagePlus,
    Sparkles,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface Doubt {
    id: string;
    question: string;
    description: string | null;
    subject: string | null;
    topic: string | null;
    lecture_id: string | null;
    image_url: string | null;
    status: 'pending' | 'answered' | 'in_progress' | 'closed';
    priority: 'low' | 'medium' | 'high';
    created_at: string;
    answered_at: string | null;
    responses?: DoubtResponse[];
}

interface DoubtResponse {
    id: string;
    response: string;
    video_url: string | null;
    document_url: string | null;
    created_at: string;
    faculty_id: string;
}

export default function DoubtsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [doubts, setDoubts] = useState<Doubt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAskModal, setShowAskModal] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const [newTopic, setNewTopic] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [aiSubmitting, setAiSubmitting] = useState(false);
    const [latestSolved, setLatestSolved] = useState<{
        answer: string;
        conceptExplanation: string;
        steps: string[];
        relatedPractice: Array<{ id: string; question: string; difficulty: string | null }>;
        imageUrl?: string | null;
    } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const fetchDoubts = useCallback(async () => {
        if (!user) return;

        try {
            const supabase = getSupabaseBrowserClient();

            const { data: doubtsData, error: doubtsError } = await supabase
                .from('doubts')
                .select('*, responses:doubt_responses(*)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (doubtsError) throw doubtsError;

            setDoubts((doubtsData as unknown as Doubt[]) || []);
        } catch (err) {
            console.error('Error fetching doubts:', err);
            setError('Failed to load your doubts');
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchDoubts();
        }
    }, [user, authLoading, fetchDoubts]);

    useEffect(() => {
        if (!authLoading) {
            setLoading(false);
        }
    }, [authLoading]);

    const resetComposer = () => {
        setShowAskModal(false);
        setNewQuestion('');
        setNewDescription('');
        setNewSubject('');
        setNewTopic('');
        setImageFile(null);
        setImagePreview(null);
    };

    const fallbackCreateDoubt = async () => {
        if (!user || (!newQuestion && !newDescription)) return;

        try {
            const supabase = getSupabaseBrowserClient();

            const { data, error } = await supabase
                .from('doubts')
                .insert({
                    user_id: user.id,
                    question: newQuestion || `${newTopic || newSubject || 'Academic'} doubt`,
                    description: newDescription || null,
                    subject: newSubject || null,
                    topic: newTopic || null,
                    status: 'pending',
                    priority: 'medium',
                } as unknown as any)
                .select()
                .single();

            if (error) throw error;

            setDoubts([(data as unknown as Doubt), ...doubts]);
            resetComposer();
        } catch (err) {
            console.error('Error asking doubt:', err);
            setError('Failed to submit your question');
        }
    };

    const askDoubt = async () => {
        if (!user || (!newQuestion && !newDescription && !imageFile)) return;

        setAiSubmitting(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('question', newQuestion);
            formData.append('description', newDescription);
            formData.append('subject', newSubject);
            formData.append('topic', newTopic);
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const response = await fetch('/api/ai/doubt-solver', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to solve doubt');
            }

            setLatestSolved({
                answer: result.data.answer,
                conceptExplanation: result.data.conceptExplanation,
                steps: result.data.steps || [],
                relatedPractice: result.data.relatedPractice || [],
                imageUrl: result.data.imageUrl,
            });

            resetComposer();
            await fetchDoubts();
        } catch (err) {
            console.error('Error solving doubt with AI:', err);
            await fallbackCreateDoubt();
            setLatestSolved(null);
        } finally {
            setAiSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'in_progress': return 'bg-blue-100 text-blue-700';
            case 'answered': return 'bg-green-100 text-green-700';
            case 'closed': return 'bg-slate-100 text-slate-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-600';
            case 'medium': return 'text-orange-600';
            case 'low': return 'text-slate-600';
            default: return 'text-slate-600';
        }
    };

    const filteredDoubts = doubts.filter(doubt => {
        const matchesSearch = doubt.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doubt.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        const matchesFilter = filterStatus === 'all' || doubt.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const pendingCount = doubts.filter(d => d.status === 'pending').length;
    const answeredCount = doubts.filter(d => d.status === 'answered').length;

    if (authLoading || loading) {
        return <DoubtsSkeleton />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <AlertCircle className="w-16 h-16 text-red-500" />
                <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
                <p className="text-slate-500">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Ask Faculty</h1>
                    <p className="text-slate-500">Submit your doubts and get answers from expert faculty</p>
                </div>
                <button
                    onClick={() => setShowAskModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Ask a Question
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{pendingCount}</div>
                            <div className="text-sm text-slate-500">Pending</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{answeredCount}</div>
                            <div className="text-sm text-slate-500">Answered</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search your doubts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="answered">Answered</option>
                    <option value="closed">Closed</option>
                </select>
            </div>

            {latestSolved ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="space-y-3">
                            <div>
                                <h3 className="font-semibold text-slate-900">AI Doubt Solver</h3>
                                <p className="text-sm text-slate-700">{latestSolved.answer}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900">Step-by-step</p>
                                <ul className="mt-1 space-y-1 text-sm text-slate-700">
                                    {latestSolved.steps.map((step, index) => (
                                        <li key={`${step}-${index}`}>{index + 1}. {step}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900">Concept help</p>
                                <p className="text-sm text-slate-700">{latestSolved.conceptExplanation}</p>
                            </div>
                            {latestSolved.relatedPractice.length > 0 ? (
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Related practice</p>
                                    <div className="mt-2 grid gap-2">
                                        {latestSolved.relatedPractice.map((item) => (
                                            <div key={item.id} className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-slate-700">
                                                <p className="font-medium text-slate-900">{item.question}</p>
                                                <p className="text-xs uppercase tracking-wide text-emerald-700">{item.difficulty || 'mixed'} difficulty</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Doubts List */}
            {filteredDoubts.length > 0 ? (
                <div className="space-y-4">
                    {filteredDoubts.map(doubt => (
                        <div key={doubt.id} className="bg-white rounded-2xl border border-slate-100 p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doubt.status)}`}>
                                        {doubt.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                    {doubt.subject && (
                                        <span className="text-sm text-slate-500 flex items-center gap-1">
                                            <BookOpen className="w-3 h-3" />
                                            {doubt.subject}
                                        </span>
                                    )}
                                </div>
                                <span className={`text-xs font-medium ${getPriorityColor(doubt.priority)}`}>
                                    {doubt.priority.toUpperCase()} PRIORITY
                                </span>
                            </div>

                            <h3 className="text-lg font-semibold text-slate-900 mb-2">{doubt.question}</h3>

                            {doubt.description && (
                                <p className="text-slate-600 mb-4">{doubt.description}</p>
                            )}

                            {doubt.image_url ? (
                                <img
                                    src={doubt.image_url}
                                    alt="Doubt attachment"
                                    className="mb-4 max-h-48 w-full rounded-xl object-cover sm:w-auto"
                                />
                            ) : null}

                            {doubt.responses && doubt.responses.length > 0 ? (
                                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
                                        <User className="w-4 h-4" />
                                        {doubt.responses[0]?.faculty_id === 'ai-doubt-solver' ? 'SaviEdu AI' : 'Faculty Response'}
                                    </div>
                                    <p className="text-sm whitespace-pre-line text-slate-700">
                                        {doubt.responses[0]?.response}
                                    </p>
                                </div>
                            ) : null}

                            <div className="flex items-center justify-between text-sm text-slate-500">
                                <span>Asked on {new Date(doubt.created_at).toLocaleDateString()}</span>
                                {doubt.answered_at && (
                                    <span>Answered on {new Date(doubt.answered_at).toLocaleDateString()}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Doubts Yet</h3>
                    <p className="text-slate-500 mb-4">Ask your first question to get help from faculty</p>
                    <button
                        onClick={() => setShowAskModal(true)}
                        className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                    >
                        Ask Your First Question
                    </button>
                </div>
            )}

            {/* Ask Doubt Modal */}
            {showAskModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900">Ask a Question</h2>
                            <button onClick={() => setShowAskModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Your Question *</label>
                                <input
                                    type="text"
                                    value={newQuestion}
                                    onChange={(e) => setNewQuestion(e.target.value)}
                                    placeholder="e.g., How to solve quadratic equations?"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                <select
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Select a subject</option>
                                    <option value="Physics">Physics</option>
                                    <option value="Chemistry">Chemistry</option>
                                    <option value="Mathematics">Mathematics</option>
                                    <option value="Biology">Biology</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Topic (Optional)</label>
                                <input
                                    type="text"
                                    value={newTopic}
                                    onChange={(e) => setNewTopic(e.target.value)}
                                    placeholder="e.g., Electrostatics"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                                <textarea
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="Provide more details about your question..."
                                    rows={4}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Image Upload (Optional)</label>
                                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600 hover:border-primary-400 hover:text-primary-700">
                                    <ImagePlus className="w-4 h-4" />
                                    Upload handwritten or printed question
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={(event) => {
                                            const file = event.target.files?.[0] || null;
                                            setImageFile(file);
                                            if (!file) {
                                                setImagePreview(null);
                                                return;
                                            }
                                            const previewUrl = URL.createObjectURL(file);
                                            setImagePreview(previewUrl);
                                        }}
                                    />
                                </label>
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt="Doubt preview"
                                        className="mt-3 max-h-40 w-full rounded-xl object-cover"
                                    />
                                ) : null}
                            </div>

                            <button
                                onClick={askDoubt}
                                disabled={aiSubmitting || (!newQuestion && !newDescription && !imageFile)}
                                className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {aiSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                                Solve with AI
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DoubtsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div>
                <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-64"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="h-24 bg-slate-100 rounded-2xl"></div>
                <div className="h-24 bg-slate-100 rounded-2xl"></div>
            </div>

            <div className="h-12 bg-slate-100 rounded-lg"></div>

            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-slate-100 rounded-2xl"></div>
                ))}
            </div>
        </div>
    );
}
