import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mock Tests - SaviEduTech',
  description: 'Take full-length mock tests for JEE and NEET with detailed analysis.',
};

export default function TestsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Mock Tests</h1>
        <p className="text-lg text-slate-600 mb-12">Test your preparation with comprehensive mock tests</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { title: 'JEE Main Full Syllabus', questions: 90, duration: '3 hours', type: 'JEE' },
            { title: 'JEE Advanced Pattern', questions: 54, duration: '3 hours', type: 'JEE' },
            { title: 'NEET Full Syllabus', questions: 200, duration: '3 hours 20 min', type: 'NEET' },
            { title: 'Chapter-wise Tests', questions: '25-50', duration: '45-90 min', type: 'Both' },
            { title: 'Bi-weekly Tests', questions: 90, duration: '3 hours', type: 'Both' },
            { title: 'Daily Challenges', questions: 10, duration: '15 min', type: 'Both' },
          ].map((test) => (
            <div key={test.title} className="bg-slate-50 p-6 rounded-lg border border-slate-200 hover:shadow-lg transition">
              <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mb-3">
                {test.type}
              </span>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{test.title}</h3>
              <div className="flex justify-between text-sm text-slate-600 mb-4">
                <span>{test.questions} Questions</span>
                <span>{test.duration}</span>
              </div>
              <Link href="/dashboard/tests" className="block text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                Start Test
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
