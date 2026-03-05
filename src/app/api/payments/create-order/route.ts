/**
 * Payment Order Creation API
 * 
 * POST /api/payments/create-order
 * Creates a payment order for Razorpay, Stripe, or PayPal
 */

import { NextRequest, NextResponse } from 'next/server';
import * as razorpay from '@/lib/payments/razorpay';
import * as stripe from '@/lib/payments/stripe';
import * as paypal from '@/lib/payments/paypal';
import { z } from 'zod';

// Validation schema
const createOrderSchema = z.object({
    gateway: z.enum(['razorpay', 'stripe', 'paypal']),
    amount: z.number().positive(),
    currency: z.string().optional(),
    donorEmail: z.string().email().optional(),
    donorName: z.string().optional(),
    donorPhone: z.string().optional(),
    description: z.string().optional(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
    metadata: z.record(z.string()).optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderSchema>;

export interface CreateOrderResponse {
    success: boolean;
    orderId?: string;
    order?: unknown;
    clientSecret?: string;
    checkoutUrl?: string;
    error?: string;
}

/**
 * POST handler for creating payment orders
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreateOrderResponse>> {
    try {
        // Parse and validate request body
        const body = await request.json();
        const validationResult = createOrderSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: `Validation error: ${validationResult.error.message}` 
                },
                { status: 400 }
            );
        }

        const { 
            gateway, 
            amount, 
            currency, 
            donorEmail, 
            donorName, 
            donorPhone,
            description,
            successUrl,
            cancelUrl,
            metadata,
        } = validationResult.data;

        // Determine currency based on gateway and location
        const defaultCurrency = gateway === 'razorpay' ? 'INR' : 
                               gateway === 'paypal' ? 'USD' : 'usd';
        const selectedCurrency = currency || defaultCurrency;

        // Convert amount to smallest currency unit
        const amountInSmallestUnit = Math.round(amount * 100);

        let result: CreateOrderResponse;

        switch (gateway) {
            case 'razorpay': {
                // Check if Razorpay is configured
                if (!razorpay.isConfigured()) {
                    return NextResponse.json(
                        { success: false, error: 'Razorpay is not configured' },
                        { status: 503 }
                    );
                }

                const razorpayResult = await razorpay.createOrder({
                    amount: amountInSmallestUnit,
                    currency: selectedCurrency as razorpay.RazorpayCurrency,
                    donorEmail,
                    donorName,
                    donorPhone,
                    notes: {
                        description: description || 'Donation',
                        ...metadata,
                    },
                });

                result = {
                    success: razorpayResult.success,
                    orderId: razorpayResult.orderId,
                    order: razorpayResult.order,
                    error: razorpayResult.error,
                };
                break;
            }

            case 'stripe': {
                // Check if Stripe is configured
                if (!stripe.isConfigured()) {
                    return NextResponse.json(
                        { success: false, error: 'Stripe is not configured' },
                        { status: 503 }
                    );
                }

                // For Stripe, we can create either a payment intent or checkout session
                // Using checkout session for better UX
                const stripeResult = await stripe.createCheckoutSession({
                    amount: amountInSmallestUnit,
                    currency: selectedCurrency.toLowerCase() as stripe.StripeCurrency,
                    successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/donate/cancel`,
                    donorEmail,
                    donorName,
                    donorPhone,
                    metadata: {
                        description: description || 'Donation',
                        ...metadata,
                    },
                });

                result = {
                    success: stripeResult.success,
                    orderId: stripeResult.sessionId,
                    checkoutUrl: stripeResult.checkoutUrl,
                    order: stripeResult.session,
                    error: stripeResult.error,
                };
                break;
            }

            case 'paypal': {
                // Check if PayPal is configured
                if (!paypal.isConfigured()) {
                    return NextResponse.json(
                        { success: false, error: 'PayPal is not configured' },
                        { status: 503 }
                    );
                }

                const paypalResult = await paypal.createOrder({
                    amount,
                    currency: selectedCurrency.toUpperCase() as paypal.PayPalCurrency,
                    description: description || 'Donation to SaviEduTech',
                    donorEmail,
                    donorName,
                    donorPhone,
                    returnUrl: successUrl,
                    cancelUrl: cancelUrl,
                });

                result = {
                    success: paypalResult.success,
                    orderId: paypalResult.orderId,
                    checkoutUrl: paypalResult.approvalUrl,
                    order: paypalResult.order,
                    error: paypalResult.error,
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
                { success: false, error: result.error || 'Failed to create order' },
                { status: 500 }
            );
        }

        return NextResponse.json(result, { status: 200 });

    } catch (error) {
        console.error('Create order API error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Internal server error' 
            },
            { status: 500 }
        );
    }
}

/**
 * GET handler for checking gateway configuration
 */
export async function GET(): Promise<NextResponse> {
    const config = {
        razorpay: {
            configured: razorpay.isConfigured(),
            config: razorpay.getConfig(),
        },
        stripe: {
            configured: stripe.isConfigured(),
            config: stripe.getConfig(),
        },
        paypal: {
            configured: paypal.isConfigured(),
            config: paypal.getConfig(),
        },
    };

    return NextResponse.json({
        success: true,
        gateways: config,
    });
}
