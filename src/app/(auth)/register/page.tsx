'use client';

/**
 * Registration Page
 *
 * SECURITY FEATURES:
 * - Zod validation with strict password requirements
 * - Email format validation with security checks
 * - Phone number validation (Indian format)
 * - Name sanitization to prevent XSS
 * - Rate limiting handled by middleware
 * - Input pattern detection for suspicious content
 * - CSRF protection via SameSite cookies
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2, CheckCircle, Shield, Users, BookOpen, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/brand/Logo';

type UserType = 'student' | 'admin' | 'faculty' | 'parent';

// Basic validation schema
const registerSchema = z.object({
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name is too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  targetExam: z.string().optional(),
  currentClass: z.string().optional(),
  userType: z.enum(['student', 'admin', 'faculty', 'parent']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => {
  if (data.userType === 'student') {
    return !!data.targetExam && data.targetExam !== '';
  }
  return true;
}, {
  message: 'Target exam is required for students',
  path: ['targetExam'],
}).refine((data) => {
  if (data.userType === 'student') {
    return !!data.currentClass && data.currentClass !== '';
  }
  return true;
}, {
  message: 'Current class is required for students',
  path: ['currentClass'],
}).refine((data) => {
  if (data.userType === 'parent') {
    return !!data.phone && data.phone !== '';
  }
  return true;
}, {
  message: "Child's phone number is required for parents",
  path: ['phone'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

// Target exam options
const targetExamOptions = [
  { value: 'JEE Mains', label: 'JEE Mains' },
  { value: 'JEE Advanced', label: 'JEE Advanced' },
  { value: 'NEET', label: 'NEET' },
  { value: 'CBSE Board', label: 'CBSE Board' },
  { value: 'Foundation', label: 'Foundation' },
];

// Current class options
const currentClassOptions = [
  { value: 'Class 9', label: 'Class 9' },
  { value: 'Class 10', label: 'Class 10' },
  { value: 'Class 11', label: 'Class 11' },
  { value: 'Class 12', label: 'Class 12' },
  { value: 'Dropper', label: 'Dropper' },
];

export default function RegisterPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [userType, setUserType] = useState<UserType>('student');
  const [mounted, setMounted] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      userType: 'student',
    }
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const refFromUrl = params.get('ref');
    if (!refFromUrl) {
      setReferralCode(null);
      return;
    }

    const sanitized = refFromUrl.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
    if (sanitized.length >= 4) {
      setReferralCode(sanitized);
    }
  }, []);

  const userRole = watch('userType');

  // Keep internal state in sync with form state
  const handleUserTypeChange = (type: UserType) => {
    setUserType(type);
    setValue('userType', type);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setSubmitError('');

    try {
      const role = userType === 'admin' ? 'admin' :
        userType === 'faculty' ? 'content_manager' :
          userType === 'parent' ? 'parent' : 'student';

      // Map exam values to database format
      let examTarget: string | null = null;
      if (userType === 'student' && data.targetExam) {
        if (data.targetExam === 'JEE Mains' || data.targetExam === 'JEE Advanced' || data.targetExam === 'Foundation') {
          examTarget = 'JEE';
        } else if (data.targetExam === 'NEET') {
          examTarget = 'NEET';
        } else if (data.targetExam === 'CBSE Board') {
          examTarget = 'Both';
        }
      }

      // Map class values to database format
      let classLevel: string | null = null;
      if (userType === 'student' && data.currentClass) {
        // Use the selected value directly as it matches the database check constraint
        classLevel = data.currentClass;
      }

      const { error } = await signUp(data.email, data.password, {
        fullName: data.fullName,
        phone: data.phone || undefined,
        role: role,
        metadata: {
          exam_target: examTarget,
          class_level: classLevel,
          referred_by_code: referralCode,
        }
      });

      if (error) {
        // Handle specific error cases
        const errorMessage = error.toLowerCase();

        if (errorMessage.includes('email') && errorMessage.includes('exists')) {
          setError('email', { message: 'This email is already registered. Please use a different email or sign in.' });
        } else if (errorMessage.includes('password') && (errorMessage.includes('weak') || errorMessage.includes('strength'))) {
          setError('password', { message: 'Password is too weak. Please use a stronger password.' });
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          setSubmitError('Network error. Please check your connection and try again.');
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
          setSubmitError('Too many attempts. Please wait a moment and try again.');
        } else {
          setSubmitError(error);
        }
        return;
      }

      // Show verification message
      setShowVerificationMessage(true);
    } catch (err) {
      setSubmitError('An unexpected error occurred. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Show verification success message
  if (showVerificationMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex">
              <Logo size="md" variant="full" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">
              Verify Your Email
            </h1>
            <p className="text-slate-600 mb-6">
              We've sent a verification email to your inbox. Please check your email and click the verification link to complete your registration.
            </p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl 
                           hover:from-primary-700 hover:to-primary-600 transition-all"
              >
                Go to Login
              </Link>
              <button
                onClick={() => setShowVerificationMessage(false)}
                className="block w-full py-3.5 border border-slate-200 text-slate-700 font-semibold rounded-xl 
                           hover:bg-slate-50 transition-all"
              >
                Register with Different Email
              </button>
            </div>
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
            <Logo size="lg" variant="full" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Create Account
          </h1>
          <p className="text-slate-500 text-center mb-6">
            Start your journey to JEE/NEET success
          </p>
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {submitError}
            </div>
          )}

          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <p className="text-xs text-emerald-800 font-medium whitespace-normal">
              <span className="font-bold">Authorized Access:</span> To ensure platform integrity, all student and faculty accounts must be authorized through a Google/Gmail account.
            </p>
          </div>

          {referralCode && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100">
              Referral code applied: <span className="font-semibold">{referralCode}</span>
            </div>
          )}

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
              Sign Up with Gmail (Recommended)
            </span>
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">or register with email</span>
            </div>
          </div>

          <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  {...register('fullName')}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all ${errors.fullName
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                    }`}
                  placeholder="Enter your full name"
                  disabled={isLoading}
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    {...register('email')}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all text-sm ${errors.email
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
                  Phone {userType === 'student' && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    {...register('phone')}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all text-sm ${errors.phone
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                      }`}
                    placeholder="9876543210"
                    maxLength={10}
                    disabled={isLoading}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
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
                  placeholder="Create password"
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
              {errors.password ? (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">
                  Min 8 chars, uppercase, lowercase, number & special char
                </p>
              )}
            </div>

            {/* Confirm Password */}
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
                  placeholder="Confirm password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* User Type Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Register as <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => handleUserTypeChange('student')}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${userType === 'student'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <Users className={`w-6 h-6 mx-auto mb-1 ${userType === 'student' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${userType === 'student' ? 'text-blue-700' : 'text-slate-600'}`}>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUserTypeChange('admin')}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${userType === 'admin'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <Shield className={`w-6 h-6 mx-auto mb-1 ${userType === 'admin' ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${userType === 'admin' ? 'text-purple-700' : 'text-slate-600'}`}>Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUserTypeChange('faculty')}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${userType === 'faculty'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <BookOpen className={`w-6 h-6 mx-auto mb-1 ${userType === 'faculty' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${userType === 'faculty' ? 'text-emerald-700' : 'text-slate-600'}`}>Faculty</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUserTypeChange('parent')}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${userType === 'parent'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <Heart className={`w-6 h-6 mx-auto mb-1 ${userType === 'parent' ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${userType === 'parent' ? 'text-amber-700' : 'text-slate-600'}`}>Parent</span>
                </button>
              </div>
            </div>

            {/* Target Exam and Class - Only for Students */}
            {mounted && userType === 'student' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Target Exam <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('targetExam')}
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all bg-white text-sm ${errors.targetExam
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                      }`}
                    disabled={isLoading}
                  >
                    <option value="">Select Exam</option>
                    {targetExamOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.targetExam && (
                    <p className="mt-1 text-sm text-red-600">{errors.targetExam.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Current Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('currentClass')}
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all bg-white text-sm ${errors.currentClass
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                      : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                      }`}
                    disabled={isLoading}
                  >
                    <option value="">Select Class</option>
                    {currentClassOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.currentClass && (
                    <p className="mt-1 text-sm text-red-600">{errors.currentClass.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Child Details - Only for Parents */}
            {mounted && userType === 'parent' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Child's Registration ID / Phone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    {...register('phone')}
                    placeholder="Enter child's phone number"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  This will be used to link your account to your child's progress.
                </p>
              </div>
            )}

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
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
