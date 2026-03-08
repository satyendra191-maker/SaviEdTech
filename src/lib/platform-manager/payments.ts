/**
 * SaviEduTech Team Autonomous Platform Manager - Payment Monitoring System
 *
 * Comprehensive monitoring and tracking for Razorpay gateway
 */

import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { sendAlert, type AlertSeverity } from './alerts';

type DonationsRow = Database['public']['Tables']['donations']['Row'];

export type PaymentGateway = 'razorpay';
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
    gatewayResponse?: unknown;
    createdAt: string;
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
    timeRange: { start: string; end: string };
    gatewayBreakdown: Record<PaymentGateway, { count: number; revenue: number; successRate: number }>;
}

export interface WebhookEndpoint {
    id: string;
    gateway: PaymentGateway;
    url: string;
    events: string[];
    isActive: boolean;
    secret?: string;
}

export interface WebhookDelivery {
    id: string;
    endpointId: string;
    gateway: PaymentGateway;
    event: string;
    status: WebhookStatus;
    attempts: number;
    responseCode?: number;
    responseBody?: string;
    deliveredAt?: string;
    createdAt: string;
}

export interface RevenueMetrics {
    totalRevenue: number;
    revenueChange: number;
    transactionCount: number;
    averageOrderValue: number;
    successRate: number;
    topPerformingDay: { date: string; revenue: number } | null;
}

export interface DonationStats {
    totalDonations: number;
    totalAmount: number;
    averageAmount: number;
    successRate: number;
    byStatus: Record<PaymentStatus, number>;
    byGateway: Record<PaymentGateway, number>;
}

// ============================================================================
// RAZORPAY MONITORING
// ============================================================================

export async function monitorRazorpay(): Promise<GatewayHealth> {
    const startTime = Date.now();
    const supabase = createAdminSupabaseClient();

    try {
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

export async function checkGatewayHealth(): Promise<GatewayHealth[]> {
    const results = await Promise.all([monitorRazorpay()]);
    return results;
}

export async function getGatewayStatus(): Promise<{
    gateways: GatewayHealth[];
    overallStatus: 'healthy' | 'degraded' | 'critical';
    timestamp: string;
}> {
    const gateways = await checkGatewayHealth();
    const criticalCount = gateways.filter(g => g.status === 'critical').length;
    const degradedCount = gateways.filter(g => g.status === 'degraded').length;

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalCount > 0) overallStatus = 'critical';
    else if (degradedCount > 0) overallStatus = 'degraded';

    return { gateways, overallStatus, timestamp: new Date().toISOString() };
}

export async function monitorTransactions(options?: {
    startDate?: string;
    endDate?: string;
}): Promise<Transaction[]> {
    const supabase = createAdminSupabaseClient();
    const startDate = options?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = options?.endDate || new Date().toISOString();

    const { data, error } = await supabase
        .from('donations')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false }) as { data: DonationsRow[] | null; error: Error | null };

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }

    return (data || []).map(t => ({
        id: t.id,
        gateway: t.gateway as PaymentGateway,
        amount: Number(t.amount),
        currency: t.currency || 'INR',
        status: t.status as PaymentStatus,
        donorEmail: t.donor_email || undefined,
        donorName: t.donor_name || undefined,
        donorPhone: t.donor_phone || undefined,
        orderId: t.order_id || undefined,
        paymentId: t.payment_id || undefined,
        gatewayResponse: t.gateway_response || undefined,
        createdAt: t.created_at,
    }));
}

export async function detectFailedTransactions(options?: {
    hours?: number;
}): Promise<Transaction[]> {
    const supabase = createAdminSupabaseClient();
    const hours = options?.hours || 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('status', 'failed')
        .gte('created_at', cutoff) as { data: DonationsRow[] | null; error: Error | null };

    if (error) {
        console.error('Error detecting failed transactions:', error);
        return [];
    }

    return (data || []).map(t => ({
        id: t.id,
        gateway: t.gateway as PaymentGateway,
        amount: Number(t.amount),
        currency: t.currency || 'INR',
        status: t.status as PaymentStatus,
        donorEmail: t.donor_email || undefined,
        donorName: t.donor_name || undefined,
        orderId: t.order_id || undefined,
        paymentId: t.payment_id || undefined,
        createdAt: t.created_at,
    }));
}

export async function detectSuspiciousPayments(options?: {
    threshold?: number;
}): Promise<{ transaction: Transaction; riskScore: number; reasons: string[] }[]> {
    const supabase = createAdminSupabaseClient();
    const threshold = options?.threshold || 10000;
    const recentTx = await monitorTransactions();

    const patterns: { transaction: Transaction; riskScore: number; reasons: string[] }[] = [];

    for (const tx of recentTx) {
        const reasons: string[] = [];
        let riskScore = 0;

        if (tx.amount > threshold) {
            reasons.push(`High amount: ₹${tx.amount}`);
            riskScore += 30;
        }

        if (!tx.donorEmail && !tx.donorPhone) {
            reasons.push('No contact information');
            riskScore += 20;
        }

        if (tx.status === 'failed') {
            reasons.push('Failed payment');
            riskScore += 40;
        }

        if (riskScore > 0) {
            patterns.push({ transaction: tx, riskScore, reasons });
        }
    }

    return patterns.sort((a, b) => b.riskScore - a.riskScore);
}

export async function getTransactionStats(options?: {
    startDate?: string;
    endDate?: string;
}): Promise<TransactionStats> {
    const supabase = createAdminSupabaseClient();
    const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = options?.endDate || new Date().toISOString();

    const { data, error } = await supabase
        .from('donations')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate) as { data: DonationsRow[] | null; error: Error | null };

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
            gatewayBreakdown: { razorpay: { count: 0, revenue: 0, successRate: 0 } },
        };
    }

    const transactions = data || [];
    const successful = transactions.filter(t => t.status === 'completed');
    const failed = transactions.filter(t => t.status === 'failed');
    const pending = transactions.filter(t => t.status === 'pending');
    const refunded = transactions.filter(t => t.status === 'refunded');

    const totalRevenue = successful.reduce((sum, t) => sum + Number(t.amount), 0);
    const refundedAmount = refunded.reduce((sum, t) => sum + Number(t.amount), 0);

    const gatewayBreakdown: TransactionStats['gatewayBreakdown'] = {
        razorpay: { count: 0, revenue: 0, successRate: 0 },
    };

    const gatewayTxs = transactions.filter(t => t.gateway === 'razorpay');
    const gatewaySuccessful = gatewayTxs.filter(t => t.status === 'completed');
    gatewayBreakdown.razorpay = {
        count: gatewayTxs.length,
        revenue: gatewaySuccessful.reduce((sum, t) => sum + Number(t.amount), 0),
        successRate: gatewayTxs.length > 0 ? (gatewaySuccessful.length / gatewayTxs.length) * 100 : 0,
    };

    return {
        totalTransactions: transactions.length,
        successfulTransactions: successful.length,
        failedTransactions: failed.length,
        pendingTransactions: pending.length,
        refundedTransactions: refunded.length,
        totalRevenue,
        refundedAmount,
        netRevenue: totalRevenue - refundedAmount,
        successRate: transactions.length > 0 ? (successful.length / transactions.length) * 100 : 0,
        averageTransactionAmount: successful.length > 0 ? totalRevenue / successful.length : 0,
        timeRange: { start: startDate, end: endDate },
        gatewayBreakdown,
    };
}

export async function retryFailedPayment(failedTransactionId: string): Promise<{
    success: boolean;
    message: string;
    newTransactionId?: string;
}> {
    const supabase = createAdminSupabaseClient();

    const { data: failedTx, error: fetchError } = await supabase
        .from('donations')
        .select('*')
        .eq('id', failedTransactionId)
        .single() as { data: DonationsRow | null; error: Error | null };

    if (fetchError || !failedTx) {
        return { success: false, message: 'Failed transaction not found' };
    }

    if (failedTx.status !== 'failed') {
        return { success: false, message: 'Transaction is not in failed state' };
    }

    await supabase
        .from('donations')
        .update({ status: 'pending', updated_at: new Date().toISOString() } as never)
        .eq('id', failedTransactionId);

    return { success: true, message: 'Payment retry initiated', newTransactionId: failedTransactionId };
}

export async function getRevenueMetrics(options?: {
    startDate?: string;
    endDate?: string;
}): Promise<RevenueMetrics> {
    const stats = await getTransactionStats(options);

    return {
        totalRevenue: stats.totalRevenue,
        revenueChange: 0,
        transactionCount: stats.totalTransactions,
        averageOrderValue: stats.averageTransactionAmount,
        successRate: stats.successRate,
        topPerformingDay: null,
    };
}

export async function getDonationStats(): Promise<DonationStats> {
    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
        .from('donations')
        .select('*') as { data: DonationsRow[] | null; error: Error | null };

    if (error || !data) {
        return {
            totalDonations: 0,
            totalAmount: 0,
            averageAmount: 0,
            successRate: 0,
            byStatus: { pending: 0, completed: 0, failed: 0, refunded: 0, cancelled: 0 },
            byGateway: { razorpay: 0 },
        };
    }

    const donations = data;
    const completed = donations.filter(t => t.status === 'completed');

    const byStatus: Record<PaymentStatus, number> = {
        pending: donations.filter(t => t.status === 'pending').length,
        completed: donations.filter(t => t.status === 'completed').length,
        failed: donations.filter(t => t.status === 'failed').length,
        refunded: donations.filter(t => t.status === 'refunded').length,
        cancelled: donations.filter(t => t.status === 'cancelled').length,
    };

    const byGateway: Record<PaymentGateway, number> = {
        razorpay: donations.filter(t => t.gateway === 'razorpay').length,
    };

    return {
        totalDonations: donations.length,
        totalAmount: completed.reduce((sum, t) => sum + Number(t.amount), 0),
        averageAmount: completed.length > 0 ? completed.reduce((sum, t) => sum + Number(t.amount), 0) / completed.length : 0,
        successRate: donations.length > 0 ? (completed.length / donations.length) * 100 : 0,
        byStatus,
        byGateway,
    };
}

export async function alertOnPaymentIssues(): Promise<{
    sent: boolean;
    issues: string[];
}> {
    const issues: string[] = [];

    const failedTx = await detectFailedTransactions({ hours: 1 });
    if (failedTx.length > 0) {
        issues.push(`${failedTx.length} failed transactions in the last hour`);
    }

    const gatewayStatus = await checkGatewayHealth();
    const criticalGateways = gatewayStatus.filter(g => g.status === 'critical');
    if (criticalGateways.length > 0) {
        issues.push(`Critical: ${criticalGateways.map(g => g.gateway).join(', ')} gateway(s) not responding`);
    }

    if (issues.length > 0) {
        await sendAlert({
            severity: 'CRITICAL' as AlertSeverity,
            title: 'Payment Issues Detected',
            message: issues.join('. '),
            source: 'payments',
            metadata: { issues },
        });
    }

    return { sent: issues.length > 0, issues };
}
