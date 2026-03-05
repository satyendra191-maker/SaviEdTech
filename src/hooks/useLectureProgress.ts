'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { LectureProgress } from '@/types';

interface UseLectureProgressOptions {
    lectureId: string;
    autoSaveInterval?: number; // in milliseconds
    onProgressSaved?: (progress: LectureProgress) => void;
    onError?: (error: Error) => void;
}

interface UseLectureProgressReturn {
    progress: LectureProgress | null;
    isLoading: boolean;
    isSaving: boolean;
    error: Error | null;
    saveProgress: (currentTime: number, duration: number) => Promise<void>;
    markAsComplete: () => Promise<void>;
    resumePosition: number;
    lastSavedAt: Date | null;
}

const DEFAULT_AUTO_SAVE_INTERVAL = 10000; // 10 seconds

export function useLectureProgress({
    lectureId,
    autoSaveInterval = DEFAULT_AUTO_SAVE_INTERVAL,
    onProgressSaved,
    onError,
}: UseLectureProgressOptions): UseLectureProgressReturn {
    const supabase = getSupabaseBrowserClient();

    const [progress, setProgress] = useState<LectureProgress | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const pendingSaveRef = useRef<{ currentTime: number; duration: number } | null>(null);
    const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    // Fetch existing progress on mount
    useEffect(() => {
        const fetchProgress = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    throw new Error('User not authenticated');
                }

                // Fetch progress from database
                const { data, error: fetchError } = await supabase
                    .from('lecture_progress' as any)
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('lecture_id', lectureId)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
                    throw fetchError;
                }

                if (isMountedRef.current) {
                    if (data) {
                        setProgress(data as LectureProgress);
                    } else {
                        // Create initial progress record
                        const newProgressData = {
                            user_id: user.id,
                            lecture_id: lectureId,
                            progress_percent: 0,
                            last_position: 0,
                            is_completed: false,
                            watch_count: 0,
                            first_started_at: new Date().toISOString(),
                            last_watched_at: new Date().toISOString(),
                        };

                        const { data: newProgress, error: createError } = await supabase
                            .from('lecture_progress' as any)
                            .insert(newProgressData as any)
                            .select()
                            .single();

                        if (createError) throw createError;
                        setProgress(newProgress as LectureProgress);
                    }
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch progress');
                if (isMountedRef.current) {
                    setError(error);
                    onError?.(error);
                }
            } finally {
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
            }
        };

        if (lectureId) {
            fetchProgress();
        }

        return () => {
            isMountedRef.current = false;
        };
    }, [lectureId, supabase, onError]);

    // Save progress function
    const saveProgress = useCallback(async (currentTime: number, duration: number) => {
        if (!lectureId || isSaving) {
            pendingSaveRef.current = { currentTime, duration };
            return;
        }

        try {
            setIsSaving(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            const progressPercent = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
            const isCompleted = progressPercent >= 95; // Consider 95% as completed

            const updateData = {
                last_position: Math.floor(currentTime),
                progress_percent: Math.min(progressPercent, 100),
                is_completed: isCompleted,
                completed_at: isCompleted && !progress?.is_completed
                    ? new Date().toISOString()
                    : progress?.completed_at,
                last_watched_at: new Date().toISOString(),
                watch_count: progress?.watch_count || 0,
            };

            // Use upsert to handle both insert and update
            const saveData = {
                user_id: user.id,
                lecture_id: lectureId,
                ...updateData,
            };

            const { data, error: saveError } = await supabase
                .from('lecture_progress' as any)
                .upsert(saveData as any, {
                    onConflict: 'user_id,lecture_id',
                })
                .select()
                .single();

            if (saveError) throw saveError;

            if (isMountedRef.current) {
                setProgress(data as LectureProgress);
                setLastSavedAt(new Date());
                onProgressSaved?.(data as LectureProgress);
            }

            // Handle any pending saves
            if (pendingSaveRef.current) {
                const pending = pendingSaveRef.current;
                pendingSaveRef.current = null;
                await saveProgress(pending.currentTime, pending.duration);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to save progress');
            if (isMountedRef.current) {
                setError(error);
                onError?.(error);
            }
        } finally {
            if (isMountedRef.current) {
                setIsSaving(false);
            }
        }
    }, [lectureId, isSaving, progress, supabase, onProgressSaved, onError]);

    // Mark lecture as complete
    const markAsComplete = useCallback(async () => {
        if (!lectureId) return;

        try {
            setIsSaving(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            const completeData = {
                user_id: user.id,
                lecture_id: lectureId,
                progress_percent: 100,
                last_position: 0,
                is_completed: true,
                completed_at: new Date().toISOString(),
                last_watched_at: new Date().toISOString(),
                watch_count: (progress?.watch_count || 0) + 1,
            };

            const { data, error: completeError } = await supabase
                .from('lecture_progress' as any)
                .upsert(completeData as any, {
                    onConflict: 'user_id,lecture_id',
                })
                .select()
                .single();

            if (completeError) throw completeError;

            if (isMountedRef.current) {
                setProgress(data as LectureProgress);
                setLastSavedAt(new Date());
                onProgressSaved?.(data as LectureProgress);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to mark as complete');
            if (isMountedRef.current) {
                setError(error);
                onError?.(error);
            }
        } finally {
            if (isMountedRef.current) {
                setIsSaving(false);
            }
        }
    }, [lectureId, progress, supabase, onProgressSaved, onError]);

    // Start auto-save interval
    useEffect(() => {
        if (autoSaveInterval > 0 && lectureId) {
            autoSaveIntervalRef.current = setInterval(() => {
                // Auto-save is triggered by the video component's onTimeUpdate
                // This interval just ensures we save before unmount
            }, autoSaveInterval);
        }

        return () => {
            if (autoSaveIntervalRef.current) {
                clearInterval(autoSaveIntervalRef.current);
            }
        };
    }, [lectureId, autoSaveInterval]);

    // Calculate resume position
    const resumePosition = progress?.last_position || 0;

    return {
        progress,
        isLoading,
        isSaving,
        error,
        saveProgress,
        markAsComplete,
        resumePosition,
        lastSavedAt,
    };
}

export default useLectureProgress;
