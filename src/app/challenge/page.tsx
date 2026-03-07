import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Daily Challenge - SaviEduTech',
  description: 'Take on daily challenges to improve your ranking and earn rewards.',
};

export default function ChallengePage() {
  return (
    <div className="min-h-screen page-bg-science">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Daily Challenge</h1>
          <p className="text-lg text-slate-600">Test your skills with daily questions and compete with other students</p>
        </div>

        <div className="max-w-2xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Today&apos;s Challenge</h2>
            <p className="text-slate-600 mt-2">10 Questions | 15 Minutes | Live Ranking</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center p-4 bg-white rounded-lg">
              <span className="text-slate-700">Participants</span>
              <span className="font-semibold text-slate-900">2,547</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white rounded-lg">
              <span className="text-slate-700">Your Best Rank</span>
              <span className="font-semibold text-slate-900">#142</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white rounded-lg">
              <span className="text-slate-700">Streak</span>
              <span className="font-semibold text-slate-900">5 Days</span>
            </div>
          </div>

          <Link href="/dashboard/challenge" className="block text-center bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition">
            Start Challenge
          </Link>
        </div>
      </div>
    </div>
  );
}
