/**
 * Payment Verification API
 * 
 * POST /api/payments/verify
 * Verifies payment completion for Razorpay, Stripe, and PayPal
 */

import { NextRequest, NextResponse } from 'next/server';
import * as razorpay from '@/lib/payments/razorpay';
import * as stripe from '@/lib/payments/stripe';
import * as paypal from '@/lib/payments/paypal';
import { z } from 'zod';

// Validation schemas
const razorpayVerifySchema = z.object({
    gateway: z.literal('razorpay'),
    orderId: z.string(),
    paymentId: z.string(),
    signature: z.string(),
});

const stripeVerifySchema = z.object({
    gateway: z.literal('stripe'),
    paymentIntentId: z.string(),
    sessionId: z.string().optional(),
});

const paypalVerifySchema = z.object({
    gateway: z.literal('paypal'),
    orderId: z.string(),
});

const verifySchema = z.union([
    razorpayVerifySchema,
    stripeVerifySchema,
    paypalVerifySchema,
]);

export type VerifyPaymentRequest = z.infer<typeof verifySchema>;

export interface VerifyPaymentResponse {
    success: boolean;
    verified?: boolean;
    payment?: unknown;
    message?: string;
    error?: string;
}

/**
 * POST handler for verifying payments
 */
export async function POST(request: NextRequest): Promise<NextResponse<VerifyPaymentResponse>> {
    try {
        // Parse and validate request body
        const body = await request.json();
        const validationResult = verifySchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Validation error: ${validationResult.error.message}`
                },
                { status: 400 }
            );
        }

        const data = validationResult.data;
        let result: VerifyPaymentResponse;

        switch (data.gateway) {
            case 'razorpay': {
                const { orderId, paymentId, signature } = data;

                // Verify payment signature
                const isValidSignature = razorpay.verifyPaymentSignature({
                    orderId,
                    paymentId,
                    signature,
                });

                if (!isValidSignature) {
                    return NextResponse.json(
                        { success: false, verified: false, error: 'Invalid payment signature' },
                        { status: 400 }
                    );
                }

                // Capture and verify the payment
                const verifyResult = await razorpay.verifyAndCapturePayment({
                    orderId,
                    paymentId,
                    signature,
                });

                result = {
                    success: verifyResult.success,
                    verified: verifyResult.success,
                    payment: verifyResult.payment,
                    message: verifyResult.success ? 'Payment verified successfully' : verifyResult.error,
                    error: verifyResult.error,
                };
                break;
            }

            case 'stripe': {
                const { paymentIntentId, sessionId } = data;

                // If session ID is provided, verify via session
                if (sessionId) {
                    const sessionResult = await stripe.retrieveCheckoutSession(sessionId);

                    if (!sessionResult.success || !sessionResult.session) {
                        return NextResponse.json(
                            { success: false, verified: false, error: sessionResult.error || 'Failed to retrieve session' },
                            { status: 400 }
                        );
                    }

                    const session = sessionResult.session;

                    if (session.payment_status === 'paid') {
                        // Confirm payment to update database
                        if (session.payment_intent) {
                            await stripe.confirmPayment(session.payment_intent);
                        }

                        result = {
                            success: true,
                            verified: true,
                            payment: session,
                            message: 'Payment verified successfully',
                        };
                    } else {
                        result = {
                            success: false,
                            verified: false,
                            payment: session,
                            message: `Payment status: ${session.payment_status}`,
                            error: 'Payment not completed',
                        };
                    }
                } else {
                    // Verify via payment intent
                    const confirmResult = await stripe.confirmPayment(paymentIntentId);

                    result = {
                        success: confirmResult.success,
                        verified: confirmResult.success,
                        payment: confirmResult.paymentIntent,
                        message: confirmResult.success ? 'Payment verified successfully' : confirmResult.error,
                        error: confirmResult.error,
                    };
                }
                break;
            }

            case 'paypal': {
                const { orderId } = data;

                // Capture the PayPal order
                const captureResult = await paypal.captureOrder({ orderId });

                result = {
                    success: captureResult.success,
                    verified: captureResult.success,
                    payment: captureResult.order,
                    message: captureResult.success ? 'Payment captured successfully' : captureResult.error,
                    error: captureResult.error,
                };
                break;
            }

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid payment gateway' },
                    { status: 400 }
                );
        }

        return NextResponse.json(result, { status: result.success ? 200 : 400 });

    } catch (error) {
        console.error('Payment verification API error:', error);
        return NextResponse.json(
            {
                success: false,
                verified: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            },
            { status: 500 }
        );
    }
}

/**
 * GET handler for checking payment status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    const searchParams = request.nextUrl.searchParams;
    const gateway = searchParams.get('gateway');
    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('paymentId');

    if (!gateway || !orderId) {
        return NextResponse.json(
            { success: false, error: 'Missing required parameters: gateway, orderId' },
            { status: 400 }
        );
    }

    try {
        let result: { success: boolean; data?: unknown; error?: string };

        switch (gateway) {
            case 'razorpay': {
                const orderResult = await razorpay.fetchOrder(orderId);
                result = {
                    success: orderResult.success,
                    data: orderResult.order,
                    error: orderResult.error,
                };
                break;
            }

            case 'stripe': {
                if (paymentId) {
                    const paymentResult = await stripe.retrievePaymentIntent(paymentId);
                    result = {
                        success: paymentResult.success,
                        data: paymentResult.paymentIntent,
                        error: paymentResult.error,
                    };
                } else {
                    const sessionResult = await stripe.retrieveCheckoutSession(orderId);
                    result = {
                        success: sessionResult.success,
                        data: sessionResult.session,
                        error: sessionResult.error,
                    };
                }
                break;
            }

            case 'paypal': {
                const orderResult = await paypal.getOrder(orderId);
                result = {
                    success: orderResult.success,
                    data: orderResult.order,
                    error: orderResult.error,
                };
                break;
            }

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid payment gateway' },
                    { status: 400 }
                );
        }

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            gateway,
            orderId,
            data: result.data,
        });

    } catch (error) {
        console.error('Payment status check error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
