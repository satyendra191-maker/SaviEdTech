/**
 * Razorpay Payment Gateway Integration
 * 
 * Features:
 * - Create orders for payments
 * - Verify payment signatures
 * - Handle Razorpay checkout
 * - Webhook processing
 */

import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

// Type definitions
export type RazorpayCurrency = 'INR';

export interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    offer_id: string | null;
    status: 'created' | 'attempted' | 'paid';
    attempts: number;
    notes: Record<string, string>;
    created_at: number;
}

export interface RazorpayPayment {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: 'captured' | 'authorized' | 'failed' | 'refunded';
    order_id: string;
    invoice_id: string | null;
    international: boolean;
    method: 'card' | 'netbanking' | 'wallet' | 'emi' | 'upi';
    amount_refunded: number;
    refund_status: string | null;
    captured: boolean;
    description: string | null;
    card_id: string | null;
    bank: string | null;
    wallet: string | null;
    vpa: string | null;
    email: string;
    contact: string;
    notes: Record<string, string>;
    fee: number;
    tax: number;
    error_code: string | null;
    error_description: string | null;
    error_source: string | null;
    error_step: string | null;
    error_reason: string | null;
    acquirer_data: Record<string, unknown>;
    created_at: number;
}

export interface CreateOrderParams {
    amount: number; // in smallest currency unit (paise for INR)
    currency?: RazorpayCurrency;
    receipt?: string;
    notes?: Record<string, string>;
    donorEmail?: string;
    donorName?: string;
    donorPhone?: string;
}

export interface VerifyPaymentParams {
    orderId: string;
    paymentId: string;
    signature: string;
}

// Configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';

/**
 * Get authentication headers for Razorpay API
 */
function getAuthHeaders(): Record<string, string> {
    const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    return {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
    };
}

/**
 * Check if Razorpay credentials are configured
 */
export function isConfigured(): boolean {
    return !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

/**
 * Create a new Razorpay order
 */
export async function createOrder(params: CreateOrderParams): Promise<{
    success: boolean;
    order?: RazorpayOrder;
    orderId?: string;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'Razorpay credentials not configured' };
    }

    try {
        const { amount, currency = 'INR', receipt, notes = {} } = params;

        const response = await fetch(`${RAZORPAY_BASE_URL}/orders`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                amount,
                currency,
                receipt: receipt || `receipt_${Date.now()}`,
                notes: {
                    ...notes,
                    donor_email: params.donorEmail || '',
                    donor_name: params.donorName || '',
                    donor_phone: params.donorPhone || '',
                },
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.description || 'Failed to create order');
        }

        const order: RazorpayOrder = await response.json();

        // Store order in database
        const supabase = createAdminSupabaseClient();
        const { error: dbError } = await supabase.from('donations').insert({
            gateway: 'razorpay',
            amount: amount / 100, // Convert paise to rupees
            currency,
            status: 'pending',
            order_id: order.id,
            donor_email: params.donorEmail || null,
            donor_name: params.donorName || null,
            donor_phone: params.donorPhone || null,
            metadata: {
                receipt: order.receipt,
                notes: order.notes,
            },
        } as never);

        if (dbError) {
            console.error('Failed to store order in database:', dbError);
        }

        return {
            success: true,
            order,
            orderId: order.id,
        };
    } catch (error) {
        console.error('Razorpay create order error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Verify Razorpay payment signature
 */
export function verifyPaymentSignature(params: VerifyPaymentParams): boolean {
    if (!RAZORPAY_KEY_SECRET) {
        console.error('Razorpay key secret not configured');
        return false;
    }

    try {
        const { orderId, paymentId, signature } = params;
        const crypto = require('crypto');

        const body = `${orderId}|${paymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        return expectedSignature === signature;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

/**
 * Verify and capture payment
 */
export async function verifyAndCapturePayment(params: VerifyPaymentParams): Promise<{
    success: boolean;
    payment?: RazorpayPayment;
    error?: string;
}> {
    if (!verifyPaymentSignature(params)) {
        return { success: false, error: 'Invalid payment signature' };
    }

    try {
        // Fetch payment details
        const response = await fetch(`${RAZORPAY_BASE_URL}/payments/${params.paymentId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.description || 'Failed to fetch payment');
        }

        const payment: RazorpayPayment = await response.json();

        // Verify order matches
        if (payment.order_id !== params.orderId) {
            return { success: false, error: 'Payment order mismatch' };
        }

        // Check payment status
        if (payment.status !== 'captured') {
            return {
                success: false,
                error: `Payment not captured. Status: ${payment.status}`
            };
        }

        // Update database
        const supabase = createAdminSupabaseClient();
        const { error: dbError } = await supabase
            .from('donations')
            .update({
                status: 'completed',
                payment_id: payment.id,
                gateway_response: payment as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                completed_at: new Date().toISOString(),
            } as never)
            .eq('order_id', params.orderId);

        if (dbError) {
            console.error('Failed to update payment in database:', dbError);
        }

        return {
            success: true,
            payment,
        };
    } catch (error) {
        console.error('Razorpay verify payment error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Fetch payment details by ID
 */
export async function fetchPayment(paymentId: string): Promise<{
    success: boolean;
    payment?: RazorpayPayment;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'Razorpay credentials not configured' };
    }

    try {
        const response = await fetch(`${RAZORPAY_BASE_URL}/payments/${paymentId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.description || 'Failed to fetch payment');
        }

        const payment: RazorpayPayment = await response.json();

        return {
            success: true,
            payment,
        };
    } catch (error) {
        console.error('Razorpay fetch payment error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Fetch order details by ID
 */
export async function fetchOrder(orderId: string): Promise<{
    success: boolean;
    order?: RazorpayOrder;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'Razorpay credentials not configured' };
    }

    try {
        const response = await fetch(`${RAZORPAY_BASE_URL}/orders/${orderId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.description || 'Failed to fetch order');
        }

        const order: RazorpayOrder = await response.json();

        return {
            success: true,
            order,
        };
    } catch (error) {
        console.error('Razorpay fetch order error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Process Razorpay webhook
 */
export async function processWebhook(payload: unknown, signature: string): Promise<{
    success: boolean;
    event?: string;
    error?: string;
}> {
    if (!RAZORPAY_WEBHOOK_SECRET) {
        return { success: false, error: 'Webhook secret not configured' };
    }

    try {
        // Verify webhook signature
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (expectedSignature !== signature) {
            return { success: false, error: 'Invalid webhook signature' };
        }

        const event = payload as { event: string; payload: { payment?: { entity: RazorpayPayment }; order?: { entity: RazorpayOrder } } };
        const supabase = createAdminSupabaseClient();

        switch (event.event) {
            case 'payment.captured': {
                const payment = event.payload.payment?.entity;
                if (payment) {
                    await supabase
                        .from('donations')
                        .update({
                            status: 'completed',
                            payment_id: payment.id,
                            gateway_response: payment as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                            completed_at: new Date(payment.created_at * 1000).toISOString(),
                        } as never)
                        .eq('order_id', payment.order_id);
                }
                break;
            }
            case 'payment.failed': {
                const payment = event.payload.payment?.entity;
                if (payment) {
                    await supabase
                        .from('donations')
                        .update({
                            status: 'failed',
                            payment_id: payment.id,
                            error_message: payment.error_description || 'Payment failed',
                            error_code: payment.error_code,
                            gateway_response: payment as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                        } as never)
                        .eq('order_id', payment.order_id);
                }
                break;
            }
            case 'order.paid': {
                // Order paid event - payment already captured
                break;
            }
        }

        return {
            success: true,
            event: event.event,
        };
    } catch (error) {
        console.error('Razorpay webhook processing error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Refund a payment
 */
export async function refundPayment(paymentId: string, amount?: number): Promise<{
    success: boolean;
    refund?: unknown;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'Razorpay credentials not configured' };
    }

    try {
        const body: { amount?: number } = {};
        if (amount) {
            body.amount = amount;
        }

        const response = await fetch(`${RAZORPAY_BASE_URL}/payments/${paymentId}/refund`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.description || 'Failed to process refund');
        }

        const refund = await response.json();

        // Update database
        const supabase = createAdminSupabaseClient();
        await supabase
            .from('donations')
            .update({ status: 'refunded' } as never)
            .eq('payment_id', paymentId);

        return {
            success: true,
            refund,
        };
    } catch (error) {
        console.error('Razorpay refund error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Get Razorpay configuration for frontend
 */
export function getConfig(): {
    keyId: string;
    isConfigured: boolean;
} {
    return {
        keyId: RAZORPAY_KEY_ID,
        isConfigured: isConfigured(),
    };
}
