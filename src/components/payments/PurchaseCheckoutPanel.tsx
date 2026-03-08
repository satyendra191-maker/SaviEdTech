'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { CoursePayment } from '@/components/payments/CoursePayment';
import { PaymentButton } from '@/components/payments/PaymentButton';

interface OfferShape {
    id: string;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    features: string[];
    accessHref: string;
    duration?: string;
    durationDays?: number;
}

interface PurchaseCheckoutPanelProps {
    kind: 'course' | 'subscription';
    offer: OfferShape;
}

type AccessState = 'checking' | 'locked' | 'granted';

export function PurchaseCheckoutPanel({ kind, offer }: PurchaseCheckoutPanelProps) {
    const { user, isLoading: authLoading } = useAuth();
    const supabase = useMemo(() => getSupabaseBrowserClient(), []);
    const paymentPageUrl = typeof window !== 'undefined' ? `${window.location.origin}/courses/${offer.id}` : undefined;
    const [accessState, setAccessState] = useState<AccessState>('locked');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) {
            return;
        }

        if (!user || !supabase) {
            setAccessState('locked');
            return;
        }

        let cancelled = false;

        async function loadAccess() {
            setAccessState('checking');
            setStatusMessage(null);

            try {
                if (kind === 'course') {
                    const { data, error } = await supabase
                        .from('course_enrollments')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('course_id', offer.id)
                        .maybeSingle();

                    if (error) {
                        throw error;
                    }

                    if (!cancelled) {
                        setAccessState(data ? 'granted' : 'locked');
                    }
                    return;
                }

                const { data, error } = await supabase
                    .from('student_profiles')
                    .select('subscription_status, subscription_expires_at')
                    .eq('id', user.id)
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                const profile = data as {
                    subscription_status?: string | null;
                    subscription_expires_at?: string | null;
                } | null;
                const expiresAt = profile?.subscription_expires_at;
                const isPremium = profile?.subscription_status === 'premium'
                    && (!expiresAt || new Date(expiresAt) > new Date());

                if (!cancelled) {
                    setAccessState(isPremium ? 'granted' : 'locked');
                }
            } catch (error) {
                console.error('Failed to load purchase access:', error);
                if (!cancelled) {
                    setAccessState('locked');
                    setStatusMessage('Unable to confirm access right now. You can still complete payment securely.');
                }
            }
        }

        void loadAccess();

        return () => {
            cancelled = true;
        };
    }, [authLoading, kind, offer.id, supabase, user]);

    if (authLoading) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3 text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Checking access...
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                        <Lock className="h-5 w-5" />
                    </div>
                    <div className="space-y-3">
                        <div>
                            <h3 className="text-xl font-semibold text-slate-900">Log in to continue</h3>
                            <p className="mt-1 text-sm text-slate-600">
                                Course purchases and premium subscriptions are linked to your student account so access can be granted instantly after Razorpay verification.
                            </p>
                        </div>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                        >
                            Log In
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (accessState === 'granted') {
        return (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-emerald-600 shadow-sm">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="space-y-3">
                        <div>
                            <h3 className="text-xl font-semibold text-emerald-900">
                                {kind === 'course' ? 'Course access already active' : 'Premium subscription already active'}
                            </h3>
                            <p className="mt-1 text-sm text-emerald-800/80">
                                {kind === 'course'
                                    ? 'You already own this course and can jump straight into the learning track.'
                                    : 'Your premium benefits are active. Open analytics to use the upgraded insights and rank tools.'}
                            </p>
                        </div>
                        <Link
                            href={offer.accessHref}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                            {kind === 'course' ? 'Open Course' : 'Open Analytics'}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {statusMessage ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {statusMessage}
                </div>
            ) : null}

            {kind === 'course' ? (
                <CoursePayment
                    course={{
                        id: offer.id,
                        title: offer.title,
                        description: offer.description,
                        price: offer.price,
                        originalPrice: offer.originalPrice,
                        duration: offer.duration,
                        features: offer.features,
                    }}
                    onSuccess={() => {
                        setAccessState('granted');
                        setStatusMessage('Payment verified. Course access has been granted.');
                    }}
                    onError={(message) => setStatusMessage(message)}
                />
            ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="mb-6 flex items-start gap-3">
                        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-slate-900">{offer.title}</h3>
                            <p className="mt-1 text-sm text-slate-600">{offer.description}</p>
                        </div>
                    </div>

                    <div className="mb-6 rounded-2xl bg-slate-900 p-6 text-white">
                        <div className="text-sm text-slate-300">Premium Plan</div>
                        <div className="mt-2 text-4xl font-bold">Rs {offer.price.toLocaleString('en-IN')}</div>
                        {offer.originalPrice ? (
                            <div className="mt-2 text-sm text-slate-400 line-through">
                                Rs {offer.originalPrice.toLocaleString('en-IN')}
                            </div>
                        ) : null}
                    </div>

                    <ul className="mb-6 space-y-3">
                        {offer.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                {feature}
                            </li>
                        ))}
                    </ul>

                    <PaymentButton
                        amount={offer.price}
                        description={offer.title}
                        metadata={{
                            type: 'subscription',
                            planId: offer.id,
                            durationDays: offer.durationDays || 365,
                            accessHref: offer.accessHref,
                        }}
                        successUrl={paymentPageUrl}
                        cancelUrl={paymentPageUrl}
                        onSuccess={() => {
                            setAccessState('granted');
                            setStatusMessage('Payment verified. Premium subscription is now active.');
                        }}
                        onError={(message) => setStatusMessage(message)}
                    >
                        Activate Premium with Razorpay
                    </PaymentButton>
                </div>
            )}
        </div>
    );
}
