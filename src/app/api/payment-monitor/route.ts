/**
 * Payment Monitor API Endpoint
 *
 * Provides REST API access to the payment monitoring system for Razorpay
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import {
    monitorRazorpay,
    checkGatewayHealth,
    getGatewayStatus,
    monitorTransactions,
    detectFailedTransactions,
    detectSuspiciousPayments,
    getTransactionStats,
    retryFailedPayment,
    getRevenueMetrics,
    getDonationStats,
    alertOnPaymentIssues,
} from '@/lib/platform-manager/payments';

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
        return { authenticated: false, error: error?.message || 'Unauthorized' };
    }

    return { authenticated: true };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const auth = await checkAuth(request);
    if (!auth.authenticated) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    try {
        switch (action) {
            case 'health': {
                const health = await monitorRazorpay();
                return NextResponse.json(health);
            }

            case 'status': {
                const status = await getGatewayStatus();
                return NextResponse.json(status);
            }

            case 'transactions': {
                const startDate = searchParams.get('startDate');
                const endDate = searchParams.get('endDate');

                const transactions = await monitorTransactions({
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                });
                return NextResponse.json({ transactions, count: transactions.length });
            }

            case 'failed-transactions': {
                const failed = await detectFailedTransactions();
                return NextResponse.json({ failed, count: failed.length });
            }

            case 'suspicious-payments': {
                const suspicious = await detectSuspiciousPayments();
                return NextResponse.json({ suspicious, count: suspicious.length });
            }

            case 'transaction-stats': {
                const stats = await getTransactionStats();
                return NextResponse.json(stats);
            }

            case 'revenue': {
                const metrics = await getRevenueMetrics();
                return NextResponse.json(metrics);
            }

            case 'donations': {
                const stats = await getDonationStats();
                return NextResponse.json(stats);
            }

            default: {
                const status = await getGatewayStatus();
                return NextResponse.json(status);
            }
        }
    } catch (error) {
        console.error('Payment monitor error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const auth = await checkAuth(request);
    if (!auth.authenticated) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    try {
        switch (action) {
            case 'retry': {
                const body = await request.json();
                const { transactionId } = body;

                if (!transactionId) {
                    return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
                }

                const result = await retryFailedPayment(transactionId);
                return NextResponse.json(result);
            }

            case 'alerts': {
                const result = await alertOnPaymentIssues();
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Payment monitor POST error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
