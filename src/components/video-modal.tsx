'use client';

import { X } from 'lucide-react';
import ReactPlayer from 'react-player';

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string;
    title: string;
}

export function VideoModal({ isOpen, onClose, videoUrl, title }: VideoModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-all duration-300">
            <div className="relative w-full max-w-5xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
                    <h3 className="text-white font-bold truncate pr-10">{title}</h3>
                    <button 
                        onClick={onClose}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all group"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Video Container */}
                <div className="aspect-video bg-black relative">
                    <ReactPlayer
                        url={videoUrl}
                        width="100%"
                        height="100%"
                        playing
                        controls
                        config={{
                            youtube: {
                                playerVars: { showinfo: 1 }
                            }
                        }}
                    />
                </div>
                
                {/* Footer Info */}
                <div className="p-4 bg-slate-900 border-t border-white/5">
                    <p className="text-slate-400 text-sm">Now watching: <span className="text-white">{title}</span></p>
                </div>
            </div>
        </div>
    );
}
