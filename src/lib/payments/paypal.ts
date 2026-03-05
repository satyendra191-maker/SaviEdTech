/**
 * PayPal Payment Gateway Integration
 * 
 * Features:
 * - Create PayPal orders
 * - Capture payments
 * - Handle PayPal checkout
 * - Webhook processing
 */

import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

// Type definitions
export type PayPalCurrency = 'USD' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'INR';

export interface PayPalOrder {
    id: string;
    status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
    intent: 'CAPTURE' | 'AUTHORIZE';
    purchase_units: PayPalPurchaseUnit[];
    create_time: string;
    update_time: string;
    links: PayPalLink[];
}

export interface PayPalPurchaseUnit {
    reference_id: string;
    amount: {
        currency_code: string;
        value: string;
    };
    payee?: {
        email_address: string;
        merchant_id: string;
    };
    description?: string;
    custom_id?: string;
    invoice_id?: string;
    payments?: {
        captures?: PayPalCapture[];
    };
}

export interface PayPalCapture {
    id: string;
    status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED' | 'FAILED';
    amount: {
        currency_code: string;
        value: string;
    };
    final_capture: boolean;
    create_time: string;
    update_time: string;
}

export interface PayPalLink {
    href: string;
    rel: string;
    method: string;
}

export interface PayPalPaymentSource {
    paypal?: {
        email_address: string;
        account_id: string;
        name: {
            given_name: string;
            surname: string;
        };
        address: {
            country_code: string;
        };
    };
}

export interface CreateOrderParams {
    amount: number;
    currency?: PayPalCurrency;
    description?: string;
    customId?: string;
    donorEmail?: string;
    donorName?: string;
    donorPhone?: string;
    returnUrl?: string;
    cancelUrl?: string;
}

export interface CaptureOrderParams {
    orderId: string;
}

// Configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';

const PAYPAL_SANDBOX_URL = 'https://api-m.sandbox.paypal.com';
const PAYPAL_LIVE_URL = 'https://api-m.paypal.com';

const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' ? PAYPAL_LIVE_URL : PAYPAL_SANDBOX_URL;

// Cache access token
let accessTokenCache: { token: string; expiresAt: number } | null = null;

/**
 * Check if PayPal credentials are configured
 */
export function isConfigured(): boolean {
    return !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
}

/**
 * Get PayPal access token
 */
async function getAccessToken(): Promise<string> {
    // Check if cached token is still valid (with 5 minute buffer)
    if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
        return accessTokenCache.token;
    }

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
        throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json() as { access_token: string; expires_in: number };

    accessTokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
}

/**
 * Get authentication headers for PayPal API
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
    const token = await getAccessToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

/**
 * Create a new PayPal order
 */
export async function createOrder(params: CreateOrderParams): Promise<{
    success: boolean;
    order?: PayPalOrder;
    orderId?: string;
    approvalUrl?: string;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'PayPal credentials not configured' };
    }

    try {
        const {
            amount,
            currency = 'USD',
            description = 'Donation',
            customId,
            donorEmail,
            donorName,
            donorPhone,
            returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/donate/success`,
            cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/donate/cancel`,
        } = params;

        const formattedAmount = amount.toFixed(2);
        const referenceId = `donation_${Date.now()}`;

        const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        reference_id: referenceId,
                        amount: {
                            currency_code: currency,
                            value: formattedAmount,
                        },
                        description,
                        custom_id: customId || referenceId,
                        invoice_id: referenceId,
                    },
                ],
                application_context: {
                    brand_name: 'SaviEduTech',
                    landing_page: 'BILLING',
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'PAY_NOW',
                    return_url: returnUrl,
                    cancel_url: cancelUrl,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create PayPal order');
        }

        const order: PayPalOrder = await response.json();

        // Find approval URL
        const approvalLink = order.links.find(link => link.rel === 'approve');

        // Store order in database
        const supabase = createAdminSupabaseClient();
        const { error: dbError } = await supabase.from('donations').insert({
            gateway: 'paypal',
            amount: amount,
            currency: currency,
            status: 'pending',
            order_id: order.id,
            donor_email: donorEmail || null,
            donor_name: donorName || null,
            donor_phone: donorPhone || null,
            metadata: {
                reference_id: referenceId,
                description,
                custom_id: customId,
            },
        } as never);

        if (dbError) {
            console.error('Failed to store order in database:', dbError);
        }

        return {
            success: true,
            order,
            orderId: order.id,
            approvalUrl: approvalLink?.href,
        };
    } catch (error) {
        console.error('PayPal create order error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Capture payment for an approved PayPal order
 */
export async function captureOrder(params: CaptureOrderParams): Promise<{
    success: boolean;
    order?: PayPalOrder;
    capture?: PayPalCapture;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'PayPal credentials not configured' };
    }

    try {
        const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${params.orderId}/capture`, {
            method: 'POST',
            headers: await getAuthHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to capture PayPal order');
        }

        const order: PayPalOrder = await response.json();

        // Extract capture information
        const purchaseUnit = order.purchase_units[0];
        const capture = purchaseUnit.payments?.captures?.[0];

        // Update database
        const supabase = createAdminSupabaseClient();

        if (order.status === 'COMPLETED' && capture) {
            await supabase
                .from('donations')
                .update({
                    status: 'completed',
                    payment_id: capture.id,
                    gateway_response: order as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                    completed_at: new Date().toISOString(),
                } as never)
                .eq('order_id', order.id);
        } else if (order.status === 'VOIDED') {
            await supabase
                .from('donations')
                .update({
                    status: 'cancelled',
                    error_message: 'Order was voided',
                    gateway_response: order as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                } as never)
                .eq('order_id', order.id);
        }

        return {
            success: order.status === 'COMPLETED',
            order,
            capture,
            error: order.status !== 'COMPLETED' ? `Order status: ${order.status}` : undefined,
        };
    } catch (error) {
        console.error('PayPal capture order error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Get order details
 */
export async function getOrder(orderId: string): Promise<{
    success: boolean;
    order?: PayPalOrder;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'PayPal credentials not configured' };
    }

    try {
        const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`, {
            method: 'GET',
            headers: await getAuthHeaders(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get PayPal order');
        }

        const order: PayPalOrder = await response.json();

        return {
            success: true,
            order,
        };
    } catch (error) {
        console.error('PayPal get order error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Refund a captured payment
 */
export async function refundPayment(captureId: string, amount?: number): Promise<{
    success: boolean;
    refund?: unknown;
    error?: string;
}> {
    if (!isConfigured()) {
        return { success: false, error: 'PayPal credentials not configured' };
    }

    try {
        const body: { amount?: { value: string; currency_code: string } } = {};

        if (amount) {
            body.amount = {
                value: amount.toFixed(2),
                currency_code: 'USD',
            };
        }

        const response = await fetch(`${PAYPAL_BASE_URL}/v2/payments/captures/${captureId}/refund`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to process refund');
        }

        const refund = await response.json();

        // Update database
        const supabase = createAdminSupabaseClient();
        await supabase
            .from('donations')
            .update({ status: 'refunded' } as never)
            .eq('payment_id', captureId);

        return {
            success: true,
            refund,
        };
    } catch (error) {
        console.error('PayPal refund error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Process PayPal webhook
 */
export async function processWebhook(
    payload: unknown,
    headers: Record<string, string>
): Promise<{
    success: boolean;
    event?: string;
    error?: string;
}> {
    if (!PAYPAL_WEBHOOK_ID) {
        return { success: false, error: 'Webhook ID not configured' };
    }

    try {
        // Verify webhook signature
        const transmissionId = headers['paypal-transmission-id'];
        const certId = headers['paypal-cert-id'];
        const authAlgo = headers['paypal-auth-algo'];
        const transmissionTime = headers['paypal-transmission-time'];
        const signature = headers['paypal-transmission-sig'];

        if (!transmissionId || !certId || !authAlgo || !transmissionTime || !signature) {
            return { success: false, error: 'Missing webhook signature headers' };
        }

        // Verify the webhook signature
        const verifyResponse = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
                auth_algo: authAlgo,
                cert_id: certId,
                transmission_id: transmissionId,
                transmission_sig: signature,
                transmission_time: transmissionTime,
                webhook_id: PAYPAL_WEBHOOK_ID,
                webhook_event: payload,
            }),
        });

        if (!verifyResponse.ok) {
            return { success: false, error: 'Failed to verify webhook signature' };
        }

        const verifyResult = await verifyResponse.json() as { verification_status: string };

        if (verifyResult.verification_status !== 'SUCCESS') {
            return { success: false, error: 'Invalid webhook signature' };
        }

        const event = payload as {
            event_type: string;
            resource: {
                id: string;
                status: string;
                amount?: { currency_code: string; value: string };
                invoice_id?: string;
                custom_id?: string;
            };
        };

        const supabase = createAdminSupabaseClient();

        switch (event.event_type) {
            case 'CHECKOUT.ORDER.APPROVED': {
                // Order approved but not yet captured
                break;
            }
            case 'CHECKOUT.ORDER.COMPLETED': {
                const orderId = event.resource.id;
                await supabase
                    .from('donations')
                    .update({
                        status: 'completed',
                        payment_id: event.resource.id,
                        gateway_response: event.resource as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                        completed_at: new Date().toISOString(),
                    } as never)
                    .eq('order_id', orderId);
                break;
            }
            case 'PAYMENT.CAPTURE.COMPLETED': {
                const captureId = event.resource.id;
                await supabase
                    .from('donations')
                    .update({
                        status: 'completed',
                        payment_id: captureId,
                        gateway_response: event.resource as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                        completed_at: new Date().toISOString(),
                    } as never)
                    .eq('payment_id', captureId);
                break;
            }
            case 'PAYMENT.CAPTURE.DENIED':
            case 'PAYMENT.CAPTURE.REFUNDED': {
                const captureId = event.resource.id;
                const status = event.event_type === 'PAYMENT.CAPTURE.DENIED' ? 'failed' : 'refunded';
                await supabase
                    .from('donations')
                    .update({
                        status,
                        error_message: event.event_type === 'PAYMENT.CAPTURE.DENIED' ? 'Payment capture denied' : undefined,
                        gateway_response: event.resource as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
                    } as never)
                    .eq('payment_id', captureId);
                break;
            }
        }

        return {
            success: true,
            event: event.event_type,
        };
    } catch (error) {
        console.error('PayPal webhook processing error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}

/**
 * Get PayPal configuration for frontend
 */
export function getConfig(): {
    clientId: string;
    isConfigured: boolean;
    isSandbox: boolean;
} {
    return {
        clientId: PAYPAL_CLIENT_ID,
        isConfigured: isConfigured(),
        isSandbox: process.env.NODE_ENV !== 'production',
    };
}
