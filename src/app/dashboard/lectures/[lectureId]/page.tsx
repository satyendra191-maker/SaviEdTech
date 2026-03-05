'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoPlayer } from '@/components/lectures/VideoPlayer';
import { LectureNotes } from '@/components/lectures/LectureNotes';
import { LectureSidebar } from '@/components/lectures/LectureSidebar';
import { useLectureProgress } from '@/hooks/useLectureProgress';
import {
    ArrowLeft,
    Share2,
    ThumbsUp,
    ThumbsDown,
    Bookmark,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data - in a real app, this would come from your API
const MOCK_LECTURE = {
    id: '1',
    title: "Newton's Laws of Motion - Complete Explanation",
    description: "In this comprehensive lecture, we explore Newton's three laws of motion with real-world examples and problem-solving techniques. This is a fundamental topic for JEE Physics.",
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    videoDuration: 2700, // 45 minutes
    thumbnailUrl: '/lectures/newton-laws-thumb.jpg',
    faculty: {
        name: 'Dharmendra Sir',
        avatar: '/faculty/dharmendra.jpg',
        subject: 'Physics',
    },
    notes: `Newton's Laws of Motion

First Law (Law of Inertia):
An object at rest stays at rest and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force.

Key Points:
• Inertia is the tendency of objects to resist changes in motion
• Mass is a measure of an object's inertia
• No net force means no acceleration

Second Law (F = ma):
The acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass.

Formula: F = ma
Where:
F = Net force (N)
m = Mass (kg)
a = Acceleration (m/s²)

Third Law (Action-Reaction):
For every action, there is an equal and opposite reaction.

Important Notes:
• Action and reaction forces act on different objects
• They are equal in magnitude but opposite in direction
• They occur simultaneously`,
    timestamps: [
        { time: 0, label: 'Introduction to Newton\'s Laws' },
        { time: 300, label: 'First Law - Law of Inertia' },
        { time: 900, label: 'Second Law - F = ma' },
        { time: 1500, label: 'Problem Solving Examples' },
        { time: 2100, label: 'Third Law - Action & Reaction' },
        { time: 2400, label: 'Summary and Key Takeaways' },
    ],
    attachments: [
        { name: 'Newton Laws Worksheet.pdf', url: '#', type: 'application/pdf', size: 2457600 },
        { name: 'Practice Problems.pdf', url: '#', type: 'application/pdf', size: 1536000 },
    ],
};

const MOCK_COURSE_DATA = {
    chapters: [
        {
            id: 'ch1',
            title: 'Mechanics Fundamentals',
            isExpanded: true,
            lectures: [
                {
                    id: '1',
                    title: "Newton's Laws of Motion",
                    duration: 2700,
                    isCompleted: false,
                    isLocked: false,
                    isCurrent: true,
                    progress: 0,
                    hasNotes: true,
                },
                {
                    id: '2',
                    title: 'Friction and Its Types',
                    duration: 2400,
                    isCompleted: false,
                    isLocked: true,
                    isCurrent: false,
                    progress: 0,
                    hasNotes: true,
                },
                {
                    id: '3',
                    title: 'Circular Motion',
                    duration: 3000,
                    isCompleted: false,
                    isLocked: true,
                    isCurrent: false,
                    progress: 0,
                    hasNotes: true,
                },
            ],
        },
        {
            id: 'ch2',
            title: 'Work, Energy & Power',
            isExpanded: false,
            lectures: [
                {
                    id: '4',
                    title: 'Work Done by Forces',
                    duration: 2100,
                    isCompleted: false,
                    isLocked: true,
                    isCurrent: false,
                    progress: 0,
                    hasNotes: true,
                },
                {
                    id: '5',
                    title: 'Kinetic and Potential Energy',
                    duration: 2700,
                    isCompleted: false,
                    isLocked: true,
                    isCurrent: false,
                    progress: 0,
                    hasNotes: true,
                },
            ],
        },
    ],
    courseProgress: {
        totalLectures: 5,
        completedLectures: 0,
        totalDuration: 12900,
        watchedDuration: 0,
    },
};

export default function LecturePage() {
    const params = useParams();
    const router = useRouter();
    const lectureId = params.lectureId as string;

    const [activeTab, setActiveTab] = useState<'notes' | 'comments' | 'resources'>('notes');
    const [isLiked, setIsLiked] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [courseData, setCourseData] = useState(MOCK_COURSE_DATA);
    const [videoDuration, setVideoDuration] = useState(0);

    // Get lecture progress
    const {
        progress,
        isLoading: isProgressLoading,
        saveProgress,
        markAsComplete,
        resumePosition,
    } = useLectureProgress({
        lectureId,
        autoSaveInterval: 10000,
    });

    // Update course data when progress changes
    useEffect(() => {
        if (progress) {
            setCourseData(prev => ({
                ...prev,
                chapters: prev.chapters.map(chapter => ({
                    ...chapter,
                    lectures: chapter.lectures.map(lecture => ({
                        ...lecture,
                        isCurrent: lecture.id === lectureId,
                        progress: lecture.id === lectureId ? progress.progress_percent : lecture.progress,
                        isCompleted: lecture.id === lectureId ? progress.is_completed : lecture.isCompleted,
                    })),
                })),
            }));
        }
    }, [progress, lectureId]);

    // Handle video time updates
    const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
        setVideoDuration(duration);

        // Save progress every 10 seconds
        if (Math.floor(currentTime) % 10 === 0) {
            saveProgress(currentTime, duration);
        }
    }, [saveProgress]);

    // Handle video ended
    const handleVideoEnded = useCallback(async () => {
        await markAsComplete();

        // Track lecture completion for gamification
        try {
            await fetch('/api/gamification/track-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activityType: 'lecture_completed',
                    metadata: { lectureId, duration: videoDuration },
                }),
            });
        } catch (error) {
            console.error('Error tracking lecture completion:', error);
        }
    }, [markAsComplete, lectureId, videoDuration]);

    // Handle timestamp click
    const handleTimestampClick = (time: number) => {
        // Scroll to video player and seek to timestamp
        const videoElement = document.querySelector('video');
        if (videoElement) {
            videoElement.currentTime = time;
            videoElement.play();
        }
    };

    // Handle lecture navigation
    const handleLectureClick = (id: string) => {
        if (id !== lectureId) {
            router.push(`/dashboard/lectures/${id}`);
        }
    };

    // Handle chapter toggle
    const handleChapterToggle = (chapterId: string) => {
        setCourseData(prev => ({
            ...prev,
            chapters: prev.chapters.map(ch =>
                ch.id === chapterId ? { ...ch, isExpanded: !ch.isExpanded } : ch
            ),
        }));
    };

    // Navigate to previous/next lecture
    const navigateLecture = (direction: 'prev' | 'next') => {
        const allLectures = courseData.chapters.flatMap(ch => ch.lectures);
        const currentIndex = allLectures.findIndex(l => l.id === lectureId);

        if (direction === 'prev' && currentIndex > 0) {
            router.push(`/dashboard/lectures/${allLectures[currentIndex - 1].id}`);
        } else if (direction === 'next' && currentIndex < allLectures.length - 1) {
            router.push(`/dashboard/lectures/${allLectures[currentIndex + 1].id}`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
                <div className="max-w-[1600px] mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/dashboard/lectures')}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="font-semibold text-slate-900 line-clamp-1">
                                    {MOCK_LECTURE.title}
                                </h1>
                                <p className="text-sm text-slate-500">
                                    {MOCK_LECTURE.faculty.subject} • {MOCK_LECTURE.faculty.name}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowSidebar(!showSidebar)}
                                className={cn(
                                    'hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                                    showSidebar
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'hover:bg-slate-100 text-slate-600'
                                )}
                            >
                                Course Content
                            </button>
                            <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <Share2 className="w-5 h-5 text-slate-600" />
                            </button>
                            <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <MoreVertical className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-[1600px] mx-auto">
                <div className="flex">
                    {/* Video and Content Area */}
                    <div className={cn(
                        'flex-1 transition-all duration-300',
                        showSidebar ? 'lg:mr-[400px]' : ''
                    )}>
                        {/* Video Player */}
                        <div className="aspect-video bg-black">
                            <VideoPlayer
                                src={MOCK_LECTURE.videoUrl}
                                poster={MOCK_LECTURE.thumbnailUrl}
                                title={MOCK_LECTURE.title}
                                initialPosition={resumePosition}
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={handleVideoEnded}
                                onPlay={() => console.log('Video playing')}
                                onPause={() => {
                                    // Save progress on pause
                                    if (videoDuration > 0) {
                                        const videoElement = document.querySelector('video');
                                        if (videoElement) {
                                            saveProgress(videoElement.currentTime, videoDuration);
                                        }
                                    }
                                }}
                            />
                        </div>

                        {/* Lecture Info */}
                        <div className="p-4 lg:p-6">
                            {/* Title and Actions */}
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                                <div className="flex-1">
                                    <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-2">
                                        {MOCK_LECTURE.title}
                                    </h2>
                                    <p className="text-slate-600 leading-relaxed">
                                        {MOCK_LECTURE.description}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsLiked(!isLiked)}
                                        className={cn(
                                            'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors',
                                            isLiked
                                                ? 'bg-primary-50 text-primary-600'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        )}
                                    >
                                        <ThumbsUp className="w-4 h-4" />
                                        <span className="hidden sm:inline">Like</span>
                                    </button>
                                    <button
                                        onClick={() => setIsBookmarked(!isBookmarked)}
                                        className={cn(
                                            'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors',
                                            isBookmarked
                                                ? 'bg-amber-50 text-amber-600'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        )}
                                    >
                                        <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
                                        <span className="hidden sm:inline">Save</span>
                                    </button>
                                </div>
                            </div>

                            {/* Faculty Info */}
                            <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    {MOCK_LECTURE.faculty.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900">
                                        {MOCK_LECTURE.faculty.name}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        {MOCK_LECTURE.faculty.subject} Faculty
                                    </p>
                                </div>
                                <button className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors">
                                    View Profile
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-6">
                                {(['notes', 'comments', 'resources'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            'flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize',
                                            activeTab === tab
                                                ? 'bg-white text-primary-600 shadow-sm'
                                                : 'text-slate-600 hover:text-slate-900'
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="space-y-6">
                                {activeTab === 'notes' && (
                                    <LectureNotes
                                        notes={MOCK_LECTURE.notes}
                                        timestamps={MOCK_LECTURE.timestamps}
                                        attachments={MOCK_LECTURE.attachments}
                                        onTimestampClick={handleTimestampClick}
                                    />
                                )}

                                {activeTab === 'comments' && (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <MessageSquare className="w-5 h-5 text-slate-400" />
                                            <h3 className="font-semibold text-slate-900">Discussion</h3>
                                        </div>
                                        <div className="text-center py-12 text-slate-500">
                                            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                            <p>No comments yet. Be the first to ask a question!</p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'resources' && (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                        <h3 className="font-semibold text-slate-900 mb-4">Additional Resources</h3>
                                        <div className="space-y-3">
                                            {MOCK_LECTURE.attachments.map((attachment, index) => (
                                                <a
                                                    key={index}
                                                    href={attachment.url}
                                                    download
                                                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                                                >
                                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-xs font-bold">
                                                        PDF
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-900">{attachment.name}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {(attachment.size / 1024 / 1024).toFixed(1)} MB
                                                        </p>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                                <button
                                    onClick={() => navigateLecture('prev')}
                                    className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    <span className="hidden sm:inline">Previous Lecture</span>
                                </button>
                                <button
                                    onClick={() => navigateLecture('next')}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                                >
                                    <span className="hidden sm:inline">Next Lecture</span>
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    {showSidebar && (
                        <div className="fixed right-0 top-[73px] bottom-0 w-[400px] bg-white border-l border-slate-200 overflow-y-auto hidden lg:block">
                            <LectureSidebar
                                chapters={courseData.chapters}
                                courseProgress={courseData.courseProgress}
                                currentLectureId={lectureId}
                                onLectureClick={handleLectureClick}
                                onChapterToggle={handleChapterToggle}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
