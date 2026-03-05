'use client';

import { useEffect, useState } from 'react';
import { PlayCircle, BookOpen, Clock, Filter, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface LectureData {
    subjects: Array<{
        id: string;
        name: string;
        color: string | null;
    }>;
    lectures: Array<{
        id: string;
        title: string;
        subject: string;
        faculty: string;
        duration: string;
        thumbnail_color: string;
        progress: number;
    }>;
}

const subjectColors: Record<string, string> = {
    'Physics': 'bg-blue-100 text-blue-700',
    'Chemistry': 'bg-emerald-100 text-emerald-700',
    'Mathematics': 'bg-amber-100 text-amber-700',
    'Biology': 'bg-red-100 text-red-700',
};

const thumbnailColors: Record<string, string> = {
    'Physics': 'bg-blue-100',
    'Chemistry': 'bg-emerald-100',
    'Mathematics': 'bg-amber-100',
    'Biology': 'bg-red-100',
};

export default function LecturesPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [data, setData] = useState<LectureData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string>('All');

    useEffect(() => {
        async function fetchLecturesData() {
            if (!user) return;

            try {
                const supabase = getSupabaseBrowserClient();

                // Fetch all active subjects
                const { data: subjectsData } = await supabase
                    .from('subjects')
                    .select('id, name, color')
                    .eq('is_active', true)
                    .order('display_order', { ascending: true });

                // Fetch published lectures with faculty info
                let query = supabase
                    .from('lectures')
                    .select(`
                        id,
                        title,
                        video_duration,
                        thumbnail_url,
                        subjects:topic_id (name, chapters:chapter_id (subjects:subject_id (name, color))),
                        faculties:faculty_id (name)
                    `)
                    .eq('is_published', true)
                    .order('published_at', { ascending: false });

                const { data: lecturesData } = await query;

                // Fetch lecture progress for the user
                const { data: progressData } = await supabase
                    .from('lecture_progress')
                    .select('lecture_id, progress_percent')
                    .eq('user_id', user.id);

                const progressMap = new Map();
                (progressData || []).forEach((item: unknown) => {
                    const p = item as { lecture_id: string; progress_percent: number };
                    progressMap.set(p.lecture_id, p.progress_percent);
                });

                // Process lectures
                const lectures = (lecturesData || []).map((item: unknown) => {
                    const lecture = item as {
                        id: string;
                        title: string;
                        video_duration: number | null;
                        thumbnail_url: string | null;
                        subjects: {
                            name: string;
                            chapters: {
                                subjects: {
                                    name: string;
                                    color: string | null;
                                } | null;
                            } | null;
                        } | null;
                        faculties: { name: string } | null;
                    };

                    const subjectName = lecture.subjects?.chapters?.subjects?.name || 'General';
                    const duration = lecture.video_duration || 0;
                    const minutes = Math.floor(duration / 60);

                    return {
                        id: lecture.id,
                        title: lecture.title,
                        subject: subjectName,
                        faculty: lecture.faculties?.name || 'Faculty',
                        duration: `${minutes} min`,
                        thumbnail_color: lecture.subjects?.chapters?.subjects?.color || thumbnailColors[subjectName] || 'bg-slate-100',
                        progress: progressMap.get(lecture.id) || 0,
                    };
                });

                setData({
                    subjects: [{ id: 'all', name: 'All', color: null }, ...(subjectsData || [])],
                    lectures,
                });
            } catch (err) {
                console.error('Error fetching lectures data:', err);
                setError('Failed to load lectures. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading) {
            fetchLecturesData();
        }
    }, [user, authLoading]);

    const filteredLectures = selectedSubject === 'All'
        ? data?.lectures || []
        : (data?.lectures || []).filter(l => l.subject === selectedSubject);

    if (authLoading || loading) {
        return <LecturesSkeleton />;
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
                    <h1 className="text-2xl font-bold text-slate-900">Video Lectures</h1>
                    <p className="text-slate-500">Learn from India's best faculty</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
                    <Filter className="w-4 h-4" />
                    Filter
                </button>
            </div>

            {/* Subject Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {data?.subjects.map((subject) => (
                    <button
                        key={subject.id}
                        onClick={() => setSelectedSubject(subject.name)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${selectedSubject === subject.name
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                    >
                        {subject.name}
                    </button>
                ))}
            </div>

            {/* Lectures Grid */}
            {filteredLectures.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLectures.map((lecture) => (
                        <Link
                            key={lecture.id}
                            href={`/dashboard/lectures/${lecture.id}`}
                            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg transition-all cursor-pointer group"
                        >
                            {/* Thumbnail */}
                            <div className={`h-40 ${lecture.thumbnail_color} flex items-center justify-center relative`}>
                                <PlayCircle className="w-16 h-16 text-slate-400 group-hover:text-primary-600 transition-colors" />
                                {lecture.progress > 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200">
                                        <div
                                            className="h-full bg-primary-600"
                                            style={{ width: `${lecture.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${subjectColors[lecture.subject] || 'bg-gray-100 text-gray-700'}`}>
                                    {lecture.subject}
                                </span>
                                <h3 className="font-semibold text-slate-900 mt-2 line-clamp-2">{lecture.title}</h3>
                                <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
                                    <span>{lecture.faculty}</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {lecture.duration}
                                    </span>
                                </div>
                                {lecture.progress > 0 && (
                                    <p className="text-xs text-primary-600 mt-2">{lecture.progress}% completed</p>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No lectures found</h3>
                    <p>No lectures available for the selected subject.</p>
                </div>
            )}
        </div>
    );
}

function LecturesSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-64"></div>
                </div>
                <div className="h-10 bg-slate-200 rounded w-24"></div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 w-24 bg-slate-200 rounded-xl flex-shrink-0"></div>
                ))}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                        <div className="h-40 bg-slate-200"></div>
                        <div className="p-4 space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-16"></div>
                            <div className="h-6 bg-slate-200 rounded w-full"></div>
                            <div className="flex justify-between">
                                <div className="h-4 bg-slate-200 rounded w-24"></div>
                                <div className="h-4 bg-slate-200 rounded w-16"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
