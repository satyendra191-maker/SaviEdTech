import { Calendar, Clock, CheckCircle, BookOpen, ChevronRight, Trophy } from 'lucide-react';

const todayDPP = {
  title: 'Physics - Mechanics',
  questions: 15,
  timeLimit: 30,
  difficulty: 'Mixed',
  status: 'available',
};

const pastDPPs = [
  { date: 'Yesterday', title: 'Chemistry - Organic', score: '12/15', accuracy: '80%', status: 'completed' },
  { date: 'Dec 2', title: 'Mathematics - Calculus', score: '14/15', accuracy: '93%', status: 'completed' },
  { date: 'Dec 1', title: 'Physics - Electrodynamics', score: '10/15', accuracy: '67%', status: 'completed' },
  { date: 'Nov 30', title: 'Biology - Zoology', score: '13/15', accuracy: '87%', status: 'completed' },
];

const streak = [
  { day: 'M', completed: true },
  { day: 'T', completed: true },
  { day: 'W', completed: true },
  { day: 'T', completed: true },
  { day: 'F', completed: true },
  { day: 'S', completed: true },
  { day: 'S', completed: false },
];

export default function DPPPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Daily Practice Problems</h1>
        <p className="text-slate-500">Solve daily curated problems to strengthen your concepts</p>
      </div>

      {/* Streak */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-slate-900">Your Streak</h3>
          </div>
          <span className="text-2xl font-bold text-slate-900">12 Days</span>
        </div>
        <div className="flex justify-between">
          {streak.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                day.completed ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {day.completed ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm">{day.day}</span>}
              </div>
              <span className="text-xs text-slate-500">{day.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Today's DPP */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="text-white/80">Today's DPP</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">{todayDPP.title}</h2>
            <div className="flex items-center gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {todayDPP.questions} Questions
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {todayDPP.timeLimit} Minutes
              </span>
              <span>Difficulty: {todayDPP.difficulty}</span>
            </div>
          </div>
          <button className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-white/90 transition-colors">
            Start DPP
          </button>
        </div>
      </div>

      {/* Past DPPs */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Past DPPs</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {pastDPPs.map((dpp, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{dpp.title}</h4>
                  <p className="text-sm text-slate-500">{dpp.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{dpp.score}</div>
                  <div className="text-xs text-slate-500">{dpp.accuracy} accuracy</div>
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-lg">
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}