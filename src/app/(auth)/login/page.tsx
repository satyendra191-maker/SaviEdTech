'use client';

/**
 * Login Page
 *
 * SECURITY FEATURES:
 * - Zod validation for all form inputs
 * - Rate limiting handled by middleware
 * - Suspicious input pattern detection
 * - CSRF protection via SameSite cookies (handled by Supabase Auth)
 * - Secure error handling that doesn't leak sensitive information
 */

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowLeft, CheckCircle, Link as LinkIcon, MessageSquare, Apple as AppleIcon, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasAuthCallbackArtifacts, sanitizeInternalRedirect } from '@/lib/auth/redirects';
import { emailSchema, containsSuspiciousPatterns } from '@/lib/security';
import { Logo } from '@/components/brand/Logo';

// Enhanced Zod validation schema for login with security checks
const loginSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long'),
  rememberMe: z.boolean().optional(),
}).refine((data) => {
  // Check for suspicious patterns in email (security check)
  return !containsSuspiciousPatterns(data.email);
}, {
  message: 'Invalid characters detected in email',
  path: ['email'],
});

type LoginFormData = z.infer<typeof loginSchema>;

// Forgot password schema with enhanced validation
const forgotPasswordSchema = z.object({
  email: emailSchema,
}).refine((data) => {
  return !containsSuspiciousPatterns(data.email);
}, {
  message: 'Invalid characters detected',
  path: ['email'],
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, resetPassword, signInWithGoogle, isAuthenticated, role, isLoading: authLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const query = new URLSearchParams(searchParams.toString());
    const hasCallbackCode = query.has('code');
    const requestedRedirect = sanitizeInternalRedirect(
      query.get('redirect') ?? query.get('next')
    );

    if (hasCallbackCode) {
      const callbackParams = new URLSearchParams();
      callbackParams.set('code', query.get('code') || '');

      const authType = query.get('type');
      if (authType) {
        callbackParams.set('type', authType);
      }

      if (requestedRedirect !== '/dashboard') {
        callbackParams.set('next', requestedRedirect);
      }

      router.replace(`/auth/callback?${callbackParams.toString()}`);
      return;
    }

    if (!hasAuthCallbackArtifacts(query)) {
      return;
    }

    const cleanParams = new URLSearchParams();
    if (query.has('redirect') || query.has('next')) {
      cleanParams.set('redirect', requestedRedirect);
    }

    const cleanUrl = cleanParams.toString() ? `/login?${cleanParams.toString()}` : '/login';
    router.replace(cleanUrl);
  }, [mounted, router, searchParams]);

  // Form hooks must be called before any early returns (React Hooks rule)
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    formState: { errors: forgotPasswordErrors },
    setError: setForgotPasswordError,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  // Auto-redirect based on role - show loading spinner during auth check
  useEffect(() => {
    // Show loading spinner while checking authentication
    if (!mounted || authLoading) {
      return; // Will show loading state below
    }

    if (isAuthenticated) {
      const requestedRedirect = searchParams.get('redirect') ?? searchParams.get('next');
      if (requestedRedirect) {
        const redirect = sanitizeInternalRedirect(requestedRedirect);
        router.replace(redirect);
        router.refresh();
        return;
      }

      // Role-based redirection
      switch (role) {
        case 'admin':
          router.replace('/admin');
          break;
        case 'finance_manager':
          router.replace('/admin/finance');
          break;
        case 'faculty':
          router.replace('/dashboard');
          break;
        case 'content_manager':
          router.replace('/admin/courses');
          break;
        case 'parent':
          router.replace('/dashboard/parent');
          break;
        default:
          router.replace('/dashboard');
          break;
      }
      router.refresh();
    }
  }, [isAuthenticated, role, authLoading, mounted, router, searchParams]);

  // Show loading spinner while checking authentication
  if (authLoading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setSubmitError('');

    try {
      const { error: signInError } = await signIn(data.email, data.password);

      if (signInError) {
        // Handle specific error cases
        const errorMessage = signInError.toLowerCase();

        if (errorMessage.includes('invalid') || errorMessage.includes('credentials')) {
          setError('email', { message: ' ' });
          setError('password', { message: ' ' });
          setSubmitError('Invalid email or password. Please try again.');
        } else if (errorMessage.includes('verify') || errorMessage.includes('confirmed')) {
          setSubmitError('Please verify your email before signing in. Check your inbox for the verification link.');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          setSubmitError('Network error. Please check your connection and try again.');
        } else if (errorMessage.includes('too many') || errorMessage.includes('rate')) {
          setSubmitError('Too many attempts. Please wait a moment and try again.');
        } else {
          setSubmitError(signInError);
        }
        return;
      }

      // Redirection is handled by the useEffect above
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    setIsResettingPassword(true);
    setSubmitError('');

    try {
      const { error } = await resetPassword(data.email);

      if (error) {
        if (error.toLowerCase().includes('not found')) {
          setForgotPasswordError('email', { message: 'No account found with this email address.' });
        } else {
          setForgotPasswordError('email', { message: error });
        }
        return;
      }

      setForgotPasswordSuccess(true);
    } catch {
      setForgotPasswordError('email', { message: 'Failed to send reset email. Please try again.' });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Prevent hydration mismatch by only rendering after mount
  if (!mounted) {
    return <LoginFormFallback />;
  }

  // Forgot Password Modal
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex">
              <Logo size="lg" variant="full" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setShowForgotPassword(false)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>

            {forgotPasswordSuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Check Your Email</h2>
                <p className="text-slate-600 mb-6">
                  We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordSuccess(false);
                  }}
                  className="text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Reset Password
                </h1>
                <p className="text-slate-500 mb-6">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <form method="post" onSubmit={handleSubmitForgot(onForgotPasswordSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        {...registerForgot('email')}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all ${forgotPasswordErrors.email
                          ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                          }`}
                        placeholder="you@example.com"
                        disabled={isResettingPassword}
                      />
                    </div>
                    {forgotPasswordErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{forgotPasswordErrors.email.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl 
                               hover:from-primary-700 hover:to-primary-600 transition-all disabled:opacity-70
                               flex items-center justify-center gap-2"
                  >
                    {isResettingPassword ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex">
            <Logo size="lg" variant="full" />
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-500 text-center mb-6">
            Sign in to continue your learning journey
          </p>

          {submitError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {submitError}
            </div>
          )}

          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-800 font-medium">
              <span className="font-bold">Important:</span> New users must sign up first. For security, all accounts must be authorized through Gmail/Google.
            </p>
          </div>

          {/* Google Auth Button - PRIMARY */}
          <button
            type="button"
            onClick={async () => {
              setIsLoading(true);
              const { error } = await signInWithGoogle();
              if (error) setSubmitError(error);
              setIsLoading(false);
            }}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 border-primary-500 bg-primary-50 hover:bg-primary-100 transition-all mb-6 group"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-primary-900 font-bold text-lg group-hover:text-primary-950">
              Sign in with Gmail (Authorized)
            </span>
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">or sign in with email</span>
            </div>
          </div>

          <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  {...register('email')}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all ${errors.email || submitError.includes('Invalid')
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                    }`}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl border outline-none transition-all ${errors.password || submitError.includes('Invalid')
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                    }`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  className="rounded border-slate-300"
                />
                <span className="text-slate-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Forgot password?
              </button>
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
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex">
            <Logo size="lg" variant="full" />
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
