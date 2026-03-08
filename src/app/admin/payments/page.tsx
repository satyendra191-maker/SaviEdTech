'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import {
    CreditCard,
    CheckCircle,
    Clock,
    DollarSign,
    FileText,
    RefreshCw,
    ShieldCheck,
    X,
    XCircle,
} from 'lucide-react';
import { DataTable, StatusBadge } from '@/components/admin/DataTable';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type PaymentRecord = Database['public']['Tables']['payments']['Row'];

function getMetadata(payment: PaymentRecord): Record<string, unknown> {
    return typeof payment.metadata === 'object' && payment.metadata !== null
        ? payment.metadata as Record<string, unknown>
        : {};
}

function getDisplayName(payment: PaymentRecord) {
    const metadata = getMetadata(payment);
    if (typeof metadata.donor_name === 'string' && metadata.donor_name) {
        return metadata.donor_name;
    }
    if (typeof metadata.courseTitle === 'string' && metadata.courseTitle) {
        return metadata.courseTitle;
    }
    if (payment.payment_type === 'subscription') {
        return typeof metadata.planId === 'string' && metadata.planId ? metadata.planId : 'Premium Subscription';
    }
    return payment.user_id || 'Anonymous';
}

function getDisplayDetails(payment: PaymentRecord) {
    const metadata = getMetadata(payment);
    if (typeof metadata.donor_email === 'string' && metadata.donor_email) {
        return metadata.donor_email;
    }
    if (typeof metadata.description === 'string' && metadata.description) {
        return metadata.description;
    }
    return payment.transaction_id || payment.razorpay_order_id || 'No transaction id';
}

function openPaymentDocument(payment: PaymentRecord) {
    const metadata = getMetadata(payment);

    if (payment.payment_type === 'donation') {
        const receiptParams = new URLSearchParams();
        if (payment.razorpay_order_id) receiptParams.set('orderId', payment.razorpay_order_id);
        if (payment.razorpay_payment_id) receiptParams.set('paymentId', payment.razorpay_payment_id);
        if ([...receiptParams.keys()].length > 0) {
            window.open(`/api/donations/receipt?${receiptParams.toString()}`, '_blank', 'noopener,noreferrer');
        }
        return;
    }

    const invoiceParams = new URLSearchParams();
    if (typeof metadata.invoice_number === 'string' && metadata.invoice_number) {
        invoiceParams.set('invoiceNumber', metadata.invoice_number);
    } else {
        if (payment.razorpay_order_id) invoiceParams.set('orderId', payment.razorpay_order_id);
        if (payment.razorpay_payment_id) invoiceParams.set('paymentId', payment.razorpay_payment_id);
    }

    if ([...invoiceParams.keys()].length > 0) {
        window.open(`/api/payments/invoice?${invoiceParams.toString()}`, '_blank', 'noopener,noreferrer');
    }
}

export default function PaymentsPage() {
    const supabase = useMemo(() => getSupabaseBrowserClient(), []);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        revenue: 0,
    });

    const fetchPayments = useCallback(async () => {
        if (!supabase) {
            setError('Payments data source is unavailable.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: queryError } = await supabase
                .from('payments')
                .select('*')
                .order('created_at', { ascending: false });

            if (queryError) {
                throw queryError;
            }

            const paymentRows = (data || []) as PaymentRecord[];
            setPayments(paymentRows);
            setStats({
                total: paymentRows.length,
                completed: paymentRows.filter((payment) => payment.status === 'completed').length,
                pending: paymentRows.filter((payment) => payment.status === 'pending').length,
                failed: paymentRows.filter((payment) => payment.status === 'failed').length,
                revenue: paymentRows
                    .filter((payment) => payment.status === 'completed')
                    .reduce((sum, payment) => sum + (payment.amount || 0), 0),
            });
        } catch (fetchError) {
            console.error('Error fetching payments:', fetchError);
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load payments');
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        void fetchPayments();
    }, [fetchPayments]);

    useEffect(() => {
        if (!supabase) {
            return undefined;
        }

        const channel = supabase
            .channel('admin-payments-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
                void fetchPayments();
            })
            .subscribe();

        return () => {
            void channel.unsubscribe();
        };
    }, [fetchPayments, supabase]);

    const columns = [
        {
            key: 'payment',
            header: 'Payment',
            sortable: true,
            render: (row: object) => {
                const payment = row as PaymentRecord;
                return (
                    <div>
                        <p className="font-medium text-slate-900">{getDisplayName(payment)}</p>
                        <p className="text-xs text-slate-500">{getDisplayDetails(payment)}</p>
                    </div>
                );
            },
        },
        {
            key: 'type',
            header: 'Type',
            render: (row: object) => {
                const payment = row as PaymentRecord;
                const variantMap: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
                    donation: 'info',
                    course_purchase: 'success',
                    subscription: 'warning',
                };
                return (
                    <StatusBadge
                        status={payment.payment_type.replace('_', ' ')}
                        variant={variantMap[payment.payment_type] || 'default'}
                    />
                );
            },
            width: '130px',
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (row: object) => {
                const payment = row as PaymentRecord;
                return (
                    <div>
                        <p className="font-medium text-slate-900">Rs {(payment.amount || 0).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-500 uppercase">{payment.currency}</p>
                    </div>
                );
            },
            width: '130px',
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: object) => {
                const payment = row as PaymentRecord;
                const variantMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
                    completed: 'success',
                    pending: 'warning',
                    failed: 'error',
                    refunded: 'default',
                    cancelled: 'default',
                };
                return <StatusBadge status={payment.status} variant={variantMap[payment.status] || 'default'} />;
            },
            width: '110px',
        },
        {
            key: 'transaction',
            header: 'Transaction',
            render: (row: object) => {
                const payment = row as PaymentRecord;
                return (
                    <div className="text-xs text-slate-500">
                        <p className="font-mono">{payment.transaction_id || payment.razorpay_order_id || 'Pending'}</p>
                        <p className="font-mono">{payment.razorpay_payment_id || 'Awaiting capture'}</p>
                    </div>
                );
            },
            width: '220px',
        },
        {
            key: 'date',
            header: 'Date',
            render: (row: object) => {
                const payment = row as PaymentRecord;
                return (
                    <div className="text-sm text-slate-600">
                        <p>{new Date(payment.created_at).toLocaleDateString('en-IN')}</p>
                        <p className="text-xs">{new Date(payment.created_at).toLocaleTimeString('en-IN')}</p>
                    </div>
                );
            },
            width: '140px',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Payment Management</h1>
                    <p className="text-slate-500">Monitor Razorpay donations, course purchases, and premium subscriptions.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <a
                        href="/admin/finance"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                    >
                        <ShieldCheck className="h-4 w-4" />
                        Financial Dashboard
                    </a>
                    <a
                        href="/api/admin/reports/export?type=payments"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        Export PDF
                    </a>
                    <button
                        type="button"
                        onClick={() => void fetchPayments()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard icon={DollarSign} label="Revenue" value={`Rs ${stats.revenue.toLocaleString('en-IN')}`} />
                <StatCard icon={CreditCard} label="Total Payments" value={stats.total.toLocaleString()} />
                <StatCard icon={CheckCircle} label="Completed" value={stats.completed.toLocaleString()} variant="success" />
                <StatCard icon={Clock} label="Pending" value={stats.pending.toLocaleString()} variant="warning" />
                <StatCard icon={XCircle} label="Failed" value={stats.failed.toLocaleString()} variant="error" />
            </div>

            <DataTable
                data={payments as unknown as object[]}
                columns={columns}
                keyExtractor={(row) => (row as PaymentRecord).id}
                title="All Payments"
                loading={loading}
                onView={(row) => setSelectedPayment(row as PaymentRecord)}
                searchKeys={['transaction_id', 'razorpay_order_id', 'razorpay_payment_id', 'payment_type', 'user_id']}
            />

            {selectedPayment ? (
                <PaymentDialog
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                />
            ) : null}
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    variant = 'default',
}: {
    icon: ElementType;
    label: string;
    value: string;
    variant?: 'default' | 'success' | 'warning' | 'error';
}) {
    const variants = {
        default: 'bg-primary-50 text-primary-600',
        success: 'bg-green-50 text-green-600',
        warning: 'bg-yellow-50 text-yellow-600',
        error: 'bg-red-50 text-red-600',
    };

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${variants[variant]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <p className="text-sm text-slate-500">{label}</p>
                </div>
            </div>
        </div>
    );
}

function PaymentDialog({
    payment,
    onClose,
}: {
    payment: PaymentRecord;
    onClose: () => void;
}) {
    const metadata = getMetadata(payment);
    const isDonation = payment.payment_type === 'donation';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Payment Details</h3>
                        <p className="text-sm text-slate-500">Razorpay payment record</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-6 p-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <DetailCard label="Type" value={payment.payment_type.replace('_', ' ')} />
                        <DetailCard label="Status" value={payment.status} />
                        <DetailCard label="Amount" value={`Rs ${payment.amount.toLocaleString('en-IN')}`} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <DetailCard label="Transaction ID" value={payment.transaction_id || 'Pending'} mono />
                        <DetailCard label="Order ID" value={payment.razorpay_order_id || 'Pending'} mono />
                        <DetailCard label="Payment ID" value={payment.razorpay_payment_id || 'Pending'} mono />
                        <DetailCard label="User" value={payment.user_id || 'Anonymous / not linked'} mono />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 mb-3 text-slate-900">
                            <ShieldCheck className="h-4 w-4" />
                            <h4 className="font-semibold">Metadata</h4>
                        </div>
                        <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
                            {JSON.stringify(metadata, null, 2)}
                        </pre>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                        {((isDonation && (payment.razorpay_order_id || payment.razorpay_payment_id))
                            || (!isDonation && (payment.razorpay_order_id || payment.razorpay_payment_id || typeof metadata.invoice_number === 'string'))) ? (
                            <button
                                type="button"
                                onClick={() => openPaymentDocument(payment)}
                                className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100"
                            >
                                <FileText className="h-4 w-4" />
                                {isDonation ? 'Download Receipt' : 'Download Invoice'}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DetailCard({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
            <div className={`mt-2 text-sm text-slate-900 ${mono ? 'font-mono break-all' : 'font-medium'}`}>{value}</div>
        </div>
    );
}
