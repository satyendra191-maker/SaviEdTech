import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Crown, ShieldCheck } from 'lucide-react';
import { notFound } from 'next/navigation';
import { COURSE_OFFERS, getCourseOffer, isPremiumPlan, PREMIUM_PLAN } from '@/lib/payments/catalog';
import { PurchaseCheckoutPanel } from '@/components/payments/PurchaseCheckoutPanel';

interface CourseDetailPageProps {
    params: Promise<{
        courseId: string;
    }>;
}

export async function generateStaticParams() {
    return [
        ...COURSE_OFFERS.map((course) => ({ courseId: course.id })),
        { courseId: PREMIUM_PLAN.id },
    ];
}

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
    const { courseId } = await params;
    const isPremium = isPremiumPlan(courseId);
    const course = isPremium ? PREMIUM_PLAN : getCourseOffer(courseId);

    if (!course) {
        return {
            title: 'Course Not Found - SaviEduTech',
        };
    }

    return {
        title: `${course.title} - SaviEduTech`,
        description: course.description,
    };
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
    const { courseId } = await params;
    const premium = isPremiumPlan(courseId);
    const offer = premium ? PREMIUM_PLAN : getCourseOffer(courseId);

    if (!offer) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50">
            <section className="px-4 py-12 md:py-16">
                <div className="mx-auto max-w-6xl">
                    <Link
                        href="/courses"
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Courses
                    </Link>

                    <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="space-y-6">
                            <div className={`rounded-3xl bg-gradient-to-br ${offer.accent} p-8 text-white shadow-xl`}>
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white/90">
                                    {premium ? <Crown className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                                    {premium ? 'Premium Subscription' : 'Course Purchase'}
                                </div>
                                <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">{offer.title}</h1>
                                <p className="mt-4 max-w-2xl text-base leading-7 text-white/85">{offer.description}</p>
                                <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/85">
                                    {premium ? (
                                        <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                                            {PREMIUM_PLAN.durationDays} days access
                                        </span>
                                    ) : null}
                                    {'duration' in offer && offer.duration ? (
                                        <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                                            {offer.duration}
                                        </span>
                                    ) : null}
                                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">
                                        Razorpay checkout
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-semibold text-slate-900">What you unlock</h2>
                                        <p className="mt-1 text-sm text-slate-600">
                                            Payment is verified through Razorpay, then access is granted immediately to your account.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                    {offer.features.map((feature) => (
                                        <div
                                            key={feature}
                                            className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-700"
                                        >
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 rounded-2xl bg-slate-900 px-6 py-6 text-white">
                                    <h3 className="text-lg font-semibold">
                                        {premium ? 'Premium workflow' : 'Course workflow'}
                                    </h3>
                                    <p className="mt-2 text-sm text-slate-300">
                                        Select this product, complete Razorpay checkout, verify the payment, and your account is updated automatically without leaving the platform.
                                    </p>
                                    <Link
                                        href={offer.accessHref}
                                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300"
                                    >
                                        Preview destination
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="self-start">
                            <PurchaseCheckoutPanel
                                kind={premium ? 'subscription' : 'course'}
                                offer={premium ? {
                                    id: PREMIUM_PLAN.id,
                                    title: PREMIUM_PLAN.title,
                                    description: PREMIUM_PLAN.description,
                                    price: PREMIUM_PLAN.price,
                                    originalPrice: PREMIUM_PLAN.originalPrice,
                                    features: PREMIUM_PLAN.features,
                                    accessHref: PREMIUM_PLAN.accessHref,
                                    durationDays: PREMIUM_PLAN.durationDays,
                                } : {
                                    id: offer.id,
                                    title: offer.title,
                                    description: offer.description,
                                    price: offer.price,
                                    originalPrice: offer.originalPrice,
                                    features: offer.features,
                                    accessHref: offer.accessHref,
                                    duration: 'duration' in offer ? offer.duration : undefined,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
