'use client';

import { AnimatedLogo } from '@/components/animated-logo';
import Link from 'next/link';

export default function CBSEPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <AnimatedLogo size="lg" className="mx-auto mb-8" />
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          CBSE Board Preparation
        </h1>
        <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
          Achieve excellence in your board exams with our comprehensive CBSE curriculum and NCERT analysis.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-left mb-16">
          <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <h3 className="text-xl font-bold text-slate-900 mb-3">NCERT Deep Dive</h3>
            <p className="text-slate-600">Thorough coverage of all NCERT textbooks and exemplar problems.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Model Papers</h3>
            <p className="text-slate-600">Prepare with our meticulously drafted sample papers and board-standard solutions.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Exam Strategies</h3>
            <p className="text-slate-600">Insights from examiners on how to present your answers and score higher.</p>
          </div>
        </div>

        <Link
          href="/register"
          className="inline-flex items-center px-8 py-4 bg-orange-600 text-white rounded-xl font-bold text-lg hover:bg-orange-700 transition transform hover:scale-105"
        >
          Join Our CBSE Batch
        </Link>
      </div>
    </div>
  );
}
