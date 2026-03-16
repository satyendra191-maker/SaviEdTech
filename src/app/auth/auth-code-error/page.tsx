'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { AlertCircle, Clock, Ban, UserX, Mail, ArrowRight, Loader2 } from 'lucide-react';

function AuthCodeErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [mounted, setMounted] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleHashRecovery = async (retries = 3) => {
      if (typeof window === 'undefined' || !window.location.hash) return;
      
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const fragmentError = hashParams.get('error');
      const fragmentErrorDescription = hashParams.get('error_description');

      // If there's an error in the fragment (Implicit Flow error)
      if (fragmentError) {
        console.log('[AuthRecovery] Error found in fragment:', fragmentError);
        // Redirect to ourselves but with query params so the UI updates correctly
        const newUrl = new URL(window.location.href);
        newUrl.hash = '';
        newUrl.searchParams.set('error', fragmentError);
        if (fragmentErrorDescription) {
          newUrl.searchParams.set('description', fragmentErrorDescription);
        }
        window.location.href = newUrl.toString();
        return;
      }

      if (accessToken) {
        setIsRecovering(true);
        
        await new Promise(r => setTimeout(r, 1000));
        console.log(`[AuthRecovery] Attempting session restoration (Attempts remaining: ${retries})...`);
        
        try {
          const { getSupabaseBrowserClient } = await import('@/lib/supabase');
          const supabase = getSupabaseBrowserClient();
          
          if (!supabase) {
            setIsRecovering(false);
            return;
          }

          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (!error) {
            console.log('[AuthRecovery] Success!');
            setTimeout(() => { window.location.href = '/dashboard'; }, 500);
          } else {
            if (error.message.includes('Lock') || error.message.includes('AbortError')) {
              if (retries > 0) {
                console.warn('[AuthRecovery] Lock collision detected, retrying...');
                return handleHashRecovery(retries - 1);
              }
            }
            console.error('[AuthRecovery] setSession error:', error.message);
            setIsRecovering(false);
          }
        } catch (err: any) {
          if (err?.message?.includes('Lock') && retries > 0) {
             console.warn('[AuthRecovery] Runtime lock collision, retrying...');
             return handleHashRecovery(retries - 1);
          }
          console.error('[AuthRecovery] Critical error:', err);
          setIsRecovering(false);
        }
      }
    };

    handleHashRecovery();
  }, []);

  if (isRecovering) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Restoring Session</h1>
          <p className="text-slate-600 mb-6">Please wait while we authorize your access...</p>
          
          <div className="pt-4 border-t border-slate-100">
             <p className="text-xs text-slate-400 mb-4">If this takes too long, try the manual option:</p>
             <button 
                onClick={() => window.location.href = '/dashboard'}
                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
             >
                I'm already logged in, take me to Dashboard
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-rose-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded mb-4"></div>
            <div className="h-4 bg-slate-200 rounded mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  const description = searchParams.get('description');
  const message = searchParams.get('message');

  const errorConfig: Record<string, { title: string; message: string; icon: React.ReactNode; showSignup?: boolean }> = {
    session_failed: {
      title: 'Authentication Failed',
      message: message || 'We could not complete authentication. Please try again.',
      icon: <AlertCircle className="w-16 h-16 text-red-500" />,
    },
    profile_not_found: {
      title: 'Account Not Found',
      message: 'Your profile was not found. Please sign up first to create an account.',
      icon: <UserX className="w-16 h-16 text-orange-500" />,
      showSignup: true,
    },
    account_blocked: {
      title: 'Account Blocked',
      message: 'Your account has been blocked. Please contact support for assistance.',
      icon: <Ban className="w-16 h-16 text-red-500" />,
    },
    not_verified: {
      title: 'Email Not Verified',
      message: 'Please verify your email address to sign in. Check your inbox for the verification link.',
      icon: <Clock className="w-16 h-16 text-orange-500" />,
    },
    employee_pending: {
      title: 'Account Pending Approval',
      message: 'Your account is pending approval by administrator. You will be notified once your account is reviewed and approved.',
      icon: <Clock className="w-16 h-16 text-orange-500" />,
    },
    access_denied: {
      title: 'Access Denied',
      message: description || 'The request was denied. If you cancelled the login, please try again.',
      icon: <Ban className="w-16 h-16 text-rose-500" />,
    },
    invalid_request: {
      title: 'Invalid Request',
      message: description || 'The authentication request was invalid or has expired. Please try again.',
      icon: <AlertCircle className="w-16 h-16 text-slate-500" />,
    },
    default: {
      title: 'Something Went Wrong',
      message: description || message || 'An error occurred during authentication. Please try again.',
      icon: <AlertCircle className="w-16 h-16 text-slate-500" />,
    },
  };

  const config = errorConfig[error || 'default'] || errorConfig.default;
  const debugParams = searchParams.get('debug_params');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="flex justify-center mb-6">
          {config.icon}
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          {config.title}
        </h1>
        
        <p className="text-slate-600 mb-6">
          {config.message}
        </p>

        {(description || message || debugParams) && (
          <div className="mb-6 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Technical Details</p>
            {description && <p className="text-xs text-slate-600 mb-1"><strong>Error:</strong> {description}</p>}
            {message && <p className="text-xs text-slate-600 mb-1"><strong>Message:</strong> {message}</p>}
            {debugParams && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">URL Parameters</p>
                <p className="text-[10px] text-slate-500 font-mono break-all">{debugParams}</p>
              </div>
            )}
            {mounted && typeof window !== 'undefined' && window.location.hash && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">URL Hash (Fragment)</p>
                <p className="text-[10px] text-slate-500 font-mono break-all line-clamp-2">{window.location.hash}</p>
                <p className="text-[10px] text-rose-500 mt-1">Found fragment - system might be using Implicit Flow instead of PKCE.</p>
              </div>
            )}
          </div>
        )}

        {error === 'not_verified' && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-xl">
            <p className="text-sm text-orange-800">
              <span className="font-semibold">What happens next?</span>
              <br />
              Our team will review your application. You will receive an email once your account is approved.
            </p>
          </div>
        )}

        {error === 'profile_not_found' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">New User?</span>
              <br />
              You must sign up first before accessing the platform. Click the sign up button below.
            </p>
          </div>
        )}

        {error === 'employee_pending' && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-xl">
            <p className="text-sm text-orange-800">
              <span className="font-semibold">Account Under Review</span>
              <br />
              Your employee account is pending approval from the administrator. This typically takes 24-48 hours. You will receive an email once approved.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
          >
            Back to Login
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          {config.showSignup && (
            <Link
              href="/register"
              className="block w-full py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Sign Up Now
            </Link>
          )}
        </div>

        {(error === 'not_verified' || error === 'employee_pending') && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Need help? Contact us at{' '}
              <a href="mailto:support@saviedutech.com" className="text-primary-600 hover:underline">
                support@saviedutech.com
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-rose-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        </div>
      </div>
    }>
      <AuthCodeErrorContent />
    </Suspense>
  );
}
