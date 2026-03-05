'use client';

import React from 'react';
import {
    PlayCircle,
    CheckCircle,
    Lock,
    Clock,
    ChevronDown,
    ChevronRight,
    FileText,
    Trophy,
    BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lecture {
    id: string;
    title: string;
    duration: number;
    isCompleted: boolean;
    isLocked: boolean;
    isCurrent: boolean;
    progress: number;
    hasNotes: boolean;
}

interface Chapter {
    id: string;
    title: string;
    lectures: Lecture[];
    isExpanded: boolean;
}

interface CourseProgress {
    totalLectures: number;
    completedLectures: number;
    totalDuration: number;
    watchedDuration: number;
}

interface LectureSidebarProps {
    chapters: Chapter[];
    courseProgress: CourseProgress;
    currentLectureId: string;
    onLectureClick: (lectureId: string) => void;
    onChapterToggle: (chapterId: string) => void;
    className?: string;
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

export function LectureSidebar({
    chapters,
    courseProgress,
    currentLectureId,
    onLectureClick,
    onChapterToggle,
    className,
}: LectureSidebarProps) {
    const progressPercent = courseProgress.totalLectures > 0
        ? Math.round((courseProgress.completedLectures / courseProgress.totalLectures) * 100)
        : 0;

    return (
        <div className={cn('bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-full', className)}>
            {/* Course Progress Header */}
            <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-primary-50 to-primary-100/50">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">Course Progress</h3>
                    <span className="text-2xl font-bold text-primary-600">{progressPercent}%</span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-white rounded-full overflow-hidden mb-3">
                    <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900">{courseProgress.completedLectures}</p>
                            <p className="text-xs text-slate-500">Completed</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                            <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900">{formatDuration(courseProgress.watchedDuration)}</p>
                            <p className="text-xs text-slate-500">Watched</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto">
                {chapters.map((chapter, chapterIndex) => (
                    <div key={chapter.id} className="border-b border-slate-100 last:border-b-0">
                        {/* Chapter Header */}
                        <button
                            onClick={() => onChapterToggle(chapter.id)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                        >
                            {chapter.isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                                Chapter {chapterIndex + 1}
                            </span>
                            <span className="font-medium text-slate-900 text-left flex-1 truncate">
                                {chapter.title}
                            </span>
                            <span className="text-xs text-slate-500">
                                {chapter.lectures.length} lectures
                            </span>
                        </button>

                        {/* Lectures List */}
                        {chapter.isExpanded && (
                            <div className="bg-slate-50/50">
                                {chapter.lectures.map((lecture, lectureIndex) => (
                                    <button
                                        key={lecture.id}
                                        onClick={() => !lecture.isLocked && onLectureClick(lecture.id)}
                                        disabled={lecture.isLocked}
                                        className={cn(
                                            'w-full px-4 py-3 flex items-start gap-3 transition-all',
                                            lecture.isCurrent
                                                ? 'bg-primary-50 border-l-4 border-primary-500'
                                                : 'hover:bg-white border-l-4 border-transparent',
                                            lecture.isLocked && 'opacity-60 cursor-not-allowed'
                                        )}
                                    >
                                        {/* Status Icon */}
                                        <div className="mt-0.5">
                                            {lecture.isLocked ? (
                                                <Lock className="w-4 h-4 text-slate-400" />
                                            ) : lecture.isCompleted ? (
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            ) : lecture.isCurrent ? (
                                                <PlayCircle className="w-4 h-4 text-primary-600" />
                                            ) : (
                                                <PlayCircle className="w-4 h-4 text-slate-400" />
                                            )}
                                        </div>

                                        {/* Lecture Info */}
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className={cn(
                                                    'text-sm font-medium truncate',
                                                    lecture.isCurrent ? 'text-primary-700' : 'text-slate-700'
                                                )}>
                                                    {lectureIndex + 1}. {lecture.title}
                                                </span>
                                                {lecture.hasNotes && (
                                                    <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDuration(lecture.duration)}
                                                </span>

                                                {/* Mini Progress Bar */}
                                                {!lecture.isCompleted && !lecture.isLocked && lecture.progress > 0 && (
                                                    <div className="flex-1 max-w-[60px] h-1 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary-500 rounded-full"
                                                            style={{ width: `${lecture.progress}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Achievement Section */}
            {progressPercent >= 50 && (
                <div className="p-4 border-t border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                            <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">
                                {progressPercent >= 100 ? 'Course Completed!' : 'Halfway There!'}
                            </p>
                            <p className="text-xs text-slate-600">
                                {progressPercent >= 100
                                    ? 'Congratulations on completing the course!'
                                    : 'Keep going, you\'re doing great!'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Stats */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {courseProgress.totalLectures} total lectures
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(courseProgress.totalDuration)} total
                    </span>
                </div>
            </div>
        </div>
    );
}

export default LectureSidebar;
