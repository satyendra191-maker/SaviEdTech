/**
 * Payment Webhook Handler
 *
 * POST /api/payments/webhook
 * Handles webhooks from Razorpay
 */

import { NextRequest, NextResponse } from 'next/server';
import * as razorpay from '@/lib/payments/razorpay';
import { grantCourseAccess, grantPremiumSubscription } from '@/lib/payments/access';
import { createAdminSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const razorpaySignature = request.headers.get('x-razorpay-signature');

        if (!razorpaySignature) {
            return NextResponse.json(
                { success: false, error: 'Missing Razorpay signature' },
                { status: 400 }
            );
        }

        const rawBody = await request.text();
        let payload: unknown;

        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload' },
                { status: 400 }
            );
        }

        const result = await razorpay.processWebhook(rawBody, payload, razorpaySignature);

        if (!result.success) {
            console.error('Webhook processing failed for razorpay:', result.error);
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        const supabase = createAdminSupabaseClient();

        if (result.paymentMetadata?.type === 'course_purchase' && result.userId && result.paymentMetadata.courseId) {
            try {
                await grantCourseAccess(supabase, result.userId, result.paymentMetadata.courseId, result.paymentRecordId ?? null);
            } catch (error) {
                console.error('Webhook course grant failed:', error);
            }
        }

        if (result.paymentMetadata?.type === 'subscription' && result.userId) {
            try {
                await grantPremiumSubscription(
                    supabase,
                    result.userId,
                    result.paymentMetadata.durationDays ?? 30
                );
            } catch (error) {
                console.error('Webhook subscription grant failed:', error);
            }
        }

        await supabase.from('webhook_logs').insert({
            gateway: 'razorpay',
            event_type: result.event || 'unknown',
            payload: payload as Record<string, unknown>,
            processed_at: new Date().toISOString(),
            status: 'success',
        } as never);

        return NextResponse.json(
            { success: true, event: result.event, gateway: 'razorpay' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url);
    const gateway = url.searchParams.get('gateway');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!gateway) {
        return NextResponse.json({
            success: true,
            webhooks: {
                razorpay: {
                    endpoint: `${baseUrl}/api/payments/webhook?gateway=razorpay`,
                    events: ['payment.captured', 'payment.failed', 'order.paid'],
                    method: 'POST',
                    headers: ['x-razorpay-signature'],
                },
            },
        });
    }

    if (gateway !== 'razorpay') {
        return NextResponse.json(
            { success: false, error: 'Invalid gateway. Only razorpay is supported.' },
            { status: 400 }
        );
    }

    return NextResponse.json({
        success: true,
        gateway: 'razorpay',
        endpoint: `${baseUrl}/api/payments/webhook?gateway=razorpay`,
        events: ['payment.captured', 'payment.failed', 'order.paid'],
        headers: ['x-razorpay-signature'],
    });
}
