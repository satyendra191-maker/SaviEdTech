/**
 * Payment Order Creation API
 *
 * POST /api/payments/create-order
 * Creates a payment order for Razorpay
 * Supports donations, course purchases, and subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import * as razorpay from '@/lib/payments/razorpay';
import type { Database } from '@/types/supabase';

const createOrderSchema = z.object({
    gateway: z.literal('razorpay'),
    amount: z.number().positive(),
    currency: z.literal('INR').optional(),
    donorEmail: z.string().email().optional(),
    donorName: z.string().optional(),
    donorPhone: z.string().optional(),
    donorMessage: z.string().max(500).optional(),
    description: z.string().optional(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
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

export type CreateOrderRequest = z.infer<typeof createOrderSchema>;

export interface CreateOrderResponse {
    success: boolean;
    orderId?: string;
    order?: unknown;
    clientSecret?: string;
    checkoutUrl?: string;
    error?: string;
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

export async function POST(request: NextRequest): Promise<NextResponse<CreateOrderResponse>> {
    try {
        const body = await request.json();
        const validationResult = createOrderSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Validation error: ${validationResult.error.message}`,
                },
                { status: 400 }
            );
        }

        const {
            amount,
            currency = 'INR',
            donorEmail,
            donorName,
            donorPhone,
            donorMessage,
            description,
            metadata,
        } = validationResult.data;

        if (!razorpay.isConfigured()) {
            return NextResponse.json(
                { success: false, error: 'Razorpay is not configured' },
                { status: 503 }
            );
        }

        const paymentType = metadata?.type || 'donation';
        const userSupabase = createSupabaseClient(request);
        const {
            data: { user },
        } = await userSupabase.auth.getUser();

        if (paymentType === 'course_purchase' && !metadata?.courseId) {
            return NextResponse.json(
                { success: false, error: 'courseId is required for course purchases.' },
                { status: 400 }
            );
        }

        if (paymentType === 'subscription' && !metadata?.planId) {
            return NextResponse.json(
                { success: false, error: 'planId is required for premium subscriptions.' },
                { status: 400 }
            );
        }

        if ((paymentType === 'course_purchase' || paymentType === 'subscription') && !user) {
            return NextResponse.json(
                { success: false, error: 'Please log in to purchase a course or subscription.' },
                { status: 401 }
            );
        }

        if (paymentType === 'donation') {
            const normalizedPhone = (donorPhone || '').replace(/\D/g, '');
            if (!donorName?.trim() || !donorEmail?.trim() || normalizedPhone.length < 10) {
                return NextResponse.json(
                    { success: false, error: 'Donor name, email, and phone number are required for donations.' },
                    { status: 400 }
                );
            }
        }

        let paymentDescription = description || 'Payment to SaviEduTech';
        if (paymentType === 'course_purchase' && metadata?.courseTitle) {
            paymentDescription = `Course: ${metadata.courseTitle}`;
        } else if (paymentType === 'subscription') {
            paymentDescription = description || 'Premium Subscription';
        }

        const razorpayResult = await razorpay.createOrder({
            amount: Math.round(amount * 100),
            currency,
            donorEmail,
            donorName,
            donorPhone,
            donorMessage,
            userId: user?.id ?? null,
            paymentType,
            metadata: {
                type: paymentType,
                courseId: metadata?.courseId,
                courseTitle: metadata?.courseTitle,
                planId: metadata?.planId,
                durationDays: metadata?.durationDays,
                accessHref: metadata?.accessHref,
                donorMessage: metadata?.donorMessage ?? donorMessage,
                description: paymentDescription,
            },
        });

        if (!razorpayResult.success) {
            return NextResponse.json(
                { success: false, error: razorpayResult.error || 'Failed to create order' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                orderId: razorpayResult.orderId,
                order: razorpayResult.order,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Create order API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        );
    }
}

export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        success: true,
        gateways: {
            razorpay: {
                configured: razorpay.isConfigured(),
                config: razorpay.getConfig(),
            },
        },
    });
}
