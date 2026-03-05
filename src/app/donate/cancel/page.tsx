'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function DonateCancelPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-10 h-10 text-amber-600" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-4">Payment Cancelled</h1>
                <p className="text-slate-600 mb-8">
                    Your donation was cancelled. No payment was processed.
                    If you have any questions or concerns, please don't hesitate to contact us.
                </p>
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
            </div>
        </div>
    );
}
