'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/brand/Logo';

export default function PendingVerificationPage() {
  const router = useRouter();
  const { signOut, isLoading } = useAuth();
  const [resendEmail, setResendEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResendEmail = async () => {
    setResendEmail(true);
    setTimeout(() => {
      setResendEmail(false);
      setEmailSent(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex rounded-xl p-2" aria-label="SaviEduTech home">
            <Logo size="lg" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-orange-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Account Pending Verification
          </h1>
          
          <p className="text-slate-500 text-center mb-6">
            Your account is awaiting approval from our administrators.
          </p>

          <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">What happens next?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Our team will review your application</li>
                  <li>You will receive an email once approved</li>
                  <li>After approval, you can sign in with your credentials</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              disabled={resendEmail || emailSent}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resendEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : emailSent ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Email Sent
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Resend Verification Email
                </>
              )}
            </button>

            <button
              onClick={() => signOut()}
              className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500">
              Need help? Contact us at{' '}
              <a href="mailto:support@saviedutech.com" className="text-primary-600 hover:underline">
                support@saviedutech.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
