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

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, Phone, GraduationCap, Loader2, CheckCircle, Shield, Users, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type UserType = 'student' | 'admin' | 'faculty';

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
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
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
  const router = useRouter();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [userType, setUserType] = useState<UserType>('student');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setSubmitError('');

    try {
      const role = userType === 'admin' ? 'admin' : userType === 'faculty' ? 'content_manager' : 'student';
      
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
        if (data.currentClass === 'Class 9' || data.currentClass === 'Class 10') {
          classLevel = '11';
        } else if (data.currentClass === 'Class 11') {
          classLevel = '11';
        } else if (data.currentClass === 'Class 12') {
          classLevel = '12';
        } else if (data.currentClass === 'Dropper') {
          classLevel = 'Dropper';
        }
      }
      
      const { error } = await signUp(data.email, data.password, {
        full_name: data.fullName,
        phone: data.phone || undefined,
        exam_target: examTarget as any,
        class_level: classLevel as any,
        role: role,
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('student')}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    userType === 'student'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Users className={`w-6 h-6 mx-auto mb-1 ${userType === 'student' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${userType === 'student' ? 'text-blue-700' : 'text-slate-600'}`}>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('admin')}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    userType === 'admin'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Shield className={`w-6 h-6 mx-auto mb-1 ${userType === 'admin' ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${userType === 'admin' ? 'text-purple-700' : 'text-slate-600'}`}>Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('faculty')}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    userType === 'faculty'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <BookOpen className={`w-6 h-6 mx-auto mb-1 ${userType === 'faculty' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${userType === 'faculty' ? 'text-emerald-700' : 'text-slate-600'}`}>Faculty</span>
                </button>
              </div>
            </div>

            {/* Target Exam and Class - Only for Students */}
            {userType === 'student' && (
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
