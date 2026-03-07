'use client';

import { AnimatedLogo } from '@/components/animated-logo';
import Link from 'next/link';

export default function JEEAdvancedPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <AnimatedLogo size="lg" className="mx-auto mb-8" />
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          JEE Advanced Preparation
        </h1>
        <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
          Master the most challenging concepts and excel in the world's toughest engineering entrance exam.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-left mb-16">
          <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Complex Problem Solving</h3>
            <p className="text-slate-600">Deep dive into multi-concept questions and advanced problem-solving techniques.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Expert Faculty Analysis</h3>
            <p className="text-slate-600">Learn from top educators who have helped thousands of students crack IIT-JEE.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Previous Year Analysis</h3>
            <p className="text-slate-600">Detailed breakdown of past JEE Advanced papers to identify key patterns.</p>
          </div>
        </div>

        <Link
          href="/register"
          className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition transform hover:scale-105"
        >
          Start Your JEE Advanced Journey
        </Link>
      </div>
    </div>
  );
}
