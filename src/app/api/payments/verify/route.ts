/**
 * Payment Verification API
 *
 * POST /api/payments/verify
 * Verifies payment completion for Razorpay
 * Handles donations, course purchases, and subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import * as razorpay from '@/lib/payments/razorpay';
import { grantCourseAccess, grantPremiumSubscription, parsePaymentMetadata } from '@/lib/payments/access';
import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

const razorpayVerifySchema = z.object({
    gateway: z.literal('razorpay'),
    orderId: z.string(),
    paymentId: z.string(),
    signature: z.string(),
    metadata: z.object({
        type: z.enum(['donation', 'course_purchase', 'subscription']).optional(),
        courseId: z.string().optional(),
        courseTitle: z.string().optional(),
        planId: z.string().optional(),
        durationDays: z.number().int().positive().optional(),
        accessHref: z.string().optional(),
        donorMessage: z.string().max(500).optional(),
    }).optional(),
});

export interface VerifyPaymentResponse {
    success: boolean;
    verified?: boolean;
    payment?: unknown;
    receiptNumber?: string;
    receiptDownloadUrl?: string;
    invoiceDownloadUrl?: string;
    redirectUrl?: string;
    message?: string;
    error?: string;
    courseAccessGranted?: boolean;
    subscriptionActivated?: boolean;
}

function createSupabaseClient(request: NextRequest) {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set() {
                    // no-op in route handlers
                },
                remove() {
                    // no-op in route handlers
                },
            },
        }
    );
}

export async function POST(request: NextRequest): Promise<NextResponse<VerifyPaymentResponse>> {
    try {
        const body = await request.json();
        const validationResult = razorpayVerifySchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Validation error: ${validationResult.error.message}`,
                },
                { status: 400 }
            );
        }

        const { orderId, paymentId, signature, metadata } = validationResult.data;
        if (!razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) {
            return NextResponse.json(
                { success: false, verified: false, error: 'Invalid payment signature' },
                { status: 400 }
            );
        }

        const verifyResult = await razorpay.verifyAndCapturePayment({
            orderId,
            paymentId,
            signature,
        });

        if (!verifyResult.success || !verifyResult.payment) {
            return NextResponse.json(
                {
                    success: false,
                    verified: false,
                    error: verifyResult.error || 'Payment verification failed',
                },
                { status: 400 }
            );
        }

        const sessionSupabase = createSupabaseClient(request);
        const {
            data: { user },
        } = await sessionSupabase.auth.getUser();
        const supabase = createAdminSupabaseClient();

        const paymentMetadata = parsePaymentMetadata({
            ...(verifyResult.paymentMetadata ?? {}),
            ...(metadata ?? {}),
        });
        const effectiveUserId = verifyResult.userId ?? user?.id ?? null;

        if (effectiveUserId) {
            const { error: paymentUserError } = await (supabase
                .from('payments') as any)
                .update({
                    user_id: effectiveUserId,
                    updated_at: new Date().toISOString(),
                })
                .eq('razorpay_order_id', orderId)
                .is('user_id', null);

            if (paymentUserError) {
                console.error('Failed to attach user to payment:', paymentUserError);
            }
        }

        let courseAccessGranted = false;
        let subscriptionActivated = false;
        let redirectUrl: string | undefined;

        if (paymentMetadata.type === 'course_purchase') {
            if (!effectiveUserId || !paymentMetadata.courseId) {
                return NextResponse.json(
                    {
                        success: false,
                        verified: true,
                        payment: verifyResult.payment,
                        error: 'Course purchase verified, but course access could not be granted.',
                    },
                    { status: 409 }
                );
            }

            await grantCourseAccess(supabase, effectiveUserId, paymentMetadata.courseId, verifyResult.paymentRecordId ?? null);
            courseAccessGranted = true;
            redirectUrl = paymentMetadata.accessHref || '/courses';
        }

        if (paymentMetadata.type === 'subscription') {
            if (!effectiveUserId) {
                return NextResponse.json(
                    {
                        success: false,
                        verified: true,
                        payment: verifyResult.payment,
                        error: 'Subscription payment verified, but no student account was available to activate it.',
                    },
                    { status: 409 }
                );
            }

            await grantPremiumSubscription(supabase, effectiveUserId, paymentMetadata.durationDays ?? 30);
            subscriptionActivated = true;
            redirectUrl = '/dashboard/settings';
        }

        const successMessage = paymentMetadata.type === 'course_purchase'
            ? 'Payment successful. Course access granted.'
            : paymentMetadata.type === 'subscription'
                ? 'Payment successful. Premium subscription activated.'
                : 'Payment verified successfully.';

        return NextResponse.json(
            {
                success: true,
                verified: true,
                payment: verifyResult.payment,
                receiptNumber: verifyResult.receiptNumber,
                receiptDownloadUrl: paymentMetadata.type === 'donation'
                    ? `/api/donations/receipt?orderId=${encodeURIComponent(orderId)}&paymentId=${encodeURIComponent(paymentId)}`
                    : undefined,
                invoiceDownloadUrl: paymentMetadata.type === 'course_purchase' || paymentMetadata.type === 'subscription'
                    ? `/api/payments/invoice?orderId=${encodeURIComponent(orderId)}&paymentId=${encodeURIComponent(paymentId)}`
                    : undefined,
                redirectUrl,
                message: successMessage,
                courseAccessGranted,
                subscriptionActivated,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Payment verification API error:', error);
        return NextResponse.json(
            {
                success: false,
                verified: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const orderId = request.nextUrl.searchParams.get('orderId');

    if (!orderId) {
        return NextResponse.json(
            { success: false, error: 'Missing required parameter: orderId' },
            { status: 400 }
        );
    }

    try {
        const orderResult = await razorpay.fetchOrder(orderId);

        if (!orderResult.success) {
            return NextResponse.json(
                { success: false, error: orderResult.error },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            orderId,
            data: orderResult.order,
        });
    } catch (error) {
        console.error('Payment status check error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
