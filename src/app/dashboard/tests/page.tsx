import { ClipboardList, Clock, Calendar, Trophy, ArrowRight, PlayCircle } from 'lucide-react';

const upcomingTests = [
    {
        id: 1,
        title: 'JEE Main Full Mock Test',
        date: 'Tomorrow, 10:00 AM',
        duration: '3 Hours',
        questions: 90,
        marks: 300,
        status: 'upcoming',
    },
    {
        id: 2,
        title: 'Physics Chapter Test - Mechanics',
        date: 'Dec 8, 2:00 PM',
        duration: '1 Hour',
        questions: 30,
        marks: 120,
        status: 'upcoming',
    },
    {
        id: 3,
        title: 'Chemistry Full Syllabus Test',
        date: 'Dec 10, 9:00 AM',
        duration: '3 Hours',
        questions: 90,
        marks: 300,
        status: 'upcoming',
    },
];

const pastTests = [
    {
        id: 4,
        title: 'Mathematics Mock Test',
        date: 'Dec 1, 2025',
        score: 245,
        maxScore: 300,
        rank: 1250,
        percentile: 95.5,
    },
    {
        id: 5,
        title: 'Physics Practice Test',
        date: 'Nov 28, 2025',
        score: 98,
        maxScore: 120,
        rank: 890,
        percentile: 97.2,
    },
];

export default function TestsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Mock Tests</h1>
                <p className="text-slate-500">Practice with JEE/NEET pattern tests</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">24</div>
                    <div className="text-sm text-slate-500">Tests Taken</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3">
                        <Trophy className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">245</div>
                    <div className="text-sm text-slate-500">Best Score</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">5</div>
                    <div className="text-sm text-slate-500">Upcoming</div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">72h</div>
                    <div className="text-sm text-slate-500">Total Time</div>
                </div>
            </div>

            {/* Upcoming Tests */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">Upcoming Tests</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {upcomingTests.map((test) => (
                        <div key={test.id} className="p-6 flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                                    <PlayCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900">{test.title}</h4>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {test.date}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {test.duration}
                                        </span>
                                        <span>{test.questions} Questions</span>
                                        <span>{test.marks} Marks</span>
                                    </div>
                                </div>
                            </div>
                            <button className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
                                Start Test
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Past Tests */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">Recent Test Results</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {pastTests.map((test) => (
                        <div key={test.id} className="p-6 flex items-center justify-between hover:bg-slate-50">
                            <div>
                                <h4 className="font-semibold text-slate-900">{test.title}</h4>
                                <p className="text-sm text-slate-500 mt-1">{test.date}</p>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="font-semibold text-slate-900">{test.score}/{test.maxScore}</div>
                                        <div className="text-xs text-slate-500">Score</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-slate-900">{test.percentile}%</div>
                                        <div className="text-xs text-slate-500">Percentile</div>
                                    </div>
                                    <button className="ml-4 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                                        View Analysis
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}