'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Play, Users, Award, BookOpen, Sparkles } from 'lucide-react';
import { VideoModal } from './video-modal';
import { AnimatedLogo } from './animated-logo';

export function Hero() {
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const demoVideoUrl = 'https://www.youtube.com/watch?v=3Rlv_wB6vYA'; // Physics Demo

    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
            </div>

            {/* Floating Elements */}
            <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl animate-bounce duration-slow" />
            <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-emerald-500/20 rounded-full blur-xl animate-pulse delay-700" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Content */}
                    <div className="text-center lg:text-left z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
                            <Award className="w-4 h-4 text-amber-400" />
                            <span className="font-medium tracking-wide">India's Leading NEET & JEE Platform for Gen-Z</span>
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-8 drop-shadow-2xl">
                            Crack{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-primary-500 animate-gradient-x">
                                JEE & NEET
                            </span>{' '}
                            with India's Best Platform
                        </h1>

                        <p className="text-xl sm:text-2xl text-slate-300 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
                            Join over <span className="text-white font-bold">100,000+</span> students mastering Physics, Chemistry, Math & Biology with <span className="text-primary-400">interactive 3D lectures</span>, AI-driven practice, and 24/7 personalized doubt resolution.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start mb-14">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-2xl font-bold text-lg hover:from-primary-700 hover:to-blue-700 hover:scale-[1.03] transition-all group shadow-2xl shadow-primary-500/20"
                            >
                                Start Free Trial Now
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                            </Link>
                            <button
                                onClick={() => setIsVideoModalOpen(true)}
                                className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-white/10 backdrop-blur-md text-white rounded-2xl font-bold text-lg border border-white/20 hover:bg-white/20 hover:scale-[1.03] transition-all shadow-xl"
                            >
                                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center animate-pulse">
                                    <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                                </div>
                                Watch Platform Demo
                            </button>
                        </div>

                        {/* Stats Bar */}
                        <div className="flex flex-wrap justify-center lg:justify-start gap-10 pt-4 border-t border-white/10">
                            {[
                                { count: '100K+', label: 'Active Students', icon: <Users className="w-5 h-5 text-blue-400" /> },
                                { count: '5000+', label: 'Video Lectures', icon: <BookOpen className="w-5 h-5 text-emerald-400" /> },
                                { count: '98%', label: 'Positive Results', icon: <Award className="w-5 h-5 text-amber-400" /> },
                            ].map((stat, i) => (
                                <div key={i} className="flex items-center gap-4 group cursor-default">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <div className="text-3xl font-extrabold text-white group-hover:text-primary-400 transition-colors">{stat.count}</div>
                                        <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">{stat.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: 3D Animated Logo */}
                    <div className="relative perspective-1000">
                        <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full transform -rotate-12 scale-110" />

                        {/* 3D Animated Logo */}
                        <div className="flex flex-col items-center justify-center z-10 animate-float">
                            <AnimatedLogo size="2xl" showText={false} className="hover:scale-110 transition-transform duration-500" />
                        </div>

                        {/* Small Trust Badge */}
                        <div className="absolute -bottom-8 right-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center gap-3 z-20 shadow-2xl animate-float delay-500">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">AI Verified</div>
                                <div className="text-sm font-semibold text-white">99.4% Accuracy</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Modal */}
            <VideoModal
                isOpen={isVideoModalOpen}
                onClose={() => setIsVideoModalOpen(false)}
                videoUrl={demoVideoUrl}
                title="SaviEduTech Platform Overview & Faculty Demo"
            />

            {/* Wave Divider with Premium Gradient */}
            <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                    <path d="M0 120L48 112.5C96 105 192 90 288 82.5C384 75 480 75 576 80C672 85 768 95 864 100C960 105 1056 105 1152 100C1248 95 1344 85 1392 80L1440 75V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0Z" fill="white" />
                </svg>
            </div>
        </section>
    );
}
