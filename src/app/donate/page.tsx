'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle, FileText, GraduationCap, Heart, Mail, Shield, Users } from 'lucide-react';
import { PaymentButton, ReceiptLookupCard, type PaymentGateway } from '@/components/payments';

const donationOptions = [
    { amount: 500, description: 'Provides study materials for 1 child for a month' },
    { amount: 1000, description: 'Sponsors online course access for 1 child' },
    { amount: 2500, description: 'Supports complete JEE or NEET preparation for 1 month' },
    { amount: 5000, description: 'Funds a six-month scholarship for 1 child' },
];

const impactStats = [
    { icon: Users, value: '5,000+', label: 'Children Supported' },
    { icon: BookOpen, value: '12,000+', label: 'Study Materials Distributed' },
    { icon: GraduationCap, value: '850+', label: 'Scholarships Awarded' },
    { icon: Heart, value: '98%', label: 'Impact Delivery Rate' },
];

const paymentGateways: { id: PaymentGateway; name: string; description: string }[] = [
    { id: 'razorpay', name: 'Razorpay', description: 'UPI, cards, wallets, and netbanking' },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatAmount(amount: number): string {
    return `Rs ${amount.toLocaleString('en-IN')}`;
}

export default function DonatePage() {
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>('razorpay');
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [receiptDownloadUrl, setReceiptDownloadUrl] = useState<string | null>(null);
    const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [donorInfo, setDonorInfo] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
    });

    const finalAmount = selectedAmount || Number(customAmount) || 0;
    const isValidAmount = finalAmount >= 10;
    const cleanedPhone = donorInfo.phone.replace(/\D/g, '');
    const isValidDonorDetails = useMemo(() => {
        return (
            donorInfo.name.trim().length >= 2 &&
            emailRegex.test(donorInfo.email.trim()) &&
            cleanedPhone.length >= 10
        );
    }, [cleanedPhone.length, donorInfo.email, donorInfo.name]);

    const handleAmountSelect = (amount: number) => {
        setSelectedAmount(amount);
        setCustomAmount('');
        setShowPaymentForm(true);
        setPaymentError(null);
    };

    const handleCustomAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setCustomAmount(value);
        setSelectedAmount(null);
        setPaymentError(null);
        setShowPaymentForm(Number(value) >= 10);
    };

    const handlePaymentSuccess = (data?: {
        orderId: string;
        paymentId?: string;
        receiptDownloadUrl?: string;
        receiptNumber?: string;
        gateway?: PaymentGateway;
        redirectUrl?: string;
    }) => {
        setPaymentSuccess(true);
        setReceiptNumber(data?.receiptNumber || null);
        setPaymentError(null);

        if (data?.receiptDownloadUrl) {
            setReceiptDownloadUrl(data.receiptDownloadUrl);
            return;
        }

        if (data?.orderId) {
            const params = new URLSearchParams({ orderId: data.orderId });
            if (data.paymentId) {
                params.set('paymentId', data.paymentId);
            }
            setReceiptDownloadUrl(`/api/donations/receipt?${params.toString()}`);
        }
    };

    const resetDonationState = () => {
        setPaymentSuccess(false);
        setSelectedAmount(null);
        setCustomAmount('');
        setShowPaymentForm(false);
        setReceiptDownloadUrl(null);
        setReceiptNumber(null);
        setPaymentError(null);
        setDonorInfo({
            name: '',
            email: '',
            phone: '',
            message: '',
        });
    };

    if (paymentSuccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50 to-white px-4">
                <div className="w-full max-w-md text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h1 className="mb-4 text-3xl font-bold text-slate-900">Thank You</h1>
                    <p className="mb-8 text-slate-600">
                        Your donation of {formatAmount(finalAmount)} has been received and routed into the SaviEduTech education fund.
                    </p>
                    {receiptDownloadUrl ? (
                        <a
                            href={receiptDownloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="mb-3 block w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-600"
                        >
                            Download Receipt {receiptNumber ? `(${receiptNumber})` : ''}
                        </a>
                    ) : null}
                    <div className="space-y-3">
                        <Link
                            href="/"
                            className="block w-full rounded-xl bg-rose-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-rose-600"
                        >
                            Back to Home
                        </Link>
                        <button
                            type="button"
                            onClick={resetDonationState}
                            className="block w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold text-slate-600 transition-colors hover:border-slate-300"
                        >
                            Make Another Donation
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
            <section className="px-4 py-16 md:py-20">
                <div className="mx-auto max-w-4xl text-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700">
                        <Heart className="h-4 w-4 fill-rose-500" />
                        <span>Education Donation Fund</span>
                    </div>
                    <h1 className="mb-6 text-3xl font-bold text-slate-900 md:text-5xl">
                        Fund Education for Vulnerable Children
                    </h1>
                    <p className="mx-auto max-w-2xl text-lg text-slate-600">
                        Every donation helps under-resourced students access classes, study material, scholarships, and mentorship for JEE and NEET preparation.
                    </p>
                </div>
            </section>

            <section className="bg-white px-4 py-12">
                <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 md:grid-cols-4">
                    {impactStats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.label} className="text-center">
                                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                                    <Icon className="h-7 w-7" />
                                </div>
                                <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                                <div className="text-sm text-slate-500">{stat.label}</div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="px-4 py-16 md:py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl font-bold text-slate-900">Choose Your Contribution</h2>
                        <p className="text-slate-600">Donation processing is secured through Razorpay only.</p>
                    </div>

                    <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {donationOptions.map((option) => (
                            <button
                                key={option.amount}
                                type="button"
                                onClick={() => handleAmountSelect(option.amount)}
                                className={`rounded-2xl border-2 bg-white p-6 text-left transition-all hover:shadow-xl ${
                                    selectedAmount === option.amount
                                        ? 'border-rose-500 ring-2 ring-rose-200'
                                        : 'border-slate-100 hover:border-rose-500'
                                }`}
                            >
                                <div className="mb-2 text-3xl font-bold text-slate-900">
                                    {formatAmount(option.amount)}
                                </div>
                                <p className="text-sm text-slate-600">{option.description}</p>
                                {selectedAmount === option.amount ? (
                                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-rose-600">
                                        <CheckCircle className="h-4 w-4" />
                                        Selected
                                    </div>
                                ) : null}
                            </button>
                        ))}
                    </div>

                    <div className="mx-auto mb-8 max-w-xl rounded-2xl border-2 border-slate-100 bg-white p-8">
                        <h3 className="mb-4 text-center text-lg font-semibold text-slate-900">Or Enter a Custom Amount</h3>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-slate-500">Rs</span>
                            <input
                                type="number"
                                min="10"
                                value={customAmount}
                                onChange={handleCustomAmountChange}
                                placeholder="Enter amount (minimum Rs 10)"
                                className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                            />
                        </div>
                    </div>

                    {showPaymentForm && isValidAmount ? (
                        <div className="mx-auto max-w-2xl rounded-2xl border-2 border-slate-100 bg-white p-8 shadow-lg">
                            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900">Complete Your Donation</h3>
                                    <p className="text-sm text-slate-500">Receipt generation starts automatically after successful payment verification.</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-rose-600">{formatAmount(finalAmount)}</div>
                                    <div className="text-sm text-slate-500">Total Amount</div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="mb-3 block text-sm font-medium text-slate-700">Payment Method</label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {paymentGateways.map((gateway) => (
                                        <button
                                            key={gateway.id}
                                            type="button"
                                            onClick={() => setSelectedGateway(gateway.id)}
                                            className={`rounded-xl border-2 p-4 text-left transition-all ${
                                                selectedGateway === gateway.id
                                                    ? 'border-rose-500 bg-rose-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="font-semibold text-slate-900">{gateway.name}</div>
                                            <p className="text-xs text-slate-500">{gateway.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6 space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Donor Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={donorInfo.name}
                                            onChange={(event) => setDonorInfo((current) => ({ ...current, name: event.target.value }))}
                                            placeholder="Full name"
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Email <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={donorInfo.email}
                                            onChange={(event) => setDonorInfo((current) => ({ ...current, email: event.target.value }))}
                                            placeholder="your@email.com"
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                        Phone Number <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={donorInfo.phone}
                                        onChange={(event) => setDonorInfo((current) => ({ ...current, phone: event.target.value }))}
                                        placeholder="+91 98765 43210"
                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Message (Optional)</label>
                                    <textarea
                                        rows={4}
                                        maxLength={500}
                                        value={donorInfo.message}
                                        onChange={(event) => setDonorInfo((current) => ({ ...current, message: event.target.value }))}
                                        placeholder="Add a note for the education support team"
                                        className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                                    />
                                </div>
                            </div>

                            {!isValidDonorDetails ? (
                                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    Enter a valid donor name, email, and phone number to continue with Razorpay checkout.
                                </div>
                            ) : null}

                            {paymentError ? (
                                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                                    {paymentError}
                                </div>
                            ) : null}

                            {isValidDonorDetails ? (
                                <PaymentButton
                                    amount={finalAmount}
                                    currency="INR"
                                    gateway={selectedGateway}
                                    donorName={donorInfo.name.trim()}
                                    donorEmail={donorInfo.email.trim()}
                                    donorPhone={donorInfo.phone.trim()}
                                    donorMessage={donorInfo.message.trim() || undefined}
                                    description="Donation to SaviEduTech"
                                    metadata={{
                                        type: 'donation',
                                        donorMessage: donorInfo.message.trim() || undefined,
                                    }}
                                    onSuccess={handlePaymentSuccess}
                                    onError={(error) => setPaymentError(error)}
                                    onCancel={() => setPaymentError('Payment cancelled before completion.')}
                                >
                                    Pay {formatAmount(finalAmount)}
                                </PaymentButton>
                            ) : (
                                <button
                                    type="button"
                                    disabled
                                    className="w-full cursor-not-allowed rounded-xl bg-emerald-300 px-6 py-3 font-semibold text-white opacity-70"
                                >
                                    Pay {formatAmount(finalAmount)}
                                </button>
                            )}

                            <div className="mt-6 border-t border-slate-100 pt-6">
                                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-green-500" />
                                        <span>Secure Razorpay checkout</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                        <span>Receipt download after payment</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-purple-500" />
                                        <span>Donation records retained for support</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </section>

            <section className="bg-slate-50 px-4 py-16 md:py-20">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold text-slate-900">How the Fund Works</h2>
                    </div>
                    <div className="grid gap-8 md:grid-cols-3">
                        {[
                            {
                                step: '01',
                                title: 'Student Identification',
                                description: 'We work with schools and community partners to identify students who need education support.',
                            },
                            {
                                step: '02',
                                title: 'Resource Allocation',
                                description: 'Funds are used for classes, practice material, scholarships, and academic mentoring.',
                            },
                            {
                                step: '03',
                                title: 'Impact Tracking',
                                description: 'We track progress through platform usage and academic performance milestones.',
                            },
                        ].map((item) => (
                            <div key={item.step} className="rounded-2xl bg-white p-6 shadow-sm">
                                <div className="mb-4 text-4xl font-bold text-rose-200">{item.step}</div>
                                <h3 className="mb-2 text-lg font-semibold text-slate-900">{item.title}</h3>
                                <p className="text-slate-600">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-white px-4 py-16">
                <div className="mx-auto max-w-4xl">
                    <ReceiptLookupCard
                        title="Need Your Receipt Later?"
                        description="Return to this page anytime and download your donation receipt with the Razorpay Order ID and Payment ID."
                    />
                </div>
            </section>

            <section className="px-4 py-16 md:py-20">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="mb-8 text-3xl font-bold text-slate-900">Transparency Commitments</h2>
                    <div className="grid gap-6 sm:grid-cols-3">
                        <div className="flex flex-col items-center">
                            <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
                            <h3 className="font-semibold text-slate-900">Documented Receipts</h3>
                            <p className="text-sm text-slate-500">Every successful donation generates a receipt with transaction details.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
                            <h3 className="font-semibold text-slate-900">Secure Processing</h3>
                            <p className="text-sm text-slate-500">Razorpay is the only supported gateway for donation payments.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
                            <h3 className="font-semibold text-slate-900">Education First</h3>
                            <p className="text-sm text-slate-500">Funds are directed toward learning access and scholarship support.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-16 md:py-20">
                <div className="mx-auto max-w-4xl text-center text-white">
                    <h2 className="mb-4 text-3xl font-bold">Ready to Contribute?</h2>
                    <p className="mb-8 text-lg text-white/90">
                        Join the donors helping students stay on the path to engineering and medical entrance success.
                    </p>
                    <div className="flex flex-col justify-center gap-4 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => {
                                setShowPaymentForm(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="rounded-xl bg-white px-8 py-4 font-semibold text-rose-500 transition-colors hover:bg-white/90"
                        >
                            Donate Now
                        </button>
                        <Link
                            href="/"
                            className="rounded-xl border-2 border-white px-8 py-4 font-semibold text-white transition-colors hover:bg-white/10"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
