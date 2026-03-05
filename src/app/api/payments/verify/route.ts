/**
 * Payment Verification API
 * 
 * POST /api/payments/verify
 * Verifies payment completion for Razorpay
 */

import { NextRequest, NextResponse } from 'next/server';
import * as razorpay from '@/lib/payments/razorpay';
import { z } from 'zod';

// Validation schema
const razorpayVerifySchema = z.object({
    gateway: z.literal('razorpay'),
    orderId: z.string(),
    paymentId: z.string(),
    signature: z.string(),
});

export type VerifyPaymentRequest = z.infer<typeof razorpayVerifySchema>;

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
        const body = await request.json();
        const validationResult = razorpayVerifySchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Validation error: ${validationResult.error.message}`
                },
                { status: 400 }
            );
        }

        const { orderId, paymentId, signature } = validationResult.data;

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

        const verifyResult = await razorpay.verifyAndCapturePayment({
            orderId,
            paymentId,
            signature,
        });

        const result: VerifyPaymentResponse = {
            success: verifyResult.success,
            verified: verifyResult.success,
            payment: verifyResult.payment,
            message: verifyResult.success ? 'Payment verified successfully' : verifyResult.error,
            error: verifyResult.error,
        };

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
    const orderId = searchParams.get('orderId');

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
