import type { Metadata } from 'next';
import Link from 'next/link';
import {
    ArrowRight,
    BookOpen,
    BrainCircuit,
    Crown,
    FileText,
    GraduationCap,
    Trophy,
} from 'lucide-react';
import { ReceiptLookupCard } from '@/components/payments';
import { COURSE_OFFERS, PREMIUM_PLAN } from '@/lib/payments/catalog';

export const metadata: Metadata = {
    title: 'Online Courses - SaviEduTech',
    description: 'Explore JEE, NEET, Board, and Foundation learning tracks on SaviEduTech.',
};

const trackMeta: Record<string, { href: string; icon: typeof GraduationCap; accent: string }> = {
    'jee-main-pro': {
        href: '/jee',
        icon: GraduationCap,
        accent: 'from-blue-500 to-cyan-500',
    },
    'jee-advanced-elite': {
        href: '/jee-advanced',
        icon: BrainCircuit,
        accent: 'from-indigo-500 to-violet-500',
    },
    'neet-complete': {
        href: '/neet',
        icon: Trophy,
        accent: 'from-emerald-500 to-teal-500',
    },
    'foundation-board-booster': {
        href: '/materials',
        icon: BookOpen,
        accent: 'from-amber-500 to-orange-500',
    },
};

const highlights = [
    'AI faculty support for doubts and revision',
    'Mock tests with timer, scoring, and performance analytics',
    'Daily national challenges and gamified study streaks',
    'Parent visibility into progress and weak areas',
];

export default function CoursesPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50">
            <section className="px-4 py-16 md:py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="max-w-3xl">
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                            SaviEduTech Learning Tracks
                        </span>
                        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                            Courses, Mock Practice, Analytics, and Premium Access
                        </h1>
                        <p className="mt-5 text-lg text-slate-600">
                            Choose the preparation path that matches your exam target, then move into lectures,
                            practice, tests, doubt solving, analytics, and rank prediction without leaving the platform.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-6 lg:grid-cols-2">
                        {COURSE_OFFERS.map((course) => {
                            const meta = trackMeta[course.id];
                            const Icon = meta.icon;
                            return (
                                <div
                                    key={course.id}
                                    className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
                                >
                                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent} text-white`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div className="mt-5 flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl font-semibold text-slate-900">{course.title}</h2>
                                            <p className="mt-3 text-sm leading-6 text-slate-600">{course.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Starts at</div>
                                            <div className="text-2xl font-bold text-slate-900">Rs {course.price.toLocaleString('en-IN')}</div>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {course.features.slice(0, 3).map((item) => (
                                            <span
                                                key={item}
                                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                                            >
                                                {item}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <Link
                                            href={`/courses/${course.id}`}
                                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                                        >
                                            Buy Course
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                        <Link
                                            href={meta.href}
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            Explore Track
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="px-4 py-8">
                <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                            <Crown className="h-4 w-4" />
                            Premium Subscription
                        </div>
                        <h2 className="mt-5 text-3xl font-semibold text-slate-900">{PREMIUM_PLAN.title}</h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{PREMIUM_PLAN.description}</p>

                        <div className="mt-6 flex flex-wrap items-end gap-3">
                            <div className="text-4xl font-bold text-slate-900">Rs {PREMIUM_PLAN.price.toLocaleString('en-IN')}</div>
                            <div className="text-lg text-slate-400 line-through">
                                Rs {PREMIUM_PLAN.originalPrice?.toLocaleString('en-IN')}
                            </div>
                            <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                                {PREMIUM_PLAN.durationDays} days access
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            {PREMIUM_PLAN.features.map((item) => (
                                <div
                                    key={item}
                                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-700"
                                >
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href={`/courses/${PREMIUM_PLAN.id}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Activate Premium
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href={PREMIUM_PLAN.accessHref}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                                Preview Analytics
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    <ReceiptLookupCard
                        title="Download Donation Receipt Later"
                        description="If you already completed a Razorpay donation, use your Order ID and Payment ID here to download the PDF receipt again."
                        className="self-start"
                    />
                </div>
            </section>

            <section className="px-4 py-8">
                <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <h2 className="text-2xl font-semibold text-slate-900">What You Get Inside the Platform</h2>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            {highlights.map((item) => (
                                <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                                    {item}
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 rounded-2xl bg-slate-900 px-6 py-6 text-white">
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-emerald-300" />
                                <h3 className="text-lg font-semibold">Stable Razorpay-only checkout</h3>
                            </div>
                            <p className="mt-2 text-sm text-slate-300">
                                Course purchases and premium subscriptions now use a single Razorpay verification path with payment recording and automatic access grants.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <h2 className="text-2xl font-semibold text-slate-900">Purchase Flow</h2>
                        <div className="mt-6 space-y-4">
                            {[
                                'Select a course or premium plan from this page.',
                                'Open the dedicated checkout page and complete Razorpay payment.',
                                'Verification updates the payment record and grants access automatically.',
                                'Return to your dashboard or learning track with access already active.',
                            ].map((step, index) => (
                                <div key={step} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white">
                                        {index + 1}
                                    </div>
                                    <p className="text-sm leading-6 text-slate-700">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
