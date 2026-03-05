import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Success Stories - SaviEduTech',
  description: 'Read inspiring success stories from our students who cracked JEE and NEET.',
};

export default function StoriesPage() {
  const stories = [
    { name: 'Rahul Sharma', exam: 'JEE Advanced', rank: 'AIR 234', college: 'IIT Bombay', year: '2024' },
    { name: 'Priya Singh', exam: 'NEET', rank: 'AIR 156', college: 'AIIMS Delhi', year: '2024' },
    { name: 'Amit Kumar', exam: 'JEE Main', rank: 'AIR 892', college: 'IIT Delhi', year: '2023' },
    { name: 'Sneha Reddy', exam: 'NEET', rank: 'AIR 423', college: 'CMC Vellore', year: '2023' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Success Stories</h1>
        <p className="text-lg text-slate-600 mb-12">Inspiring journeys of students who achieved their dreams</p>

        <div className="grid md:grid-cols-2 gap-8">
          {stories.map((story) => (
            <div key={story.name} className="bg-slate-50 p-8 rounded-lg border border-slate-200">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">{story.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{story.name}</h3>
                  <p className="text-slate-600">{story.exam} - {story.year}</p>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Rank</p>
                    <p className="font-semibold text-slate-900">{story.rank}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">College</p>
                    <p className="font-semibold text-slate-900">{story.college}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
