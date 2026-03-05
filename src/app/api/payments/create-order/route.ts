/**
 * Payment Order Creation API
 * 
 * POST /api/payments/create-order
 * Creates a payment order for Razorpay
 */

import { NextRequest, NextResponse } from 'next/server';
import * as razorpay from '@/lib/payments/razorpay';
import { z } from 'zod';

// Validation schema
const createOrderSchema = z.object({
    gateway: z.literal('razorpay'),
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
            amount, 
            currency, 
            donorEmail, 
            donorName, 
            donorPhone,
            description,
            metadata,
        } = validationResult.data;

        const selectedCurrency = currency || 'INR';
        const amountInSmallestUnit = Math.round(amount * 100);

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

        const result: CreateOrderResponse = {
            success: razorpayResult.success,
            orderId: razorpayResult.orderId,
            order: razorpayResult.order,
            error: razorpayResult.error,
        };

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
    };

    return NextResponse.json({
        success: true,
        gateways: config,
    });
}
