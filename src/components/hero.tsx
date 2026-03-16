'use client';

import Link from 'next/link';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { AnimatedLogo } from '@/components/animated-logo';
import { AtomGraphic } from '@/components/atom-graphic';

export function Hero() {
    return (
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),radial-gradient(circle_at_85%_25%,_rgba(56,189,248,0.22),_transparent_24%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#082f49_100%)]">
            <div className="absolute inset-0 opacity-25">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M14 14h12v12H14zm40 0h12v12H54zM14 54h12v12H14zm40 0h12v12H54z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
                            <Sparkles className="h-4 w-4 text-amber-300" />
                            National AI EdTech Platform
                        </div>

                        <h1 className="mt-8 text-5xl font-black leading-tight text-white sm:text-6xl lg:text-7xl">
                            Learn JEE, NEET,
                            <br />
                            and Board Concepts
                            <span className="block bg-gradient-to-r from-amber-300 via-orange-400 to-sky-300 bg-clip-text text-transparent">
                                with clarity and speed
                            </span>
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300 lg:mx-0 lg:text-xl">
                            Explore guided video lectures, chapter practice, AI-powered doubt support, mock tests, and structured learning paths built for serious exam preparation.
                        </p>

                        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
                            <Link
                                href="/register"
                                className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-2xl bg-white px-7 py-4 text-base font-bold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-slate-100"
                            >
                                Start Learning Free
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                            <Link
                                href="/demo"
                                className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-base font-bold text-white transition-all hover:bg-white/15"
                            >
                                <Play className="h-5 w-5" fill="currentColor" />
                                Watch Demo
                            </Link>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 scale-90 rounded-full bg-sky-400/15 blur-3xl" />
                        <div className="relative rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
                            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Platform Focus</p>
                                        <h2 className="mt-2 text-2xl font-bold text-white">Everything You Need to Succeed</h2>
                                    </div>
                                    <AnimatedLogo size="sm" variant="dark" />
                                </div>

                                <div className="grid gap-3">
                                    {[
                                        'Live and recorded lectures',
                                        'Daily practice problems',
                                        'Mock tests and online exams',
                                        'Unified AI academic assistance',
                                    ].map((item, index) => (
                                        <div
                                            key={item}
                                            className={`rounded-2xl border px-4 py-4 text-sm font-semibold ${
                                                index % 2 === 0
                                                    ? 'border-sky-300/20 bg-sky-400/10 text-sky-100'
                                                    : 'border-amber-300/20 bg-amber-400/10 text-amber-100'
                                            }`}
                                        >
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-16 lg:mt-0">
                    <div className="relative h-64 w-full lg:h-80">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400/20 via-purple-400/20 to-pink-400/20 blur-3xl" />
                        <div className="relative h-full w-full">
                            <AtomGraphic className="h-full w-full" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
