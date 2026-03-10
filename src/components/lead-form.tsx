'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, CheckCircle, Loader2 } from 'lucide-react';

const leadFormSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
    email: z.string().email('Enter a valid email').optional().or(z.literal('')),
    examTarget: z.enum(['JEE', 'NEET', 'Both', 'Other']),
    classLevel: z.enum(['6', '7', '8', '9', '10', '11', '12', 'Dropper']),
    city: z.string().min(2, 'City is required'),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

export function LeadForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<LeadFormData>({
        resolver: zodResolver(leadFormSchema),
    });

    const onSubmit = async (data: LeadFormData) => {
        setIsSubmitting(true);
        try {
            // Simulate API call - replace with actual Supabase integration
            await new Promise((resolve) => setTimeout(resolve, 1500));
            console.log('Lead submitted:', data);
            setIsSuccess(true);
            reset();
            setTimeout(() => setIsSuccess(false), 5000);
        } catch (error) {
            console.error('Error submitting lead:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Thank You!</h3>
                <p className="text-slate-600">
                    Our team will contact you shortly with more information about our courses.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
                Get Free Consultation
            </h3>
            <p className="text-slate-600 text-sm mb-6">
                Fill in your details and our experts will guide you
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Full Name *
                    </label>
                    <input
                        {...register('name')}
                        type="text"
                        placeholder="Enter your name"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    />
                    {errors.name && (
                        <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Phone *
                        </label>
                        <input
                            {...register('phone')}
                            type="tel"
                            placeholder="10-digit number"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                        />
                        {errors.phone && (
                            <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            City *
                        </label>
                        <input
                            {...register('city')}
                            type="text"
                            placeholder="Your city"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                        />
                        {errors.city && (
                            <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Email (Optional)
                    </label>
                    <input
                        {...register('email')}
                        type="email"
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    />
                    {errors.email && (
                        <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Target Exam *
                        </label>
                        <select
                            {...register('examTarget')}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
                        >
                            <option value="">Select</option>
                            <option value="JEE">JEE</option>
                            <option value="NEET">NEET</option>
                            <option value="Both">Both</option>
                            <option value="Other">Other</option>
                        </select>
                        {errors.examTarget && (
                            <p className="text-red-500 text-xs mt-1">{errors.examTarget.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Class Level *
                        </label>
                        <select
                            {...register('classLevel')}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
                        >
                            <option value="">Select</option>
                            <option value="6">Class 6</option>
                            <option value="7">Class 7</option>
                            <option value="8">Class 8</option>
                            <option value="9">Class 9</option>
                            <option value="10">Class 10</option>
                            <option value="11">Class 11</option>
                            <option value="12">Class 12</option>
                            <option value="Dropper">Dropper</option>
                        </select>
                        {errors.classLevel && (
                            <p className="text-red-500 text-xs mt-1">{errors.classLevel.message}</p>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl 
                     hover:from-primary-700 hover:to-primary-600 active:scale-[0.98] transition-all
                     disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100
                     flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Get Free Callback
                        </>
                    )}
                </button>

                <p className="text-xs text-slate-500 text-center">
                    By submitting, you agree to our{' '}
                    <a href="/terms" className="text-primary-600 hover:underline">
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-primary-600 hover:underline">
                        Privacy Policy
                    </a>
                </p>
            </form>
        </div>
    );
}