import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database, Json } from '@/types/supabase';
import {
    buildCourseInvoiceNumber,
    buildDonationReceiptNumber,
    calculateInclusiveTaxBreakdown,
    formatInr,
    resolveGstRate,
} from '@/lib/finance/documents';
import { generateAdminReportPDF, type AdminReportPayload, type AdminReportTable } from '@/lib/pdf/admin-report';

type PaymentRow = Database['public']['Tables']['payments']['Row'];
type DonationRow = Database['public']['Tables']['donations']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type FinancialTransactionRow = Database['public']['Tables']['financial_transactions']['Row'];
type CourseInvoiceRow = Database['public']['Tables']['course_invoices']['Row'];
type DonationReceiptRow = Database['public']['Tables']['donation_receipts']['Row'];
type FinancialAuditLogRow = Database['public']['Tables']['financial_audit_logs']['Row'];
type GstReportRow = Database['public']['Tables']['gst_reports']['Row'];
type LedgerEntryInsert = Database['public']['Tables']['ledger_entries']['Insert'];

export type FinanceReportType =
    | 'monthly-gst-sales'
    | 'course-sales'
    | 'donation-transactions'
    | 'revenue-summary'
    | 'transaction-ledger'
    | 'gstr1'
    | 'gstr3b';

export interface FinanceDashboardSummary {
    metrics: {
        totalCourseRevenue: number;
        totalDonations: number;
        gstCollected: number;
        netRevenue: number;
        monthlyCourseRevenue: number;
        monthlyDonations: number;
        monthlyGstCollected: number;
        completedTransactions: number;
        refundedTransactions: number;
    };
    dailyRevenueTrend: Array<{
        label: string;
        courseRevenue: number;
        donations: number;
        gst: number;
        netRevenue: number;
    }>;
    monthlyRevenueTrend: Array<{
        label: string;
        courseRevenue: number;
        donations: number;
        gst: number;
        netRevenue: number;
    }>;
    courseSalesBreakdown: Array<{
        label: string;
        amount: number;
        count: number;
    }>;
    donationTrend: Array<{
        label: string;
        amount: number;
        count: number;
    }>;
    recentTransactions: Array<{
        id: string;
        occurredAt: string;
        transactionType: string;
        transactionKind: string;
        status: string;
        counterparty: string;
        documentNumber: string | null;
        reference: string | null;
        grossAmount: number;
        gstAmount: number;
    }>;
    recentInvoices: Array<Pick<CourseInvoiceRow, 'id' | 'invoice_number' | 'course_title' | 'student_name' | 'total_amount' | 'invoice_date' | 'status'>>;
    recentReceipts: Array<Pick<DonationReceiptRow, 'id' | 'receipt_number' | 'donor_name' | 'amount' | 'receipt_date'>>;
    gstReports: Array<Pick<GstReportRow, 'id' | 'report_type' | 'report_month' | 'file_format' | 'total_taxable_value' | 'total_gst_amount' | 'total_invoice_value' | 'created_at'>>;
    recentAuditLogs: Array<Pick<FinancialAuditLogRow, 'id' | 'action_type' | 'message' | 'reference_type' | 'reference_id' | 'created_at'>>;
}

export interface FinanceReportDataset {
    reportType: FinanceReportType;
    title: string;
    subtitle: string;
    fileBaseName: string;
    periodLabel: string;
    metrics: Array<{
        label: string;
        value: string;
        helper?: string;
    }>;
    tables: AdminReportTable[];
    charts: Array<{
        title: string;
        points: Array<{ label: string; value: number }>;
    }>;
    csvRows: Array<Record<string, string | number>>;
    gstSnapshot?: {
        reportType: Database['public']['Tables']['gst_reports']['Insert']['report_type'];
        reportMonth: string;
        periodStart: string;
        periodEnd: string;
        totalTaxableValue: number;
        totalGstAmount: number;
        totalInvoiceValue: number;
        totalDonationValue: number;
        totalTransactions: number;
        summary: Record<string, unknown>;
    };
}

const LEDGER_ACCOUNTS = {
    bank: {
        code: 'BANK_RAZORPAY',
        name: 'Bank / Payment Gateway Account',
    },
    courseRevenue: {
        code: 'COURSE_REVENUE',
        name: 'Course Revenue Account',
    },
    donationIncome: {
        code: 'DONATION_INCOME',
        name: 'Donation Income Account',
    },
    gstOutput: {
        code: 'GST_OUTPUT',
        name: 'GST Output Tax Account',
    },
    refund: {
        code: 'REFUND_ACCOUNT',
        name: 'Refund Account',
    },
} as const;

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
}

function asJson(value: unknown): Json {
    return (value ?? {}) as Json;
}

function asNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return 0;
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, delta: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function formatMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function formatDayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function formatDisplayDate(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
    });
}

function formatDisplayMonth(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit',
    });
}

function monthRange(monthKey?: string | null) {
    const now = new Date();
    let base = startOfMonth(now);

    if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) {
        const [year, month] = monthKey.split('-').map(Number);
        if (Number.isFinite(year) && Number.isFinite(month)) {
            base = new Date(year, month - 1, 1);
        }
    }

    const start = startOfMonth(base);
    const end = endOfMonth(base);

    return {
        monthKey: formatMonthKey(start),
        start,
        end,
    };
}

function withTwoDecimals(value: number): number {
    return Number(value.toFixed(2));
}

async function fetchPayment(paymentId: string): Promise<PaymentRow | null> {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data as PaymentRow | null;
}

async function fetchProfile(userId: string | null): Promise<ProfileRow | null> {
    if (!userId) {
        return null;
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data as ProfileRow | null;
}

async function fetchDonationForPayment(payment: PaymentRow): Promise<DonationRow | null> {
    if (payment.payment_type !== 'donation') {
        return null;
    }

    const supabase = createAdminSupabaseClient();
    let query = supabase
        .from('donations')
        .select('*')
        .limit(1);

    if (payment.razorpay_payment_id) {
        query = query.eq('payment_id', payment.razorpay_payment_id);
    } else if (payment.razorpay_order_id) {
        query = query.eq('order_id', payment.razorpay_order_id);
    } else if (payment.transaction_id) {
        query = query.eq('transaction_id', payment.transaction_id);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
        throw error;
    }

    return data as DonationRow | null;
}

async function logFinancialAudit(params: {
    actorUserId?: string | null;
    actorRole?: string | null;
    actionType: string;
    referenceType?: string | null;
    referenceId?: string | null;
    message?: string | null;
    metadata?: Record<string, unknown>;
}) {
    const supabase = createAdminSupabaseClient();
    const auditPayload: Database['public']['Tables']['financial_audit_logs']['Insert'] = {
        actor_user_id: params.actorUserId ?? null,
        actor_role: params.actorRole ?? 'system',
        action_type: params.actionType,
        module: 'finance',
        reference_type: params.referenceType ?? null,
        reference_id: params.referenceId ?? null,
        message: params.message ?? null,
        metadata: asJson(params.metadata),
    };

    await supabase.from('financial_audit_logs').insert(auditPayload as never);
}

export async function recordFinanceAuditAction(params: {
    actorUserId?: string | null;
    actorRole?: string | null;
    actionType: string;
    referenceType?: string | null;
    referenceId?: string | null;
    message?: string | null;
    metadata?: Record<string, unknown>;
}) {
    await logFinancialAudit(params);
}

async function rebuildLedgerEntries(transaction: FinancialTransactionRow) {
    const supabase = createAdminSupabaseClient();
    const entryGroupId = transaction.transaction_reference
        || transaction.external_payment_id
        || transaction.external_order_id
        || transaction.id;

    const rows: LedgerEntryInsert[] = [];

    if (transaction.transaction_kind === 'refund') {
        if (transaction.transaction_type === 'donation') {
            rows.push(
                {
                    financial_transaction_id: transaction.id,
                    entry_group_id: entryGroupId,
                    entry_type: 'debit',
                    ledger_account_code: LEDGER_ACCOUNTS.refund.code,
                    ledger_account_name: LEDGER_ACCOUNTS.refund.name,
                    amount: transaction.gross_amount,
                    currency: transaction.currency,
                    narration: 'Donation refund recognised',
                },
                {
                    financial_transaction_id: transaction.id,
                    entry_group_id: entryGroupId,
                    entry_type: 'credit',
                    ledger_account_code: LEDGER_ACCOUNTS.bank.code,
                    ledger_account_name: LEDGER_ACCOUNTS.bank.name,
                    amount: transaction.gross_amount,
                    currency: transaction.currency,
                    narration: 'Refund issued back through Razorpay',
                }
            );
        } else {
            rows.push({
                financial_transaction_id: transaction.id,
                entry_group_id: entryGroupId,
                entry_type: 'debit',
                ledger_account_code: LEDGER_ACCOUNTS.refund.code,
                ledger_account_name: LEDGER_ACCOUNTS.refund.name,
                amount: transaction.taxable_value > 0 ? transaction.taxable_value : transaction.gross_amount,
                currency: transaction.currency,
                narration: 'Course or subscription refund recognised',
            });

            if (transaction.gst_amount > 0) {
                rows.push({
                    financial_transaction_id: transaction.id,
                    entry_group_id: entryGroupId,
                    entry_type: 'debit',
                    ledger_account_code: LEDGER_ACCOUNTS.gstOutput.code,
                    ledger_account_name: LEDGER_ACCOUNTS.gstOutput.name,
                    amount: transaction.gst_amount,
                    currency: transaction.currency,
                    narration: 'GST liability reversed for refund',
                });
            }

            rows.push({
                financial_transaction_id: transaction.id,
                entry_group_id: entryGroupId,
                entry_type: 'credit',
                ledger_account_code: LEDGER_ACCOUNTS.bank.code,
                ledger_account_name: LEDGER_ACCOUNTS.bank.name,
                amount: transaction.gross_amount,
                currency: transaction.currency,
                narration: 'Refund paid out through Razorpay',
            });
        }
    } else {
        rows.push({
            financial_transaction_id: transaction.id,
            entry_group_id: entryGroupId,
            entry_type: 'debit',
            ledger_account_code: LEDGER_ACCOUNTS.bank.code,
            ledger_account_name: LEDGER_ACCOUNTS.bank.name,
            amount: transaction.gross_amount,
            currency: transaction.currency,
            narration: 'Payment captured through Razorpay',
        });

        if (transaction.transaction_type === 'donation') {
            rows.push({
                financial_transaction_id: transaction.id,
                entry_group_id: entryGroupId,
                entry_type: 'credit',
                ledger_account_code: LEDGER_ACCOUNTS.donationIncome.code,
                ledger_account_name: LEDGER_ACCOUNTS.donationIncome.name,
                amount: transaction.gross_amount,
                currency: transaction.currency,
                narration: 'Donation income recognised',
            });
        } else {
            rows.push({
                financial_transaction_id: transaction.id,
                entry_group_id: entryGroupId,
                entry_type: 'credit',
                ledger_account_code: LEDGER_ACCOUNTS.courseRevenue.code,
                ledger_account_name: LEDGER_ACCOUNTS.courseRevenue.name,
                amount: transaction.taxable_value > 0 ? transaction.taxable_value : transaction.gross_amount,
                currency: transaction.currency,
                narration: 'Course or subscription revenue recognised',
            });

            if (transaction.gst_amount > 0) {
                rows.push({
                    financial_transaction_id: transaction.id,
                    entry_group_id: entryGroupId,
                    entry_type: 'credit',
                    ledger_account_code: LEDGER_ACCOUNTS.gstOutput.code,
                    ledger_account_name: LEDGER_ACCOUNTS.gstOutput.name,
                    amount: transaction.gst_amount,
                    currency: transaction.currency,
                    narration: 'GST output liability recognised',
                });
            }
        }
    }

    await supabase
        .from('ledger_entries')
        .delete()
        .eq('financial_transaction_id', transaction.id);

    if (rows.length > 0) {
        const { error } = await supabase.from('ledger_entries').insert(rows as never);
        if (error) {
            throw error;
        }
    }
}

async function syncRefundTransaction(payment: PaymentRow, captureTransaction: FinancialTransactionRow) {
    if (payment.status !== 'refunded') {
        return null;
    }

    const supabase = createAdminSupabaseClient();
    const { data: existingRefundData } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('payment_id', payment.id)
        .eq('transaction_kind', 'refund')
        .maybeSingle();
    const existingRefund = existingRefundData as FinancialTransactionRow | null;

    const refundPayload: Database['public']['Tables']['financial_transactions']['Insert'] = {
        payment_id: payment.id,
        donation_id: captureTransaction.donation_id,
        user_id: payment.user_id,
        transaction_kind: 'refund',
        transaction_type: payment.payment_type,
        status: 'refunded',
        gross_amount: captureTransaction.gross_amount,
        taxable_value: captureTransaction.taxable_value,
        gst_rate: captureTransaction.gst_rate,
        gst_amount: captureTransaction.gst_amount,
        net_amount: captureTransaction.net_amount,
        currency: payment.currency,
        payment_gateway: payment.payment_method,
        transaction_reference: payment.razorpay_payment_id || payment.transaction_id || payment.razorpay_order_id || payment.id,
        external_order_id: payment.razorpay_order_id,
        external_payment_id: payment.razorpay_payment_id,
        source_document_number: captureTransaction.source_document_number,
        description: `Refund for ${payment.payment_type.replace('_', ' ')}`,
        occurred_at: payment.processed_at || payment.updated_at || new Date().toISOString(),
        metadata: {
            sourcePaymentId: payment.id,
            sourceTransactionId: captureTransaction.id,
            ...asRecord(payment.metadata),
        } as Json,
    };

    const { data: refundTransaction, error: refundError } = await supabase
        .from('financial_transactions')
        .upsert(refundPayload as never, {
            onConflict: 'payment_id,transaction_kind',
        })
        .select('*')
        .single();

    if (refundError) {
        throw refundError;
    }

    if (payment.payment_type === 'donation') {
        const { data: receiptData } = await supabase
            .from('donation_receipts')
            .select('metadata')
            .eq('payment_id', payment.id)
            .maybeSingle();
        const receiptMetadata = asRecord((receiptData as { metadata?: unknown } | null)?.metadata);

        await supabase
            .from('donation_receipts')
            .update({
                metadata: {
                    ...receiptMetadata,
                    refundedAt: payment.updated_at,
                },
            } as never)
            .eq('payment_id', payment.id);
    } else {
        await supabase
            .from('course_invoices')
            .update({
                status: 'refunded',
                updated_at: new Date().toISOString(),
            } as never)
            .eq('payment_id', payment.id);
    }

    await rebuildLedgerEntries(refundTransaction as FinancialTransactionRow);

    if (!existingRefund?.id) {
        await logFinancialAudit({
            actionType: 'refund_accounted',
            referenceType: 'payment',
            referenceId: payment.id,
            message: 'Refund accounting entries were generated automatically.',
            metadata: {
                paymentType: payment.payment_type,
                grossAmount: payment.amount,
            },
        });
    }

    return refundTransaction as FinancialTransactionRow;
}

async function mergePaymentMetadata(payment: PaymentRow, patch: Record<string, unknown>) {
    const supabase = createAdminSupabaseClient();
    const metadata = {
        ...asRecord(payment.metadata),
        ...patch,
    };

    const { error } = await supabase
        .from('payments')
        .update({
            metadata: asJson(metadata),
            updated_at: new Date().toISOString(),
        } as never)
        .eq('id', payment.id);

    if (error) {
        throw error;
    }
}

export async function syncFinancialRecordsForPaymentRecord(paymentId: string) {
    const supabase = createAdminSupabaseClient();
    const payment = await fetchPayment(paymentId);

    if (!payment) {
        return null;
    }

    if (!['completed', 'refunded'].includes(payment.status)) {
        return null;
    }

    const metadata = asRecord(payment.metadata);
    const profile = await fetchProfile(payment.user_id);
    const donation = await fetchDonationForPayment(payment);
    const gstRate = resolveGstRate(payment.payment_type, metadata);
    const breakdown = calculateInclusiveTaxBreakdown(payment.amount, gstRate);

    const { data: existingTransactionData } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('payment_id', payment.id)
        .eq('transaction_kind', 'capture')
        .maybeSingle();
    const existingTransaction = existingTransactionData as FinancialTransactionRow | null;

    const capturePayload: Database['public']['Tables']['financial_transactions']['Insert'] = {
        payment_id: payment.id,
        donation_id: donation?.id || null,
        user_id: payment.user_id,
        transaction_kind: 'capture',
        transaction_type: payment.payment_type,
        status: payment.status,
        gross_amount: withTwoDecimals(payment.amount),
        taxable_value: breakdown.taxableValue,
        gst_rate: breakdown.gstRate,
        gst_amount: breakdown.gstAmount,
        net_amount: breakdown.taxableValue,
        currency: payment.currency,
        payment_gateway: payment.payment_method,
        transaction_reference: payment.razorpay_payment_id || payment.transaction_id || payment.razorpay_order_id || payment.id,
        external_order_id: payment.razorpay_order_id,
        external_payment_id: payment.razorpay_payment_id,
        source_document_number: null,
        description: asString(metadata.description) || `${payment.payment_type.replace('_', ' ')} payment`,
        occurred_at: payment.processed_at || payment.timestamp,
        metadata: asJson(metadata),
    };

    const { data: captureTransactionData, error: captureError } = await supabase
        .from('financial_transactions')
        .upsert(capturePayload as never, {
            onConflict: 'payment_id,transaction_kind',
        })
        .select('*')
        .single();

    if (captureError) {
        throw captureError;
    }

    const captureTransaction = captureTransactionData as FinancialTransactionRow;
    let sourceDocumentNumber: string | null = captureTransaction.source_document_number;

    if (payment.payment_type === 'donation') {
        const { data: existingReceiptData } = await supabase
            .from('donation_receipts')
            .select('*')
            .eq('payment_id', payment.id)
            .maybeSingle();
        const existingReceipt = existingReceiptData as DonationReceiptRow | null;

        const receiptNumber = existingReceipt?.receipt_number
            || donation?.receipt_number
            || asString(asRecord(donation?.metadata).receipt_number)
            || asString(metadata.receipt_number)
            || buildDonationReceiptNumber(
                donation?.completed_at || payment.processed_at || payment.timestamp,
                payment.razorpay_payment_id || payment.razorpay_order_id || payment.id
            );

        const receiptPayload: Database['public']['Tables']['donation_receipts']['Insert'] = {
            donation_id: donation?.id || null,
            payment_id: payment.id,
            financial_transaction_id: captureTransaction.id,
            user_id: payment.user_id,
            receipt_number: receiptNumber,
            donor_name: donation?.donor_name || asString(metadata.donor_name) || profile?.full_name || 'Anonymous Donor',
            donor_email: donation?.donor_email || asString(metadata.donor_email) || profile?.email || null,
            donor_phone: donation?.donor_phone || asString(metadata.donor_phone) || profile?.phone || null,
            amount: withTwoDecimals(payment.amount),
            currency: payment.currency,
            transaction_id: payment.razorpay_payment_id || payment.transaction_id || payment.razorpay_order_id,
            receipt_date: donation?.completed_at || payment.processed_at || payment.timestamp,
            metadata: {
                ...asRecord(donation?.metadata),
                ...metadata,
            } as Json,
        };

        const { error: receiptError } = await supabase
            .from('donation_receipts')
            .upsert(receiptPayload as never, {
                onConflict: 'payment_id',
            });

        if (receiptError) {
            throw receiptError;
        }

        if (donation?.id) {
            await supabase
                .from('donations')
                .update({
                    receipt_number: receiptNumber,
                    metadata: {
                        ...asRecord(donation.metadata),
                        receipt_number: receiptNumber,
                    },
                    updated_at: new Date().toISOString(),
                } as never)
                .eq('id', donation.id);
        }

        await mergePaymentMetadata(payment, { receipt_number: receiptNumber });
        sourceDocumentNumber = receiptNumber;

        if (!existingReceipt?.id) {
            await logFinancialAudit({
                actionType: 'donation_receipt_issued',
                referenceType: 'payment',
                referenceId: payment.id,
                message: 'Donation receipt created automatically after successful payment.',
                metadata: {
                    receiptNumber,
                    amount: payment.amount,
                },
            });
        }
    } else {
        const { data: existingInvoiceData } = await supabase
            .from('course_invoices')
            .select('*')
            .eq('payment_id', payment.id)
            .maybeSingle();
        const existingInvoice = existingInvoiceData as CourseInvoiceRow | null;

        const invoiceNumber = existingInvoice?.invoice_number
            || asString(metadata.invoice_number)
            || buildCourseInvoiceNumber(
                payment.processed_at || payment.timestamp,
                payment.razorpay_payment_id || payment.razorpay_order_id || payment.id
            );

        const studentName = profile?.full_name
            || asString(metadata.studentName)
            || asString(metadata.donor_name)
            || 'Student';
        const studentEmail = profile?.email
            || asString(metadata.studentEmail)
            || asString(metadata.donor_email);
        const courseTitle = asString(metadata.courseTitle)
            || asString(metadata.planId)
            || 'SaviEduTech Learning Product';

        const invoicePayload: Database['public']['Tables']['course_invoices']['Insert'] = {
            payment_id: payment.id,
            financial_transaction_id: captureTransaction.id,
            user_id: payment.user_id,
            invoice_number: invoiceNumber,
            invoice_type: payment.payment_type,
            student_name: studentName,
            student_email: studentEmail,
            course_id: asString(metadata.courseId),
            course_title: courseTitle,
            taxable_value: breakdown.taxableValue,
            gst_rate: breakdown.gstRate,
            gst_amount: breakdown.gstAmount,
            total_amount: withTwoDecimals(payment.amount),
            currency: payment.currency,
            transaction_id: payment.transaction_id || payment.razorpay_payment_id,
            payment_reference: payment.razorpay_order_id,
            invoice_date: payment.processed_at || payment.timestamp,
            status: payment.status === 'refunded' ? 'refunded' : 'issued',
            metadata: asJson(metadata),
        };

        const { error: invoiceError } = await supabase
            .from('course_invoices')
            .upsert(invoicePayload as never, {
                onConflict: 'payment_id',
            });

        if (invoiceError) {
            throw invoiceError;
        }

        await mergePaymentMetadata(payment, {
            invoice_number: invoiceNumber,
            gstRate: breakdown.gstRate,
            taxableValue: breakdown.taxableValue,
            gstAmount: breakdown.gstAmount,
        });
        sourceDocumentNumber = invoiceNumber;

        if (!existingInvoice?.id) {
            await logFinancialAudit({
                actionType: 'course_invoice_issued',
                referenceType: 'payment',
                referenceId: payment.id,
                message: 'Course tax invoice created automatically after successful payment.',
                metadata: {
                    invoiceNumber,
                    amount: payment.amount,
                    transactionType: payment.payment_type,
                },
            });
        }
    }

    if (sourceDocumentNumber !== captureTransaction.source_document_number) {
        const { error: transactionUpdateError } = await supabase
            .from('financial_transactions')
            .update({
                source_document_number: sourceDocumentNumber,
                updated_at: new Date().toISOString(),
            } as never)
            .eq('id', captureTransaction.id);

        if (transactionUpdateError) {
            throw transactionUpdateError;
        }
    }

    await rebuildLedgerEntries({
        ...captureTransaction,
        source_document_number: sourceDocumentNumber,
    });

    if (!existingTransaction?.id) {
        await logFinancialAudit({
            actionType: 'payment_accounted',
            referenceType: 'payment',
            referenceId: payment.id,
            message: 'Double-entry accounting records were generated automatically.',
            metadata: {
                paymentType: payment.payment_type,
                grossAmount: payment.amount,
                gstAmount: breakdown.gstAmount,
                sourceDocumentNumber,
            },
        });
    }

    const refundTransaction = payment.status === 'refunded'
        ? await syncRefundTransaction(payment, {
            ...captureTransaction,
            source_document_number: sourceDocumentNumber,
        })
        : null;

    return {
        payment,
        captureTransaction: {
            ...captureTransaction,
            source_document_number: sourceDocumentNumber,
        },
        refundTransaction,
        documentNumber: sourceDocumentNumber,
    };
}

function buildRecentCounterpartyMaps(
    invoices: CourseInvoiceRow[],
    receipts: DonationReceiptRow[]
) {
    const invoiceByPaymentId = new Map<string, CourseInvoiceRow>();
    const receiptByPaymentId = new Map<string, DonationReceiptRow>();

    for (const invoice of invoices) {
        invoiceByPaymentId.set(invoice.payment_id, invoice);
    }

    for (const receipt of receipts) {
        if (receipt.payment_id) {
            receiptByPaymentId.set(receipt.payment_id, receipt);
        }
    }

    return {
        invoiceByPaymentId,
        receiptByPaymentId,
    };
}

export async function getFinanceDashboardSummary(): Promise<FinanceDashboardSummary> {
    const supabase = createAdminSupabaseClient();
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const sixMonthsAgo = addMonths(currentMonthStart, -5);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 13);

    const [
        transactionResult,
        invoiceResult,
        receiptResult,
        auditResult,
        gstResult,
    ] = await Promise.all([
        supabase
            .from('financial_transactions')
            .select('*')
            .gte('occurred_at', sixMonthsAgo.toISOString())
            .order('occurred_at', { ascending: false }),
        supabase
            .from('course_invoices')
            .select('*')
            .gte('invoice_date', sixMonthsAgo.toISOString())
            .order('invoice_date', { ascending: false }),
        supabase
            .from('donation_receipts')
            .select('*')
            .gte('receipt_date', sixMonthsAgo.toISOString())
            .order('receipt_date', { ascending: false }),
        supabase
            .from('financial_audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(16),
        supabase
            .from('gst_reports')
            .select('*')
            .order('report_month', { ascending: false })
            .limit(12),
    ]);

    if (transactionResult.error) throw transactionResult.error;
    if (invoiceResult.error) throw invoiceResult.error;
    if (receiptResult.error) throw receiptResult.error;
    if (auditResult.error) throw auditResult.error;
    if (gstResult.error) throw gstResult.error;

    const transactions = (transactionResult.data || []) as FinancialTransactionRow[];
    const invoices = (invoiceResult.data || []) as CourseInvoiceRow[];
    const receipts = (receiptResult.data || []) as DonationReceiptRow[];
    const auditLogs = (auditResult.data || []) as FinancialAuditLogRow[];
    const gstReports = (gstResult.data || []) as GstReportRow[];

    const { invoiceByPaymentId, receiptByPaymentId } = buildRecentCounterpartyMaps(invoices, receipts);

    const captures = transactions.filter((entry) => entry.transaction_kind === 'capture');
    const refunds = transactions.filter((entry) => entry.transaction_kind === 'refund');

    const courseCaptureTotal = captures
        .filter((entry) => entry.transaction_type !== 'donation')
        .reduce((sum, entry) => sum + entry.gross_amount, 0);
    const donationCaptureTotal = captures
        .filter((entry) => entry.transaction_type === 'donation')
        .reduce((sum, entry) => sum + entry.gross_amount, 0);
    const courseRefundTotal = refunds
        .filter((entry) => entry.transaction_type !== 'donation')
        .reduce((sum, entry) => sum + entry.gross_amount, 0);
    const donationRefundTotal = refunds
        .filter((entry) => entry.transaction_type === 'donation')
        .reduce((sum, entry) => sum + entry.gross_amount, 0);
    const gstCaptured = captures
        .filter((entry) => entry.transaction_type !== 'donation')
        .reduce((sum, entry) => sum + entry.gst_amount, 0);
    const gstRefunded = refunds
        .filter((entry) => entry.transaction_type !== 'donation')
        .reduce((sum, entry) => sum + entry.gst_amount, 0);

    const totalCourseRevenue = withTwoDecimals(courseCaptureTotal - courseRefundTotal);
    const totalDonations = withTwoDecimals(donationCaptureTotal - donationRefundTotal);
    const gstCollected = withTwoDecimals(gstCaptured - gstRefunded);
    const netRevenue = withTwoDecimals(totalCourseRevenue + totalDonations - gstCollected);

    const currentMonthKey = formatMonthKey(currentMonthStart);
    const monthlyTransactions = transactions.filter((entry) => formatMonthKey(new Date(entry.occurred_at)) === currentMonthKey);
    const monthlyCaptures = monthlyTransactions.filter((entry) => entry.transaction_kind === 'capture');
    const monthlyRefunds = monthlyTransactions.filter((entry) => entry.transaction_kind === 'refund');
    const monthlyCourseRevenue = withTwoDecimals(
        monthlyCaptures.filter((entry) => entry.transaction_type !== 'donation').reduce((sum, entry) => sum + entry.gross_amount, 0)
        - monthlyRefunds.filter((entry) => entry.transaction_type !== 'donation').reduce((sum, entry) => sum + entry.gross_amount, 0)
    );
    const monthlyDonations = withTwoDecimals(
        monthlyCaptures.filter((entry) => entry.transaction_type === 'donation').reduce((sum, entry) => sum + entry.gross_amount, 0)
        - monthlyRefunds.filter((entry) => entry.transaction_type === 'donation').reduce((sum, entry) => sum + entry.gross_amount, 0)
    );
    const monthlyGstCollected = withTwoDecimals(
        monthlyCaptures.filter((entry) => entry.transaction_type !== 'donation').reduce((sum, entry) => sum + entry.gst_amount, 0)
        - monthlyRefunds.filter((entry) => entry.transaction_type !== 'donation').reduce((sum, entry) => sum + entry.gst_amount, 0)
    );

    const dailyLabels = Array.from({ length: 14 }, (_, index) => {
        const day = new Date(twoWeeksAgo);
        day.setDate(twoWeeksAgo.getDate() + index);
        return day;
    });
    const dailyMap = new Map<string, { courseRevenue: number; donations: number; gst: number }>();
    for (const day of dailyLabels) {
        dailyMap.set(formatDayKey(day), { courseRevenue: 0, donations: 0, gst: 0 });
    }

    for (const entry of transactions) {
        const occurredAt = new Date(entry.occurred_at);
        if (occurredAt < twoWeeksAgo) {
            continue;
        }

        const key = formatDayKey(occurredAt);
        const bucket = dailyMap.get(key);
        if (!bucket) {
            continue;
        }

        const sign = entry.transaction_kind === 'refund' ? -1 : 1;
        if (entry.transaction_type === 'donation') {
            bucket.donations += sign * entry.gross_amount;
        } else {
            bucket.courseRevenue += sign * entry.gross_amount;
            bucket.gst += sign * entry.gst_amount;
        }
    }

    const dailyRevenueTrend = dailyLabels.map((day) => {
        const bucket = dailyMap.get(formatDayKey(day)) || { courseRevenue: 0, donations: 0, gst: 0 };
        const courseRevenue = withTwoDecimals(bucket.courseRevenue);
        const donations = withTwoDecimals(bucket.donations);
        const gst = withTwoDecimals(bucket.gst);

        return {
            label: formatDisplayDate(day),
            courseRevenue,
            donations,
            gst,
            netRevenue: withTwoDecimals(courseRevenue + donations - gst),
        };
    });

    const monthlyLabels = Array.from({ length: 6 }, (_, index) => addMonths(sixMonthsAgo, index));
    const monthlyMap = new Map<string, { courseRevenue: number; donations: number; gst: number }>();
    for (const month of monthlyLabels) {
        monthlyMap.set(formatMonthKey(month), { courseRevenue: 0, donations: 0, gst: 0 });
    }

    for (const entry of transactions) {
        const key = formatMonthKey(new Date(entry.occurred_at));
        const bucket = monthlyMap.get(key);
        if (!bucket) {
            continue;
        }

        const sign = entry.transaction_kind === 'refund' ? -1 : 1;
        if (entry.transaction_type === 'donation') {
            bucket.donations += sign * entry.gross_amount;
        } else {
            bucket.courseRevenue += sign * entry.gross_amount;
            bucket.gst += sign * entry.gst_amount;
        }
    }

    const monthlyRevenueTrend = monthlyLabels.map((month) => {
        const bucket = monthlyMap.get(formatMonthKey(month)) || { courseRevenue: 0, donations: 0, gst: 0 };
        const courseRevenue = withTwoDecimals(bucket.courseRevenue);
        const donations = withTwoDecimals(bucket.donations);
        const gst = withTwoDecimals(bucket.gst);

        return {
            label: formatDisplayMonth(month),
            courseRevenue,
            donations,
            gst,
            netRevenue: withTwoDecimals(courseRevenue + donations - gst),
        };
    });

    const courseSalesMap = new Map<string, { amount: number; count: number }>();
    for (const invoice of invoices.filter((entry) => entry.status !== 'refunded')) {
        const bucket = courseSalesMap.get(invoice.course_title) || { amount: 0, count: 0 };
        bucket.amount += invoice.total_amount;
        bucket.count += 1;
        courseSalesMap.set(invoice.course_title, bucket);
    }

    const courseSalesBreakdown = [...courseSalesMap.entries()]
        .map(([label, value]) => ({
            label,
            amount: withTwoDecimals(value.amount),
            count: value.count,
        }))
        .sort((left, right) => right.amount - left.amount)
        .slice(0, 8);

    const donationTrendMap = new Map<string, { amount: number; count: number }>();
    for (const receipt of receipts) {
        const key = formatMonthKey(new Date(receipt.receipt_date));
        const bucket = donationTrendMap.get(key) || { amount: 0, count: 0 };
        bucket.amount += receipt.amount;
        bucket.count += 1;
        donationTrendMap.set(key, bucket);
    }

    const donationTrend = monthlyLabels.map((month) => {
        const key = formatMonthKey(month);
        const bucket = donationTrendMap.get(key) || { amount: 0, count: 0 };
        return {
            label: formatDisplayMonth(month),
            amount: withTwoDecimals(bucket.amount),
            count: bucket.count,
        };
    });

    const recentTransactions = transactions.slice(0, 12).map((entry) => {
        const invoice = entry.payment_id ? invoiceByPaymentId.get(entry.payment_id) : null;
        const receipt = entry.payment_id ? receiptByPaymentId.get(entry.payment_id) : null;

        return {
            id: entry.id,
            occurredAt: entry.occurred_at,
            transactionType: entry.transaction_type,
            transactionKind: entry.transaction_kind,
            status: entry.status,
            counterparty: invoice?.student_name || receipt?.donor_name || entry.transaction_type.replace('_', ' '),
            documentNumber: invoice?.invoice_number || receipt?.receipt_number || entry.source_document_number,
            reference: entry.external_payment_id || entry.external_order_id || entry.transaction_reference,
            grossAmount: entry.gross_amount,
            gstAmount: entry.gst_amount,
        };
    });

    return {
        metrics: {
            totalCourseRevenue,
            totalDonations,
            gstCollected,
            netRevenue,
            monthlyCourseRevenue,
            monthlyDonations,
            monthlyGstCollected,
            completedTransactions: captures.length,
            refundedTransactions: refunds.length,
        },
        dailyRevenueTrend,
        monthlyRevenueTrend,
        courseSalesBreakdown,
        donationTrend,
        recentTransactions,
        recentInvoices: invoices.slice(0, 8).map((invoice) => ({
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            course_title: invoice.course_title,
            student_name: invoice.student_name,
            total_amount: invoice.total_amount,
            invoice_date: invoice.invoice_date,
            status: invoice.status,
        })),
        recentReceipts: receipts.slice(0, 8).map((receipt) => ({
            id: receipt.id,
            receipt_number: receipt.receipt_number,
            donor_name: receipt.donor_name,
            amount: receipt.amount,
            receipt_date: receipt.receipt_date,
        })),
        gstReports: gstReports.slice(0, 8).map((report) => ({
            id: report.id,
            report_type: report.report_type,
            report_month: report.report_month,
            file_format: report.file_format,
            total_taxable_value: report.total_taxable_value,
            total_gst_amount: report.total_gst_amount,
            total_invoice_value: report.total_invoice_value,
            created_at: report.created_at,
        })),
        recentAuditLogs: auditLogs.map((entry) => ({
            id: entry.id,
            action_type: entry.action_type,
            message: entry.message,
            reference_type: entry.reference_type,
            reference_id: entry.reference_id,
            created_at: entry.created_at,
        })),
    };
}

function summarizeTransactions(transactions: FinancialTransactionRow[]) {
    return {
        taxableValue: withTwoDecimals(transactions.reduce((sum, row) => sum + row.taxable_value, 0)),
        gstAmount: withTwoDecimals(transactions.reduce((sum, row) => sum + row.gst_amount, 0)),
        invoiceValue: withTwoDecimals(transactions.reduce((sum, row) => sum + row.gross_amount, 0)),
        donationValue: withTwoDecimals(
            transactions.filter((row) => row.transaction_type === 'donation').reduce((sum, row) => sum + row.gross_amount, 0)
        ),
    };
}

async function getMonthlyRecords(monthKey?: string | null) {
    const supabase = createAdminSupabaseClient();
    const { monthKey: normalizedMonth, start, end } = monthRange(monthKey);

    const [transactionsResult, invoicesResult, receiptsResult, ledgerResult] = await Promise.all([
        supabase
            .from('financial_transactions')
            .select('*')
            .gte('occurred_at', start.toISOString())
            .lte('occurred_at', `${formatDayKey(end)}T23:59:59.999Z`)
            .order('occurred_at', { ascending: true }),
        supabase
            .from('course_invoices')
            .select('*')
            .gte('invoice_date', start.toISOString())
            .lte('invoice_date', `${formatDayKey(end)}T23:59:59.999Z`)
            .order('invoice_date', { ascending: true }),
        supabase
            .from('donation_receipts')
            .select('*')
            .gte('receipt_date', start.toISOString())
            .lte('receipt_date', `${formatDayKey(end)}T23:59:59.999Z`)
            .order('receipt_date', { ascending: true }),
        supabase
            .from('ledger_entries')
            .select(`
                *,
                financial_transactions!inner (
                    occurred_at,
                    transaction_type,
                    transaction_kind,
                    source_document_number,
                    transaction_reference
                )
            `)
            .gte('created_at', start.toISOString())
            .lte('created_at', `${formatDayKey(end)}T23:59:59.999Z`)
            .order('created_at', { ascending: true }),
    ]);

    if (transactionsResult.error) throw transactionsResult.error;
    if (invoicesResult.error) throw invoicesResult.error;
    if (receiptsResult.error) throw receiptsResult.error;
    if (ledgerResult.error) throw ledgerResult.error;

    return {
        monthKey: normalizedMonth,
        start,
        end,
        transactions: (transactionsResult.data || []) as FinancialTransactionRow[],
        invoices: (invoicesResult.data || []) as CourseInvoiceRow[],
        receipts: (receiptsResult.data || []) as DonationReceiptRow[],
        ledgerRows: (ledgerResult.data || []) as Array<Database['public']['Tables']['ledger_entries']['Row'] & {
            financial_transactions: Pick<FinancialTransactionRow, 'occurred_at' | 'transaction_type' | 'transaction_kind' | 'source_document_number' | 'transaction_reference'>;
        }>,
    };
}

export async function buildFinanceReportDataset(reportType: FinanceReportType, monthKey?: string | null): Promise<FinanceReportDataset> {
    const { monthKey: normalizedMonth, start, end, transactions, invoices, receipts, ledgerRows } = await getMonthlyRecords(monthKey);
    const periodLabel = `${formatDisplayMonth(start)} - ${formatDisplayMonth(end)}`;
    const captureTransactions = transactions.filter((entry) => entry.transaction_kind === 'capture');
    const summary = summarizeTransactions(captureTransactions);
    const revenueTrendPoints = Array.from(
        transactions.reduce((map, entry) => {
            const label = formatDisplayDate(entry.occurred_at);
            const next = map.get(label) || 0;
            const signed = entry.transaction_kind === 'refund' ? -entry.gross_amount : entry.gross_amount;
            map.set(label, withTwoDecimals(next + signed));
            return map;
        }, new Map<string, number>()).entries()
    ).map(([label, value]) => ({ label, value }));

    if (reportType === 'monthly-gst-sales' || reportType === 'gstr1') {
        const rows = invoices.map((invoice) => ({
            'Invoice Number': invoice.invoice_number,
            'Invoice Date': invoice.invoice_date.slice(0, 10),
            'Customer Name': invoice.student_name,
            'Course / Plan': invoice.course_title,
            'Taxable Value': invoice.taxable_value,
            'GST Rate %': invoice.gst_rate,
            'GST Amount': invoice.gst_amount,
            'Total Invoice Value': invoice.total_amount,
            Status: invoice.status,
        }));

        return {
            reportType,
            title: reportType === 'gstr1' ? 'GSTR-1 Ready Sales Report' : 'Monthly GST Sales Report',
            subtitle: 'Course and subscription invoices structured for GST sales filing support.',
            fileBaseName: reportType === 'gstr1' ? `gstr1-${normalizedMonth}` : `monthly-gst-sales-${normalizedMonth}`,
            periodLabel,
            metrics: [
                { label: 'Invoices', value: String(invoices.length) },
                { label: 'Taxable Value', value: formatInr(summary.taxableValue) },
                { label: 'GST Amount', value: formatInr(summary.gstAmount) },
                { label: 'Invoice Value', value: formatInr(summary.invoiceValue) },
            ],
            tables: [
                {
                    title: 'GST Sales Register',
                    columns: ['Invoice Number', 'Date', 'Customer', 'Taxable', 'GST', 'Total'],
                    rows: invoices.slice(0, 16).map((invoice) => [
                        invoice.invoice_number,
                        invoice.invoice_date.slice(0, 10),
                        invoice.student_name,
                        formatInr(invoice.taxable_value),
                        formatInr(invoice.gst_amount),
                        formatInr(invoice.total_amount),
                    ]),
                },
            ],
            charts: [
                {
                    title: 'Daily GST Sales Value',
                    points: revenueTrendPoints.slice(-10),
                },
            ],
            csvRows: rows,
            gstSnapshot: {
                reportType: reportType === 'gstr1' ? 'gstr1' : 'monthly_gst_sales',
                reportMonth: `${normalizedMonth}-01`,
                periodStart: formatDayKey(start),
                periodEnd: formatDayKey(end),
                totalTaxableValue: summary.taxableValue,
                totalGstAmount: summary.gstAmount,
                totalInvoiceValue: summary.invoiceValue,
                totalDonationValue: 0,
                totalTransactions: invoices.length,
                summary: {
                    invoices: invoices.length,
                    month: normalizedMonth,
                },
            },
        };
    }

    if (reportType === 'course-sales') {
        const grouped = new Map<string, { amount: number; count: number }>();
        for (const invoice of invoices) {
            const bucket = grouped.get(invoice.course_title) || { amount: 0, count: 0 };
            bucket.amount += invoice.total_amount;
            bucket.count += 1;
            grouped.set(invoice.course_title, bucket);
        }

        const rows = [...grouped.entries()].map(([course, value]) => ({
            'Course / Plan': course,
            Invoices: value.count,
            'Total Sales': withTwoDecimals(value.amount),
        }));

        return {
            reportType,
            title: 'Course Sales Report',
            subtitle: 'Course and subscription sales grouped by learning product.',
            fileBaseName: `course-sales-${normalizedMonth}`,
            periodLabel,
            metrics: [
                { label: 'Products Sold', value: String(rows.length) },
                { label: 'Invoices', value: String(invoices.length) },
                { label: 'Gross Sales', value: formatInr(summary.invoiceValue) },
                { label: 'Net Revenue', value: formatInr(summary.taxableValue) },
            ],
            tables: [
                {
                    title: 'Sales by Product',
                    columns: ['Course / Plan', 'Invoices', 'Total Sales'],
                    rows: rows.slice(0, 16).map((row) => [
                        String(row['Course / Plan']),
                        String(row.Invoices),
                        formatInr(asNumber(row['Total Sales'])),
                    ]),
                },
            ],
            charts: [
                {
                    title: 'Top Selling Products',
                    points: rows.slice(0, 8).map((row) => ({
                        label: String(row['Course / Plan']).slice(0, 18),
                        value: asNumber(row['Total Sales']),
                    })),
                },
            ],
            csvRows: rows,
            gstSnapshot: {
                reportType: 'course_sales',
                reportMonth: `${normalizedMonth}-01`,
                periodStart: formatDayKey(start),
                periodEnd: formatDayKey(end),
                totalTaxableValue: summary.taxableValue,
                totalGstAmount: summary.gstAmount,
                totalInvoiceValue: summary.invoiceValue,
                totalDonationValue: 0,
                totalTransactions: invoices.length,
                summary: {
                    products: rows.length,
                },
            },
        };
    }

    if (reportType === 'donation-transactions') {
        const rows = receipts.map((receipt) => ({
            'Receipt Number': receipt.receipt_number,
            'Receipt Date': receipt.receipt_date.slice(0, 10),
            'Donor Name': receipt.donor_name,
            'Donor Email': receipt.donor_email || '',
            Amount: receipt.amount,
            'Transaction ID': receipt.transaction_id || '',
        }));

        return {
            reportType,
            title: 'Donation Transaction Report',
            subtitle: 'Donation receipts and funding transactions for audit and accounting review.',
            fileBaseName: `donation-transactions-${normalizedMonth}`,
            periodLabel,
            metrics: [
                { label: 'Receipts', value: String(receipts.length) },
                { label: 'Donations', value: formatInr(receipts.reduce((sum, receipt) => sum + receipt.amount, 0)) },
                { label: 'Average Donation', value: formatInr(receipts.length ? receipts.reduce((sum, receipt) => sum + receipt.amount, 0) / receipts.length : 0) },
                { label: 'GST', value: formatInr(0), helper: 'Donations tracked separately from taxable course revenue' },
            ],
            tables: [
                {
                    title: 'Donation Receipt Register',
                    columns: ['Receipt Number', 'Date', 'Donor', 'Amount', 'Transaction ID'],
                    rows: receipts.slice(0, 16).map((receipt) => [
                        receipt.receipt_number,
                        receipt.receipt_date.slice(0, 10),
                        receipt.donor_name,
                        formatInr(receipt.amount),
                        receipt.transaction_id || '-',
                    ]),
                },
            ],
            charts: [
                {
                    title: 'Donation Value by Receipt',
                    points: receipts.slice(0, 8).map((receipt) => ({
                        label: receipt.receipt_number.slice(-6),
                        value: receipt.amount,
                    })),
                },
            ],
            csvRows: rows,
            gstSnapshot: {
                reportType: 'donation_transactions',
                reportMonth: `${normalizedMonth}-01`,
                periodStart: formatDayKey(start),
                periodEnd: formatDayKey(end),
                totalTaxableValue: 0,
                totalGstAmount: 0,
                totalInvoiceValue: 0,
                totalDonationValue: withTwoDecimals(receipts.reduce((sum, receipt) => sum + receipt.amount, 0)),
                totalTransactions: receipts.length,
                summary: {
                    receipts: receipts.length,
                },
            },
        };
    }

    if (reportType === 'transaction-ledger') {
        const rows = ledgerRows.map((entry) => ({
            'Entry Date': entry.created_at.slice(0, 10),
            'Entry Group': entry.entry_group_id,
            'Account Code': entry.ledger_account_code,
            'Account Name': entry.ledger_account_name,
            'Entry Type': entry.entry_type,
            Amount: entry.amount,
            Narration: entry.narration || '',
            Reference: entry.financial_transactions?.source_document_number || entry.financial_transactions?.transaction_reference || '',
        }));

        return {
            reportType,
            title: 'Transaction Ledger Export',
            subtitle: 'Double-entry ledger for accountant review and audit support.',
            fileBaseName: `transaction-ledger-${normalizedMonth}`,
            periodLabel,
            metrics: [
                { label: 'Ledger Rows', value: String(rows.length) },
                { label: 'Debit Entries', value: String(rows.filter((row) => row['Entry Type'] === 'debit').length) },
                { label: 'Credit Entries', value: String(rows.filter((row) => row['Entry Type'] === 'credit').length) },
                { label: 'Ledger Value', value: formatInr(rows.reduce((sum, row) => sum + asNumber(row.Amount), 0)) },
            ],
            tables: [
                {
                    title: 'Ledger',
                    columns: ['Date', 'Account', 'Type', 'Amount', 'Reference'],
                    rows: rows.slice(0, 16).map((row) => [
                        String(row['Entry Date']),
                        `${row['Account Code']} - ${row['Account Name']}`,
                        String(row['Entry Type']),
                        formatInr(asNumber(row.Amount)),
                        String(row.Reference || '-'),
                    ]),
                },
            ],
            charts: [
                {
                    title: 'Ledger Value Flow',
                    points: rows.slice(0, 10).map((row) => ({
                        label: String(row['Entry Date']).slice(5),
                        value: asNumber(row.Amount),
                    })),
                },
            ],
            csvRows: rows,
        };
    }

    if (reportType === 'gstr3b') {
        const taxableValue = summary.taxableValue;
        const gstAmount = summary.gstAmount;
        const invoiceValue = summary.invoiceValue;

        return {
            reportType,
            title: 'GSTR-3B Ready Summary',
            subtitle: 'Monthly outward taxable supply summary for accountant-assisted filing.',
            fileBaseName: `gstr3b-${normalizedMonth}`,
            periodLabel,
            metrics: [
                { label: 'Taxable Supplies', value: formatInr(taxableValue) },
                { label: 'GST Payable', value: formatInr(gstAmount) },
                { label: 'Invoice Value', value: formatInr(invoiceValue) },
                { label: 'Transactions', value: String(captureTransactions.length) },
            ],
            tables: [
                {
                    title: 'GSTR-3B Summary',
                    columns: ['Particulars', 'Value'],
                    rows: [
                        ['Taxable Value of Outward Supplies', formatInr(taxableValue)],
                        ['GST Amount', formatInr(gstAmount)],
                        ['Gross Invoice Value', formatInr(invoiceValue)],
                        ['Donation Receipts (separate)', formatInr(receipts.reduce((sum, receipt) => sum + receipt.amount, 0))],
                    ],
                },
            ],
            charts: [
                {
                    title: 'Revenue vs GST',
                    points: [
                        { label: 'Taxable', value: taxableValue },
                        { label: 'GST', value: gstAmount },
                        { label: 'Gross', value: invoiceValue },
                    ],
                },
            ],
            csvRows: [
                { Particulars: 'Taxable Value of Outward Supplies', Value: taxableValue },
                { Particulars: 'GST Amount', Value: gstAmount },
                { Particulars: 'Gross Invoice Value', Value: invoiceValue },
                { Particulars: 'Donation Receipts (separate)', Value: receipts.reduce((sum, receipt) => sum + receipt.amount, 0) },
            ],
            gstSnapshot: {
                reportType: 'gstr3b',
                reportMonth: `${normalizedMonth}-01`,
                periodStart: formatDayKey(start),
                periodEnd: formatDayKey(end),
                totalTaxableValue: taxableValue,
                totalGstAmount: gstAmount,
                totalInvoiceValue: invoiceValue,
                totalDonationValue: withTwoDecimals(receipts.reduce((sum, receipt) => sum + receipt.amount, 0)),
                totalTransactions: captureTransactions.length,
                summary: {
                    outwardSupplies: taxableValue,
                    gstPayable: gstAmount,
                },
            },
        };
    }

    const revenueRows = [
        {
            Category: 'Course Revenue',
            Amount: withTwoDecimals(captureTransactions.filter((entry) => entry.transaction_type !== 'donation').reduce((sum, entry) => sum + entry.gross_amount, 0)),
        },
        {
            Category: 'Donation Income',
            Amount: withTwoDecimals(captureTransactions.filter((entry) => entry.transaction_type === 'donation').reduce((sum, entry) => sum + entry.gross_amount, 0)),
        },
        {
            Category: 'GST Collected',
            Amount: summary.gstAmount,
        },
        {
            Category: 'Net Revenue',
            Amount: withTwoDecimals(summary.invoiceValue + summary.donationValue - summary.gstAmount),
        },
    ];

    return {
        reportType,
        title: 'Revenue Summary Report',
        subtitle: 'High-level course revenue, donation, and GST summary for management review.',
        fileBaseName: `revenue-summary-${normalizedMonth}`,
        periodLabel,
        metrics: [
            { label: 'Course Revenue', value: formatInr(revenueRows[0]?.Amount || 0) },
            { label: 'Donations', value: formatInr(revenueRows[1]?.Amount || 0) },
            { label: 'GST', value: formatInr(revenueRows[2]?.Amount || 0) },
            { label: 'Net Revenue', value: formatInr(revenueRows[3]?.Amount || 0) },
        ],
        tables: [
            {
                title: 'Revenue Summary',
                columns: ['Category', 'Amount'],
                rows: revenueRows.map((row) => [row.Category, formatInr(row.Amount)]),
            },
        ],
        charts: [
            {
                title: 'Revenue Trend',
                points: revenueTrendPoints.slice(-10),
            },
        ],
        csvRows: revenueRows,
        gstSnapshot: {
            reportType: 'revenue_summary',
            reportMonth: `${normalizedMonth}-01`,
            periodStart: formatDayKey(start),
            periodEnd: formatDayKey(end),
            totalTaxableValue: summary.taxableValue,
            totalGstAmount: summary.gstAmount,
            totalInvoiceValue: summary.invoiceValue,
            totalDonationValue: summary.donationValue,
            totalTransactions: captureTransactions.length,
            summary: {
                courseRevenue: revenueRows[0]?.Amount || 0,
                donations: revenueRows[1]?.Amount || 0,
                netRevenue: revenueRows[3]?.Amount || 0,
            },
        },
    };
}

export async function generateFinanceReportPdf(
    reportType: FinanceReportType,
    monthKey: string | null | undefined,
    generatedBy: string
): Promise<{ dataset: FinanceReportDataset; pdf: Blob }> {
    const dataset = await buildFinanceReportDataset(reportType, monthKey);
    const payload: AdminReportPayload = {
        title: dataset.title,
        subtitle: `${dataset.subtitle} Reporting period: ${dataset.periodLabel}.`,
        generatedBy,
        metrics: dataset.metrics,
        tables: dataset.tables,
        charts: dataset.charts,
    };

    const pdf = await generateAdminReportPDF(payload);

    return {
        dataset,
        pdf,
    };
}

export async function recordGstReportSnapshot(
    dataset: FinanceReportDataset,
    generatedBy: string,
    fileFormat: Database['public']['Tables']['gst_reports']['Insert']['file_format']
) {
    if (!dataset.gstSnapshot) {
        return null;
    }

    const supabase = createAdminSupabaseClient();
    const payload: Database['public']['Tables']['gst_reports']['Insert'] = {
        report_type: dataset.gstSnapshot.reportType,
        report_month: dataset.gstSnapshot.reportMonth,
        period_start: dataset.gstSnapshot.periodStart,
        period_end: dataset.gstSnapshot.periodEnd,
        file_format: fileFormat,
        total_taxable_value: dataset.gstSnapshot.totalTaxableValue,
        total_gst_amount: dataset.gstSnapshot.totalGstAmount,
        total_invoice_value: dataset.gstSnapshot.totalInvoiceValue,
        total_donation_value: dataset.gstSnapshot.totalDonationValue,
        total_transactions: dataset.gstSnapshot.totalTransactions,
        generated_by: generatedBy,
        summary: asJson(dataset.gstSnapshot.summary),
    };

    const { data, error } = await supabase
        .from('gst_reports')
        .insert(payload as never)
        .select('*')
        .single();

    if (error) {
        throw error;
    }

    await logFinancialAudit({
        actorUserId: generatedBy,
        actorRole: 'admin',
        actionType: 'gst_report_generated',
        referenceType: 'gst_report',
        referenceId: (data as GstReportRow).id,
        message: `Generated ${dataset.reportType} export.`,
        metadata: {
            fileFormat,
            period: dataset.periodLabel,
        },
    });

    return data as GstReportRow;
}

export async function getCourseInvoiceByReference(filters: {
    invoiceNumber?: string | null;
    orderId?: string | null;
    paymentId?: string | null;
}) {
    const supabase = createAdminSupabaseClient();

    if (filters.invoiceNumber) {
        const { data, error } = await supabase
            .from('course_invoices')
            .select('*')
            .eq('invoice_number', filters.invoiceNumber)
            .maybeSingle();

        if (error) throw error;
        return data as CourseInvoiceRow | null;
    }

    let paymentQuery = supabase
        .from('payments')
        .select('id')
        .limit(1);

    if (filters.paymentId) {
        paymentQuery = paymentQuery.eq('razorpay_payment_id', filters.paymentId);
    }
    if (filters.orderId) {
        paymentQuery = paymentQuery.eq('razorpay_order_id', filters.orderId);
    }

    const { data: payment } = await paymentQuery.maybeSingle();
    const paymentRow = payment as Pick<PaymentRow, 'id'> | null;

    if (!paymentRow?.id) {
        return null;
    }

    const { data, error } = await supabase
        .from('course_invoices')
        .select('*')
        .eq('payment_id', paymentRow.id)
        .maybeSingle();

    if (error) throw error;
    return data as CourseInvoiceRow | null;
}

export async function getPaymentByOrderOrPaymentId(filters: {
    orderId?: string | null;
    paymentId?: string | null;
}) {
    const supabase = createAdminSupabaseClient();
    let query = supabase
        .from('payments')
        .select('*')
        .limit(1);

    if (filters.paymentId) {
        query = query.eq('razorpay_payment_id', filters.paymentId);
    }
    if (filters.orderId) {
        query = query.eq('razorpay_order_id', filters.orderId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data as PaymentRow | null;
}

export async function getPaymentById(paymentRecordId: string | null | undefined) {
    if (!paymentRecordId) {
        return null;
    }

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentRecordId)
        .maybeSingle();

    if (error) throw error;
    return data as PaymentRow | null;
}
