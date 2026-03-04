import { RotateCcw, BookOpen, CheckCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';

const revisionTasks = [
  {
    id: 1,
    topic: 'Thermodynamics',
    subject: 'Physics',
    reason: 'Low accuracy in recent tests',
    priority: 'High',
    type: 'lecture_review',
    estimatedTime: '45 min',
  },
  {
    id: 2,
    topic: 'Organic Chemistry - Aldehydes',
    subject: 'Chemistry',
    reason: 'Mistakes in previous DPP',
    priority: 'High',
    type: 'practice_questions',
    estimatedTime: '30 min',
  },
  {
    id: 3,
    topic: 'Integration by Parts',
    subject: 'Mathematics',
    reason: 'Weak topic identified',
    priority: 'Medium',
    type: 'lecture_review',
    estimatedTime: '40 min',
  },
];

const mistakeLog = [
  { topic: 'Newton Laws', subject: 'Physics', type: 'Conceptual', date: 'Dec 2' },
  { topic: 'Chemical Bonding', subject: 'Chemistry', type: 'Calculation', date: 'Dec 1' },
  { topic: 'Derivatives', subject: 'Mathematics', type: 'Misread', date: 'Nov 30' },
];

export default function RevisionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Smart Revision</h1>
        <p className="text-slate-500">AI-powered revision recommendations based on your weak areas</p>
      </div>

      {/* Priority Tasks */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-slate-900">Priority Revision Tasks</h3>
        </div>
        <div className="space-y-4">
          {revisionTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  task.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{task.topic}</h4>
                  <p className="text-sm text-slate-500">{task.subject} • {task.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    task.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {task.priority}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">{task.estimatedTime}</p>
                </div>
                <button className="p-2 hover:bg-white rounded-lg">
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revision Schedule */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Today's Revision Schedule</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900 line-through">Watch: Thermodynamics Lecture</h4>
                <p className="text-sm text-slate-500">Completed at 10:30 AM</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900">Practice: Organic Chemistry Questions</h4>
                <p className="text-sm text-slate-500">15 questions • 30 minutes</p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg">
                Start
              </button>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-400">Review: Integration Formulas</h4>
                <p className="text-sm text-slate-400">Scheduled for 4:00 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mistake Log */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Recent Mistakes</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {mistakeLog.map((mistake, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <h4 className="font-medium text-slate-900">{mistake.topic}</h4>
                  <p className="text-sm text-slate-500">{mistake.subject} • {mistake.type}</p>
                </div>
                <span className="text-sm text-slate-400">{mistake.date}</span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100">
            <button className="w-full py-3 text-primary-600 font-medium hover:bg-primary-50 rounded-xl transition-colors">
              View All Mistakes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}