// @ts-nocheck
/**
 * Razorpay Payment Gateway Integration
 *
 * Features:
 * - Create orders for payments
 * - Verify payment signatures
 * - Handle Razorpay checkout
 * - Webhook processing
 */

import crypto from 'crypto';
import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { parsePaymentMetadata, type PaymentMetadata, type PaymentType } from '@/lib/payments/access';
import { buildDonationReceiptNumber } from '@/lib/finance/documents';
import { syncFinancialRecordsForPaymentRecord } from '@/lib/finance/service';

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
    amount: number;
    currency?: RazorpayCurrency;
    receipt?: string;
    notes?: Record<string, string>;
    donorEmail?: string;
    donorName?: string;
    donorPhone?: string;
    donorMessage?: string;
    userId?: string | null;
    paymentType?: PaymentType;
    metadata?: Record<string, unknown>;
}

export interface VerifyPaymentParams {
    orderId: string;
    paymentId: string;
    signature: string;
}

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';
const RAZORPAY_REQUEST_TIMEOUT_MS = 15000;

function getAuthHeaders(): Record<string, string> {
    const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    return {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
    };
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = RAZORPAY_REQUEST_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        });
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Razorpay request timed out after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function buildReceiptNumber(baseId: string, occurredAt: string | Date = new Date()): string {
    return buildDonationReceiptNumber(occurredAt, baseId);
}

function notesToMetadata(orderNotes: Record<string, string> | undefined, explicitMetadata?: Record<string, unknown>): PaymentMetadata {
    const merged = {
        type: orderNotes?.paymentType,
        courseId: orderNotes?.courseId,
        courseTitle: orderNotes?.courseTitle,
        planId: orderNotes?.planId,
        durationDays: orderNotes?.durationDays ? Number(orderNotes.durationDays) : undefined,
        accessHref: orderNotes?.accessHref,
        description: orderNotes?.description,
        donorMessage: orderNotes?.donor_message,
        ...(explicitMetadata ?? {}),
    };

    return parsePaymentMetadata(merged);
}

async function syncDonationMirror(input: {
    userId?: string | null;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    orderId?: string | null;
    paymentId?: string | null;
    donorName?: string | null;
    donorEmail?: string | null;
    donorPhone?: string | null;
    donorMessage?: string | null;
    metadata?: Record<string, unknown>;
    gatewayResponse?: Record<string, unknown> | null;
    errorMessage?: string | null;
    errorCode?: string | null;
    completedAt?: string | null;
}) {
    const supabase = createAdminSupabaseClient();
    const donationPayload: Database['public']['Tables']['donations']['Insert'] = {
        gateway: 'razorpay',
        user_id: input.userId ?? null,
        amount: input.amount,
        currency: input.currency,
        status: input.status,
        order_id: input.orderId ?? null,
        payment_id: input.paymentId ?? null,
        transaction_id: input.paymentId ?? input.orderId ?? null,
        donor_name: input.donorName ?? null,
        donor_email: input.donorEmail ?? null,
        donor_phone: input.donorPhone ?? null,
        email: input.donorEmail ?? null,
        message: input.donorMessage ?? null,
        receipt_number: typeof input.metadata?.receipt_number === 'string' ? input.metadata.receipt_number : null,
        metadata: input.metadata ?? {},
        gateway_response: input.gatewayResponse ?? {},
        error_message: input.errorMessage ?? null,
        error_code: input.errorCode ?? null,
        timestamp: input.completedAt ?? new Date().toISOString(),
        completed_at: input.completedAt ?? null,
        updated_at: new Date().toISOString(),
    };

    const { data: existingDonation } = await supabase
        .from('donations')
        .select('id')
        .or([
            input.orderId ? `order_id.eq.${input.orderId}` : null,
            input.paymentId ? `payment_id.eq.${input.paymentId}` : null,
        ].filter(Boolean).join(','))
        .maybeSingle();

    if (existingDonation?.id) {
        const { error } = await supabase
            .from('donations')
            .update(donationPayload)
            .eq('id', existingDonation.id);

        if (error) {
            console.error('Failed to update donation mirror:', error);
        }
        return;
    }

    const { error } = await supabase
        .from('donations')
        .insert(donationPayload);

    if (error) {
        console.error('Failed to insert donation mirror:', error);
    }
}

async function syncPaymentRecord(input: {
    userId?: string | null;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    paymentType: PaymentType;
    paymentMethod?: string | null;
    transactionId?: string | null;
    orderId?: string | null;
    paymentId?: string | null;
    metadata?: Record<string, unknown>;
    timestamp?: string;
    processedAt?: string | null;
}) {
    const supabase = createAdminSupabaseClient();
    const payload: Database['public']['Tables']['payments']['Insert'] = {
        user_id: input.userId ?? null,
        amount: input.amount,
        currency: input.currency,
        status: input.status,
        payment_type: input.paymentType,
        payment_method: input.paymentMethod || 'razorpay',
        transaction_id: input.transactionId ?? null,
        razorpay_order_id: input.orderId ?? null,
        razorpay_payment_id: input.paymentId ?? null,
        metadata: input.metadata ?? {},
        timestamp: input.timestamp ?? new Date().toISOString(),
        processed_at: input.processedAt ?? null,
        updated_at: new Date().toISOString(),
    };

    const lookupFilters = [
        input.orderId ? `razorpay_order_id.eq.${input.orderId}` : null,
        input.paymentId ? `razorpay_payment_id.eq.${input.paymentId}` : null,
        input.transactionId ? `transaction_id.eq.${input.transactionId}` : null,
    ].filter(Boolean);

    const existingPayment = lookupFilters.length > 0
        ? await supabase
            .from('payments')
            .select('id')
            .or(lookupFilters.join(','))
            .maybeSingle()
        : { data: null, error: null };

    if (existingPayment.error) {
        console.error('Failed to look up payment record:', existingPayment.error);
    }

    if (existingPayment.data?.id) {
        const { error } = await supabase
            .from('payments')
            .update(payload)
            .eq('id', existingPayment.data.id);

        if (error) {
            console.error('Failed to update payment record:', error);
        }
        return existingPayment.data.id;
    }

    const { data, error } = await supabase
        .from('payments')
        .insert(payload)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('Failed to insert payment record:', error);
        return null;
    }

    return data?.id ?? null;
}

export function isConfigured(): boolean {
    return !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

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
        const {
            amount,
            currency = 'INR',
            receipt,
            donorEmail,
            donorName,
            donorPhone,
            donorMessage,
            userId,
            paymentType = 'donation',
            metadata = {},
        } = params;

        const paymentMetadata = parsePaymentMetadata({
            type: paymentType,
            ...metadata,
        });

        const orderNotes: Record<string, string> = {
            ...(params.notes ?? {}),
            description: paymentMetadata.description || params.notes?.description || 'SaviEduTech payment',
            paymentType,
            courseId: paymentMetadata.courseId || '',
            courseTitle: paymentMetadata.courseTitle || '',
            planId: paymentMetadata.planId || '',
            durationDays: paymentMetadata.durationDays ? String(paymentMetadata.durationDays) : '',
            accessHref: paymentMetadata.accessHref || '',
            donor_message: donorMessage || paymentMetadata.donorMessage || '',
            donor_email: donorEmail || '',
            donor_name: donorName || '',
            donor_phone: donorPhone || '',
        };

        const response = await fetchWithTimeout(`${RAZORPAY_BASE_URL}/orders`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                amount,
                currency,
                receipt: receipt || `receipt_${Date.now()}`,
                notes: orderNotes,
            }),
        });

        if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}));
            throw new Error((errorPayload as { error?: { description?: string } }).error?.description || 'Failed to create order');
        }

        const order: RazorpayOrder = await response.json();
        const receiptNumber = buildReceiptNumber(order.id, new Date(order.created_at * 1000));
        const storedMetadata = {
            ...metadata,
            type: paymentType,
            courseId: paymentMetadata.courseId,
            courseTitle: paymentMetadata.courseTitle,
            planId: paymentMetadata.planId,
            durationDays: paymentMetadata.durationDays,
            accessHref: paymentMetadata.accessHref,
            description: paymentMetadata.description || orderNotes.description,
            donorMessage: donorMessage || paymentMetadata.donorMessage || null,
            receipt: order.receipt,
            receipt_number: receiptNumber,
            donor_email: donorEmail || null,
            donor_name: donorName || null,
            donor_phone: donorPhone || null,
            notes: order.notes,
        };

        await syncPaymentRecord({
            userId,
            amount: amount / 100,
            currency,
            status: 'pending',
            paymentType,
            paymentMethod: 'razorpay',
            transactionId: order.id,
            orderId: order.id,
            metadata: storedMetadata,
            timestamp: new Date(order.created_at * 1000).toISOString(),
        });

        if (paymentType === 'donation') {
            await syncDonationMirror({
                userId,
                amount: amount / 100,
                currency,
                status: 'pending',
                orderId: order.id,
                donorName,
                donorEmail,
                donorPhone,
                donorMessage,
                metadata: storedMetadata,
            });
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

export function verifyPaymentSignature(params: VerifyPaymentParams): boolean {
    if (!RAZORPAY_KEY_SECRET) {
        console.error('Razorpay key secret not configured');
        return false;
    }

    try {
        const body = `${params.orderId}|${params.paymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        return expectedSignature === params.signature;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

export async function verifyAndCapturePayment(params: VerifyPaymentParams): Promise<{
    success: boolean;
    payment?: RazorpayPayment;
    receiptNumber?: string;
    paymentMetadata?: PaymentMetadata;
    userId?: string | null;
    paymentRecordId?: string | null;
    error?: string;
}> {
    if (!verifyPaymentSignature(params)) {
        return { success: false, error: 'Invalid payment signature' };
    }

    try {
        const paymentResponse = await fetchWithTimeout(`${RAZORPAY_BASE_URL}/payments/${params.paymentId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!paymentResponse.ok) {
            const errorPayload = await paymentResponse.json().catch(() => ({}));
            throw new Error((errorPayload as { error?: { description?: string } }).error?.description || 'Failed to fetch payment');
        }

        const payment: RazorpayPayment = await paymentResponse.json();
        if (payment.order_id !== params.orderId) {
            return { success: false, error: 'Payment order mismatch' };
        }

        if (payment.status !== 'captured') {
            return { success: false, error: `Payment not captured. Status: ${payment.status}` };
        }

        const orderResult = await fetchOrder(params.orderId);
        const order = orderResult.success ? orderResult.order : undefined;
        const orderNotes = order?.notes || {};
        const completedAt = new Date(payment.created_at * 1000).toISOString();
        const supabase = createAdminSupabaseClient();

        const { data: existingPayment, error: existingPaymentError } = await supabase
            .from('payments')
            .select('id, user_id, metadata')
            .eq('razorpay_order_id', params.orderId)
            .maybeSingle();

        if (existingPaymentError) {
            console.error('Failed to look up existing payment:', existingPaymentError);
        }

        const paymentMetadata = notesToMetadata(orderNotes, (existingPayment?.metadata || {}) as Record<string, unknown>);
        const receiptNumber = buildReceiptNumber(params.orderId, completedAt);
        const mergedMetadata = {
            ...(existingPayment?.metadata as Record<string, unknown> | null || {}),
            type: paymentMetadata.type,
            courseId: paymentMetadata.courseId,
            courseTitle: paymentMetadata.courseTitle,
            planId: paymentMetadata.planId,
            durationDays: paymentMetadata.durationDays,
            accessHref: paymentMetadata.accessHref,
            description: paymentMetadata.description,
            donorMessage: orderNotes.donor_message || paymentMetadata.donorMessage || null,
            receipt: order?.receipt || null,
            receipt_number: receiptNumber,
            receipt_generated_at: completedAt,
            donor_email: orderNotes.donor_email || payment.email || null,
            donor_name: orderNotes.donor_name || null,
            donor_phone: orderNotes.donor_phone || payment.contact || null,
            notes: orderNotes,
            payment_details: payment,
        };

        const paymentRecordId = await syncPaymentRecord({
            userId: existingPayment?.user_id ?? null,
            amount: payment.amount / 100,
            currency: payment.currency || 'INR',
            status: 'completed',
            paymentType: paymentMetadata.type,
            paymentMethod: payment.method || 'razorpay',
            transactionId: payment.id,
            orderId: params.orderId,
            paymentId: payment.id,
            metadata: mergedMetadata,
            timestamp: completedAt,
            processedAt: completedAt,
        });

        if (paymentRecordId) {
            await syncFinancialRecordsForPaymentRecord(paymentRecordId);
        }

        if (paymentMetadata.type === 'donation') {
            await syncDonationMirror({
                userId: existingPayment?.user_id ?? null,
                amount: payment.amount / 100,
                currency: payment.currency || 'INR',
                status: 'completed',
                orderId: params.orderId,
                paymentId: payment.id,
                donorName: orderNotes.donor_name || null,
                donorEmail: orderNotes.donor_email || payment.email || null,
                donorPhone: orderNotes.donor_phone || payment.contact || null,
                donorMessage: orderNotes.donor_message || paymentMetadata.donorMessage || null,
                metadata: mergedMetadata,
                gatewayResponse: payment as unknown as Record<string, unknown>,
                completedAt,
            });
        }

        return {
            success: true,
            payment,
            receiptNumber,
            paymentMetadata,
            userId: existingPayment?.user_id ?? null,
            paymentRecordId,
        };
    } catch (error) {
        console.error('Razorpay verify payment error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

export async function fetchPayment(paymentId: string): Promise<{
    success: boolean;
    payment?: RazorpayPayment;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'Razorpay credentials not configured' };
    }

    try {
        const response = await fetchWithTimeout(`${RAZORPAY_BASE_URL}/payments/${paymentId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}));
            throw new Error((errorPayload as { error?: { description?: string } }).error?.description || 'Failed to fetch payment');
        }

        const payment: RazorpayPayment = await response.json();
        return { success: true, payment };
    } catch (error) {
        console.error('Razorpay fetch payment error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

export async function fetchOrder(orderId: string): Promise<{
    success: boolean;
    order?: RazorpayOrder;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'Razorpay credentials not configured' };
    }

    try {
        const response = await fetchWithTimeout(`${RAZORPAY_BASE_URL}/orders/${orderId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}));
            throw new Error((errorPayload as { error?: { description?: string } }).error?.description || 'Failed to fetch order');
        }

        const order: RazorpayOrder = await response.json();
        return { success: true, order };
    } catch (error) {
        console.error('Razorpay fetch order error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

export async function processWebhook(rawBody: string, payload: unknown, signature: string): Promise<{
    success: boolean;
    event?: string;
    paymentMetadata?: PaymentMetadata;
    userId?: string | null;
    paymentId?: string | null;
    orderId?: string | null;
    paymentRecordId?: string | null;
    error?: string;
}> {
    if (!RAZORPAY_WEBHOOK_SECRET) {
        return { success: false, error: 'Webhook secret not configured' };
    }

    try {
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== signature) {
            return { success: false, error: 'Invalid webhook signature' };
        }

        const event = payload as {
            event: string;
            payload: {
                payment?: { entity: RazorpayPayment };
                order?: { entity: RazorpayOrder };
            };
        };

        if (event.event === 'payment.captured' || event.event === 'order.paid') {
            const payment = event.payload.payment?.entity;
            const order = event.payload.order?.entity;
            const orderId = payment?.order_id || order?.id || null;

            if (payment && orderId) {
                const supabase = createAdminSupabaseClient();
                const { data: existingPayment } = await supabase
                    .from('payments')
                    .select('id, user_id, metadata')
                    .eq('razorpay_order_id', orderId)
                    .maybeSingle();

                const paymentMetadata = notesToMetadata(order?.notes || payment.notes, (existingPayment?.metadata || {}) as Record<string, unknown>);
                const completedAt = new Date(payment.created_at * 1000).toISOString();
                const receiptNumber = buildReceiptNumber(orderId, completedAt);
                const mergedMetadata = {
                    ...(existingPayment?.metadata as Record<string, unknown> | null || {}),
                    type: paymentMetadata.type,
                    courseId: paymentMetadata.courseId,
                    courseTitle: paymentMetadata.courseTitle,
                    planId: paymentMetadata.planId,
                    durationDays: paymentMetadata.durationDays,
                    accessHref: paymentMetadata.accessHref,
                    description: paymentMetadata.description,
                    donorMessage: order?.notes?.donor_message || paymentMetadata.donorMessage || null,
                    receipt: order?.receipt || null,
                    receipt_number: receiptNumber,
                    donor_email: order?.notes?.donor_email || payment.email || null,
                    donor_name: order?.notes?.donor_name || null,
                    donor_phone: order?.notes?.donor_phone || payment.contact || null,
                    notes: order?.notes || payment.notes || {},
                    payment_details: payment,
                };

                const paymentRecordId = await syncPaymentRecord({
                    userId: existingPayment?.user_id ?? null,
                    amount: payment.amount / 100,
                    currency: payment.currency || 'INR',
                    status: event.event === 'payment.captured' || payment.status === 'captured' ? 'completed' : 'pending',
                    paymentType: paymentMetadata.type,
                    paymentMethod: payment.method || 'razorpay',
                    transactionId: payment.id,
                    orderId,
                    paymentId: payment.id,
                    metadata: mergedMetadata,
                    timestamp: completedAt,
                    processedAt: completedAt,
                });

                if (paymentRecordId) {
                    await syncFinancialRecordsForPaymentRecord(paymentRecordId);
                }

                if (paymentMetadata.type === 'donation') {
                    await syncDonationMirror({
                        userId: existingPayment?.user_id ?? null,
                        amount: payment.amount / 100,
                        currency: payment.currency || 'INR',
                        status: 'completed',
                        orderId,
                        paymentId: payment.id,
                        donorName: order?.notes?.donor_name || null,
                        donorEmail: order?.notes?.donor_email || payment.email || null,
                        donorPhone: order?.notes?.donor_phone || payment.contact || null,
                        donorMessage: order?.notes?.donor_message || paymentMetadata.donorMessage || null,
                        metadata: mergedMetadata,
                        gatewayResponse: payment as unknown as Record<string, unknown>,
                        completedAt,
                    });
                }

                return {
                    success: true,
                    event: event.event,
                    paymentMetadata,
                    userId: existingPayment?.user_id ?? null,
                    paymentId: payment.id,
                    orderId,
                    paymentRecordId,
                };
            }
        }

        if (event.event === 'payment.failed') {
            const payment = event.payload.payment?.entity;
            if (payment) {
                const supabase = createAdminSupabaseClient();
                const { data: existingPayment } = await supabase
                    .from('payments')
                    .select('user_id, metadata')
                    .eq('razorpay_order_id', payment.order_id)
                    .maybeSingle();

                const paymentMetadata = notesToMetadata(payment.notes, (existingPayment?.metadata || {}) as Record<string, unknown>);
                const mergedMetadata = {
                    ...(existingPayment?.metadata as Record<string, unknown> | null || {}),
                    type: paymentMetadata.type,
                    donorMessage: payment.notes?.donor_message || paymentMetadata.donorMessage || null,
                    payment_details: payment,
                    notes: payment.notes || {},
                };

                await syncPaymentRecord({
                    userId: existingPayment?.user_id ?? null,
                    amount: payment.amount / 100,
                    currency: payment.currency || 'INR',
                    status: 'failed',
                    paymentType: paymentMetadata.type,
                    paymentMethod: payment.method || 'razorpay',
                    transactionId: payment.id,
                    orderId: payment.order_id,
                    paymentId: payment.id,
                    metadata: mergedMetadata,
                    timestamp: new Date(payment.created_at * 1000).toISOString(),
                });

                if (paymentMetadata.type === 'donation') {
                    await syncDonationMirror({
                        userId: existingPayment?.user_id ?? null,
                        amount: payment.amount / 100,
                        currency: payment.currency || 'INR',
                        status: 'failed',
                        orderId: payment.order_id,
                        paymentId: payment.id,
                        donorEmail: payment.email || null,
                        donorPhone: payment.contact || null,
                        donorMessage: payment.notes?.donor_message || paymentMetadata.donorMessage || null,
                        metadata: mergedMetadata,
                        gatewayResponse: payment as unknown as Record<string, unknown>,
                        errorMessage: payment.error_description || 'Payment failed',
                        errorCode: payment.error_code,
                    });
                }
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

        const response = await fetchWithTimeout(`${RAZORPAY_BASE_URL}/payments/${paymentId}/refund`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}));
            throw new Error((errorPayload as { error?: { description?: string } }).error?.description || 'Failed to process refund');
        }

        const refund = await response.json();
        const supabase = createAdminSupabaseClient();
        const { data: existingPayment } = await supabase
            .from('payments')
            .select('user_id, amount, currency, payment_type, razorpay_order_id, metadata')
            .eq('razorpay_payment_id', paymentId)
            .maybeSingle();

        if (existingPayment) {
            const refundedRecordId = await syncPaymentRecord({
                userId: existingPayment.user_id,
                amount: existingPayment.amount,
                currency: existingPayment.currency,
                status: 'refunded',
                paymentType: existingPayment.payment_type,
                paymentMethod: 'razorpay',
                transactionId: paymentId,
                orderId: existingPayment.razorpay_order_id,
                paymentId,
                metadata: (existingPayment.metadata || {}) as Record<string, unknown>,
                timestamp: new Date().toISOString(),
                processedAt: new Date().toISOString(),
            });

            if (refundedRecordId) {
                await syncFinancialRecordsForPaymentRecord(refundedRecordId);
            }

            if (existingPayment.payment_type === 'donation') {
                await syncDonationMirror({
                    userId: existingPayment.user_id,
                    amount: existingPayment.amount,
                    currency: existingPayment.currency,
                    status: 'refunded',
                    orderId: existingPayment.razorpay_order_id,
                    paymentId,
                    metadata: (existingPayment.metadata || {}) as Record<string, unknown>,
                });
            }
        }

        return { success: true, refund };
    } catch (error) {
        console.error('Razorpay refund error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

export function getConfig(): {
    keyId: string;
    isConfigured: boolean;
} {
    return {
        keyId: RAZORPAY_KEY_ID,
        isConfigured: isConfigured(),
    };
}
