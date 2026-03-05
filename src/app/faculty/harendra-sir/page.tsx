import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Harendra Sir - Chemistry Faculty - SaviEduTech',
  description: 'Learn Chemistry from Harendra Sir - Expert educator with 12+ years of experience.',
};

export default function FacultyHarendraPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="md:col-span-1">
            <div className="aspect-square bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center">
              <span className="text-6xl text-emerald-300 font-bold">H</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 mb-4">
              Chemistry
            </span>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Harendra Sir</h1>
            <p className="text-lg text-slate-600 mb-6">12+ Years Experience</p>
            
            <p className="text-slate-600 mb-6">
              Chemistry specialist focusing on organic and inorganic mastery through visual learning techniques.
              Specializing in Organic Chemistry, Inorganic Chemistry, and Physical Chemistry.
            </p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">45,000+</div>
                <div className="text-sm text-slate-500">Students</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">1,000+</div>
                <div className="text-sm text-slate-500">Videos</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">12+</div>
                <div className="text-sm text-slate-500">Years</div>
              </div>
            </div>

            <Link href="/dashboard/lectures?subject=chemistry" className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition">
              View Chemistry Lectures
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
