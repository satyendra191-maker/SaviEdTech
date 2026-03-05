'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

function DonateSuccessContent() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your payment...');

    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');
    const paymentId = searchParams.get('payment_id');
    const token = searchParams.get('token'); // PayPal

    useEffect(() => {
        async function verifyPayment() {
            try {
                // Determine which gateway based on params
                let gateway: 'stripe' | 'paypal' | null = null;
                let verifyData: Record<string, string> = {};

                if (sessionId) {
                    gateway = 'stripe';
                    verifyData = { sessionId, gateway };
                } else if (token && orderId) {
                    gateway = 'paypal';
                    verifyData = { orderId, gateway };
                } else if (orderId && paymentId) {
                    // Could be Razorpay or Stripe payment intent
                    verifyData = { orderId, paymentId, gateway: 'razorpay' };
                }

                if (!gateway && !verifyData.orderId) {
                    setStatus('error');
                    setMessage('Invalid payment verification data');
                    return;
                }

                // Call verification API
                const response = await fetch('/api/payments/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(verifyData),
                });

                const result = await response.json();

                if (result.success && result.verified) {
                    setStatus('success');
                    setMessage('Thank you for your donation! Your payment has been verified.');
                } else {
                    setStatus('error');
                    setMessage(result.error || 'Payment verification failed. Please contact support.');
                }
            } catch (error) {
                console.error('Verification error:', error);
                setStatus('error');
                setMessage('An error occurred while verifying your payment.');
            }
        }

        verifyPayment();
    }, [sessionId, orderId, paymentId, token]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {status === 'verifying' && (
                    <>
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-4">Verifying Payment</h1>
                        <p className="text-slate-600">{message}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-4">Thank You!</h1>
                        <p className="text-slate-600 mb-8">{message}</p>
                        <div className="space-y-3">
                            <Link
                                href="/"
                                className="block w-full py-3 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-colors"
                            >
                                Back to Home
                            </Link>
                            <Link
                                href="/donate"
                                className="block w-full py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:border-slate-300 transition-colors"
                            >
                                Make Another Donation
                            </Link>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-4">Payment Verification Issue</h1>
                        <p className="text-slate-600 mb-8">{message}</p>
                        <div className="space-y-3">
                            <Link
                                href="/donate"
                                className="block w-full py-3 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-colors"
                            >
                                Try Again
                            </Link>
                            <Link
                                href="/"
                                className="block w-full py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:border-slate-300 transition-colors"
                            >
                                Back to Home
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function DonateSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-4">Loading...</h1>
                </div>
            </div>
        }>
            <DonateSuccessContent />
        </Suspense>
    );
}
