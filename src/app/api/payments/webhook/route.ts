/**
 * Payment Webhook Handler
 * 
 * POST /api/payments/webhook
 * Handles webhooks from Razorpay, Stripe, and PayPal
 */

import { NextRequest, NextResponse } from 'next/server';
import * as razorpay from '@/lib/payments/razorpay';
import * as stripe from '@/lib/payments/stripe';
import * as paypal from '@/lib/payments/paypal';
import { createAdminSupabaseClient } from '@/lib/supabase';

// Webhook event types
interface WebhookEvent {
    gateway: 'razorpay' | 'stripe' | 'paypal';
    event: string;
    payload: unknown;
}

/**
 * POST handler for processing webhooks
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Get the gateway from the URL path or headers
        const url = new URL(request.url);
        const gateway = url.searchParams.get('gateway') as 'razorpay' | 'stripe' | 'paypal' | null;

        if (!gateway) {
            return NextResponse.json(
                { success: false, error: 'Gateway parameter is required' },
                { status: 400 }
            );
        }

        // Get raw body for signature verification
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

        let result: { success: boolean; event?: string; error?: string };

        switch (gateway) {
            case 'razorpay': {
                // Get Razorpay signature from headers
                const razorpaySignature = request.headers.get('x-razorpay-signature');

                if (!razorpaySignature) {
                    return NextResponse.json(
                        { success: false, error: 'Missing Razorpay signature' },
                        { status: 400 }
                    );
                }

                result = await razorpay.processWebhook(payload, razorpaySignature);
                break;
            }

            case 'stripe': {
                // Get Stripe signature from headers
                const stripeSignature = request.headers.get('stripe-signature');

                if (!stripeSignature) {
                    return NextResponse.json(
                        { success: false, error: 'Missing Stripe signature' },
                        { status: 400 }
                    );
                }

                result = await stripe.processWebhook(payload, stripeSignature);
                break;
            }

            case 'paypal': {
                // PayPal uses multiple headers for verification
                const paypalHeaders: Record<string, string> = {};
                request.headers.forEach((value, key) => {
                    if (key.startsWith('paypal-')) {
                        paypalHeaders[key] = value;
                    }
                });

                if (Object.keys(paypalHeaders).length === 0) {
                    return NextResponse.json(
                        { success: false, error: 'Missing PayPal headers' },
                        { status: 400 }
                    );
                }

                result = await paypal.processWebhook(payload, paypalHeaders);
                break;
            }

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid gateway' },
                    { status: 400 }
                );
        }

        if (!result.success) {
            console.error(`Webhook processing failed for ${gateway}:`, result.error);
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }

        // Log successful webhook
        const supabase = createAdminSupabaseClient();
        await supabase.from('webhook_logs').insert({
            gateway,
            event_type: result.event || 'unknown',
            payload: payload as Record<string, unknown>,
            processed_at: new Date().toISOString(),
            status: 'success',
        } as never);

        return NextResponse.json(
            { success: true, event: result.event, gateway },
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

/**
 * GET handler for webhook configuration/info
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const url = new URL(request.url);
    const gateway = url.searchParams.get('gateway');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!gateway) {
        // Return all webhook endpoints
        return NextResponse.json({
            success: true,
            webhooks: {
                razorpay: {
                    endpoint: `${baseUrl}/api/payments/webhook?gateway=razorpay`,
                    events: ['payment.captured', 'payment.failed', 'order.paid'],
                    method: 'POST',
                    headers: ['x-razorpay-signature'],
                },
                stripe: {
                    endpoint: `${baseUrl}/api/payments/webhook?gateway=stripe`,
                    events: ['payment_intent.succeeded', 'payment_intent.payment_failed', 'checkout.session.completed'],
                    method: 'POST',
                    headers: ['stripe-signature'],
                },
                paypal: {
                    endpoint: `${baseUrl}/api/payments/webhook?gateway=paypal`,
                    events: ['CHECKOUT.ORDER.APPROVED', 'CHECKOUT.ORDER.COMPLETED', 'PAYMENT.CAPTURE.COMPLETED'],
                    method: 'POST',
                    headers: ['paypal-transmission-id', 'paypal-cert-id', 'paypal-auth-algo', 'paypal-transmission-time', 'paypal-transmission-sig'],
                },
            },
        });
    }

    // Return specific gateway webhook info
    switch (gateway) {
        case 'razorpay':
            return NextResponse.json({
                success: true,
                gateway: 'razorpay',
                endpoint: `${baseUrl}/api/payments/webhook?gateway=razorpay`,
                events: ['payment.captured', 'payment.failed', 'order.paid'],
                headers: ['x-razorpay-signature'],
            });

        case 'stripe':
            return NextResponse.json({
                success: true,
                gateway: 'stripe',
                endpoint: `${baseUrl}/api/payments/webhook?gateway=stripe`,
                events: ['payment_intent.succeeded', 'payment_intent.payment_failed', 'checkout.session.completed'],
                headers: ['stripe-signature'],
            });

        case 'paypal':
            return NextResponse.json({
                success: true,
                gateway: 'paypal',
                endpoint: `${baseUrl}/api/payments/webhook?gateway=paypal`,
                events: ['CHECKOUT.ORDER.APPROVED', 'CHECKOUT.ORDER.COMPLETED', 'PAYMENT.CAPTURE.COMPLETED'],
                headers: ['paypal-transmission-id', 'paypal-cert-id', 'paypal-auth-algo', 'paypal-transmission-time', 'paypal-transmission-sig'],
            });

        default:
            return NextResponse.json(
                { success: false, error: 'Invalid gateway' },
                { status: 400 }
            );
    }
}

/**
 * Configure webhook endpoints for each gateway
 * This should be called during setup to configure webhooks in each gateway's dashboard
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
    // This endpoint is for admin use only to configure webhooks
    // In production, you'd add authentication here

    try {
        const body = await request.json();
        const { action, gateway } = body;

        if (action === 'register' && gateway) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const webhookUrl = `${baseUrl}/api/payments/webhook?gateway=${gateway}`;

            // Return configuration details for manual setup
            return NextResponse.json({
                success: true,
                message: `Configure webhook in ${gateway} dashboard`,
                webhookUrl,
                gateway,
            });
        }

        return NextResponse.json(
            { success: false, error: 'Invalid action or gateway' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Webhook configuration error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
