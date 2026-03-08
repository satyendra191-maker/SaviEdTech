'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, TimerReset, MonitorSmartphone, ClipboardCheck } from 'lucide-react';

export default function OnlineExamLandingPage() {
    return (
        <main className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.15),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)]">
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm font-medium text-sky-700">
                            <ClipboardCheck className="h-4 w-4" />
                            NTA-style online examinations
                        </div>
                        <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
                            Real exam simulation for JEE, NEET, and board preparation.
                        </h1>
                        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                            Attempt full-screen, timed exams with section navigation, live autosave, instant scorecards, and proctored integrity checks built for serious practice.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="/dashboard/online-exams"
                                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                            >
                                Open Exam Center
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/dashboard/tests"
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                Practice Mock Tests
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-xl shadow-sky-100 backdrop-blur">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FeatureCard
                                icon={TimerReset}
                                title="Real-time timer"
                                description="Automatic submission and timed section strategy just like national CBT exams."
                            />
                            <FeatureCard
                                icon={ShieldCheck}
                                title="Proctored integrity"
                                description="Fullscreen checks, tab monitoring, webcam validation, and suspicious activity logs."
                            />
                            <FeatureCard
                                icon={MonitorSmartphone}
                                title="Desktop-first"
                                description="Optimized for laptops and tablets. Mobile remains focused on low-stakes practice."
                            />
                            <FeatureCard
                                icon={ClipboardCheck}
                                title="Instant analytics"
                                description="Score, accuracy, percentile, weak-topic analysis, and predicted rank after submission."
                            />
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

function FeatureCard({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof ClipboardCheck;
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
    );
}
