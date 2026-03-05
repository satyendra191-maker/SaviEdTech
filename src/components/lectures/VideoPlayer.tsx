'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    SkipBack,
    SkipForward,
    Settings,
    Check,
    RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoQuality {
    label: string;
    src: string;
}

interface VideoPlayerProps {
    src: string;
    poster?: string;
    title?: string;
    qualities?: VideoQuality[];
    initialPosition?: number;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    onEnded?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
    className?: string;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function VideoPlayer({
    src,
    poster,
    title,
    qualities = [],
    initialPosition = 0,
    onTimeUpdate,
    onEnded,
    onPlay,
    onPause,
    className,
}: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(initialPosition);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [currentQuality, setCurrentQuality] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showResumePrompt, setShowResumePrompt] = useState(initialPosition > 10);

    // Format time to MM:SS or HH:MM:SS
    const formatTime = (time: number): string => {
        if (isNaN(time)) return '0:00';
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Handle video loaded metadata
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setIsLoading(false);
            if (initialPosition > 0) {
                videoRef.current.currentTime = initialPosition;
            }
        }
    };

    // Handle time update
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const time = videoRef.current.currentTime;
            const dur = videoRef.current.duration;
            setCurrentTime(time);

            // Update buffered amount
            if (videoRef.current.buffered.length > 0) {
                setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
            }

            onTimeUpdate?.(time, dur);
        }
    };

    // Toggle play/pause
    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                onPause?.();
            } else {
                videoRef.current.play();
                onPlay?.();
            }
        }
    }, [isPlaying, onPlay, onPause]);

    // Handle play event
    const handlePlay = () => {
        setIsPlaying(true);
        // Hide controls after 3 seconds
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    // Handle pause event
    const handlePause = () => {
        setIsPlaying(false);
        setShowControls(true);
    };

    // Toggle mute
    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    // Handle volume change
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            setIsMuted(newVolume === 0);
        }
    };

    // Handle seek
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    // Skip forward/backward
    const skip = (seconds: number) => {
        if (videoRef.current) {
            const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    // Toggle fullscreen
    const toggleFullscreen = async () => {
        if (!containerRef.current) return;

        try {
            if (!isFullscreen) {
                await containerRef.current.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    };

    // Handle fullscreen change
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Change playback speed
    const changeSpeed = (speed: number) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
            setPlaybackSpeed(speed);
            setShowSpeedMenu(false);
        }
    };

    // Change quality
    const changeQuality = (index: number) => {
        if (videoRef.current && qualities[index]) {
            const wasPlaying = !videoRef.current.paused;
            const currentTime = videoRef.current.currentTime;

            setCurrentQuality(index);
            videoRef.current.src = qualities[index].src;
            videoRef.current.currentTime = currentTime;

            if (wasPlaying) {
                videoRef.current.play();
            }
            setShowQualityMenu(false);
        }
    };

    // Handle mouse move to show controls
    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    skip(-10);
                    break;
                case 'arrowright':
                    e.preventDefault();
                    skip(10);
                    break;
                case 'arrowup':
                    e.preventDefault();
                    setVolume(v => Math.min(1, v + 0.1));
                    if (videoRef.current) videoRef.current.volume = Math.min(1, volume + 0.1);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    setVolume(v => Math.max(0, v - 0.1));
                    if (videoRef.current) videoRef.current.volume = Math.max(0, volume - 0.1);
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'j':
                    e.preventDefault();
                    skip(-10);
                    break;
                case 'l':
                    e.preventDefault();
                    skip(10);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, volume]);

    // Resume from initial position
    const handleResume = () => {
        setShowResumePrompt(false);
        if (videoRef.current) {
            videoRef.current.play();
        }
    };

    // Restart from beginning
    const handleRestart = () => {
        setShowResumePrompt(false);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play();
        }
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            if (progressSaveIntervalRef.current) clearInterval(progressSaveIntervalRef.current);
        };
    }, []);

    // Get current video source
    const currentSrc = qualities.length > 0 ? qualities[currentQuality].src : src;

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative group bg-black rounded-2xl overflow-hidden',
                isFullscreen ? 'w-screen h-screen rounded-none' : 'w-full aspect-video',
                className
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                src={currentSrc}
                poster={poster}
                className="w-full h-full object-contain"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={onEnded}
                onWaiting={() => setIsLoading(true)}
                onCanPlay={() => setIsLoading(false)}
                preload="metadata"
                playsInline
            />

            {/* Loading Spinner */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-primary-500 rounded-full animate-spin" />
                </div>
            )}

            {/* Resume Prompt */}
            {showResumePrompt && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
                    <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 text-center">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <RotateCcw className="w-6 h-6 text-primary-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            Resume Watching?
                        </h3>
                        <p className="text-slate-600 mb-4">
                            You left off at {formatTime(initialPosition)}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleRestart}
                                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                            >
                                Start Over
                            </button>
                            <button
                                onClick={handleResume}
                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                            >
                                Resume
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Title Overlay */}
            {title && showControls && (
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
                    <h3 className="text-white font-medium truncate">{title}</h3>
                </div>
            )}

            {/* Controls Overlay */}
            <div
                className={cn(
                    'absolute inset-0 flex flex-col justify-end transition-opacity duration-300',
                    showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
            >
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Controls Container */}
                <div className="relative p-4 space-y-3">
                    {/* Progress Bar */}
                    <div className="relative group/progress">
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer hover:h-2 transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                        />
                        {/* Buffered Progress */}
                        <div
                            className="absolute top-0 left-0 h-1.5 bg-white/20 rounded-full pointer-events-none group-hover/progress:h-2 transition-all"
                            style={{ width: `${(buffered / duration) * 100}%` }}
                        />
                        {/* Current Progress */}
                        <div
                            className="absolute top-0 left-0 h-1.5 bg-primary-500 rounded-full pointer-events-none group-hover/progress:h-2 transition-all"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* Play/Pause */}
                            <button
                                onClick={togglePlay}
                                className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors"
                            >
                                {isPlaying ? (
                                    <Pause className="w-6 h-6" />
                                ) : (
                                    <Play className="w-6 h-6" />
                                )}
                            </button>

                            {/* Skip Backward */}
                            <button
                                onClick={() => skip(-10)}
                                className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors"
                            >
                                <SkipBack className="w-5 h-5" />
                            </button>

                            {/* Skip Forward */}
                            <button
                                onClick={() => skip(10)}
                                className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors"
                            >
                                <SkipForward className="w-5 h-5" />
                            </button>

                            {/* Volume */}
                            <div className="flex items-center gap-2 group/volume">
                                <button
                                    onClick={toggleMute}
                                    className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    {isMuted || volume === 0 ? (
                                        <VolumeX className="w-5 h-5" />
                                    ) : (
                                        <Volume2 className="w-5 h-5" />
                                    )}
                                </button>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>

                            {/* Time Display */}
                            <span className="text-white text-sm font-medium">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Playback Speed */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowSpeedMenu(!showSpeedMenu);
                                        setShowQualityMenu(false);
                                    }}
                                    className="px-3 py-1.5 text-white text-sm font-medium hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    {playbackSpeed}x
                                </button>
                                {showSpeedMenu && (
                                    <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-xl overflow-hidden min-w-[120px]">
                                        {PLAYBACK_SPEEDS.map((speed) => (
                                            <button
                                                key={speed}
                                                onClick={() => changeSpeed(speed)}
                                                className={cn(
                                                    'w-full px-4 py-2 text-left text-sm text-white hover:bg-white/20 transition-colors flex items-center justify-between',
                                                    playbackSpeed === speed && 'bg-white/20'
                                                )}
                                            >
                                                {speed}x
                                                {playbackSpeed === speed && (
                                                    <Check className="w-4 h-4" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Quality Selector */}
                            {qualities.length > 1 && (
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setShowQualityMenu(!showQualityMenu);
                                            setShowSpeedMenu(false);
                                        }}
                                        className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors"
                                    >
                                        <Settings className="w-5 h-5" />
                                    </button>
                                    {showQualityMenu && (
                                        <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-xl overflow-hidden min-w-[120px]">
                                            {qualities.map((quality, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => changeQuality(index)}
                                                    className={cn(
                                                        'w-full px-4 py-2 text-left text-sm text-white hover:bg-white/20 transition-colors flex items-center justify-between',
                                                        currentQuality === index && 'bg-white/20'
                                                    )}
                                                >
                                                    {quality.label}
                                                    {currentQuality === index && (
                                                        <Check className="w-4 h-4" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Fullscreen */}
                            <button
                                onClick={toggleFullscreen}
                                className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors"
                            >
                                {isFullscreen ? (
                                    <Minimize className="w-5 h-5" />
                                ) : (
                                    <Maximize className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Big Play Button (when paused) */}
            {!isPlaying && !showResumePrompt && !isLoading && (
                <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                >
                    <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                        <Play className="w-10 h-10 text-slate-900 ml-1" fill="currentColor" />
                    </div>
                </button>
            )}
        </div>
    );
}

export default VideoPlayer;
