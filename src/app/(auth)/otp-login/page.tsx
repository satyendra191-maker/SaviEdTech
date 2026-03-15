'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Phone, Lock, Loader2, ArrowLeft, CheckCircle, MessageSquare } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

const otpRequestSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
});

const otpVerifySchema = z.object({
  token: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits'),
});

type OTPRequestData = z.infer<typeof otpRequestSchema>;
type OTPVerifyData = z.infer<typeof otpVerifySchema>;

export default function OTPLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isEmailOTP, setIsEmailOTP] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const {
    register: registerRequest,
    handleSubmit: handleRequestSubmit,
    formState: { errors: requestErrors },
    setValue,
  } = useForm<OTPRequestData>({
    resolver: zodResolver(otpRequestSchema),
  });

  const {
    register: registerVerify,
    handleSubmit: handleVerifySubmit,
    formState: { errors: verifyErrors },
  } = useForm<OTPVerifyData>({
    resolver: zodResolver(otpVerifySchema),
  });

  const onRequestSubmit = async (data: OTPRequestData) => {
    setIsLoading(true);
    setSubmitError('');
    setIdentifier(data.identifier);

    try {
      const response = await fetch('/api/auth/otp-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          identifier: data.identifier,
          isEmail: isEmailOTP 
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setSubmitError(result.error || 'Failed to send OTP');
        return;
      }

      setSuccess(true);
      setCountdown(300); // 5 minutes
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifySubmit = async (data: OTPVerifyData) => {
    setIsLoading(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/auth/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          identifier,
          token: data.token,
          isEmail: isEmailOTP
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setSubmitError(result.error || 'Invalid OTP');
        return;
      }

      router.push('/dashboard');
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/auth/otp-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          identifier,
          isEmail: isEmailOTP 
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setSubmitError(result.error || 'Failed to resend OTP');
        return;
      }

      setCountdown(300);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex">
              <Logo size="md" variant="full" showTagline={true} />
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex">
            <Logo size="lg" variant="full" showTagline={true} />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Link
            href="/login"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                OTP Login
              </h1>
              <p className="text-slate-500 text-sm">
                Verify your identity with a one-time password
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setIsEmailOTP(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                isEmailOTP
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4 inline-block mr-2" />
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => setIsEmailOTP(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isEmailOTP
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-4 h-4 inline-block mr-2" />
              Phone OTP
            </button>
          </div>

          {submitError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {submitError}
            </div>
          )}

          {!success ? (
            <form method="post" onSubmit={handleRequestSubmit(onRequestSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isEmailOTP ? 'Email Address' : 'Phone Number'}
                </label>
                <div className="relative">
                  {isEmailOTP ? (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  ) : (
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  )}
                  <input
                    type={isEmailOTP ? 'email' : 'tel'}
                    {...registerRequest('identifier')}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all ${
                      requestErrors.identifier
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                    }`}
                    placeholder={isEmailOTP ? 'you@example.com' : '9876543210'}
                    disabled={isLoading}
                  />
                </div>
                {requestErrors.identifier && (
                  <p className="mt-1 text-sm text-red-600">{requestErrors.identifier.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl 
                           hover:from-primary-700 hover:to-primary-600 transition-all disabled:opacity-70
                           flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Send OTP'
                )}
              </button>
            </form>
          ) : (
            <form method="post" onSubmit={handleVerifySubmit(onVerifySubmit)} className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-lg">
                OTP sent to {identifier}. Expires in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Enter OTP
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    {...registerVerify('token')}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all text-center text-2xl tracking-widest ${
                      verifyErrors.token
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                    }`}
                    placeholder="000000"
                    maxLength={6}
                    disabled={isLoading}
                  />
                </div>
                {verifyErrors.token && (
                  <p className="mt-1 text-sm text-red-600">{verifyErrors.token.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl 
                           hover:from-primary-700 hover:to-primary-600 transition-all disabled:opacity-70
                           flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Login'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resendOTP}
                  disabled={countdown > 0 || isLoading}
                  className="text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                >
                  {countdown > 0 ? `Resend OTP in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Or sign in with{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                password
              </Link>{' '}
              or{' '}
              <Link href="/magic-link" className="text-primary-600 hover:text-primary-700 font-semibold">
                magic link
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
