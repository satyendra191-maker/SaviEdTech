'use client';

import Link from 'next/link';
import { Crown, Zap, BookOpen, Gift, Share2, Trophy, Users, TrendingUp } from 'lucide-react';

const plans = [
  { name: 'Free', price: '₹0', icon: BookOpen, features: ['Free courses', 'Basic practice', 'Community access'] },
  { name: 'Pro', price: '₹2,499/yr', icon: Zap, features: ['All free', 'Premium courses', 'AI tutor unlimited', 'Mock tests'], popular: true },
  { name: 'Elite', price: '₹4,999/yr', icon: Crown, features: ['All Pro', '1-on-1 mentor', 'Live classes', 'Career guidance'] },
];

const streams = [
  { name: 'Course Sales', icon: BookOpen },
  { name: 'Subscriptions', icon: Crown },
  { name: 'Live Programs', icon: Trophy },
  { name: 'Mentorship', icon: Users },
  { name: 'Test Series', icon: TrendingUp },
  { name: 'Donations', icon: Gift },
];

export default function GrowthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="bg-gradient-to-r from-primary-900 to-primary-800 text-white py-16 px-4">
        <h1 className="text-4xl font-black text-center mb-4">Grow Your Future</h1>
        <p className="text-center text-primary-100 mb-8">Premium learning with subscriptions, mentorship & more</p>
        <div className="flex justify-center gap-4">
          <Link href="/register" className="px-6 py-3 bg-amber-500 rounded-xl font-bold">Get Started</Link>
          <Link href="/courses" className="px-6 py-3 bg-white/10 rounded-xl font-bold">Browse Courses</Link>
        </div>
      </div>

      <div className="py-12 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">Revenue Streams</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {streams.map(s => (
            <div key={s.name} className="p-6 bg-white rounded-2xl border border-slate-200 text-center">
              <s.icon className="w-8 h-8 mx-auto mb-2 text-primary-600" />
              <div className="font-bold">{s.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="py-12 px-4 bg-slate-50">
        <h2 className="text-2xl font-bold text-center mb-8">Membership Plans</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4 mx-auto">
          {plans.map(p => (
            <div key={p.name} className={`p-6 bg-white rounded-2xl border-2 ${p.popular ? 'border-amber-500 shadow-xl' : 'border-slate-200'}`}>
              <p.icon className="w-10 h-10 mb-4 text-primary-600" />
              <div className="text-2xl font-black mb-2">{p.price}</div>
              <div className="font-bold mb-4">{p.name} Plan</div>
              <ul className="space-y-2 text-sm">
                {p.features.map(f => <li key={f}>✓ {f}</li>)}
              </ul>
              <Link href="/register" className={`block mt-6 py-3 text-center rounded-xl font-bold ${p.popular ? 'bg-amber-500 text-white' : 'bg-slate-100'}`}>
                Choose Plan
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="py-12 px-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Start?</h2>
        <Link href="/register" className="inline-block px-8 py-4 bg-primary-600 text-white font-bold rounded-2xl">
          Join Free Now
        </Link>
      </div>
    </div>
  );
}
