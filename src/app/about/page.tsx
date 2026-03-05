import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us - SaviEduTech',
  description: 'Learn about SaviEduTech - India\'s premier digital coaching platform for JEE and NEET preparation.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">About SaviEduTech</h1>
        
        <div className="prose max-w-none">
          <p className="text-lg text-slate-600 mb-6">
            SaviEduTech is India&apos;s premier digital coaching platform dedicated to helping students ace their JEE and NEET examinations. 
            With cutting-edge technology and expert faculty guidance, we transform the way students prepare for competitive exams.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">Our Mission</h2>
          <p className="text-slate-600 mb-6">
            To provide quality education accessible to every student in India, regardless of their geographic location or financial constraints. 
            We believe that every student deserves the best possible guidance to achieve their dreams.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">Our Vision</h2>
          <p className="text-slate-600 mb-6">
            To become the most trusted digital education platform in India, empowering millions of students to realize their full potential 
            and build a brighter future for themselves and the nation.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">Why Choose SaviEduTech?</h2>
          <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-6">
            <li>Expert faculty with years of experience in coaching students for JEE & NEET</li>
            <li>Comprehensive study material covering all topics in depth</li>
            <li>Regular mock tests and practice sessions</li>
            <li>Personalized learning paths based on student performance</li>
            <li>24/7 doubt resolution support</li>
            <li>Affordable pricing plans</li>
          </ul>

          <div className="mt-12 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Ready to Start Your Journey?</h3>
            <Link href="/dashboard" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
