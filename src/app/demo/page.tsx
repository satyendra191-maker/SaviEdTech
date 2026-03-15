'use client';

import Link from 'next/link';
import { ArrowLeft, Play } from 'lucide-react';
import ReactPlayer from 'react-player';
import { BrandLogo } from '@/components/brand-logo';

const DEMO_VIDEO_URL = 'https://www.youtube.com/watch?v=3Rlv_wB6vYA';
const DEMO_TITLE = 'SaviEduTech Platform Demo';
const DEMO_DESCRIPTION = 'Discover how SaviEduTech helps you crack JEE, NEET, and Board exams with AI-powered learning, expert faculty, and comprehensive study materials.';

export default function DemoPage() {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),radial-gradient(circle_at_85%_25%,_rgba(56,189,248,0.22),_transparent_24%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#082f49_100%)]">
            <div className="absolute inset-0 opacity-25">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M14 14h12v12H14zm40 0h12v12H54zM14 54h12v12H14zm40 0h12v12H54z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            <header className="relative z-10 border-b border-white/10 bg-slate-950/50 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                    <Link href="/" className="shrink-0">
                        <BrandLogo size="md" />
                    </Link>
                    <div className="w-24" />
                </div>
            </header>

            <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-4xl">
                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
                            <Play className="h-4 w-4 text-amber-300" fill="currentColor" />
                            Platform Demo
                        </div>
                        <h1 className="mt-6 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                            {DEMO_TITLE}
                        </h1>
                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                            {DEMO_DESCRIPTION}
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
                        <div className="aspect-video w-full bg-black">
                            <ReactPlayer
                                url={DEMO_VIDEO_URL}
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
                    </div>

                    <div className="mt-12 text-center">
                        <p className="mb-6 text-lg text-slate-300">
                            Ready to start your journey to success?
                        </p>
                        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                            <Link
                                href="/register"
                                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-white px-7 py-4 text-base font-bold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-slate-100"
                            >
                                Start Learning Free
                            </Link>
                            <Link
                                href="/courses"
                                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-base font-bold text-white transition-all hover:bg-white/15"
                            >
                                Explore Courses
                            </Link>
                        </div>
                    </div>

                    <div className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
                        <h2 className="text-2xl font-bold text-white mb-6">
                            What You Will Learn
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
                                'Live and recorded video lectures from expert faculty',
                                'Daily practice problems with instant solutions',
                                'Full-length mock tests with detailed analysis',
                                'Unified AI academic assistant for doubt solving',
                                'Smart revision recommendations based on weak areas',
                                'Track progress with detailed analytics',
                            ].map((feature) => (
                                <div
                                    key={feature}
                                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                                >
                                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-slate-200">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
