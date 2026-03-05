import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dharmendra Sir - Physics Faculty - SaviEduTech',
  description: 'Learn Physics from Dharmendra Sir - Expert educator with 15+ years of experience.',
};

export default function FacultyDharmendraPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="md:col-span-1">
            <div className="aspect-square bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
              <span className="text-6xl text-blue-300 font-bold">D</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-4">
              Physics
            </span>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Dharmendra Sir</h1>
            <p className="text-lg text-slate-600 mb-6">15+ Years Experience</p>
            
            <p className="text-slate-600 mb-6">
              Expert Physics educator with a unique approach to making complex concepts simple through real-world examples. 
              Specializing in Mechanics, Electrodynamics, and Modern Physics.
            </p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">50,000+</div>
                <div className="text-sm text-slate-500">Students</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">1,200+</div>
                <div className="text-sm text-slate-500">Videos</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">15+</div>
                <div className="text-sm text-slate-500">Years</div>
              </div>
            </div>

            <Link href="/dashboard/lectures?subject=physics" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
              View Physics Lectures
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
