import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Practice Questions - SaviEduTech',
  description: 'Practice JEE and NEET questions with instant solutions and detailed explanations.',
};

export default function PracticePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Practice Questions</h1>
        <p className="text-lg text-slate-600 mb-12">Master concepts with our comprehensive question bank</p>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: 'Physics', description: 'Mechanics, Electromagnetism, Optics, and more', color: 'bg-blue-50 border-blue-200' },
            { title: 'Chemistry', description: 'Physical, Organic, and Inorganic Chemistry', color: 'bg-green-50 border-green-200' },
            { title: 'Mathematics', description: 'Algebra, Calculus, Coordinate Geometry', color: 'bg-purple-50 border-purple-200' },
            { title: 'Biology', description: 'Botany, Zoology, Human Physiology', color: 'bg-emerald-50 border-emerald-200' },
          ].map((subject) => (
            <Link key={subject.title} href="/dashboard/practice" className={`block p-6 rounded-lg border-2 ${subject.color} hover:shadow-lg transition`}>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{subject.title}</h3>
              <p className="text-slate-600">{subject.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/dashboard/practice" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
            Start Practicing
          </Link>
        </div>
      </div>
    </div>
  );
}
