'use client';

import React, { useMemo, useState } from 'react';
import { AlertCircle, Download, FileText, Loader2 } from 'lucide-react';

interface ReceiptLookupCardProps {
    title?: string;
    description?: string;
    className?: string;
    defaultOrderId?: string;
    defaultPaymentId?: string;
    hidePaymentId?: boolean;
}

function buildReceiptUrl(orderId: string, paymentId: string): string {
    const params = new URLSearchParams();
    if (orderId) params.set('orderId', orderId);
    if (paymentId) params.set('paymentId', paymentId);
    return `/api/donations/receipt?${params.toString()}`;
}

function extractFilename(contentDisposition: string | null, fallback: string): string {
    if (!contentDisposition) return fallback;

    const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
        return decodeURIComponent(utfMatch[1]);
    }

    const basicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    if (basicMatch?.[1]) {
        return basicMatch[1];
    }

    return fallback;
}

export function ReceiptLookupCard({
    title = 'Download Previous Donation Receipt',
    description = 'Enter your Razorpay Order ID and, if available, Payment ID to download the PDF receipt later.',
    className = '',
    defaultOrderId = '',
    defaultPaymentId = '',
    hidePaymentId = false,
}: ReceiptLookupCardProps) {
    const [orderId, setOrderId] = useState(defaultOrderId);
    const [paymentId, setPaymentId] = useState(defaultPaymentId);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const trimmedOrderId = orderId.trim();
    const trimmedPaymentId = paymentId.trim();

    const canDownload = useMemo(() => trimmedOrderId.length > 0 || trimmedPaymentId.length > 0, [trimmedOrderId, trimmedPaymentId]);

    const handleDownload = async () => {
        if (!canDownload || isDownloading) {
            return;
        }

        setIsDownloading(true);
        setError(null);

        try {
            const receiptUrl = buildReceiptUrl(trimmedOrderId, trimmedPaymentId);
            const response = await fetch(receiptUrl, {
                method: 'GET',
                cache: 'no-store',
            });

            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(typeof data.error === 'string' ? data.error : 'Receipt could not be downloaded');
                }
                throw new Error(`Receipt request failed (${response.status})`);
            }

            const blob = await response.blob();
            const filename = extractFilename(
                response.headers.get('content-disposition'),
                `donation-receipt-${trimmedOrderId || trimmedPaymentId || Date.now()}.pdf`
            );

            const objectUrl = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = objectUrl;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(objectUrl);
        } catch (downloadError) {
            setError(downloadError instanceof Error ? downloadError.message : 'Failed to download receipt');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{description}</p>
                </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Order ID</label>
                    <input
                        type="text"
                        value={orderId}
                        onChange={(event) => setOrderId(event.target.value)}
                        placeholder="order_XXXXXXXXXXXX"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                </div>
                {!hidePaymentId && (
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment ID</label>
                        <input
                            type="text"
                            value={paymentId}
                            onChange={(event) => setPaymentId(event.target.value)}
                            placeholder="pay_XXXXXXXXXXXX"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                    Works for completed Razorpay donations. Use the IDs from your payment confirmation email, SMS, or dashboard.
                </p>
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!canDownload || isDownloading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {isDownloading ? 'Preparing PDF...' : 'Download PDF Receipt'}
                </button>
            </div>
        </div>
    );
}
