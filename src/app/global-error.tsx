'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { reportClientError } from '@/lib/client/error-reporting';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        if (!error) {
            return;
        }

        console.error('[GlobalError] Application error:', {
            message: error.message,
            digest: error.digest,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        });

        reportClientError({
            boundary: 'next-global-error',
            message: error.message,
            stack: error.stack,
            digest: error.digest || null,
        });
    }, [error]);

    const displayMessage = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again.'
        : (error.message || 'An unexpected error occurred');

    return (
        <html>
            <body>
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="text-center p-8 max-w-md">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">
                            Something went wrong!
                        </h2>
                        <p className="text-slate-600 mb-6">
                            {displayMessage}
                        </p>
                        {process.env.NODE_ENV === 'development' && error.stack && (
                            <div className="mb-6 p-3 bg-slate-100 rounded-lg text-left overflow-auto max-h-32 text-xs font-mono">
                                {error.stack}
                            </div>
                        )}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => reset()}
                                className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try again
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center justify-center gap-2 px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                Go to Home
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
