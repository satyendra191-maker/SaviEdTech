import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Play, BookOpen, Award } from 'lucide-react';

const faculties = [
  {
    name: 'Dharmendra Sir',
    subject: 'Physics',
    theme: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    image: '/faculty/dharmendra.jpg',
    experience: '15+ Years',
    students: '50,000+',
    videos: '1,200+',
    description: 'Expert Physics educator with a unique approach to making complex concepts simple through real-world examples.',
    specialization: 'Mechanics, Electrodynamics, Modern Physics',
  },
  {
    name: 'Harendra Sir',
    subject: 'Chemistry',
    theme: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    image: '/faculty/harendra.jpg',
    experience: '12+ Years',
    students: '45,000+',
    videos: '1,000+',
    description: 'Chemistry specialist focusing on organic and inorganic mastery through visual learning techniques.',
    specialization: 'Organic Chemistry, Inorganic Chemistry, Physical Chemistry',
  },
  {
    name: 'Ravindra Sir',
    subject: 'Mathematics',
    theme: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    image: '/faculty/ravindra.jpg',
    experience: '18+ Years',
    students: '60,000+',
    videos: '1,500+',
    description: 'Mathematics genius known for simplifying complex problems with step-by-step solving approaches.',
    specialization: 'Calculus, Algebra, Coordinate Geometry',
  },
  {
    name: 'Arvind Sir',
    subject: 'Biology',
    theme: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    image: '/faculty/arvind.jpg',
    experience: '14+ Years',
    students: '40,000+',
    videos: '900+',
    description: 'Biology expert for NEET preparation with diagram-based visual teaching methodology.',
    specialization: 'Zoology, Botany, Human Physiology',
  },
];

export function FacultySection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Learn from India's Best Faculty
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Our expert educators bring years of experience and a proven track record of success
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {faculties.map((faculty) => (
            <div
              key={faculty.name}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Image Section */}
                <div className={`sm:w-2/5 ${faculty.bgColor} p-6 flex items-center justify-center`}>
                  <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${faculty.theme} flex items-center justify-center text-white text-3xl font-bold`}>
                    {faculty.name.split(' ')[0][0]}
                  </div>
                </div>

                {/* Content Section */}
                <div className="sm:w-3/5 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${faculty.bgColor} ${faculty.textColor}`}>
                      {faculty.subject}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{faculty.name}</h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{faculty.description}</p>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div>
                      <div className={`text-lg font-bold ${faculty.textColor}`}>{faculty.experience}</div>
                      <div className="text-xs text-slate-500">Experience</div>
                    </div>
                    <div>
                      <div className={`text-lg font-bold ${faculty.textColor}`}>{faculty.students}</div>
                      <div className="text-xs text-slate-500">Students</div>
                    </div>
                    <div>
                      <div className={`text-lg font-bold ${faculty.textColor}`}>{faculty.videos}</div>
                      <div className="text-xs text-slate-500">Videos</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                    <BookOpen className="w-4 h-4" />
                    <span>{faculty.specialization}</span>
                  </div>

                  <Link
                    href={`/faculty/${faculty.name.toLowerCase().replace(' ', '-')}`}
                    className={`inline-flex items-center gap-2 text-sm font-semibold ${faculty.textColor} hover:underline`}
                  >
                    View Lectures
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/lectures"
            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
          >
            <Play className="w-5 h-5" />
            Browse All Lectures
          </Link>
        </div>
      </div>
    </section>
  );
}