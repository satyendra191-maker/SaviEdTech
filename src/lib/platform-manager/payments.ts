/**
 * AI Autonomous Platform Manager - Payment Monitoring System
 *
 * Comprehensive monitoring and tracking for payment gateways:
 * - Razorpay, Stripe, PayPal gateway monitoring
 * - Transaction monitoring and failure detection
 * - Webhook validation and delivery monitoring
 * - Payment reporting and analytics
 * - Alerting on payment issues
 */

import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { sendAlert, type AlertSeverity } from './alerts';

// Type definitions from Supabase schema
type DonationsRow = Database['public']['Tables']['donations']['Row'];

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type PaymentGateway = 'razorpay' | 'stripe' | 'paypal';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export type WebhookStatus = 'pending' | 'delivered' | 'failed' | 'retrying';

export interface GatewayHealth {
    gateway: PaymentGateway;
    status: 'healthy' | 'degraded' | 'critical' | 'unknown';
    responseTimeMs: number;
    lastChecked: string;
    successRate: number;
    errorCount: number;
    errorMessage?: string;
}

export interface Transaction {
    id: string;
    gateway: PaymentGateway;
    amount: number;
    currency: string;
    status: PaymentStatus;
    donorEmail?: string;
    donorName?: string;
    donorPhone?: string;
    orderId?: string;
    paymentId?: string;
    gatewayResponse?: Record<string, unknown>;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

export interface TransactionStats {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    refundedTransactions: number;
    totalRevenue: number;
    refundedAmount: number;
    netRevenue: number;
    successRate: number;
    averageTransactionAmount: number;
    timeRange: {
        start: string;
        end: string;
    };
    gatewayBreakdown: Record<PaymentGateway, {
        count: number;
        revenue: number;
        successRate: number;
    }>;
}

export interface WebhookEndpoint {
    id: string;
    gateway: PaymentGateway;
    url: string;
    eventTypes: string[];
    isActive: boolean;
    secret?: string;
    createdAt: string;
    lastDeliveredAt?: string;
}

export interface WebhookDelivery {
    id: string;
    endpointId: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: WebhookStatus;
    attempts: number;
    lastAttemptAt?: string;
    responseStatus?: number;
    responseBody?: string;
    errorMessage?: string;
    createdAt: string;
}

export interface FailedTransaction {
    id: string;
    transactionId: string;
    gateway: PaymentGateway;
    amount: number;
    errorCode?: string;
    errorMessage: string;
    retryCount: number;
    maxRetries: number;
    canRetry: boolean;
    createdAt: string;
    lastRetryAt?: string;
}

export interface SuspiciousPaymentPattern {
    type: 'multiple_failures' | 'high_amount' | 'velocity' | 'unusual_pattern';
    description: string;
    transactionIds: string[];
    donorEmail?: string;
    riskScore: number;
    detectedAt: string;
}

export interface RevenueMetrics {
    daily: {
        date: string;
        revenue: number;
        transactionCount: number;
    }[];
    weekly: {
        week: string;
        revenue: number;
        transactionCount: number;
    }[];
    monthly: {
        month: string;
        revenue: number;
        transactionCount: number;
    }[];
    trends: {
        dailyGrowth: number;
        weeklyGrowth: number;
        monthlyGrowth: number;
    };
}

export interface DonationStats {
    totalDonors: number;
    uniqueDonors: number;
    returningDonors: number;
    averageDonationAmount: number;
    medianDonationAmount: number;
    largestDonation: number;
    smallestDonation: number;
    topDonors: {
        email: string;
        name: string;
        totalAmount: number;
        donationCount: number;
    }[];
    donationDistribution: {
        range: string;
        count: number;
        percentage: number;
    }[];
}

export interface PaymentReport {
    generatedAt: string;
    period: {
        start: string;
        end: string;
    };
    summary: {
        totalTransactions: number;
        successfulTransactions: number;
        failedTransactions: number;
        totalRevenue: number;
        netRevenue: number;
    };
    gatewayStatus: GatewayHealth[];
    transactionStats: TransactionStats;
    revenueMetrics: RevenueMetrics;
    donationStats: DonationStats;
    issues: {
        failedTransactions: FailedTransaction[];
        suspiciousPatterns: SuspiciousPaymentPattern[];
        webhookFailures: WebhookDelivery[];
    };
}

// ============================================================================
// PAYMENT GATEWAY MONITOR
// ============================================================================

/**
 * Monitor Razorpay transactions and webhooks
 */
export async function monitorRazorpay(): Promise<GatewayHealth> {
    const startTime = Date.now();
    const supabase = createAdminSupabaseClient();

    try {
        // Check Razorpay API connectivity
        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!razorpayKeyId || !razorpayKeySecret) {
            return {
                gateway: 'razorpay',
                status: 'critical',
                responseTimeMs: Date.now() - startTime,
                lastChecked: new Date().toISOString(),
                successRate: 0,
                errorCount: 1,
                errorMessage: 'Razorpay credentials not configured',
            };
        }

        // Test API connectivity
        const response = await fetch('https://api.razorpay.com/v1/orders?count=1', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`,
            },
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            return {
                gateway: 'razorpay',
                status: 'critical',
                responseTimeMs: responseTime,
                lastChecked: new Date().toISOString(),
                successRate: 0,
                errorCount: 1,
                errorMessage: `Razorpay API error: ${response.status} ${response.statusText}`,
            };
        }

        // Calculate success rate from recent transactions
        const { data: transactions, error } = await supabase
            .from('donations')
            .select('status')
            .eq('gateway', 'razorpay')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as { data: Pick<DonationsRow, 'status'>[] | null; error: Error | null };

        let successRate = 100;
        let errorCount = 0;

        if (!error && transactions && transactions.length > 0) {
            const successful = transactions.filter(t => t.status === 'completed').length;
            successRate = (successful / transactions.length) * 100;
            errorCount = transactions.filter(t => t.status === 'failed').length;
        }

        return {
            gateway: 'razorpay',
            status: responseTime > 5000 ? 'degraded' : 'healthy',
            responseTimeMs: responseTime,
            lastChecked: new Date().toISOString(),
            successRate,
            errorCount,
        };
    } catch (error) {
        return {
            gateway: 'razorpay',
            status: 'critical',
            responseTimeMs: Date.now() - startTime,
            lastChecked: new Date().toISOString(),
            successRate: 0,
            errorCount: 1,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Monitor Stripe transactions and webhooks
 */
export async function monitorStripe(): Promise<GatewayHealth> {
    const startTime = Date.now();
    const supabase = createAdminSupabaseClient();

    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

        if (!stripeSecretKey) {
            return {
                gateway: 'stripe',
                status: 'critical',
                responseTimeMs: Date.now() - startTime,
                lastChecked: new Date().toISOString(),
                successRate: 0,
                errorCount: 1,
                errorMessage: 'Stripe secret key not configured',
            };
        }

        // Test Stripe API connectivity
        const response = await fetch('https://api.stripe.com/v1/charges?limit=1', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
            },
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            return {
                gateway: 'stripe',
                status: 'critical',
                responseTimeMs: responseTime,
                lastChecked: new Date().toISOString(),
                successRate: 0,
                errorCount: 1,
                errorMessage: `Stripe API error: ${response.status} ${response.statusText}`,
            };
        }

        // Calculate success rate from recent transactions
        const { data: transactions, error } = await supabase
            .from('donations')
            .select('status')
            .eq('gateway', 'stripe')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as { data: Pick<DonationsRow, 'status'>[] | null; error: Error | null };

        let successRate = 100;
        let errorCount = 0;

        if (!error && transactions && transactions.length > 0) {
            const successful = transactions.filter(t => t.status === 'completed').length;
            successRate = (successful / transactions.length) * 100;
            errorCount = transactions.filter(t => t.status === 'failed').length;
        }

        return {
            gateway: 'stripe',
            status: responseTime > 5000 ? 'degraded' : 'healthy',
            responseTimeMs: responseTime,
            lastChecked: new Date().toISOString(),
            successRate,
            errorCount,
        };
    } catch (error) {
        return {
            gateway: 'stripe',
            status: 'critical',
            responseTimeMs: Date.now() - startTime,
            lastChecked: new Date().toISOString(),
            successRate: 0,
            errorCount: 1,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Monitor PayPal transactions
 */
export async function monitorPayPal(): Promise<GatewayHealth> {
    const startTime = Date.now();
    const supabase = createAdminSupabaseClient();

    try {
        const paypalClientId = process.env.PAYPAL_CLIENT_ID;
        const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;

        if (!paypalClientId || !paypalClientSecret) {
            return {
                gateway: 'paypal',
                status: 'unknown',
                responseTimeMs: Date.now() - startTime,
                lastChecked: new Date().toISOString(),
                successRate: 0,
                errorCount: 0,
                errorMessage: 'PayPal credentials not configured',
            };
        }

        // Get access token
        const tokenResponse = await fetch('https://api.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64')}`,
            },
            body: 'grant_type=client_credentials',
        });

        const responseTime = Date.now() - startTime;

        if (!tokenResponse.ok) {
            return {
                gateway: 'paypal',
                status: 'critical',
                responseTimeMs: responseTime,
                lastChecked: new Date().toISOString(),
                successRate: 0,
                errorCount: 1,
                errorMessage: `PayPal API error: ${tokenResponse.status} ${tokenResponse.statusText}`,
            };
        }

        // Calculate success rate from recent transactions
        const { data: transactions, error } = await supabase
            .from('donations')
            .select('status')
            .eq('gateway', 'paypal')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as { data: Pick<DonationsRow, 'status'>[] | null; error: Error | null };

        let successRate = 100;
        let errorCount = 0;

        if (!error && transactions && transactions.length > 0) {
            const successful = transactions.filter(t => t.status === 'completed').length;
            successRate = (successful / transactions.length) * 100;
            errorCount = transactions.filter(t => t.status === 'failed').length;
        }

        return {
            gateway: 'paypal',
            status: responseTime > 5000 ? 'degraded' : 'healthy',
            responseTimeMs: responseTime,
            lastChecked: new Date().toISOString(),
            successRate,
            errorCount,
        };
    } catch (error) {
        return {
            gateway: 'paypal',
            status: 'critical',
            responseTimeMs: Date.now() - startTime,
            lastChecked: new Date().toISOString(),
            successRate: 0,
            errorCount: 1,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Check all gateway connectivity
 */
export async function checkGatewayHealth(): Promise<GatewayHealth[]> {
    const results = await Promise.all([
        monitorRazorpay(),
        monitorStripe(),
        monitorPayPal(),
    ]);

    return results;
}

/**
 * Get status of all payment gateways
 */
export async function getGatewayStatus(): Promise<{
    gateways: GatewayHealth[];
    overallStatus: 'healthy' | 'degraded' | 'critical';
    timestamp: string;
}> {
    const gateways = await checkGatewayHealth();

    // Determine overall status
    const criticalCount = gateways.filter(g => g.status === 'critical').length;
    const degradedCount = gateways.filter(g => g.status === 'degraded').length;

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalCount > 0) {
        overallStatus = 'critical';
    } else if (degradedCount > 0) {
        overallStatus = 'degraded';
    }

    return {
        gateways,
        overallStatus,
        timestamp: new Date().toISOString(),
    };
}

// ============================================================================
// TRANSACTION MONITOR
// ============================================================================

/**
 * Monitor all transactions from donations table
 */
export async function monitorTransactions(options?: {
    startDate?: string;
    endDate?: string;
    gateway?: PaymentGateway;
    status?: PaymentStatus;
    limit?: number;
}): Promise<Transaction[]> {
    const supabase = createAdminSupabaseClient();

    let query = supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false });

    if (options?.startDate) {
        query = query.gte('created_at', options.startDate);
    }

    if (options?.endDate) {
        query = query.lte('created_at', options.endDate);
    }

    if (options?.gateway) {
        query = query.eq('gateway', options.gateway);
    }

    if (options?.status) {
        query = query.eq('status', options.status);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query as { data: DonationsRow[] | null; error: Error | null };

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        gateway: row.gateway as PaymentGateway,
        amount: row.amount,
        currency: row.currency || 'INR',
        status: row.status as PaymentStatus,
        donorEmail: row.donor_email,
        donorName: row.donor_name,
        donorPhone: row.donor_phone,
        orderId: row.order_id,
        paymentId: row.payment_id,
        gatewayResponse: row.gateway_response as Record<string, unknown>,
        errorMessage: row.error_message,
        metadata: row.metadata as Record<string, unknown>,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
    }));
}

/**
 * Detect failed payments
 */
export async function detectFailedTransactions(options?: {
    since?: string;
    gateway?: PaymentGateway;
    includeRetried?: boolean;
}): Promise<FailedTransaction[]> {
    const supabase = createAdminSupabaseClient();

    const since = options?.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
        .from('donations')
        .select('*')
        .eq('status', 'failed')
        .gte('created_at', since)
        .order('created_at', { ascending: false });

    if (options?.gateway) {
        query = query.eq('gateway', options.gateway);
    }

    const { data, error } = await query as { data: DonationsRow[] | null; error: Error | null };

    if (error) {
        console.error('Error detecting failed transactions:', error);
        return [];
    }

    return (data || []).map(row => ({
        id: `failed-${row.id}`,
        transactionId: row.id,
        gateway: row.gateway as PaymentGateway,
        amount: row.amount,
        errorCode: row.error_code,
        errorMessage: row.error_message || 'Unknown error',
        retryCount: row.retry_count || 0,
        maxRetries: 3,
        canRetry: (row.retry_count || 0) < 3 && !row.error_message?.includes('insufficient funds'),
        createdAt: row.created_at,
        lastRetryAt: row.last_retry_at,
    }));
}

/**
 * Detect suspicious payment patterns
 */
export async function detectSuspiciousPayments(options?: {
    timeWindowHours?: number;
    velocityThreshold?: number;
    highAmountThreshold?: number;
}): Promise<SuspiciousPaymentPattern[]> {
    const supabase = createAdminSupabaseClient();
    const patterns: SuspiciousPaymentPattern[] = [];

    const timeWindow = options?.timeWindowHours || 1;
    const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000).toISOString();

    // Pattern 1: Multiple failed attempts from same donor
    const { data: failedByDonor, error: failedError } = await supabase
        .from('donations')
        .select('donor_email, id, amount, created_at')
        .eq('status', 'failed')
        .gte('created_at', since) as { data: Pick<DonationsRow, 'donor_email' | 'id' | 'amount' | 'created_at'>[] | null; error: Error | null };

    if (!failedError && failedByDonor) {
        const donorFailures = new Map<string, Pick<DonationsRow, 'donor_email' | 'id' | 'amount' | 'created_at'>[]>();
        failedByDonor.forEach(tx => {
            if (tx.donor_email) {
                if (!donorFailures.has(tx.donor_email)) {
                    donorFailures.set(tx.donor_email, []);
                }
                donorFailures.get(tx.donor_email)!.push(tx);
            }
        });

        donorFailures.forEach((txs, email) => {
            if (txs.length >= 3) {
                patterns.push({
                    type: 'multiple_failures',
                    description: `${txs.length} failed payment attempts from ${email} in the last ${timeWindow} hours`,
                    transactionIds: txs.map(t => t.id),
                    donorEmail: email,
                    riskScore: Math.min(txs.length * 20, 100),
                    detectedAt: new Date().toISOString(),
                });
            }
        });
    }

    // Pattern 2: High amount transactions
    const highAmountThreshold = options?.highAmountThreshold || 100000; // ₹1,00,000
    const { data: highAmountTxs, error: highAmountError } = await supabase
        .from('donations')
        .select('id, donor_email, amount')
        .gte('amount', highAmountThreshold)
        .gte('created_at', since) as { data: Pick<DonationsRow, 'id' | 'donor_email' | 'amount'>[] | null; error: Error | null };

    if (!highAmountError && highAmountTxs && highAmountTxs.length > 0) {
        highAmountTxs.forEach(tx => {
            patterns.push({
                type: 'high_amount',
                description: `High value transaction: ₹${tx.amount}`,
                transactionIds: [tx.id],
                donorEmail: tx.donor_email,
                riskScore: 50,
                detectedAt: new Date().toISOString(),
            });
        });
    }

    // Pattern 3: Velocity check (many transactions from same donor)
    const velocityThreshold = options?.velocityThreshold || 10;
    const { data: allTxs, error: velocityError } = await supabase
        .from('donations')
        .select('donor_email, id, created_at')
        .gte('created_at', since) as { data: Pick<DonationsRow, 'donor_email' | 'id' | 'created_at'>[] | null; error: Error | null };

    if (!velocityError && allTxs) {
        const donorVelocity = new Map<string, string[]>();
        allTxs.forEach(tx => {
            if (tx.donor_email) {
                if (!donorVelocity.has(tx.donor_email)) {
                    donorVelocity.set(tx.donor_email, []);
                }
                donorVelocity.get(tx.donor_email)!.push(tx.id);
            }
        });

        donorVelocity.forEach((ids, email) => {
            if (ids.length >= velocityThreshold) {
                patterns.push({
                    type: 'velocity',
                    description: `${ids.length} transactions from ${email} in the last ${timeWindow} hours`,
                    transactionIds: ids,
                    donorEmail: email,
                    riskScore: Math.min(ids.length * 10, 100),
                    detectedAt: new Date().toISOString(),
                });
            }
        });
    }

    return patterns.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Get transaction statistics
 */
export async function getTransactionStats(options?: {
    startDate?: string;
    endDate?: string;
    gateway?: PaymentGateway;
}): Promise<TransactionStats> {
    const supabase = createAdminSupabaseClient();

    const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = options?.endDate || new Date().toISOString();

    let query = supabase
        .from('donations')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

    if (options?.gateway) {
        query = query.eq('gateway', options.gateway);
    }

    const { data, error } = await query as { data: DonationsRow[] | null; error: Error | null };

    if (error) {
        console.error('Error getting transaction stats:', error);
        return {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            pendingTransactions: 0,
            refundedTransactions: 0,
            totalRevenue: 0,
            refundedAmount: 0,
            netRevenue: 0,
            successRate: 0,
            averageTransactionAmount: 0,
            timeRange: { start: startDate, end: endDate },
            gatewayBreakdown: {
                razorpay: { count: 0, revenue: 0, successRate: 0 },
                stripe: { count: 0, revenue: 0, successRate: 0 },
                paypal: { count: 0, revenue: 0, successRate: 0 },
            },
        };
    }

    const transactions = data || [];

    const successful = transactions.filter(t => t.status === 'completed');
    const failed = transactions.filter(t => t.status === 'failed');
    const pending = transactions.filter(t => t.status === 'pending');
    const refunded = transactions.filter(t => t.status === 'refunded');

    const totalRevenue = successful.reduce((sum, t) => sum + t.amount, 0);
    const refundedAmount = refunded.reduce((sum, t) => sum + t.amount, 0);

    // Calculate gateway breakdown
    const gatewayBreakdown: TransactionStats['gatewayBreakdown'] = {
        razorpay: { count: 0, revenue: 0, successRate: 0 },
        stripe: { count: 0, revenue: 0, successRate: 0 },
        paypal: { count: 0, revenue: 0, successRate: 0 },
    };

    (['razorpay', 'stripe', 'paypal'] as PaymentGateway[]).forEach(gateway => {
        const gatewayTxs = transactions.filter(t => t.gateway === gateway);
        const gatewaySuccessful = gatewayTxs.filter(t => t.status === 'completed');

        gatewayBreakdown[gateway] = {
            count: gatewayTxs.length,
            revenue: gatewaySuccessful.reduce((sum, t) => sum + t.amount, 0),
            successRate: gatewayTxs.length > 0
                ? (gatewaySuccessful.length / gatewayTxs.length) * 100
                : 0,
        };
    });

    return {
        totalTransactions: transactions.length,
        successfulTransactions: successful.length,
        failedTransactions: failed.length,
        pendingTransactions: pending.length,
        refundedTransactions: refunded.length,
        totalRevenue,
        refundedAmount,
        netRevenue: totalRevenue - refundedAmount,
        successRate: transactions.length > 0
            ? (successful.length / transactions.length) * 100
            : 0,
        averageTransactionAmount: successful.length > 0
            ? totalRevenue / successful.length
            : 0,
        timeRange: { start: startDate, end: endDate },
        gatewayBreakdown,
    };
}

/**
 * Retry failed transactions
 */
export async function retryFailedPayment(failedTransactionId: string): Promise<{
    success: boolean;
    message: string;
    newTransactionId?: string;
}> {
    const supabase = createAdminSupabaseClient();

    // Get the failed transaction
    const { data: failedTx, error: fetchError } = await supabase
        .from('donations')
        .select('*')
        .eq('id', failedTransactionId)
        .single() as { data: DonationsRow | null; error: Error | null };

    if (fetchError || !failedTx) {
        return {
            success: false,
            message: 'Failed transaction not found',
        };
    }

    if (failedTx.status !== 'failed') {
        return {
            success: false,
            message: 'Transaction is not in failed state',
        };
    }

    const retryCount = failedTx.retry_count || 0;
    if (retryCount >= 3) {
        return {
            success: false,
            message: 'Maximum retry attempts reached',
        };
    }

    // Update retry count
    const updateData: Partial<DonationsRow> = {
        retry_count: retryCount + 1,
        last_retry_at: new Date().toISOString(),
        status: 'pending',
        updated_at: new Date().toISOString(),
    };
    await supabase
        .from('donations' as keyof Database['public']['Tables'])
        .update(updateData as never)
        .eq('id', failedTransactionId);

    // In a real implementation, you would:
    // 1. Call the appropriate gateway API to retry the payment
    // 2. Update the transaction status based on the response

    return {
        success: true,
        message: 'Payment retry initiated',
        newTransactionId: failedTransactionId,
    };
}

// ============================================================================
// WEBHOOK MONITOR
// ============================================================================

// In-memory storage for webhook configurations (should be in database in production)
const webhookEndpoints: Map<string, WebhookEndpoint> = new Map();
const webhookDeliveries: Map<string, WebhookDelivery> = new Map();

/**
 * Validate webhook endpoint configurations
 */
export async function validateWebhookEndpoints(): Promise<{
    endpointId: string;
    gateway: PaymentGateway;
    url: string;
    isValid: boolean;
    error?: string;
}[]> {
    const results: {
        endpointId: string;
        gateway: PaymentGateway;
        url: string;
        isValid: boolean;
        error?: string;
    }[] = [];

    for (const endpoint of webhookEndpoints.values()) {
        try {
            // Attempt to validate the endpoint
            const response = await fetch(endpoint.url, {
                method: 'HEAD',
                headers: {
                    'X-Webhook-Validation': 'true',
                },
            });

            results.push({
                endpointId: endpoint.id,
                gateway: endpoint.gateway,
                url: endpoint.url,
                isValid: response.ok || response.status === 405, // 405 is OK for HEAD requests
            });
        } catch (error) {
            results.push({
                endpointId: endpoint.id,
                gateway: endpoint.gateway,
                url: endpoint.url,
                isValid: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    return results;
}

/**
 * Monitor webhook delivery status
 */
export async function monitorWebhookDelivery(options?: {
    since?: string;
    status?: WebhookStatus;
}): Promise<WebhookDelivery[]> {
    const since = options?.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const deliveries = Array.from(webhookDeliveries.values())
        .filter(d => d.createdAt >= since)
        .filter(d => !options?.status || d.status === options.status)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return deliveries;
}

/**
 * Get webhook health status
 */
export async function getWebhookStatus(): Promise<{
    endpoints: WebhookEndpoint[];
    recentDeliveries: WebhookDelivery[];
    failedDeliveries: WebhookDelivery[];
    deliveryRate: number;
    timestamp: string;
}> {
    const endpoints = Array.from(webhookEndpoints.values());

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentDeliveries = Array.from(webhookDeliveries.values())
        .filter(d => d.createdAt >= since);

    const failedDeliveries = recentDeliveries.filter(d => d.status === 'failed');

    const deliveryRate = recentDeliveries.length > 0
        ? ((recentDeliveries.length - failedDeliveries.length) / recentDeliveries.length) * 100
        : 100;

    return {
        endpoints,
        recentDeliveries: recentDeliveries.slice(0, 50),
        failedDeliveries,
        deliveryRate,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Replay failed webhooks
 */
export async function replayWebhook(deliveryId: string): Promise<{
    success: boolean;
    message: string;
    newDeliveryId?: string;
}> {
    const delivery = webhookDeliveries.get(deliveryId);

    if (!delivery) {
        return {
            success: false,
            message: 'Webhook delivery not found',
        };
    }

    if (delivery.status !== 'failed') {
        return {
            success: false,
            message: 'Webhook is not in failed state',
        };
    }

    const endpoint = webhookEndpoints.get(delivery.endpointId);

    if (!endpoint) {
        return {
            success: false,
            message: 'Webhook endpoint not found',
        };
    }

    // Create new delivery attempt
    const newDelivery: WebhookDelivery = {
        id: `delivery-${Date.now()}`,
        endpointId: endpoint.id,
        eventType: delivery.eventType,
        payload: delivery.payload,
        status: 'pending',
        attempts: 0,
        createdAt: new Date().toISOString(),
    };

    webhookDeliveries.set(newDelivery.id, newDelivery);

    // In a real implementation, you would trigger the actual webhook delivery here

    return {
        success: true,
        message: 'Webhook replay initiated',
        newDeliveryId: newDelivery.id,
    };
}

// ============================================================================
// PAYMENT REPORTER
// ============================================================================

/**
 * Generate comprehensive payment report
 */
export async function generatePaymentReport(options?: {
    period?: 'day' | 'week' | 'month' | 'custom';
    startDate?: string;
    endDate?: string;
}): Promise<PaymentReport> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (options?.period) {
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'custom':
            startDate = options.startDate ? new Date(options.startDate) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
            endDate = options.endDate ? new Date(options.endDate) : now;
            break;
        case 'day':
        default:
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    const [
        gatewayStatus,
        transactionStats,
        revenueMetrics,
        donationStats,
        failedTransactions,
        suspiciousPatterns,
    ] = await Promise.all([
        checkGatewayHealth(),
        getTransactionStats({ startDate: startDateStr, endDate: endDateStr }),
        getRevenueMetrics({ startDate: startDateStr, endDate: endDateStr }),
        getDonationStats({ startDate: startDateStr, endDate: endDateStr }),
        detectFailedTransactions({ since: startDateStr }),
        detectSuspiciousPayments(),
    ]);

    const webhookStatus = await getWebhookStatus();

    return {
        generatedAt: new Date().toISOString(),
        period: {
            start: startDateStr,
            end: endDateStr,
        },
        summary: {
            totalTransactions: transactionStats.totalTransactions,
            successfulTransactions: transactionStats.successfulTransactions,
            failedTransactions: transactionStats.failedTransactions,
            totalRevenue: transactionStats.totalRevenue,
            netRevenue: transactionStats.netRevenue,
        },
        gatewayStatus,
        transactionStats,
        revenueMetrics,
        donationStats,
        issues: {
            failedTransactions,
            suspiciousPatterns,
            webhookFailures: webhookStatus.failedDeliveries,
        },
    };
}

/**
 * Calculate revenue metrics
 */
export async function getRevenueMetrics(options?: {
    startDate?: string;
    endDate?: string;
}): Promise<RevenueMetrics> {
    const supabase = createAdminSupabaseClient();

    const endDate = options?.endDate ? new Date(options.endDate) : new Date();
    const startDate = options?.startDate
        ? new Date(options.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
        .from('donations')
        .select('amount, status, created_at')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()) as { data: Pick<DonationsRow, 'amount' | 'status' | 'created_at'>[] | null; error: Error | null };

    if (error || !data) {
        return {
            daily: [],
            weekly: [],
            monthly: [],
            trends: { dailyGrowth: 0, weeklyGrowth: 0, monthlyGrowth: 0 },
        };
    }

    // Daily aggregation
    const dailyMap = new Map<string, { revenue: number; count: number }>();
    const weeklyMap = new Map<string, { revenue: number; count: number }>();
    const monthlyMap = new Map<string, { revenue: number; count: number }>();

    data.forEach(tx => {
        const date = new Date(tx.created_at);
        const dayKey = date.toISOString().split('T')[0];
        const weekKey = getWeekKey(date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        // Daily
        if (!dailyMap.has(dayKey)) {
            dailyMap.set(dayKey, { revenue: 0, count: 0 });
        }
        const daily = dailyMap.get(dayKey)!;
        daily.revenue += tx.amount;
        daily.count++;

        // Weekly
        if (!weeklyMap.has(weekKey)) {
            weeklyMap.set(weekKey, { revenue: 0, count: 0 });
        }
        const weekly = weeklyMap.get(weekKey)!;
        weekly.revenue += tx.amount;
        weekly.count++;

        // Monthly
        if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { revenue: 0, count: 0 });
        }
        const monthly = monthlyMap.get(monthKey)!;
        monthly.revenue += tx.amount;
        monthly.count++;
    });

    const daily = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({
            date,
            revenue: stats.revenue,
            transactionCount: stats.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const weekly = Array.from(weeklyMap.entries())
        .map(([week, stats]) => ({
            week,
            revenue: stats.revenue,
            transactionCount: stats.count,
        }))
        .sort((a, b) => a.week.localeCompare(b.week));

    const monthly = Array.from(monthlyMap.entries())
        .map(([month, stats]) => ({
            month,
            revenue: stats.revenue,
            transactionCount: stats.count,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate trends
    const trends = calculateTrends(daily, weekly, monthly);

    return {
        daily,
        weekly,
        monthly,
        trends,
    };
}

/**
 * Get donation statistics
 */
export async function getDonationStats(options?: {
    startDate?: string;
    endDate?: string;
}): Promise<DonationStats> {
    const supabase = createAdminSupabaseClient();

    const endDate = options?.endDate ? new Date(options.endDate) : new Date();
    const startDate = options?.startDate
        ? new Date(options.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
        .from('donations')
        .select('amount, donor_email, donor_name, status, created_at')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()) as { data: Pick<DonationsRow, 'amount' | 'donor_email' | 'donor_name' | 'status' | 'created_at'>[] | null; error: Error | null };

    if (error || !data || data.length === 0) {
        return {
            totalDonors: 0,
            uniqueDonors: 0,
            returningDonors: 0,
            averageDonationAmount: 0,
            medianDonationAmount: 0,
            largestDonation: 0,
            smallestDonation: 0,
            topDonors: [],
            donationDistribution: [],
        };
    }

    // Calculate statistics
    const donorMap = new Map<string, { name: string; total: number; count: number }>();
    const amounts: number[] = [];

    data.forEach(tx => {
        amounts.push(tx.amount);

        if (tx.donor_email) {
            if (!donorMap.has(tx.donor_email)) {
                donorMap.set(tx.donor_email, { name: tx.donor_name || 'Anonymous', total: 0, count: 0 });
            }
            const donor = donorMap.get(tx.donor_email)!;
            donor.total += tx.amount;
            donor.count++;
        }
    });

    const uniqueDonors = donorMap.size;
    const returningDonors = Array.from(donorMap.values()).filter(d => d.count > 1).length;

    amounts.sort((a, b) => a - b);
    const totalAmount = amounts.reduce((sum, a) => sum + a, 0);

    // Donation distribution
    const ranges = [
        { min: 0, max: 500, label: '₹0 - ₹500' },
        { min: 500, max: 1000, label: '₹500 - ₹1,000' },
        { min: 1000, max: 2500, label: '₹1,000 - ₹2,500' },
        { min: 2500, max: 5000, label: '₹2,500 - ₹5,000' },
        { min: 5000, max: 10000, label: '₹5,000 - ₹10,000' },
        { min: 10000, max: Infinity, label: '₹10,000+' },
    ];

    const distribution = ranges.map(range => {
        const count = amounts.filter(a => a >= range.min && a < range.max).length;
        return {
            range: range.label,
            count,
            percentage: (count / amounts.length) * 100,
        };
    });

    // Top donors
    const topDonors = Array.from(donorMap.entries())
        .map(([email, stats]) => ({
            email,
            name: stats.name,
            totalAmount: stats.total,
            donationCount: stats.count,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10);

    return {
        totalDonors: amounts.length,
        uniqueDonors,
        returningDonors,
        averageDonationAmount: totalAmount / amounts.length,
        medianDonationAmount: amounts[Math.floor(amounts.length / 2)],
        largestDonation: amounts[amounts.length - 1],
        smallestDonation: amounts[0],
        topDonors,
        donationDistribution: distribution,
    };
}

/**
 * Alert on payment failures
 */
export async function alertOnPaymentIssues(): Promise<{
    alertsSent: number;
    issues: string[];
}> {
    const issues: string[] = [];
    let alertsSent = 0;

    // Check gateway health
    const gatewayStatus = await getGatewayStatus();

    for (const gateway of gatewayStatus.gateways) {
        if (gateway.status === 'critical') {
            const alertMessage = `CRITICAL: ${gateway.gateway} payment gateway is down - ${gateway.errorMessage}`;
            issues.push(alertMessage);

            await sendAlert({
                severity: 'CRITICAL',
                title: `${gateway.gateway} Gateway Down`,
                message: alertMessage,
                source: 'payment-monitor',
            });
            alertsSent++;
        } else if (gateway.status === 'degraded') {
            const alertMessage = `WARNING: ${gateway.gateway} payment gateway is degraded - Response time: ${gateway.responseTimeMs}ms`;
            issues.push(alertMessage);

            await sendAlert({
                severity: 'HIGH',
                title: `${gateway.gateway} Gateway Degraded`,
                message: alertMessage,
                source: 'payment-monitor',
            });
            alertsSent++;
        }

        if (gateway.successRate < 90) {
            const alertMessage = `WARNING: ${gateway.gateway} success rate dropped to ${gateway.successRate.toFixed(2)}%`;
            issues.push(alertMessage);

            await sendAlert({
                severity: 'MEDIUM',
                title: `${gateway.gateway} Success Rate Low`,
                message: alertMessage,
                source: 'payment-monitor',
            });
            alertsSent++;
        }
    }

    // Check for failed transactions
    const failedTxs = await detectFailedTransactions({
        since: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // Last hour
    });

    if (failedTxs.length > 10) {
        const alertMessage = `WARNING: ${failedTxs.length} failed transactions in the last hour`;
        issues.push(alertMessage);

        await sendAlert({
            severity: 'HIGH',
            title: 'High Payment Failure Rate',
            message: alertMessage,
            source: 'payment-monitor',
        });
        alertsSent++;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = await detectSuspiciousPayments();

    for (const pattern of suspiciousPatterns) {
        if (pattern.riskScore > 70) {
            const alertMessage = `SUSPICIOUS: ${pattern.description} (Risk Score: ${pattern.riskScore})`;
            issues.push(alertMessage);

            await sendAlert({
                severity: 'HIGH',
                title: 'Suspicious Payment Activity Detected',
                message: alertMessage,
                source: 'payment-monitor',
            });
            alertsSent++;
        }
    }

    return {
        alertsSent,
        issues,
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${String(week).padStart(2, '0')}`;
}

function calculateTrends(
    daily: RevenueMetrics['daily'],
    weekly: RevenueMetrics['weekly'],
    monthly: RevenueMetrics['monthly']
): RevenueMetrics['trends'] {
    // Calculate daily growth
    let dailyGrowth = 0;
    if (daily.length >= 2) {
        const yesterday = daily[daily.length - 1].revenue;
        const dayBefore = daily[daily.length - 2].revenue;
        dailyGrowth = dayBefore > 0 ? ((yesterday - dayBefore) / dayBefore) * 100 : 0;
    }

    // Calculate weekly growth
    let weeklyGrowth = 0;
    if (weekly.length >= 2) {
        const lastWeek = weekly[weekly.length - 1].revenue;
        const weekBefore = weekly[weekly.length - 2].revenue;
        weeklyGrowth = weekBefore > 0 ? ((lastWeek - weekBefore) / weekBefore) * 100 : 0;
    }

    // Calculate monthly growth
    let monthlyGrowth = 0;
    if (monthly.length >= 2) {
        const lastMonth = monthly[monthly.length - 1].revenue;
        const monthBefore = monthly[monthly.length - 2].revenue;
        monthlyGrowth = monthBefore > 0 ? ((lastMonth - monthBefore) / monthBefore) * 100 : 0;
    }

    return {
        dailyGrowth,
        weeklyGrowth,
        monthlyGrowth,
    };
}
