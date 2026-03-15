'use client';

import { BrandLogo } from '@/components/brand-logo';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackLoadingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8">
                <BrandLogo size="lg" />
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-6" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    Setting up your account
                </h2>
                <p className="text-slate-500 text-center max-w-xs">
                    Please wait while we complete your sign in...
                </p>
            </div>

            <p className="mt-8 text-sm text-slate-400">
                Secure connection • SaviEdTech
            </p>
        </div>
    );
}
