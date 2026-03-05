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

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, GraduationCap, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { emailSchema, containsSuspiciousPatterns } from '@/lib/security';

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
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { signIn, resetPassword } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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

      // Redirect after successful login
      router.push(redirect);
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

  // Forgot Password Modal
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-slate-900">Savi</span>
                <span className="text-2xl font-bold text-primary-600">EduTech</span>
              </div>
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

                <form onSubmit={handleSubmitForgot(onForgotPasswordSubmit)} className="space-y-4">
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
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-900">Savi</span>
              <span className="text-2xl font-bold text-primary-600">EduTech</span>
            </div>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-slate-900">Savi</span>
              <span className="text-2xl font-bold text-primary-700">EduTech</span>
            </div>
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
