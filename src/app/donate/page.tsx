import { Heart, Users, BookOpen, GraduationCap, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-full text-sm font-medium mb-6">
            <Heart className="w-4 h-4 fill-rose-500" />
            <span>Education for All</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
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

      {/* Donation Options */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Choose Your Contribution</h2>
            <p className="text-slate-600">Every donation makes a difference in a child's life</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {donationOptions.map((option) => (
              <div
                key={option.amount}
                className="bg-white rounded-2xl p-6 border-2 border-slate-100 hover:border-rose-500 transition-all hover:shadow-xl cursor-pointer group"
              >
                <div className="text-3xl font-bold text-slate-900 mb-2">
                  ₹{option.amount.toLocaleString()}
                </div>
                <p className="text-sm text-slate-600 mb-6">{option.description}</p>
                <button className="w-full py-3 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg">
                  Donate Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="mt-8 bg-white rounded-2xl p-8 border-2 border-slate-100 max-w-xl mx-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 text-center">Or Enter Custom Amount</h3>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                <input
                  type="number"
                  placeholder="Enter amount"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                />
              </div>
              <button className="px-8 py-3 bg-rose-500 text-white font-semibold rounded-xl hover:bg-rose-600 transition-colors">
                Donate
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-slate-50">
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
              <div key={item.step} className="bg-white rounded-2xl p-6">
                <div className="text-4xl font-bold text-rose-200 mb-4">{item.step}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Transparency */}
      <section className="py-20 px-4">
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
      <section className="py-20 px-4 bg-gradient-to-r from-rose-500 to-pink-500">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Make a Difference?</h2>
          <p className="text-lg text-white/90 mb-8">
            Join thousands of donors who are helping children achieve their dreams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-white text-rose-500 font-semibold rounded-xl hover:bg-white/90 transition-colors">
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