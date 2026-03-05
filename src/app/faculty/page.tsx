import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Our Faculty - SaviEduTech',
  description: 'Meet our expert faculty members for JEE and NEET preparation.',
};

export default function FacultyPage() {
  const faculty = [
    { name: 'Dharmendra Sir', subject: 'Physics', experience: '15+ years', image: '/faculty/dharmendra.jpg' },
    { name: 'Harendra Sir', subject: 'Chemistry', experience: '12+ years', image: '/faculty/harendra.jpg' },
    { name: 'Ravindra Sir', subject: 'Mathematics', experience: '18+ years', image: '/faculty/ravindra.jpg' },
    { name: 'Arvind Sir', subject: 'Biology', experience: '14+ years', image: '/faculty/arvind.jpg' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">Our Faculty</h1>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {faculty.map((member) => (
            <Link key={member.name} href={`/faculty/${member.name.toLowerCase().replace(' ', '-')}`} className="group">
              <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200 group-hover:shadow-lg transition">
                <div className="aspect-square bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <span className="text-4xl text-blue-300">{member.name.charAt(0)}</span>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-slate-900">{member.name}</h3>
                  <p className="text-slate-600">{member.subject}</p>
                  <p className="text-sm text-slate-500">{member.experience}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
