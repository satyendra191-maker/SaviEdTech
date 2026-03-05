import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Arvind Sir - Biology Faculty - SaviEduTech',
  description: 'Learn Biology from Arvind Sir - Expert educator with 14+ years of experience for NEET preparation.',
};

export default function FacultyArvindPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="md:col-span-1">
            <div className="aspect-square bg-gradient-to-br from-red-100 to-rose-100 rounded-2xl flex items-center justify-center">
              <span className="text-6xl text-red-300 font-bold">A</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 mb-4">
              Biology
            </span>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Arvind Sir</h1>
            <p className="text-lg text-slate-600 mb-6">14+ Years Experience</p>
            
            <p className="text-slate-600 mb-6">
              Biology expert for NEET preparation with diagram-based visual teaching methodology.
              Specializing in Zoology, Botany, and Human Physiology.
            </p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">40,000+</div>
                <div className="text-sm text-slate-500">Students</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">900+</div>
                <div className="text-sm text-slate-500">Videos</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">14+</div>
                <div className="text-sm text-slate-500">Years</div>
              </div>
            </div>

            <Link href="/dashboard/lectures?subject=biology" className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition">
              View Biology Lectures
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
