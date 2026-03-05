/**
 * Stripe Payment Gateway Integration
 * 
 * Features:
 * - Create payment intents
 * - Handle Stripe checkout sessions
 * - Verify payments
 * - Webhook processing
 * - Support for international payments
 */

import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

// Type definitions
export type StripeCurrency = 'usd' | 'eur' | 'gbp' | 'aud' | 'cad' | 'inr';

export interface StripePaymentIntent {
    id: string;
    object: 'payment_intent';
    amount: number;
    currency: string;
    status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
    client_secret: string;
    customer: string | null;
    description: string | null;
    metadata: Record<string, string>;
    receipt_email: string | null;
    charges: {
        object: 'list';
        data: StripeCharge[];
    };
    created: number;
}

export interface StripeCharge {
    id: string;
    object: 'charge';
    amount: number;
    currency: string;
    status: 'succeeded' | 'pending' | 'failed';
    paid: boolean;
    receipt_url: string | null;
    payment_method: string | null;
    failure_message: string | null;
    failure_code: string | null;
}

export interface StripeCheckoutSession {
    id: string;
    object: 'checkout.session';
    amount_total: number;
    currency: string;
    status: 'open' | 'complete' | 'expired';
    payment_status: 'paid' | 'unpaid' | 'no_payment_required';
    client_reference_id: string | null;
    customer_email: string | null;
    metadata: Record<string, string>;
    payment_intent: string | null;
    url: string | null;
    created: number;
}

export interface CreatePaymentIntentParams {
    amount: number; // in smallest currency unit (cents)
    currency?: StripeCurrency;
    description?: string;
    metadata?: Record<string, string>;
    receiptEmail?: string;
    donorName?: string;
    donorPhone?: string;
}

export interface CreateCheckoutSessionParams {
    amount: number;
    currency?: StripeCurrency;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    donorEmail?: string;
    donorName?: string;
    donorPhone?: string;
}

// Configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

const STRIPE_BASE_URL = 'https://api.stripe.com/v1';

/**
 * Get authentication headers for Stripe API
 */
function getAuthHeaders(): Record<string, string> {
    return {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
    };
}

/**
 * Convert object to URL encoded string
 */
function toUrlEncoded(obj: Record<string, string | number | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            params.append(key, String(value));
        }
    }
    return params.toString();
}

/**
 * Check if Stripe credentials are configured
 */
export function isConfigured(): boolean {
    return !!(STRIPE_SECRET_KEY && STRIPE_PUBLISHABLE_KEY);
}

/**
 * Create a new Stripe Payment Intent
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<{
    success: boolean;
    paymentIntent?: StripePaymentIntent;
    clientSecret?: string;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'Stripe credentials not configured' };
    }

    try {
        const { amount, currency = 'usd', description, metadata = {}, receiptEmail, donorName, donorPhone } = params;

        const body = toUrlEncoded({
            amount,
            currency,
            description: description || 'Donation',
            'metadata[donor_name]': donorName || '',
            'metadata[donor_phone]': donorPhone || '',
            ...Object.entries(metadata).reduce((acc, [key, value]) => {
                acc[`metadata[${key}]`] = value;
                return acc;
            }, {} as Record<string, string>),
            receipt_email: receiptEmail || '',
            automatic_payment_methods: JSON.stringify({ enabled: true }),
        });

        const response = await fetch(`${STRIPE_BASE_URL}/payment_intents`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to create payment intent');
        }

        const paymentIntent: StripePaymentIntent = await response.json();

        // Store payment intent in database
        const supabase = createAdminSupabaseClient();
        const { error: dbError } = await supabase.from('donations').insert({
            gateway: 'stripe',
            amount: amount / getCurrencyMultiplier(currency),
            currency: currency.toUpperCase(),
            status: 'pending',
            order_id: paymentIntent.id,
            donor_email: receiptEmail || null,
            donor_name: donorName || null,
            donor_phone: donorPhone || null,
            metadata: {
                description,
                client_secret: paymentIntent.client_secret,
            },
        } as never);

        if (dbError) {
            console.error('Failed to store payment intent in database:', dbError);
        }

        return {
            success: true,
            paymentIntent,
            clientSecret: paymentIntent.client_secret,
        };
    } catch (error) {
        console.error('Stripe create payment intent error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Create a Stripe Checkout Session
 */
export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
    success: boolean;
    session?: StripeCheckoutSession;
    sessionId?: string;
    checkoutUrl?: string;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'Stripe credentials not configured' };
    }

    try {
        const { amount, currency = 'usd', successUrl, cancelUrl, metadata = {}, donorEmail, donorName, donorPhone } = params;

        const body = toUrlEncoded({
            'line_items[0][price_data][currency]': currency,
            'line_items[0][price_data][product_data][name]': 'Donation',
            'line_items[0][price_data][unit_amount]': amount,
            'line_items[0][quantity]': 1,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: `donation_${Date.now()}`,
            customer_email: donorEmail || '',
            'metadata[donor_name]': donorName || '',
            'metadata[donor_phone]': donorPhone || '',
            ...Object.entries(metadata).reduce((acc, [key, value]) => {
                acc[`metadata[${key}]`] = value;
                return acc;
            }, {} as Record<string, string>),
        });

        const response = await fetch(`${STRIPE_BASE_URL}/checkout/sessions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to create checkout session');
        }

        const session: StripeCheckoutSession = await response.json();

        // Store session in database
        const supabase = createAdminSupabaseClient();
        const { error: dbError } = await supabase.from('donations').insert({
            gateway: 'stripe',
            amount: amount / getCurrencyMultiplier(currency),
            currency: currency.toUpperCase(),
            status: 'pending',
            order_id: session.id,
            donor_email: donorEmail || null,
            donor_name: donorName || null,
            donor_phone: donorPhone || null,
            metadata: {
                client_reference_id: session.client_reference_id,
                checkout_url: session.url,
            },
        } as never);

        if (dbError) {
            console.error('Failed to store session in database:', dbError);
        }

        return {
            success: true,
            session,
            sessionId: session.id,
            checkoutUrl: session.url || undefined,
        };
    } catch (error) {
        console.error('Stripe create checkout session error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Retrieve payment intent details
 */
export async function retrievePaymentIntent(paymentIntentId: string): Promise<{
    success: boolean;
    paymentIntent?: StripePaymentIntent;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'Stripe credentials not configured' };
    }

    try {
        const response = await fetch(`${STRIPE_BASE_URL}/payment_intents/${paymentIntentId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to retrieve payment intent');
        }

        const paymentIntent: StripePaymentIntent = await response.json();

        return {
            success: true,
            paymentIntent,
        };
    } catch (error) {
        console.error('Stripe retrieve payment intent error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Retrieve checkout session details
 */
export async function retrieveCheckoutSession(sessionId: string): Promise<{
    success: boolean;
    session?: StripeCheckoutSession;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'Stripe credentials not configured' };
    }

    try {
        const response = await fetch(`${STRIPE_BASE_URL}/checkout/sessions/${sessionId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to retrieve checkout session');
        }

        const session: StripeCheckoutSession = await response.json();

        return {
            success: true,
            session,
        };
    } catch (error) {
        console.error('Stripe retrieve checkout session error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Confirm and verify payment
 */
export async function confirmPayment(paymentIntentId: string): Promise<{
    success: boolean;
    paymentIntent?: StripePaymentIntent;
    error?: string;
}> {
    try {
        const result = await retrievePaymentIntent(paymentIntentId);

        if (!result.success || !result.paymentIntent) {
            return { success: false, error: result.error || 'Failed to retrieve payment' };
        }

        const paymentIntent = result.paymentIntent;

        // Update database based on payment status
        const supabase = createAdminSupabaseClient();

        if (paymentIntent.status === 'succeeded') {
            const charge = paymentIntent.charges.data[0];
            await supabase
                .from('donations')
                .update({
                    status: 'completed',
                    payment_id: charge?.id || paymentIntent.id,
                    gateway_response: paymentIntent as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                    completed_at: new Date().toISOString(),
                } as never)
                .eq('order_id', paymentIntentId);
        } else if (paymentIntent.status === 'canceled') {
            await supabase
                .from('donations')
                .update({
                    status: 'cancelled',
                    error_message: 'Payment was canceled',
                    gateway_response: paymentIntent as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                } as never)
                .eq('order_id', paymentIntentId);
        }

        return {
            success: paymentIntent.status === 'succeeded',
            paymentIntent,
            error: paymentIntent.status !== 'succeeded' ? `Payment status: ${paymentIntent.status}` : undefined,
        };
    } catch (error) {
        console.error('Stripe confirm payment error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Process Stripe webhook
 */
export async function processWebhook(payload: unknown, signature: string): Promise<{
    success: boolean;
    event?: string;
    error?: string;
}> {
    if (!STRIPE_WEBHOOK_SECRET) {
        return { success: false, error: 'Webhook secret not configured' };
    }

    try {
        const event = payload as {
            type: string;
            data: {
                object: StripePaymentIntent | StripeCheckoutSession | StripeCharge
            }
        };

        const supabase = createAdminSupabaseClient();

        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as StripePaymentIntent;
                const charge = paymentIntent.charges.data[0];
                await supabase
                    .from('donations')
                    .update({
                        status: 'completed',
                        payment_id: charge?.id || paymentIntent.id,
                        gateway_response: paymentIntent as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                        completed_at: new Date(paymentIntent.created * 1000).toISOString(),
                    } as never)
                    .eq('order_id', paymentIntent.id);
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as StripePaymentIntent;
                const charge = paymentIntent.charges.data[0];
                await supabase
                    .from('donations')
                    .update({
                        status: 'failed',
                        error_message: charge?.failure_message || 'Payment failed',
                        error_code: charge?.failure_code,
                        gateway_response: paymentIntent as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                    } as never)
                    .eq('order_id', paymentIntent.id);
                break;
            }
            case 'checkout.session.completed': {
                const session = event.data.object as StripeCheckoutSession;
                if (session.payment_status === 'paid') {
                    await supabase
                        .from('donations')
                        .update({
                            status: 'completed',
                            payment_id: session.payment_intent,
                            gateway_response: session as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                            completed_at: new Date(session.created * 1000).toISOString(),
                        } as never)
                        .eq('order_id', session.id);
                }
                break;
            }
        }

        return {
            success: true,
            event: event.type,
        };
    } catch (error) {
        console.error('Stripe webhook processing error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Create a refund
 */
export async function createRefund(paymentIntentId: string, amount?: number): Promise<{
    success: boolean;
    refund?: unknown;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'Stripe credentials not configured' };
    }

    try {
        const bodyParams: Record<string, string | number> = {
            payment_intent: paymentIntentId,
        };

        if (amount) {
            bodyParams.amount = amount;
        }

        const body = toUrlEncoded(bodyParams);

        const response = await fetch(`${STRIPE_BASE_URL}/refunds`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to create refund');
        }

        const refund = await response.json();

        // Update database
        const supabase = createAdminSupabaseClient();
        await supabase
            .from('donations')
            .update({ status: 'refunded' } as never)
            .eq('order_id', paymentIntentId);

        return {
            success: true,
            refund,
        };
    } catch (error) {
        console.error('Stripe refund error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Get currency multiplier (smallest unit to main unit)
 */
function getCurrencyMultiplier(currency: StripeCurrency): number {
    // Most currencies use 100 (cents), but some like JPY use 1
    const zeroDecimalCurrencies = ['jpy'];
    return zeroDecimalCurrencies.includes(currency) ? 1 : 100;
}

/**
 * Get Stripe configuration for frontend
 */
export function getConfig(): {
    publishableKey: string;
    isConfigured: boolean;
} {
    return {
        publishableKey: STRIPE_PUBLISHABLE_KEY,
        isConfigured: isConfigured(),
    };
}
