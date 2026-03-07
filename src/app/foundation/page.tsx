'use client';

import { AnimatedLogo } from '@/components/animated-logo';
import Link from 'next/link';

export default function FoundationPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <AnimatedLogo size="lg" className="mx-auto mb-8" />
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
          Foundation Course (6-10)
        </h1>
        <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
          Building strong fundamentals early on is key to future success in competitive exams.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-left mb-16">
          <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Strong Basics</h3>
            <p className="text-slate-600">Conceptual clarity in Science and Math from the very beginning.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Logic & Reasoning</h3>
            <p className="text-slate-600">Enhance your mental ability and logical thinking skills.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Olympiad Prep</h3>
            <p className="text-slate-600">Prepare for various school-level competitive exams like NTSE, KVPY, and Olympiads.</p>
          </div>
        </div>

        <Link
          href="/register"
          className="inline-flex items-center px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition transform hover:scale-105"
        >
          Start Your JEE Advanced Prep Now
        </Link>
      </div>
    </div>
  );
}
