/**
 * Payment Button Component
 * 
 * Unified payment button using Razorpay
 * Handles order creation, checkout, and payment verification
 */

'use client';

import React, { useState, useCallback } from 'react';
import { CreditCard, Wallet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind class merging
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type PaymentGateway = 'razorpay';

// Payment status types
export type PaymentStatus = 'idle' | 'loading' | 'processing' | 'success' | 'error';

// Component props
export interface PaymentButtonProps {
    amount: number;
    currency?: string;
    gateway?: PaymentGateway | 'auto';
    donorEmail?: string;
    donorName?: string;
    donorPhone?: string;
    donorMessage?: string;
    description?: string;
    metadata?: {
        type?: 'donation' | 'course_purchase' | 'subscription';
        courseId?: string;
        courseTitle?: string;
        planId?: string;
        durationDays?: number;
        accessHref?: string;
        donorMessage?: string;
    };
    successUrl?: string;
    cancelUrl?: string;
    className?: string;
    onSuccess?: (data: {
        orderId: string;
        paymentId?: string;
        gateway: PaymentGateway;
        receiptNumber?: string;
        receiptDownloadUrl?: string;
        invoiceDownloadUrl?: string;
        redirectUrl?: string;
    }) => void;
    onError?: (error: string) => void;
    onCancel?: () => void;
    children?: React.ReactNode;
    showGatewaySelector?: boolean;
}

// Razorpay window type declaration
declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
    }
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    prefill: {
        name?: string;
        email?: string;
        contact?: string;
    };
    theme: {
        color: string;
    };
    modal: {
        ondismiss: () => void;
    };
}

interface RazorpayInstance {
    open: () => void;
    close: () => void;
}

interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

interface VerificationResult {
    verified: boolean;
    receiptNumber?: string;
    receiptDownloadUrl?: string;
    invoiceDownloadUrl?: string;
    redirectUrl?: string;
    error?: string;
}

// Payment button component
export function PaymentButton({
    amount,
    currency = 'INR',
    gateway = 'auto',
    donorEmail,
    donorName,
    donorPhone,
    donorMessage,
    description = 'Donation',
    metadata,
    successUrl,
    cancelUrl,
    className,
    onSuccess,
    onError,
    onCancel,
    children,
    showGatewaySelector = false,
}: PaymentButtonProps) {
    const [status, setStatus] = useState<PaymentStatus>('idle');
    const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>(
        gateway === 'auto' ? 'razorpay' : gateway
    );
    const [error, setError] = useState<string | null>(null);

    const parseJsonResponse = useCallback(async (response: Response): Promise<Record<string, unknown>> => {
        try {
            const parsed = await response.json();
            return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
        } catch {
            return {};
        }
    }, []);

    // Load Razorpay script with multiple CDN fallbacks
    const loadRazorpayScript = useCallback(async (): Promise<boolean> => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }

            // Try multiple Razorpay CDN URLs
            const cdnUrls = [
                'https://checkout.razorpay.com/v1/checkout.js',
                'https://cdn.razorpay.com/v1/checkout.js',
                'https://js.razorpay.com/v1/razorpay.js',
            ];

            let currentIndex = 0;

            const tryLoadScript = () => {
                if (currentIndex >= cdnUrls.length) {
                    // All CDNs failed, try loading inline as last resort
                    resolve(false);
                    return;
                }

                const script = document.createElement('script');
                script.src = cdnUrls[currentIndex];
                script.async = true;
                script.onload = () => resolve(true);
                script.onerror = () => {
                    currentIndex++;
                    tryLoadScript();
                };
                document.body.appendChild(script);
            };

            tryLoadScript();
        });
    }, []);

    // Create order via API
    const createOrder = useCallback(async (): Promise<{
        success: boolean;
        orderId?: string;
        order?: unknown;
        checkoutUrl?: string;
        clientSecret?: string;
        error?: string;
    }> => {
        const response = await fetch('/api/payments/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gateway: selectedGateway,
                amount,
                currency: currency,
                donorEmail,
                donorName,
                donorPhone,
                donorMessage,
                description,
                successUrl: successUrl || `${window.location.origin}/donate/success`,
                cancelUrl: cancelUrl || `${window.location.origin}/donate/cancel`,
                metadata: {
                    type: metadata?.type || 'donation',
                    courseId: metadata?.courseId,
                    courseTitle: metadata?.courseTitle,
                    planId: metadata?.planId,
                    durationDays: metadata?.durationDays,
                    accessHref: metadata?.accessHref,
                    donorMessage: metadata?.donorMessage ?? donorMessage,
                },
            }),
        });

        const result = await parseJsonResponse(response);

        if (!response.ok) {
            return {
                success: false,
                error: (result.error as string | undefined) || `Failed to create order (${response.status})`,
            };
        }

        return {
            success: Boolean(result.success),
            orderId: result.orderId as string | undefined,
            order: result.order,
            checkoutUrl: result.checkoutUrl as string | undefined,
            clientSecret: result.clientSecret as string | undefined,
            error: result.error as string | undefined,
        };
    }, [
        amount,
        cancelUrl,
        currency,
        description,
        donorEmail,
        donorName,
        donorPhone,
        donorMessage,
        metadata?.accessHref,
        metadata?.courseId,
        metadata?.courseTitle,
        metadata?.donorMessage,
        metadata?.durationDays,
        metadata?.planId,
        metadata?.type,
        parseJsonResponse,
        selectedGateway,
        successUrl,
    ]);

    // Verify payment via API
    const verifyPayment = useCallback(async (data: {
        orderId: string;
        paymentId?: string;
        signature?: string;
    }): Promise<VerificationResult> => {
        const body: Record<string, unknown> = {
            gateway: selectedGateway,
            orderId: data.orderId,
            metadata: {
                type: metadata?.type || 'donation',
                courseId: metadata?.courseId,
                courseTitle: metadata?.courseTitle,
                planId: metadata?.planId,
                durationDays: metadata?.durationDays,
                accessHref: metadata?.accessHref,
                donorMessage: metadata?.donorMessage ?? donorMessage,
            },
        };

        if (data.paymentId) body.paymentId = data.paymentId;
        if (data.signature) body.signature = data.signature;

        const response = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const result = await parseJsonResponse(response);
        return {
            verified: Boolean(result.success && result.verified),
            receiptNumber: result.receiptNumber as string | undefined,
            receiptDownloadUrl: result.receiptDownloadUrl as string | undefined,
            invoiceDownloadUrl: result.invoiceDownloadUrl as string | undefined,
            redirectUrl: result.redirectUrl as string | undefined,
            error: result.error as string | undefined,
        };
    }, [donorMessage, metadata?.accessHref, metadata?.courseId, metadata?.courseTitle, metadata?.donorMessage, metadata?.durationDays, metadata?.planId, metadata?.type, parseJsonResponse, selectedGateway]);

    // Handle Razorpay payment
    const handleRazorpayPayment = useCallback(async (orderId: string) => {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            setError('Failed to load Razorpay SDK');
            setStatus('error');
            onError?.('Failed to load Razorpay SDK');
            return;
        }

        // Get Razorpay key from server
        const configResponse = await fetch('/api/payments/create-order');
        const config = await configResponse.json();
        const razorpayKey = config.gateways?.razorpay?.config?.keyId;

        if (!razorpayKey) {
            setError('Razorpay is not configured');
            setStatus('error');
            onError?.('Razorpay is not configured');
            return;
        }

        const options: RazorpayOptions = {
            key: razorpayKey,
            amount: amount * 100, // Convert to paise
            currency: currency,
            name: 'SaviEduTech',
            description: description,
            order_id: orderId,
            handler: async (response: RazorpayResponse) => {
                setStatus('processing');

                const verification = await verifyPayment({
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                });

                if (verification.verified) {
                    setStatus('success');
                    onSuccess?.({
                        orderId: response.razorpay_order_id,
                        paymentId: response.razorpay_payment_id,
                        gateway: 'razorpay',
                        receiptNumber: verification.receiptNumber,
                        receiptDownloadUrl: verification.receiptDownloadUrl,
                        invoiceDownloadUrl: verification.invoiceDownloadUrl,
                        redirectUrl: verification.redirectUrl,
                    });
                } else {
                    const verificationError = verification.error || 'Payment verification failed';
                    setError(verificationError);
                    setStatus('error');
                    onError?.(verificationError);
                }
            },
            prefill: {
                name: donorName,
                email: donorEmail,
                contact: donorPhone,
            },
            theme: {
                color: '#10b981',
            },
            modal: {
                ondismiss: () => {
                    setStatus('idle');
                    onCancel?.();
                },
            },
        };

        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.open();
    }, [amount, currency, description, donorEmail, donorName, donorPhone, loadRazorpayScript, onCancel, onError, onSuccess, verifyPayment]);

    // Main payment handler
    const handlePayment = useCallback(async () => {
        setStatus('loading');
        setError(null);

        try {
            const orderResult = await createOrder();

            if (!orderResult.success) {
                setError(orderResult.error || 'Failed to create order');
                setStatus('error');
                onError?.(orderResult.error || 'Failed to create order');
                return;
            }

            setStatus('processing');

            switch (selectedGateway) {
                case 'razorpay':
                    await handleRazorpayPayment(orderResult.orderId!);
                    break;
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Payment failed';
            setError(errorMessage);
            setStatus('error');
            onError?.(errorMessage);
        }
    }, [createOrder, handleRazorpayPayment, onError, selectedGateway]);


    // Get gateway icon
    const getGatewayIcon = (gw: PaymentGateway) => {
        switch (gw) {
            case 'razorpay':
                return <Wallet className="w-4 h-4" />;
        }
    };

    // Get gateway label
    const getGatewayLabel = (gw: PaymentGateway) => {
        switch (gw) {
            case 'razorpay':
                return 'Razorpay';
        }
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Gateway Selector */}
            {showGatewaySelector && (
                <div className="flex flex-wrap gap-2">
                    {(['razorpay'] as PaymentGateway[]).map((gw) => (
                        <button
                            key={gw}
                            onClick={() => setSelectedGateway(gw)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all',
                                selectedGateway === gw
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            )}
                        >
                            {getGatewayIcon(gw)}
                            {getGatewayLabel(gw)}
                        </button>
                    ))}
                </div>
            )}

            {/* Payment Button */}
            <button
                onClick={handlePayment}
                disabled={status === 'loading' || status === 'processing'}
                className={cn(
                    'w-full py-3 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2',
                    status === 'success'
                        ? 'bg-green-500 text-white'
                        : status === 'error'
                            ? 'bg-red-500 text-white'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                )}
            >
                {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
                {status === 'processing' && <Loader2 className="w-5 h-5 animate-spin" />}
                {status === 'success' && <CheckCircle className="w-5 h-5" />}
                {status === 'error' && <AlertCircle className="w-5 h-5" />}

                {children || (
                    status === 'idle' ? `Pay ${getGatewayLabel(selectedGateway)}` :
                        status === 'loading' ? 'Processing...' :
                            status === 'processing' ? 'Verifying...' :
                                status === 'success' ? 'Payment Successful!' :
                                    'Payment Failed'
                )}
            </button>

            {/* Error Message */}
            {error && status === 'error' && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Success Message */}
            {status === 'success' && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Thank you for your support!
                </div>
            )}
        </div>
    );
}

export function RazorpayButton(props: Omit<PaymentButtonProps, 'gateway' | 'showGatewaySelector'>) {
    return (
        <PaymentButton
            {...props}
            gateway="razorpay"
            showGatewaySelector={false}
        />
    );
}

// Export all components
export default PaymentButton;
