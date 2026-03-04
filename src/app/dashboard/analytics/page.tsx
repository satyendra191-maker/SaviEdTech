import { TrendingUp, Target, Clock, Award, BarChart3, BookOpen } from 'lucide-react';

const subjectStats = [
  { subject: 'Physics', accuracy: 78, questions: 450, time: '42h', color: 'bg-blue-500' },
  { subject: 'Chemistry', accuracy: 82, questions: 380, time: '38h', color: 'bg-emerald-500' },
  { subject: 'Mathematics', accuracy: 75, questions: 520, time: '55h', color: 'bg-amber-500' },
  { subject: 'Biology', accuracy: 85, questions: 290, time: '28h', color: 'bg-red-500' },
];

const weakTopics = [
  { topic: 'Thermodynamics', subject: 'Physics', accuracy: 45 },
  { topic: 'Organic Chemistry', subject: 'Chemistry', accuracy: 52 },
  { topic: 'Integration', subject: 'Mathematics', accuracy: 48 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Performance Analytics</h1>
        <p className="text-slate-500">Track your progress and identify areas for improvement</p>
      </div>

      {/* Rank Prediction Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Predicted JEE Main Rank</h2>
            <p className="text-slate-400">Based on your test performance and practice history</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-400">AIR 1,250</div>
              <div className="text-sm text-slate-400">Predicted Rank</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400">98.5%</div>
              <div className="text-sm text-slate-400">Percentile</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400">85%</div>
              <div className="text-sm text-slate-400">Readiness</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Subject-wise Performance</h3>
          <div className="space-y-4">
            {subjectStats.map((stat) => (
              <div key={stat.subject} className="flex items-center gap-4">
                <div className={`w-3 h-12 rounded-full ${stat.color}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900">{stat.subject}</span>
                    <span className="font-semibold text-slate-900">{stat.accuracy}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stat.color}`}
                      style={{ width: `${stat.accuracy}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span>{stat.questions} questions</span>
                    <span>{stat.time} spent</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Topics */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Topics Needing Attention</h3>
          <div className="space-y-4">
            {weakTopics.map((topic) => (
              <div key={topic.topic} className="p-4 bg-red-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-slate-900">{topic.topic}</h4>
                    <p className="text-sm text-slate-500">{topic.subject}</p>
                  </div>
                  <span className="text-red-600 font-semibold">{topic.accuracy}%</span>
                </div>
                <div className="h-2 bg-red-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${topic.accuracy}%` }}
                  />
                </div>
                <button className="mt-3 text-sm text-red-600 font-medium hover:underline">
                  Practice this topic
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-900">1,640</div>
          <div className="text-sm text-slate-500">Questions Solved</div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3">
            <Target className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-900">78.5%</div>
          <div className="text-sm text-slate-500">Average Accuracy</div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-900">163h</div>
          <div className="text-sm text-slate-500">Study Time</div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Award className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-900">24</div>
          <div className="text-sm text-slate-500">Tests Completed</div>
        </div>
      </div>
    </div>
  );
}