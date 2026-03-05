import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Video Lectures - SaviEduTech',
  description: 'Watch expert video lectures for JEE and NEET preparation.',
};

export default function LecturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Video Lectures</h1>
        <p className="text-lg text-slate-600 mb-12">Learn from expert faculty with our comprehensive video lectures</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { title: 'Physics Lectures', topics: 45, hours: 120 },
            { title: 'Chemistry Lectures', topics: 50, hours: 140 },
            { title: 'Mathematics Lectures', topics: 40, hours: 100 },
            { title: 'Biology Lectures', topics: 48, hours: 130 },
          ].map((subject) => (
            <div key={subject.title} className="bg-slate-50 p-6 rounded-lg border border-slate-200 hover:shadow-lg transition">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{subject.title}</h3>
              <p className="text-slate-600 mb-4">{subject.topics} Topics | {subject.hours} Hours</p>
              <Link href="/dashboard/lectures" className="block text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                View Lectures
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
