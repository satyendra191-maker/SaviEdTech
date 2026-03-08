'use client';

import React from 'react';
import {
    CreditCard,
    CheckCircle,
    Lock,
    Shield,
    ShoppingCart,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PaymentButton } from '@/components/payments/PaymentButton';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface CourseData {
    id: string;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    features: string[];
    thumbnail?: string;
    duration?: string;
    accessHref?: string;
}

export interface CoursePaymentProps {
    course: CourseData;
    userEmail?: string;
    userName?: string;
    userPhone?: string;
    onSuccess?: (data: {
        orderId: string;
        paymentId?: string;
        courseId: string;
        receiptNumber?: string;
        invoiceDownloadUrl?: string;
        redirectUrl?: string;
    }) => void;
    onError?: (error: string) => void;
    onCancel?: () => void;
    className?: string;
}

export function CoursePayment({
    course,
    userEmail,
    userName,
    userPhone,
    onSuccess,
    onError,
    onCancel,
    className,
}: CoursePaymentProps) {
    const discount = course.originalPrice
        ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
        : 0;

    return (
        <div className={cn('bg-white rounded-2xl border border-slate-200 overflow-hidden', className)}>
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
                <div className="flex items-center gap-2 text-emerald-100 text-sm mb-2">
                    <ShoppingCart className="w-4 h-4" />
                    Course Purchase
                </div>
                <h2 className="text-2xl font-bold">{course.title}</h2>
                {course.description ? (
                    <p className="text-emerald-100 mt-1">{course.description}</p>
                ) : null}
            </div>

            <div className="p-6 space-y-6">
                <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-slate-900">
                        Rs {course.price.toLocaleString('en-IN')}
                    </span>
                    {course.originalPrice ? (
                        <>
                            <span className="text-xl text-slate-400 line-through">
                                Rs {course.originalPrice.toLocaleString('en-IN')}
                            </span>
                            <span className="px-2 py-1 bg-red-100 text-red-600 text-sm font-semibold rounded-lg">
                                {discount}% OFF
                            </span>
                        </>
                    ) : null}
                </div>

                {course.features.length > 0 ? (
                    <div className="space-y-3">
                        <h3 className="font-semibold text-slate-900">This course includes:</h3>
                        <ul className="space-y-2">
                            {course.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <div className="border-t border-slate-100" />

                <PaymentButton
                    amount={course.price}
                    currency="INR"
                    donorEmail={userEmail}
                    donorName={userName}
                    donorPhone={userPhone}
                    description={`Course: ${course.title}`}
                    metadata={{
                        type: 'course_purchase',
                        courseId: course.id,
                        courseTitle: course.title,
                        accessHref: course.accessHref,
                    }}
                    successUrl={typeof window !== 'undefined' ? `${window.location.origin}/courses/${course.id}` : undefined}
                    cancelUrl={typeof window !== 'undefined' ? `${window.location.origin}/courses/${course.id}` : undefined}
                    onSuccess={(data) => {
                        onSuccess?.({
                            orderId: data.orderId,
                            paymentId: data.paymentId,
                            courseId: course.id,
                            receiptNumber: data.receiptNumber,
                            invoiceDownloadUrl: data.invoiceDownloadUrl,
                            redirectUrl: data.redirectUrl || course.accessHref,
                        });
                    }}
                    onError={onError}
                    onCancel={onCancel}
                >
                    Pay with Razorpay
                </PaymentButton>

                <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Secure Payment
                    </div>
                    <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Course Access After Verification
                    </div>
                    <div className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        Razorpay Only
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CoursePayment;
