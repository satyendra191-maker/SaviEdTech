'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    BarChart3,
    Download,
    FileSpreadsheet,
    FileText,
    HandCoins,
    Landmark,
    ReceiptText,
    RefreshCw,
    ShieldCheck,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { AdminReportDropdown, ExportDropdown, GST_FINANCE_REPORTS, LEADS_REPORTS, STUDENT_REPORTS, COURSE_REPORTS, PAYMENT_REPORTS, DONATION_REPORTS, LECTURE_REPORTS, TEST_REPORTS, FACULTY_REPORTS, CAREER_REPORTS, ANALYTICS_REPORTS } from '@/components/admin/AdminExportDropdown';

interface FinanceSummary {
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
    recentInvoices: Array<{
        id: string;
        invoice_number: string;
        course_title: string;
        student_name: string;
        total_amount: number;
        invoice_date: string;
        status: string;
    }>;
    recentReceipts: Array<{
        id: string;
        receipt_number: string;
        donor_name: string;
        amount: number;
        receipt_date: string;
    }>;
    gstReports: Array<{
        id: string;
        report_type: string;
        report_month: string;
        file_format: string;
        total_taxable_value: number;
        total_gst_amount: number;
        total_invoice_value: number;
        created_at: string;
    }>;
    recentAuditLogs: Array<{
        id: string;
        action_type: string;
        message: string | null;
        reference_type: string | null;
        reference_id: string | null;
        created_at: string;
    }>;
}

const REPORT_ACTIONS = [
    { report: 'monthly-gst-sales', label: 'Monthly GST Sales', description: 'Invoice-level GST sales register for accountants.' },
    { report: 'course-sales', label: 'Course Sales', description: 'Course and subscription sales grouped by product.' },
    { report: 'donation-transactions', label: 'Donation Transactions', description: 'Donation receipt register for funding audit.' },
    { report: 'revenue-summary', label: 'Revenue Summary', description: 'High-level revenue, GST, and donation summary.' },
    { report: 'transaction-ledger', label: 'Transaction Ledger', description: 'Double-entry ledger export for reconciliation.' },
    { report: 'gstr1', label: 'GSTR-1 Ready', description: 'Structured outward sales export for GST filing support.' },
    { report: 'gstr3b', label: 'GSTR-3B Ready', description: 'Monthly outward taxable supply summary.' },
] as const;

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatMonthInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildExportUrl(report: string, format: 'pdf' | 'csv' | 'xlsx', month: string): string {
    return `/api/admin/finance/export?report=${encodeURIComponent(report)}&format=${format}&month=${encodeURIComponent(month)}`;
}

export default function AdminFinancePage() {
    const [data, setData] = useState<FinanceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(() => formatMonthInput(new Date()));

    const fetchSummary = useCallback(async (silent = false) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const response = await fetch('/api/admin/finance/summary', {
                credentials: 'include',
                cache: 'no-store',
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error?.message || payload?.error || 'Failed to load finance summary.');
            }

            setData(payload.data as FinanceSummary);
        } catch (summaryError) {
            console.error('Failed to load finance summary:', summaryError);
            setError(summaryError instanceof Error ? summaryError.message : 'Failed to load finance summary.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchSummary();
    }, [fetchSummary]);

    const topCourseSales = useMemo(() => (data?.courseSalesBreakdown || []).slice(0, 6), [data?.courseSalesBreakdown]);
    const topDonationTrend = useMemo(() => (data?.donationTrend || []).slice(-6), [data?.donationTrend]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
                    <p className="text-sm text-slate-500">Loading finance dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Financial & Accounts Dashboard</h1>
                    <p className="text-sm text-slate-500">
                        Track revenue, GST, donations, invoices, receipts, and accounting exports in one place.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(event) => setSelectedMonth(event.target.value)}
                        className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-primary-500"
                    />
                    <button
                        type="button"
                        onClick={() => void fetchSummary(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard icon={Landmark} label="Course Revenue" value={formatCurrency(data?.metrics.totalCourseRevenue || 0)} accent="bg-sky-50 text-sky-700" />
                <MetricCard icon={HandCoins} label="Donations" value={formatCurrency(data?.metrics.totalDonations || 0)} accent="bg-rose-50 text-rose-700" />
                <MetricCard icon={ReceiptText} label="GST Collected" value={formatCurrency(data?.metrics.gstCollected || 0)} accent="bg-amber-50 text-amber-700" />
                <MetricCard icon={ShieldCheck} label="Net Revenue" value={formatCurrency(data?.metrics.netRevenue || 0)} accent="bg-emerald-50 text-emerald-700" />
                <MetricCard icon={BarChart3} label="Refunded Txns" value={String(data?.metrics.refundedTransactions || 0)} accent="bg-slate-100 text-slate-700" />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <ChartCard title="Daily Revenue Trend">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data?.dailyRevenueTrend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Line type="monotone" dataKey="netRevenue" stroke="#2563eb" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="gst" stroke="#f59e0b" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Monthly Revenue Mix">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.monthlyRevenueTrend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Bar dataKey="courseRevenue" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="donations" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <ChartCard title="Course Sales Breakdown">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topCourseSales}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-16} textAnchor="end" height={70} />
                                <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Bar dataKey="amount" fill="#16a34a" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Donation Trend">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={topDonationTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Line type="monotone" dataKey="amount" stroke="#e11d48" strokeWidth={3} dot />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Exports & GST Filing Support</h2>
                        <p className="text-sm text-slate-500">Generate PDF, CSV, Excel, JSON, and Word reports for accountants and GST filing workflows.</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Reporting month: {selectedMonth}
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {REPORT_ACTIONS.map((action) => (
                        <article key={action.report} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="text-sm font-semibold text-slate-900">{action.label}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>
                                <div className="mt-4">
                                <ExportDropdown report={action.report} label={action.label} month={selectedMonth} />
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Recent Financial Transactions</h2>
                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="px-3 py-3">When</th>
                                    <th className="px-3 py-3">Counterparty</th>
                                    <th className="px-3 py-3">Type</th>
                                    <th className="px-3 py-3">Document</th>
                                    <th className="px-3 py-3">Gross</th>
                                    <th className="px-3 py-3">GST</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.recentTransactions || []).map((entry) => (
                                    <tr key={entry.id} className="border-b border-slate-100 last:border-0">
                                        <td className="px-3 py-3 text-slate-500">{new Date(entry.occurredAt).toLocaleString('en-IN')}</td>
                                        <td className="px-3 py-3">
                                            <div className="font-medium text-slate-900">{entry.counterparty}</div>
                                            <div className="text-xs text-slate-500">{entry.reference || 'Reference pending'}</div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.transactionKind === 'refund' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {entry.transactionType.replace('_', ' ')} / {entry.transactionKind}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 font-mono text-xs text-slate-600">{entry.documentNumber || '-'}</td>
                                        <td className="px-3 py-3 font-semibold text-slate-900">{formatCurrency(entry.grossAmount)}</td>
                                        <td className="px-3 py-3 text-slate-600">{formatCurrency(entry.gstAmount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="space-y-6">
                    <MiniListCard
                        title="Recent Invoices"
                        items={(data?.recentInvoices || []).map((invoice) => ({
                            id: invoice.id,
                            title: invoice.invoice_number,
                            subtitle: `${invoice.student_name} | ${invoice.course_title}`,
                            meta: `${formatCurrency(invoice.total_amount)} | ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}`,
                            href: `/api/payments/invoice?invoiceNumber=${encodeURIComponent(invoice.invoice_number)}`,
                        }))}
                    />

                    <MiniListCard
                        title="Recent Donation Receipts"
                        items={(data?.recentReceipts || []).map((receipt) => ({
                            id: receipt.id,
                            title: receipt.receipt_number,
                            subtitle: receipt.donor_name,
                            meta: `${formatCurrency(receipt.amount)} | ${new Date(receipt.receipt_date).toLocaleDateString('en-IN')}`,
                            href: null,
                        }))}
                    />
                </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">GST Report History</h2>
                    <div className="mt-4 space-y-3">
                        {(data?.gstReports || []).length ? (data?.gstReports || []).map((report) => (
                            <div key={report.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-medium text-slate-900">{report.report_type.replace(/_/g, ' ')}</p>
                                        <p className="text-sm text-slate-500">
                                            {report.report_month} | {report.file_format.toUpperCase()} | Taxable {formatCurrency(report.total_taxable_value)}
                                        </p>
                                    </div>
                                    <span className="text-xs text-slate-400">{new Date(report.created_at).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                No GST report snapshots generated yet.
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Finance Audit Trail</h2>
                    <div className="mt-4 space-y-3">
                        {(data?.recentAuditLogs || []).length ? (data?.recentAuditLogs || []).map((entry) => (
                            <div key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-medium text-slate-900">{entry.action_type.replace(/_/g, ' ')}</p>
                                        <p className="text-sm text-slate-500">{entry.message || 'No description provided.'}</p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            {entry.reference_type || 'general'} {entry.reference_id ? `| ${entry.reference_id}` : ''}
                                        </p>
                                    </div>
                                    <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                Finance audit events will appear here after exports, invoices, receipts, and accounting updates.
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-lg">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">GST Filing Support Snapshot</h2>
                        <p className="mt-2 text-sm text-white/75">
                            GSTR-1 and GSTR-3B exports are generated from live invoices, GST values, and double-entry accounting records.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href={buildExportUrl('gstr1', 'xlsx', selectedMonth)}
                            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white/90"
                        >
                            Download GSTR-1 XLSX
                        </Link>
                        <Link
                            href={buildExportUrl('gstr3b', 'pdf', selectedMonth)}
                            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                        >
                            Download GSTR-3B PDF
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    icon: Icon,
    label,
    value,
    accent,
}: {
    icon: typeof Landmark;
    label: string;
    value: string;
    accent: string;
}) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={`rounded-2xl p-3 ${accent}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-xl font-semibold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    );
}

function ChartCard({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function MiniListCard({
    title,
    items,
}: {
    title: string;
    items: Array<{
        id: string;
        title: string;
        subtitle: string;
        meta: string;
        href: string | null;
    }>;
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <div className="mt-4 space-y-3">
                {items.length ? items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-medium text-slate-900">{item.title}</p>
                                <p className="text-sm text-slate-500">{item.subtitle}</p>
                                <p className="mt-1 text-xs text-slate-400">{item.meta}</p>
                            </div>
                            {item.href ? (
                                <a
                                    href={item.href}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    Download
                                </a>
                            ) : null}
                        </div>
                    </div>
                )) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        No records available yet.
                    </div>
                )}
            </div>
        </section>
    );
}
