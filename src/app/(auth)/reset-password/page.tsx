'use client';

/**
 * Password Reset Page
 *
 * SECURITY FEATURES:
 * - Zod validation with strict password requirements
 * - Password confirmation matching
 * - Rate limiting handled by middleware
 * - Secure token validation via URL parameters
 * - CSRF protection via SameSite cookies
 */

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, GraduationCap, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { passwordSchema } from '@/lib/security';

// Enhanced Zod validation schema using security module
const resetPasswordSchema = z.object({
    password: passwordSchema,
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { updatePassword } = useAuth();

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Check for access token in URL
    const accessToken = searchParams.get('access_token');
    const type = searchParams.get('type');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    useEffect(() => {
        // If no access token is present, show error
        if (!accessToken && type !== 'recovery') {
            setHasError(true);
            setErrorMessage('Invalid or expired password reset link. Please request a new one.');
        }
    }, [accessToken, type]);

    const onSubmit = async (data: ResetPasswordFormData) => {
        setIsLoading(true);
        setHasError(false);

        try {
            const { error } = await updatePassword(data.password);

            if (error) {
                setHasError(true);
                if (error.toLowerCase().includes('weak') || error.toLowerCase().includes('password')) {
                    setErrorMessage('Password is too weak. Please use a stronger password.');
                } else {
                    setErrorMessage(error);
                }
                return;
            }

            setIsSuccess(true);
        } catch {
            setHasError(true);
            setErrorMessage('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

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
                    {isSuccess ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-4">
                                Password Updated!
                            </h1>
                            <p className="text-slate-600 mb-6">
                                Your password has been successfully reset. You can now sign in with your new password.
                            </p>
                            <Link
                                href="/login"
                                className="block w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl 
                           hover:from-primary-700 hover:to-primary-600 transition-all"
                            >
                                Go to Login
                            </Link>
                        </div>
                    ) : hasError ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-4">
                                Reset Failed
                            </h1>
                            <p className="text-slate-600 mb-6">{errorMessage}</p>
                            <Link
                                href="/login"
                                className="block w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl 
                           hover:from-primary-700 hover:to-primary-600 transition-all"
                            >
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
                                Reset Password
                            </h1>
                            <p className="text-slate-500 text-center mb-6">
                                Create a new password for your account
                            </p>

                            {errorMessage && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                    {errorMessage}
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        New Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            {...register('password')}
                                            className={`w-full pl-10 pr-12 py-3 rounded-xl border outline-none transition-all ${errors.password
                                                ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                                                : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                                                }`}
                                            placeholder="Enter new password"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            disabled={isLoading}
                                        >
                                            {showPassword ? (
                                                <span className="text-sm font-medium">Hide</span>
                                            ) : (
                                                <span className="text-sm font-medium">Show</span>
                                            )}
                                        </button>
                                    </div>
                                    {errors.password ? (
                                        <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                                    ) : (
                                        <p className="mt-1 text-xs text-slate-500">
                                            Min 8 chars, uppercase, lowercase, number & special char
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Confirm Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            {...register('confirmPassword')}
                                            className={`w-full pl-10 pr-12 py-3 rounded-xl border outline-none transition-all ${errors.confirmPassword
                                                ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                                                : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                                                }`}
                                            placeholder="Confirm new password"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            disabled={isLoading}
                                        >
                                            {showConfirmPassword ? (
                                                <span className="text-sm font-medium">Hide</span>
                                            ) : (
                                                <span className="text-sm font-medium">Show</span>
                                            )}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && (
                                        <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
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
                                            Updating...
                                        </>
                                    ) : (
                                        'Reset Password'
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

function ResetPasswordFallback() {
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
                <div className="bg-white rounded-2xl shadow-xl p-8 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<ResetPasswordFallback />}>
            <ResetPasswordForm />
        </Suspense>
    );
}
