'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable, StatusBadge } from '@/components/admin/DataTable';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    DollarSign,
    CreditCard,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw,
    TrendingUp,
    Users,
    X,
    FileText,
} from 'lucide-react';
import type { Database } from '@/types/supabase';

type Donation = Database['public']['Tables']['donations']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface PaymentWithUser extends Donation {
    user?: Profile;
}

export default function PaymentsPage() {
    const [payments, setPayments] = useState<PaymentWithUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        totalAmount: 0,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PaymentWithUser | null>(null);

    const supabase = createBrowserSupabaseClient();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: donationsData, error: donationsError } = await supabase
                .from('donations')
                .select('*')
                .order('created_at', { ascending: false });

            if (donationsError) throw donationsError;

            const paymentsList = (donationsData || []) as Donation[];
            setPayments(paymentsList);

            // Calculate stats
            const total = paymentsList.reduce((acc, p) => acc + (p.amount || 0), 0);
            const completed = paymentsList.filter(p => p.status === 'completed').length;
            const pending = paymentsList.filter(p => p.status === 'pending').length;
            const failed = paymentsList.filter(p => p.status === 'failed').length;

            setStats({
                total: paymentsList.length,
                completed,
                pending,
                failed,
                totalAmount: total,
            });
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleView = (item: object) => {
        setSelectedPayment(item as PaymentWithUser);
        setDialogOpen(true);
    };

    const handleRefund = async (payment: PaymentWithUser) => {
        if (!confirm(`Are you sure you want to refund ₹${payment.amount} to ${payment.donor_name || payment.donor_email}?`)) return;

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('donations') as any).update({
                status: 'refunded',
                updated_at: new Date().toISOString(),
            }).eq('id', payment.id);

            await fetchData();
            alert('Refund processed successfully');
        } catch (error) {
            console.error('Error processing refund:', error);
            alert('Failed to process refund');
        }
    };

    const handleRetry = async (payment: PaymentWithUser) => {
        if (!confirm('Retry this payment?')) return;

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('donations') as any).update({
                status: 'pending',
                retry_count: (payment.retry_count || 0) + 1,
                last_retry_at: new Date().toISOString(),
            }).eq('id', payment.id);

            await fetchData();
            alert('Payment retry initiated');
        } catch (error) {
            console.error('Error retrying payment:', error);
            alert('Failed to retry payment');
        }
    };

    const columns = [
        {
            key: 'donor',
            header: 'Donor',
            sortable: true,
            render: (row: object) => {
                const payment = row as PaymentWithUser;
                return (
                    <div>
                        <p className="font-medium text-slate-900">{payment.donor_name || 'Anonymous'}</p>
                        <p className="text-xs text-slate-500">{payment.donor_email || payment.donor_phone || 'No contact info'}</p>
                    </div>
                );
            }
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (row: object) => {
                const payment = row as PaymentWithUser;
                return (
                    <div>
                        <p className="font-medium text-slate-900">₹{(payment.amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-500 uppercase">{payment.currency || 'INR'}</p>
                    </div>
                );
            },
            width: '120px'
        },
        {
            key: 'gateway',
            header: 'Gateway',
            render: (row: object) => {
                const payment = row as PaymentWithUser;
                const gatewayColors: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
                    'razorpay': 'info',
                    'stripe': 'warning',
                    'paypal': 'success',
                };
                return (
                    <StatusBadge
                        status={payment.gateway?.toUpperCase() || 'N/A'}
                        variant={gatewayColors[payment.gateway || ''] || 'default'}
                    />
                );
            },
            width: '100px'
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: object) => {
                const payment = row as PaymentWithUser;
                const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
                    'completed': 'success',
                    'pending': 'warning',
                    'failed': 'error',
                    'refunded': 'default',
                    'cancelled': 'default',
                };
                return <StatusBadge status={payment.status} variant={statusColors[payment.status] || 'default'} />;
            },
            width: '100px'
        },
        {
            key: 'retry',
            header: 'Retries',
            render: (row: object) => {
                const payment = row as PaymentWithUser;
                return <span className="text-sm text-slate-600">{payment.retry_count || 0}</span>;
            },
            width: '80px'
        },
        {
            key: 'date',
            header: 'Date',
            render: (row: object) => {
                const payment = row as PaymentWithUser;
                return (
                    <div className="text-sm text-slate-600">
                        <p>{new Date(payment.created_at).toLocaleDateString()}</p>
                        <p className="text-xs">{new Date(payment.created_at).toLocaleTimeString()}</p>
                    </div>
                );
            },
            width: '120px'
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Payment Management</h1>
                    <p className="text-slate-500">Track and manage donations and payments</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard icon={DollarSign} label="Total Revenue" value={stats.totalAmount} prefix="₹" />
                <StatCard icon={CreditCard} label="Total Payments" value={stats.total} />
                <StatCard icon={CheckCircle} label="Completed" value={stats.completed} variant="success" />
                <StatCard icon={Clock} label="Pending" value={stats.pending} variant="warning" />
                <StatCard icon={XCircle} label="Failed" value={stats.failed} variant="error" />
            </div>

            {/* Data Table */}
            <DataTable
                data={payments as unknown as object[]}
                columns={columns}
                keyExtractor={(row) => (row as PaymentWithUser).id}
                title="All Payments"
                loading={loading}
                onView={handleView}
                searchKeys={['donor_name', 'donor_email', 'donor_phone', 'order_id', 'payment_id']}
            />

            {/* Dialog */}
            {dialogOpen && selectedPayment && (
                <PaymentDialog
                    payment={selectedPayment}
                    onClose={() => setDialogOpen(false)}
                    onRefund={() => handleRefund(selectedPayment)}
                    onRetry={() => handleRetry(selectedPayment)}
                />
            )}
        </div>
    );
}

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: number;
    prefix?: string;
    variant?: 'default' | 'success' | 'warning' | 'error';
}

function StatCard({ icon: Icon, label, value, prefix = '', variant = 'default' }: StatCardProps) {
    const variantColors = {
        default: 'bg-primary-50 text-primary-600',
        success: 'bg-green-50 text-green-600',
        warning: 'bg-yellow-50 text-yellow-600',
        error: 'bg-red-50 text-red-600',
    };

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${variantColors[variant]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-slate-900">{prefix}{value.toLocaleString()}</p>
                    <p className="text-sm text-slate-500">{label}</p>
                </div>
            </div>
        </div>
    );
}

interface PaymentDialogProps {
    payment: PaymentWithUser;
    onClose: () => void;
    onRefund: () => void;
    onRetry: () => void;
}

function PaymentDialog({ payment, onClose, onRefund, onRetry }: PaymentDialogProps) {
    const statusColors: Record<string, string> = {
        'completed': 'text-green-600 bg-green-50',
        'pending': 'text-yellow-600 bg-yellow-50',
        'failed': 'text-red-600 bg-red-50',
        'refunded': 'text-slate-600 bg-slate-100',
        'cancelled': 'text-slate-600 bg-slate-100',
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Payment Details</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Status Banner */}
                    <div className={`p-4 rounded-xl mb-6 ${statusColors[payment.status] || 'text-slate-600 bg-slate-100'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Payment Status</p>
                                <p className="text-2xl font-bold capitalize">{payment.status}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">Amount</p>
                                <p className="text-2xl font-bold">₹{(payment.amount || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Donor Info */}
                    <div className="bg-slate-50 p-4 rounded-xl mb-6">
                        <h4 className="font-medium text-slate-900 mb-3">Donor Information</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500">Name:</span>
                                <span className="ml-2 font-medium">{payment.donor_name || 'Anonymous'}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Email:</span>
                                <span className="ml-2 font-medium">{payment.donor_email || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Phone:</span>
                                <span className="ml-2 font-medium">{payment.donor_phone || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Gateway:</span>
                                <span className="ml-2 font-medium capitalize">{payment.gateway}</span>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="bg-slate-50 p-4 rounded-xl mb-6">
                        <h4 className="font-medium text-slate-900 mb-3">Transaction Details</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Order ID:</span>
                                <span className="font-mono">{payment.order_id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Payment ID:</span>
                                <span className="font-mono">{payment.payment_id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Currency:</span>
                                <span className="uppercase">{payment.currency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Retry Count:</span>
                                <span>{payment.retry_count || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-slate-50 p-4 rounded-xl mb-6">
                        <h4 className="font-medium text-slate-900 mb-3">Timeline</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Created:</span>
                                <span>{new Date(payment.created_at).toLocaleString()}</span>
                            </div>
                            {payment.completed_at && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Completed:</span>
                                    <span>{new Date(payment.completed_at).toLocaleString()}</span>
                                </div>
                            )}
                            {payment.last_retry_at && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Last Retry:</span>
                                    <span>{new Date(payment.last_retry_at).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-500">Last Updated:</span>
                                <span>{new Date(payment.updated_at).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Error Info */}
                    {(payment.error_message || payment.error_code) && (
                        <div className="bg-red-50 p-4 rounded-xl mb-6">
                            <h4 className="font-medium text-red-900 mb-3">Error Information</h4>
                            {payment.error_code && (
                                <p className="text-sm text-red-700 mb-1">
                                    <span className="font-medium">Code:</span> {payment.error_code}
                                </p>
                            )}
                            {payment.error_message && (
                                <p className="text-sm text-red-700">
                                    <span className="font-medium">Message:</span> {payment.error_message}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Metadata */}
                    {payment.metadata && Object.keys(payment.metadata).length > 0 && (
                        <div className="bg-slate-50 p-4 rounded-xl">
                            <h4 className="font-medium text-slate-900 mb-3">Additional Metadata</h4>
                            <pre className="text-xs bg-slate-100 p-3 rounded overflow-x-auto">
                                {JSON.stringify(payment.metadata, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                    {payment.status === 'completed' && (
                        <button
                            onClick={onRefund}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refund Payment
                        </button>
                    )}
                    {payment.status === 'failed' && (
                        <button
                            onClick={onRetry}
                            className="flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retry Payment
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
