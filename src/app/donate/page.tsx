'use client';

import { useState } from 'react';
import { Heart, Users, BookOpen, GraduationCap, CheckCircle, ArrowRight, Shield, FileText, Mail } from 'lucide-react';
import Link from 'next/link';
import { PaymentButton, type PaymentGateway } from '@/components/payments';

const donationOptions = [
  { amount: 500, description: 'Provides study materials for 1 child for a month' },
  { amount: 1000, description: 'Sponsors online course access for 1 child' },
  { amount: 2500, description: 'Covers complete JEE/NEET prep for 1 month' },
  { amount: 5000, description: 'Full scholarship for 1 child for 6 months' },
];

const impactStats = [
  { icon: Users, value: '5,000+', label: 'Children Supported' },
  { icon: BookOpen, value: '12,000+', label: 'Study Materials Distributed' },
  { icon: GraduationCap, value: '850+', label: 'Scholarships Awarded' },
  { icon: Heart, value: '98%', label: 'Success Rate' },
];

const paymentGateways: { id: PaymentGateway; name: string; description: string; icon: string }[] = [
  { id: 'razorpay', name: 'Razorpay', description: 'Best for India (UPI, Cards, NetBanking)', icon: '🇮🇳' },
];

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>('razorpay');
  const [donorInfo, setDonorInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const finalAmount = selectedAmount || Number(customAmount) || 0;
  const isValidAmount = finalAmount >= 10;

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setShowPaymentForm(true);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    setSelectedAmount(null);
    if (Number(value) >= 10) {
      setShowPaymentForm(true);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    // Reset form after success
    setTimeout(() => {
      setPaymentSuccess(false);
      setSelectedAmount(null);
      setCustomAmount('');
      setShowPaymentForm(false);
      setDonorInfo({ name: '', email: '', phone: '' });
    }, 5000);
  };

  const getCurrency = (gateway: PaymentGateway) => {
    switch (gateway) {
      case 'razorpay':
        return 'INR';
      default:
        return 'INR';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `$${amount.toLocaleString('en-US')}`;
  };

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Thank You!</h1>
          <p className="text-slate-600 mb-8">
            Your donation of {formatAmount(finalAmount, getCurrency(selectedGateway))} has been received.
            You're making a real difference in a child's life.
          </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full py-3 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-colors"
            >
              Back to Home
            </Link>
            <button
              onClick={() => setPaymentSuccess(false)}
              className="block w-full py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:border-slate-300 transition-colors"
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
      {/* Hero Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-full text-sm font-medium mb-6">
            <Heart className="w-4 h-4 fill-rose-500" />
            <span>Education for All</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            Empower Vulnerable Children Through Education
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Your donation helps provide quality education, study materials, and coaching support
            to underprivileged children aspiring for JEE, NEET, and other competitive exams.
          </p>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {impactStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mb-4">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Choose Your Contribution</h2>
            <p className="text-slate-600">Every donation makes a difference in a child's life</p>
          </div>

          {/* Preset Amounts */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {donationOptions.map((option) => (
              <button
                key={option.amount}
                onClick={() => handleAmountSelect(option.amount)}
                className={`bg-white rounded-2xl p-6 border-2 transition-all hover:shadow-xl text-left ${selectedAmount === option.amount
                  ? 'border-rose-500 ring-2 ring-rose-200'
                  : 'border-slate-100 hover:border-rose-500'
                  }`}
              >
                <div className="text-3xl font-bold text-slate-900 mb-2">
                  ₹{option.amount.toLocaleString()}
                </div>
                <p className="text-sm text-slate-600">{option.description}</p>
                {selectedAmount === option.amount && (
                  <div className="mt-4 flex items-center gap-2 text-rose-600 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Selected
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="bg-white rounded-2xl p-8 border-2 border-slate-100 max-w-xl mx-auto mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 text-center">Or Enter Custom Amount</h3>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                <input
                  type="number"
                  placeholder="Enter amount (min ₹10)"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                  min="10"
                />
              </div>
            </div>
          </div>

          {/* Payment Form */}
          {showPaymentForm && isValidAmount && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl p-8 border-2 border-slate-100 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-slate-900">Complete Your Donation</h3>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-rose-600">
                      {formatAmount(finalAmount, getCurrency(selectedGateway))}
                    </div>
                    <div className="text-sm text-slate-500">Total Amount</div>
                  </div>
                </div>

                {/* Gateway Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Select Payment Method
                  </label>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {paymentGateways.map((gateway) => (
                      <button
                        key={gateway.id}
                        onClick={() => setSelectedGateway(gateway.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${selectedGateway === gateway.id
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{gateway.icon}</span>
                          <span className="font-semibold text-slate-900">{gateway.name}</span>
                        </div>
                        <p className="text-xs text-slate-500">{gateway.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Donor Information */}
                <div className="space-y-4 mb-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Your name"
                        value={donorInfo.name}
                        onChange={(e) => setDonorInfo({ ...donorInfo, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={donorInfo.email}
                        onChange={(e) => setDonorInfo({ ...donorInfo, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={donorInfo.phone}
                      onChange={(e) => setDonorInfo({ ...donorInfo, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Payment Button */}
                <PaymentButton
                  amount={finalAmount}
                  currency={getCurrency(selectedGateway)}
                  gateway={selectedGateway}
                  donorName={donorInfo.name || undefined}
                  donorEmail={donorInfo.email || undefined}
                  donorPhone={donorInfo.phone || undefined}
                  description="Donation to SaviEduTech"
                  onSuccess={handlePaymentSuccess}
                  onError={(error) => alert(`Payment failed: ${error}`)}
                  onCancel={() => console.log('Payment cancelled')}
                  className="w-full"
                >
                  Pay {formatAmount(finalAmount, getCurrency(selectedGateway))}
                </PaymentButton>

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span>Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>Tax Deductible (80G)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-500" />
                      <span>Receipt via Email</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">How Your Donation Helps</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'We Identify Students',
                description: 'We work with schools and NGOs to identify deserving students from underprivileged backgrounds.',
              },
              {
                step: '02',
                title: 'Provide Resources',
                description: 'Your donations fund study materials, online courses, test series, and mentorship programs.',
              },
              {
                step: '03',
                title: 'Track Progress',
                description: "We monitor each student's progress and provide regular updates to donors on their impact.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="text-4xl font-bold text-rose-200 mb-4">{item.step}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">100% Transparency</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
              <h3 className="font-semibold text-slate-900">Tax Benefits</h3>
              <p className="text-sm text-slate-500">All donations are tax deductible under 80G</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
              <h3 className="font-semibold text-slate-900">Regular Reports</h3>
              <p className="text-sm text-slate-500">Quarterly impact reports for all donors</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
              <h3 className="font-semibold text-slate-900">Secure Payments</h3>
              <p className="text-sm text-slate-500">Bank-grade encryption for all transactions</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-r from-rose-500 to-pink-500">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Make a Difference?</h2>
          <p className="text-lg text-white/90 mb-8">
            Join thousands of donors who are helping children achieve their dreams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                setShowPaymentForm(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-8 py-4 bg-white text-rose-500 font-semibold rounded-xl hover:bg-white/90 transition-colors"
            >
              Donate Now
            </button>
            <Link
              href="/"
              className="px-8 py-4 border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
