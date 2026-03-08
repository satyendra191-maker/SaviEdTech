'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ProctoringSeverity = 'info' | 'warning' | 'critical';

interface UseExamProctoringOptions {
    enabled: boolean;
    examId: string;
    attemptId: string | null;
    initialWarningCount?: number;
    onAutoSubmit?: () => void;
}

interface ProctoringEventState {
    type: string;
    severity: ProctoringSeverity;
    message: string;
    occurredAt: string;
}

type BrowserFaceDetector = new (options?: {
    fastMode?: boolean;
    maxDetectedFaces?: number;
}) => {
    detect(input: CanvasImageSource): Promise<Array<{ boundingBox?: DOMRectReadOnly }>>;
};

function isClientMobile(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }

    return /android|iphone|mobile/i.test(navigator.userAgent);
}

export function useExamProctoring({
    enabled,
    examId,
    attemptId,
    initialWarningCount = 0,
    onAutoSubmit,
}: UseExamProctoringOptions) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const cooldownRef = useRef<Map<string, number>>(new Map());
    const lastActivityRef = useRef<number>(Date.now());
    const snapshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const faceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const inactivityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [warningCount, setWarningCount] = useState(initialWarningCount);
    const [lastEvent, setLastEvent] = useState<ProctoringEventState | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const supportsFaceDetector = useMemo(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return Boolean((window as Window & { FaceDetector?: BrowserFaceDetector }).FaceDetector);
    }, []);

    const captureSnapshot = useCallback(async () => {
        if (!videoRef.current || !attemptId) {
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 360;
        const context = canvas.getContext('2d');

        if (!context) {
            return null;
        }

        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.72);

        try {
            const response = await fetch('/api/online-exams/snapshot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    examId,
                    attemptId,
                    imageData,
                }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to upload snapshot');
            }

            return payload?.data?.snapshotPath || null;
        } catch (error) {
            console.error('Failed to upload proctoring snapshot:', error);
            return null;
        }
    }, [attemptId, examId]);

    const recordEvent = useCallback(async (
        type: string,
        severity: ProctoringSeverity,
        message: string,
        options?: {
            includeSnapshot?: boolean;
            metadata?: Record<string, unknown>;
            cooldownMs?: number;
        }
    ) => {
        if (!enabled || !attemptId) {
            return null;
        }

        const cooldownMs = options?.cooldownMs ?? 30000;
        const previousAt = cooldownRef.current.get(type) || 0;
        if (Date.now() - previousAt < cooldownMs) {
            return null;
        }

        cooldownRef.current.set(type, Date.now());
        setLastEvent({
            type,
            severity,
            message,
            occurredAt: new Date().toISOString(),
        });

        if (severity !== 'info') {
            setWarningCount((current) => current + 1);
        }

        const screenshotUrl = options?.includeSnapshot ? await captureSnapshot() : null;

        try {
            const response = await fetch('/api/online-exams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'log_event',
                    examId,
                    attemptId,
                    eventType: type,
                    severity,
                    warningMessage: message,
                    screenshotUrl,
                    metadata: {
                        ...(options?.metadata || {}),
                        mobileClient: isClientMobile(),
                    },
                }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to log proctoring event');
            }

            if (payload?.data?.warningCount !== undefined) {
                setWarningCount(Number(payload.data.warningCount || 0));
            }

            if (payload?.data?.shouldAutoSubmit) {
                onAutoSubmit?.();
            }

            return payload?.data || null;
        } catch (error) {
            console.error('Failed to record proctoring event:', error);
            return null;
        }
    }, [attemptId, captureSnapshot, enabled, examId, onAutoSubmit]);

    const requestFullscreen = useCallback(async () => {
        if (typeof document === 'undefined') {
            return false;
        }

        if (document.fullscreenElement) {
            return true;
        }

        try {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
            return true;
        } catch (error) {
            console.error('Failed to enable fullscreen mode:', error);
            return false;
        }
    }, []);

    useEffect(() => {
        if (!enabled || !attemptId) {
            return undefined;
        }

        let isCancelled = false;

        async function enableCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 640 },
                        height: { ideal: 360 },
                    },
                    audio: false,
                });

                if (isCancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => undefined);
                }
                setIsCameraReady(true);
                setCameraError(null);
            } catch (error) {
                console.error('Failed to initialize exam camera:', error);
                setIsCameraReady(false);
                setCameraError('Webcam permission is required for proctored online exams.');
            }
        }

        void enableCamera();

        return () => {
            isCancelled = true;
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
    }, [attemptId, enabled]);

    useEffect(() => {
        if (!enabled || !attemptId) {
            return undefined;
        }

        const markActive = () => {
            lastActivityRef.current = Date.now();
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                void recordEvent('tab_switch', 'warning', 'Tab switching detected. Please stay on the exam screen.', {
                    includeSnapshot: true,
                });
            }
        };

        const handleFullscreenChange = () => {
            const nextState = Boolean(document.fullscreenElement);
            setIsFullscreen(nextState);

            if (!nextState) {
                void recordEvent('fullscreen_exit', 'warning', 'Fullscreen mode exited. Please return to fullscreen to continue the exam.', {
                    includeSnapshot: true,
                });
            }
        };

        const handleBlur = () => {
            void recordEvent('window_blur', 'warning', 'Exam window focus was lost.', {
                cooldownMs: 45000,
            });
        };

        const handleClipboardAttempt = (event: Event) => {
            event.preventDefault();
            void recordEvent('clipboard_attempt', 'warning', 'Copy and paste are disabled during proctored exams.', {
                cooldownMs: 45000,
            });
        };

        window.addEventListener('mousemove', markActive);
        window.addEventListener('keydown', markActive);
        window.addEventListener('click', markActive);
        window.addEventListener('touchstart', markActive);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('copy', handleClipboardAttempt);
        document.addEventListener('paste', handleClipboardAttempt);
        document.addEventListener('cut', handleClipboardAttempt);
        document.addEventListener('contextmenu', handleClipboardAttempt);

        return () => {
            window.removeEventListener('mousemove', markActive);
            window.removeEventListener('keydown', markActive);
            window.removeEventListener('click', markActive);
            window.removeEventListener('touchstart', markActive);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('copy', handleClipboardAttempt);
            document.removeEventListener('paste', handleClipboardAttempt);
            document.removeEventListener('cut', handleClipboardAttempt);
            document.removeEventListener('contextmenu', handleClipboardAttempt);
        };
    }, [attemptId, enabled, recordEvent]);

    useEffect(() => {
        if (!enabled || !attemptId || !isCameraReady || !videoRef.current) {
            return undefined;
        }

        if (supportsFaceDetector) {
            const FaceDetectorCtor = (window as Window & { FaceDetector?: BrowserFaceDetector }).FaceDetector!;
            const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 2 });

            faceCheckIntervalRef.current = setInterval(() => {
                const video = videoRef.current;
                if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
                    return;
                }

                void detector.detect(video)
                    .then((faces) => {
                        if (faces.length === 0) {
                            void recordEvent('face_absent', 'warning', 'Face not detected. Please remain visible in the camera.', {
                                includeSnapshot: true,
                            });
                        } else if (faces.length > 1) {
                            void recordEvent('multiple_faces', 'critical', 'Multiple people detected. This activity is not allowed during the exam.', {
                                includeSnapshot: true,
                            });
                        }
                    })
                    .catch((error) => {
                        console.error('Face detection check failed:', error);
                    });
            }, 8000);
        } else {
            void recordEvent('face_detection_unavailable', 'info', 'Face detection fallback mode enabled for this browser.', {
                cooldownMs: 24 * 60 * 60 * 1000,
            });
        }

        inactivityIntervalRef.current = setInterval(() => {
            const inactiveForMs = Date.now() - lastActivityRef.current;
            if (inactiveForMs > 3 * 60 * 1000) {
                void recordEvent('suspicious_inactivity', 'warning', 'Unusual inactivity detected during the exam.', {
                    includeSnapshot: true,
                    cooldownMs: 120000,
                    metadata: {
                        inactiveForMs,
                    },
                });
            }
        }, 30000);

        snapshotIntervalRef.current = setInterval(() => {
            void captureSnapshot();
        }, 120000);

        return () => {
            if (faceCheckIntervalRef.current) {
                clearInterval(faceCheckIntervalRef.current);
            }
            if (inactivityIntervalRef.current) {
                clearInterval(inactivityIntervalRef.current);
            }
            if (snapshotIntervalRef.current) {
                clearInterval(snapshotIntervalRef.current);
            }
        };
    }, [attemptId, captureSnapshot, enabled, isCameraReady, recordEvent, supportsFaceDetector]);

    return {
        videoRef,
        isCameraReady,
        cameraError,
        warningCount,
        lastEvent,
        isFullscreen,
        requestFullscreen,
        recordEvent,
    };
}

export default useExamProctoring;
