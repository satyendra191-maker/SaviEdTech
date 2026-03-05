import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Ravindra Sir - Mathematics Faculty - SaviEduTech',
  description: 'Learn Mathematics from Ravindra Sir - Expert educator with 18+ years of experience.',
};

export default function FacultyRavindraPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="md:col-span-1">
            <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
              <span className="text-6xl text-amber-300 font-bold">R</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 mb-4">
              Mathematics
            </span>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Ravindra Sir</h1>
            <p className="text-lg text-slate-600 mb-6">18+ Years Experience</p>
            
            <p className="text-slate-600 mb-6">
              Mathematics genius known for simplifying complex problems with step-by-step solving approaches.
              Specializing in Calculus, Algebra, and Coordinate Geometry.
            </p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">60,000+</div>
                <div className="text-sm text-slate-500">Students</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">1,500+</div>
                <div className="text-sm text-slate-500">Videos</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">18+</div>
                <div className="text-sm text-slate-500">Years</div>
              </div>
            </div>

            <Link href="/dashboard/lectures?subject=mathematics" className="inline-block bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition">
              View Mathematics Lectures
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
