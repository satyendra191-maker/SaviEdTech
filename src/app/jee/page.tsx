import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'JEE Preparation - SaviEduTech',
  description: 'Complete JEE preparation with expert faculty, mock tests, and practice questions.',
};

export default function JEEPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">JEE Preparation</h1>
          <p className="text-lg text-slate-600">Your pathway to IIT and top engineering colleges</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {[
            { title: 'JEE Main', description: 'Full syllabus tests, chapter-wise practice, previous year papers' },
            { title: 'JEE Advanced', description: 'Advanced level problems, mock tests, expert guidance' },
            { title: 'Rank Prediction', description: 'AI-powered rank prediction based on your performance' },
          ].map((item) => (
            <div key={item.title} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/dashboard" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
            Start JEE Preparation
          </Link>
        </div>
      </div>
    </div>
  );
}
