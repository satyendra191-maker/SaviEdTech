import { Trophy, Clock, Users, Zap, ChevronRight, Award } from 'lucide-react';

const leaderboard = [
  { rank: 1, name: 'Rahul S.', time: '12s', points: 100 },
  { rank: 2, name: 'Priya M.', time: '15s', points: 90 },
  { rank: 3, name: 'Amit K.', time: '18s', points: 80 },
  { rank: 4, name: 'Sneha R.', time: '22s', points: 70 },
  { rank: 5, name: 'Vikram P.', time: '25s', points: 60 },
];

export default function ChallengePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily National Challenge</h1>
          <p className="text-slate-500">Compete with students across India</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl">
          <Zap className="w-5 h-5" />
          <span className="font-semibold">Live Now</span>
        </div>
      </div>

      {/* Today's Challenge Card */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Today's Question</h2>
            <p className="text-white/80">Topic: Physics - Mechanics</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
          <p className="text-lg font-medium mb-4">
            A block of mass 5 kg is placed on a frictionless inclined plane making an angle of 30° with the horizontal. 
            What is the acceleration of the block down the plane? (g = 10 m/s²)
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {['2.5 m/s²', '5 m/s²', '7.5 m/s²', '10 m/s²'].map((option, i) => (
              <button
                key={i}
                className="p-4 bg-white/10 hover:bg-white/20 rounded-xl text-left font-medium transition-colors"
              >
                {String.fromCharCode(65 + i)}. {option}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">1,234</div>
              <div className="text-sm text-white/80">Attempted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">456</div>
              <div className="text-sm text-white/80">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold flex items-center gap-1">
                <Clock className="w-5 h-5" />
                2h 30m
              </div>
              <div className="text-sm text-white/80">Time Left</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Leaderboard */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-slate-900">Today's Leaderboard</h3>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {leaderboard.map((user) => (
              <div key={user.rank} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${user.rank === 1 ? 'bg-yellow-400 text-yellow-900' : 
                      user.rank === 2 ? 'bg-gray-300 text-gray-900' :
                      user.rank === 3 ? 'bg-orange-400 text-orange-900' :
                      'bg-slate-100 text-slate-600'}`}>
                    {user.rank}
                  </div>
                  <span className="font-medium text-slate-900">{user.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {user.time}
                  </span>
                  <span className="font-semibold text-slate-900">{user.points} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Your Stats */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Your Challenge Stats</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Challenges Attempted</div>
                  <div className="text-sm text-slate-500">Last 30 days</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">28</div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Correct Answers</div>
                  <div className="text-sm text-slate-500">Success rate: 82%</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">23</div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Best Rank</div>
                  <div className="text-sm text-slate-500">All time best</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">#12</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}