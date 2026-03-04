import { BookOpen, Clock, CheckCircle, ArrowRight } from 'lucide-react';

const subjects = [
  { name: 'Physics', questions: 2500, color: 'bg-blue-50 text-blue-600', progress: 65 },
  { name: 'Chemistry', questions: 2200, color: 'bg-emerald-50 text-emerald-600', progress: 48 },
  { name: 'Mathematics', questions: 3000, color: 'bg-amber-50 text-amber-600', progress: 72 },
  { name: 'Biology', questions: 1800, color: 'bg-red-50 text-red-600', progress: 35 },
];

const recentQuestions = [
  { id: 1, subject: 'Physics', topic: 'Mechanics', difficulty: 'Medium', status: 'Correct' },
  { id: 2, subject: 'Chemistry', topic: 'Organic', difficulty: 'Hard', status: 'Incorrect' },
  { id: 3, subject: 'Mathematics', topic: 'Calculus', difficulty: 'Easy', status: 'Correct' },
];

export default function PracticePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Practice Questions</h1>
        <p className="text-slate-500">Master concepts with 10,000+ questions</p>
      </div>

      {/* Subject Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {subjects.map((subject) => (
          <div
            key={subject.name}
            className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className={`w-12 h-12 rounded-xl ${subject.color} flex items-center justify-center mb-4`}>
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900">{subject.name}</h3>
            <p className="text-sm text-slate-500">{subject.questions.toLocaleString()} questions</p>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Progress</span>
                <span className="font-medium text-slate-700">{subject.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full"
                  style={{ width: `${subject.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Practice */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-2">Quick Practice Session</h3>
            <p className="text-white/80">10 questions • Mixed topics • 15 minutes</p>
          </div>
          <button className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-white/90 transition-colors flex items-center gap-2">
            Start Now
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {recentQuestions.map((q) => (
            <div key={q.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  q.subject === 'Physics' ? 'bg-blue-100 text-blue-600' :
                  q.subject === 'Chemistry' ? 'bg-emerald-100 text-emerald-600' :
                  q.subject === 'Mathematics' ? 'bg-amber-100 text-amber-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{q.topic}</p>
                  <p className="text-sm text-slate-500">{q.subject} • {q.difficulty}</p>
                </div>
              </div>
              <span className={`flex items-center gap-1 text-sm font-medium ${
                q.status === 'Correct' ? 'text-green-600' : 'text-red-600'
              }`}>
                {q.status === 'Correct' ? <CheckCircle className="w-4 h-4" /> : null}
                {q.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}