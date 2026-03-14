'use client';

import Link from 'next/link';
import {
  PlayCircle,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Trophy,
  RefreshCw,
  Clock,
  Users,
  Brain,
  Target,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Heart,
  Briefcase,
  Mail,
} from 'lucide-react';

const features = [
  {
    icon: PlayCircle,
    title: 'Video Lectures',
    description: 'High-quality video lectures from expert faculty with detailed explanations and visual diagrams.',
    color: 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700',
    borderColor: 'border-blue-300',
    href: '/lectures',
  },
  {
    icon: BookOpen,
    title: 'Practice Questions',
    description: '10,000+ practice questions covering all topics with varying difficulty levels.',
    color: 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700',
    borderColor: 'border-emerald-300',
    href: '/practice',
  },
  {
    icon: ClipboardCheck,
    title: 'Mock Tests',
    description: 'Full-length JEE/NEET pattern tests with detailed performance analysis.',
    color: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700',
    borderColor: 'border-amber-300',
    href: '/mock-tests',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track your progress with detailed analytics and personalized insights.',
    color: 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700',
    borderColor: 'border-purple-300',
    href: '/dashboard/analytics',
  },
  {
    icon: Trophy,
    title: 'Daily Challenge',
    description: 'Compete with students nationwide in our daily question challenge.',
    color: 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700',
    borderColor: 'border-orange-300',
    href: '/challenge',
  },
  {
    icon: RefreshCw,
    title: 'Smart Revision',
    description: 'AI-powered revision recommendations based on your weak areas.',
    color: 'bg-gradient-to-br from-pink-100 to-pink-200 text-pink-700',
    borderColor: 'border-pink-300',
    href: '/dashboard/revision',
  },
  {
    icon: Clock,
    title: 'Daily Practice',
    description: 'Curated daily practice problems (DPP) with solutions.',
    color: 'bg-gradient-to-br from-cyan-100 to-cyan-200 text-cyan-700',
    borderColor: 'border-cyan-300',
    href: '/dashboard/dpp',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Join a community of 100,000+ aspirants and learn together.',
    color: 'bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700',
    borderColor: 'border-indigo-300',
    href: '/dashboard/practice',
  },
];

const aiFeatures = [
  {
    icon: Brain,
    title: 'AI Personal Tutor',
    description: 'Get 24/7 personalized tutoring from our AI assistant',
    href: '/ai-tutor',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    icon: Target,
    title: 'AI Adaptive Learning',
    description: 'System adapts to your learning style and pace',
    href: '/ai-tutor',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: GraduationCap,
    title: 'AI Rank Simulator',
    description: 'Predict your All India Rank with precision',
    href: '/dashboard/analytics',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Sparkles,
    title: 'SaviTech AI',
    description: 'Advanced AI solutions for education',
    href: '/savitech-ai',
    color: 'from-amber-500 to-orange-500',
  },
];

export function Features() {
  return (
    <section className="py-20 page-bg-science">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Comprehensive tools and resources designed to help you crack JEE & NEET
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Link
              key={index}
              href={feature.href}
              className="group block p-6 rounded-2xl border-2 transition-all hover:shadow-xl hover:-translate-y-1"
            >
              <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AIFeatures() {
  return (
    <section className="py-20 bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Powered by SaviTech AI
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            AI-Powered Learning
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Experience the future of education with our advanced AI systems
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {aiFeatures.map((feature, index) => (
            <Link
              key={index}
              href={feature.href}
              className="group block p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {feature.description}
              </p>
              <div className="flex items-center text-purple-600 font-medium text-sm group-hover:gap-2 transition-all">
                Learn More <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CoursePreview() {
  const courses = [
    { title: 'JEE Main + Advanced', subjects: 'Physics, Chemistry, Math', exams: 'IIT JEE', color: 'from-blue-500 to-cyan-500' },
    { title: 'NEET UG', subjects: 'Physics, Chemistry, Biology', exams: 'NEET, AIIMS', color: 'from-green-500 to-emerald-500' },
    { title: 'Class 11-12 Foundation', subjects: 'Complete Syllabus', exams: 'School Exams', color: 'from-purple-500 to-pink-500' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Popular Courses
            </h2>
            <p className="text-lg text-slate-600">
              Expert-designed courses for every exam
            </p>
          </div>
          <Link 
            href="/courses"
            className="mt-4 md:mt-0 inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            View All Courses <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <Link
              key={index}
              href="/courses"
              className="group block bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className={`h-3 bg-gradient-to-r ${course.color}`} />
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-slate-600 mb-1">{course.subjects}</p>
                <p className="text-xs text-slate-500">{course.exams}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function QuickLinks() {
  const links = [
    { name: 'Donate', href: '/donate', description: 'Support education for all', icon: Heart, color: 'text-rose-400' },
    { name: 'Careers', href: '/careers', description: 'Join our team', icon: Briefcase, color: 'text-blue-400' },
    { name: 'Contact', href: '/contact', description: 'Get in touch', icon: Mail, color: 'text-green-400' },
    { name: 'SaviTech AI', href: '/savitech-ai', description: 'Explore AI solutions', icon: Sparkles, color: 'text-purple-400' },
  ];

  return (
    <section className="py-16 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {links.map((link, index) => {
            const Icon = link.icon;
            return (
              <Link
                key={index}
                href={link.href}
                className="block p-6 bg-white/10 rounded-xl hover:bg-white/20 transition-all hover:-translate-y-1 text-center group"
              >
                <div className={`mx-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${link.color}`} />
                </div>
                <h3 className="text-white font-semibold mb-1">{link.name}</h3>
                <p className="text-white/60 text-sm">{link.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Features;
