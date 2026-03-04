/**
 * Payment Monitor API Endpoint
 *
 * Provides REST API access to the payment monitoring system for:
 * - Gateway health checks
 * - Transaction monitoring
 * - Webhook status
 * - Payment reports
 * - Payment alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import {
    // Payment Gateway Monitor
    monitorRazorpay,
    monitorStripe,
    monitorPayPal,
    checkGatewayHealth,
    getGatewayStatus,

    // Transaction Monitor
    monitorTransactions,
    detectFailedTransactions,
    detectSuspiciousPayments,
    getTransactionStats,
    retryFailedPayment,

    // Webhook Monitor
    validateWebhookEndpoints,
    monitorWebhookDelivery,
    getWebhookStatus,
    replayWebhook,

    // Payment Reporter
    generatePaymentReport,
    getRevenueMetrics,
    getDonationStats,
    alertOnPaymentIssues,
} from '@/lib/platform-manager/payments';

// Authentication check
async function checkAuth(request: NextRequest): Promise<{ authenticated: boolean; error?: string }> {
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set() { /* no-op */ },
                remove() { /* no-op */ },
            },
        }
    );
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return { authenticated: false, error: 'Unauthorized' };
    }

    // Check if user is admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string } | null; error: Error | null };

    if (!profile || profile.role !== 'admin') {
        return { authenticated: false, error: 'Forbidden: Admin access required' };
    }

    return { authenticated: true };
}

// GET handler for retrieving payment monitoring data
export async function GET(request: NextRequest): Promise<NextResponse> {
    const auth = await checkAuth(request);
    if (!auth.authenticated) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    try {
        switch (action) {
            case 'status': {
                const status = await getGatewayStatus();
                return NextResponse.json(status);
            }

            case 'gateway-health': {
                const health = await checkGatewayHealth();
                return NextResponse.json({ gateways: health, timestamp: new Date().toISOString() });
            }

            case 'razorpay': {
                const health = await monitorRazorpay();
                return NextResponse.json(health);
            }

            case 'stripe': {
                const health = await monitorStripe();
                return NextResponse.json(health);
            }

            case 'paypal': {
                const health = await monitorPayPal();
                return NextResponse.json(health);
            }

            case 'transactions': {
                const startDate = searchParams.get('startDate');
                const endDate = searchParams.get('endDate');
                const gateway = searchParams.get('gateway') as 'razorpay' | 'stripe' | 'paypal' | undefined;
                const status = searchParams.get('status') as 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled' | undefined;
                const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

                const transactions = await monitorTransactions({
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    gateway,
                    status,
                    limit,
                });
                return NextResponse.json({ transactions, count: transactions.length });
            }

            case 'failed-transactions': {
                const since = searchParams.get('since');
                const gateway = searchParams.get('gateway') as 'razorpay' | 'stripe' | 'paypal' | undefined;

                const failed = await detectFailedTransactions({
                    since: since || undefined,
                    gateway,
                });
                return NextResponse.json({ failed, count: failed.length });
            }

            case 'suspicious-payments': {
                const timeWindow = searchParams.get('timeWindow') ? parseInt(searchParams.get('timeWindow')!) : undefined;
                const velocityThreshold = searchParams.get('velocity') ? parseInt(searchParams.get('velocity')!) : undefined;
                const highAmount = searchParams.get('highAmount') ? parseInt(searchParams.get('highAmount')!) : undefined;

                const suspicious = await detectSuspiciousPayments({
                    timeWindowHours: timeWindow,
                    velocityThreshold,
                    highAmountThreshold: highAmount,
                });
                return NextResponse.json({ suspicious, count: suspicious.length });
            }

            case 'transaction-stats': {
                const startDate = searchParams.get('startDate');
                const endDate = searchParams.get('endDate');
                const gateway = searchParams.get('gateway') as 'razorpay' | 'stripe' | 'paypal' | undefined;

                const stats = await getTransactionStats({
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    gateway,
                });
                return NextResponse.json(stats);
            }

            case 'webhook-status': {
                const status = await getWebhookStatus();
                return NextResponse.json(status);
            }

            case 'webhook-deliveries': {
                const since = searchParams.get('since');
                const deliveryStatus = searchParams.get('deliveryStatus') as 'pending' | 'delivered' | 'failed' | 'retrying' | undefined;

                const deliveries = await monitorWebhookDelivery({
                    since: since || undefined,
                    status: deliveryStatus,
                });
                return NextResponse.json({ deliveries, count: deliveries.length });
            }

            case 'validate-webhooks': {
                const validation = await validateWebhookEndpoints();
                return NextResponse.json({ validation, timestamp: new Date().toISOString() });
            }

            case 'report': {
                const period = (searchParams.get('period') as 'day' | 'week' | 'month' | 'custom') || 'day';
                const startDate = searchParams.get('startDate');
                const endDate = searchParams.get('endDate');

                const report = await generatePaymentReport({
                    period,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                });
                return NextResponse.json(report);
            }

            case 'revenue-metrics': {
                const startDate = searchParams.get('startDate');
                const endDate = searchParams.get('endDate');

                const metrics = await getRevenueMetrics({
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                });
                return NextResponse.json(metrics);
            }

            case 'donation-stats': {
                const startDate = searchParams.get('startDate');
                const endDate = searchParams.get('endDate');

                const stats = await getDonationStats({
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                });
                return NextResponse.json(stats);
            }

            default:
                return NextResponse.json(
                    { error: 'Unknown action', validActions: ['status', 'gateway-health', 'razorpay', 'stripe', 'paypal', 'transactions', 'failed-transactions', 'suspicious-payments', 'transaction-stats', 'webhook-status', 'webhook-deliveries', 'validate-webhooks', 'report', 'revenue-metrics', 'donation-stats'] },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Payment Monitor API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// POST handler for actions
export async function POST(request: NextRequest): Promise<NextResponse> {
    const auth = await checkAuth(request);
    if (!auth.authenticated) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { action, data } = body;

        switch (action) {
            case 'retry-payment': {
                const { transactionId } = data || {};
                if (!transactionId) {
                    return NextResponse.json(
                        { error: 'transactionId is required' },
                        { status: 400 }
                    );
                }

                const result = await retryFailedPayment(transactionId);
                return NextResponse.json(result);
            }

            case 'replay-webhook': {
                const { deliveryId } = data || {};
                if (!deliveryId) {
                    return NextResponse.json(
                        { error: 'deliveryId is required' },
                        { status: 400 }
                    );
                }

                const result = await replayWebhook(deliveryId);
                return NextResponse.json(result);
            }

            case 'check-alerts': {
                const result = await alertOnPaymentIssues();
                return NextResponse.json(result);
            }

            case 'health-check': {
                const [gatewayHealth, webhookStatus] = await Promise.all([
                    checkGatewayHealth(),
                    getWebhookStatus(),
                ]);

                return NextResponse.json({
                    gateways: gatewayHealth,
                    webhooks: webhookStatus,
                    timestamp: new Date().toISOString(),
                });
            }

            default:
                return NextResponse.json(
                    { error: 'Unknown action', validActions: ['retry-payment', 'replay-webhook', 'check-alerts', 'health-check'] },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Payment Monitor API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
