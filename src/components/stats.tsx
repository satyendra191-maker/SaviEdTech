import { Users, BookOpen, Award, PlayCircle } from 'lucide-react';

const stats = [
  {
    icon: Users,
    value: '100,000+',
    label: 'Active Students',
    description: 'Learning with us',
  },
  {
    icon: BookOpen,
    value: '50,000+',
    label: 'Practice Questions',
    description: 'With solutions',
  },
  {
    icon: PlayCircle,
    value: '5,000+',
    label: 'Video Lectures',
    description: 'Hours of content',
  },
  {
    icon: Award,
    value: '95%',
    label: 'Success Rate',
    description: 'Student satisfaction',
  },
];

export function Stats() {
  return (
    <section className="py-12 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50 text-primary-600 mb-3">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm font-medium text-slate-700">{stat.label}</div>
                <div className="text-xs text-slate-500">{stat.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}