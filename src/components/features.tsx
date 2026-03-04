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
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: BookOpen,
    title: 'Practice Questions',
    description: '10,000+ practice questions covering all topics with varying difficulty levels.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: ClipboardCheck,
    title: 'Mock Tests',
    description: 'Full-length JEE/NEET pattern tests with detailed performance analysis.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track your progress with detailed analytics and personalized insights.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: Trophy,
    title: 'Daily Challenge',
    description: 'Compete with students nationwide in our daily question challenge.',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: RefreshCw,
    title: 'Smart Revision',
    description: 'AI-powered revision recommendations based on your weak areas.',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    icon: Clock,
    title: 'Daily Practice',
    description: 'Curated daily practice problems (DPP) with solutions.',
    color: 'bg-cyan-50 text-cyan-600',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Join a community of 100,000+ aspirants and learn together.',
    color: 'bg-indigo-50 text-indigo-600',
  },
];

export function Features() {
  return (
    <section className="py-20 bg-slate-50">
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
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600">
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