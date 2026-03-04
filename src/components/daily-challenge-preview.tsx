import Link from 'next/link';
import { Trophy, Clock, Users, ChevronRight, Zap } from 'lucide-react';

export function DailyChallengePreview() {
  return (
    <section className="py-20 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Live Now</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Daily National Challenge
            </h2>
            <p className="text-lg text-white/90 mb-8">
              Test your knowledge against students from all over India. One question, thousands of participants, daily rankings!
            </p>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold">1,234</div>
                <div className="text-sm text-white/80">Attempted Today</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">456</div>
                <div className="text-sm text-white/80">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">2h 30m</div>
                <div className="text-sm text-white/80">Time Left</div>
              </div>
            </div>

            <Link
              href="/challenge"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-600 font-semibold rounded-xl hover:bg-white/90 transition-colors"
            >
              <Trophy className="w-5 h-5" />
              Attempt Today's Challenge
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-white" />
              <h3 className="text-xl font-semibold text-white">Yesterday's Top Performers</h3>
            </div>

            <div className="space-y-4">
              {[
                { rank: 1, name: 'Rahul S.', time: '12s', points: 100 },
                { rank: 2, name: 'Priya M.', time: '15s', points: 90 },
                { rank: 3, name: 'Amit K.', time: '18s', points: 80 },
                { rank: 4, name: 'Sneha R.', time: '22s', points: 70 },
                { rank: 5, name: 'Vikram P.', time: '25s', points: 60 },
              ].map((user) => (
                <div
                  key={user.rank}
                  className="flex items-center justify-between p-4 bg-white/10 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${user.rank === 1 ? 'bg-yellow-400 text-yellow-900' : 
                        user.rank === 2 ? 'bg-gray-300 text-gray-900' :
                        user.rank === 3 ? 'bg-orange-400 text-orange-900' :
                        'bg-white/20 text-white'}`}>
                      {user.rank}
                    </div>
                    <span className="text-white font-medium">{user.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-white/80">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {user.time}
                    </span>
                    <span className="font-semibold">{user.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}