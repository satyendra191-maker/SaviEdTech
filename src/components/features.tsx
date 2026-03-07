import {
  PlayCircle,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Trophy,
  RefreshCw,
  Clock,
  Users
} from 'lucide-react';

const features = [
  {
    icon: PlayCircle,
    title: 'Video Lectures',
    description: 'High-quality video lectures from expert faculty with detailed explanations and visual diagrams.',
    color: 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700',
    borderColor: 'border-blue-300',
  },
  {
    icon: BookOpen,
    title: 'Practice Questions',
    description: '10,000+ practice questions covering all topics with varying difficulty levels.',
    color: 'bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700',
    borderColor: 'border-emerald-300',
  },
  {
    icon: ClipboardCheck,
    title: 'Mock Tests',
    description: 'Full-length JEE/NEET pattern tests with detailed performance analysis.',
    color: 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700',
    borderColor: 'border-amber-300',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track your progress with detailed analytics and personalized insights.',
    color: 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700',
    borderColor: 'border-purple-300',
  },
  {
    icon: Trophy,
    title: 'Daily Challenge',
    description: 'Compete with students nationwide in our daily question challenge.',
    color: 'bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700',
    borderColor: 'border-orange-300',
  },
  {
    icon: RefreshCw,
    title: 'Smart Revision',
    description: 'AI-powered revision recommendations based on your weak areas.',
    color: 'bg-gradient-to-br from-pink-100 to-pink-200 text-pink-700',
    borderColor: 'border-pink-300',
  },
  {
    icon: Clock,
    title: 'Daily Practice',
    description: 'Curated daily practice problems (DPP) with solutions.',
    color: 'bg-gradient-to-br from-cyan-100 to-cyan-200 text-cyan-700',
    borderColor: 'border-cyan-300',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Join a community of 100,000+ aspirants and learn together.',
    color: 'bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700',
    borderColor: 'border-indigo-300',
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
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`${feature.color} rounded-2xl p-6 shadow-sm border ${feature.borderColor} hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
              >
                <div className={`w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-700">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}