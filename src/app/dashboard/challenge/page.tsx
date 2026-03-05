'use client';

import { useEffect, useState } from 'react';
import { Trophy, Clock, Users, Zap, ChevronRight, Award, Loader2, AlertCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ShareCard } from '@/components/social/ShareButtons';

interface ChallengeData {
  todayChallenge: {
    id: string;
    title: string;
    description: string | null;
    question_text: string;
    options: string[];
    total_participants: number;
    correct_participants: number;
    closes_at: string | null;
    difficulty_level: string | null;
  } | null;
  leaderboard: Array<{
    rank: number;
    name: string;
    time: string;
    points: number;
  }>;
  userStats: {
    challengesAttempted: number;
    correctAnswers: number;
    successRate: number;
    bestRank: number | null;
  };
  hasAttempted: boolean;
}

export default function ChallengePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    rank: number;
    correct: boolean;
    points: number;
  } | null>(null);

  useEffect(() => {
    async function fetchChallengeData() {
      if (!user) return;

      try {
        const supabase = getSupabaseBrowserClient();
        const today = new Date().toISOString().split('T')[0];

        // Fetch today's challenge with question
        const { data: challengeData } = await supabase
          .from('daily_challenges')
          .select(`
                        id,
                        title,
                        description,
                        total_participants,
                        correct_participants,
                        closes_at,
                        difficulty_level,
                        questions:question_id (
                            question_text,
                            correct_answer
                        )
                    `)
          .eq('challenge_date', today)
          .single();

        // For now, use mock leaderboard data
        // In production, this would come from challenge_attempts table
        const leaderboard = [
          { rank: 1, name: 'Rahul S.', time: '12s', points: 100 },
          { rank: 2, name: 'Priya M.', time: '15s', points: 90 },
          { rank: 3, name: 'Amit K.', time: '18s', points: 80 },
          { rank: 4, name: 'Sneha R.', time: '22s', points: 70 },
          { rank: 5, name: 'Vikram P.', time: '25s', points: 60 },
        ];

        // Mock user stats - in production would fetch from challenge_attempts
        const correctCount = 0;
        const successRate = 0;
        const hasAttempted = false;

        const challenge = challengeData as {
          id: string;
          title: string | null;
          description: string | null;
          total_participants: number;
          correct_participants: number;
          closes_at: string | null;
          difficulty_level: string | null;
          questions: { question_text: string; correct_answer: string } | null;
        } | null;

        // Parse options from correct_answer (assuming format like "A|option1|option2|option3|option4")
        const options = ['2.5 m/s²', '5 m/s²', '7.5 m/s²', '10 m/s²']; // Default options

        setData({
          todayChallenge: challenge ? {
            id: challenge.id,
            title: challenge.title || 'Physics - Mechanics',
            description: challenge.description,
            question_text: challenge.questions?.question_text ||
              'A block of mass 5 kg is placed on a frictionless inclined plane making an angle of 30° with the horizontal. What is the acceleration of the block down the plane? (g = 10 m/s²)',
            options,
            total_participants: challenge.total_participants || 0,
            correct_participants: challenge.correct_participants || 0,
            closes_at: challenge.closes_at,
            difficulty_level: challenge.difficulty_level,
          } : null,
          leaderboard,
          userStats: {
            challengesAttempted: 0, // Would be fetched from challenge_attempts
            correctAnswers: correctCount,
            successRate,
            bestRank: null, // Would need to calculate from historical data
          },
          hasAttempted: hasAttempted,
        });
      } catch (err) {
        console.error('Error fetching challenge data:', err);
        setError('Failed to load challenge data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchChallengeData();
    }
  }, [user, authLoading]);

  const handleSubmit = async () => {
    if (selectedOption === null || !data?.todayChallenge || !user) return;

    setSubmitting(true);
    try {
      // For now, just simulate submission without database insert
      // In production, this would insert into challenge_attempts table

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Track challenge completion for gamification
      try {
        await fetch('/api/gamification/track-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityType: 'challenge_completed',
            metadata: {
              challengeId: data.todayChallenge.id,
              selectedOption,
            },
          }),
        });
      } catch (gamificationError) {
        console.error('Error tracking challenge completion:', gamificationError);
      }

      // Update hasAttempted state
      setData(prev => prev ? { ...prev, hasAttempted: true } : null);

      // Simulate rank calculation (in production, this would come from the backend)
      const simulatedRank = Math.floor(Math.random() * 50) + 1;
      const isCorrect = selectedOption === 0; // Assuming first option is correct for demo
      const earnedPoints = isCorrect ? 100 : 10;

      setSubmissionResult({
        rank: simulatedRank,
        correct: isCorrect,
        points: earnedPoints,
      });
    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getTimeRemaining = () => {
    if (!data?.todayChallenge?.closes_at) return '2h 30m';
    const closesAt = new Date(data.todayChallenge.closes_at);
    const now = new Date();
    const diffMs = closesAt.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return `${diffHrs}h ${diffMins}m`;
  };

  if (authLoading || loading) {
    return <ChallengeSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
        <p className="text-slate-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

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
            <h2 className="text-2xl font-bold">{data?.todayChallenge?.title || "Today's Question"}</h2>
            <p className="text-white/80">Difficulty: {data?.todayChallenge?.difficulty_level || 'Medium'}</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
          <p className="text-lg font-medium mb-4">
            {data?.todayChallenge?.question_text}
          </p>
          {data?.hasAttempted ? (
            <div className="space-y-4">
              <div className="text-center py-4 bg-white/20 rounded-xl">
                <Trophy className="w-12 h-12 mx-auto mb-2" />
                <p className="text-xl font-semibold">
                  {submissionResult 
                    ? (submissionResult.correct 
                        ? `🎉 Correct! Rank #${submissionResult.rank}` 
                        : `💪 Attempted! Rank #${submissionResult.rank}`)
                    : "You've already attempted today's challenge!"}
                </p>
                <p className="text-white/80">
                  {submissionResult 
                    ? `Earned ${submissionResult.points} points • Check back tomorrow for a new question.`
                    : "Check back tomorrow for a new question."}
                </p>
              </div>
              
              {submissionResult && (
                <ShareCard
                  shareData={{
                    rank: submissionResult.rank,
                    totalParticipants: data?.todayChallenge?.total_participants || 100,
                    challengeTitle: data?.todayChallenge?.title || "Daily National Challenge",
                    correctAnswer: submissionResult.correct,
                    points: submissionResult.points,
                  }}
                  className="bg-white/10 backdrop-blur-sm border-white/20"
                />
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {(data?.todayChallenge?.options || []).map((option, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOption(i)}
                  className={`p-4 rounded-xl text-left font-medium transition-colors ${selectedOption === i
                    ? 'bg-white text-orange-600'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                >
                  {String.fromCharCode(65 + i)}. {option}
                </button>
              ))}
            </div>
          )}
          {!data?.hasAttempted && (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null || submitting}
              className="w-full mt-4 py-3 bg-white text-orange-600 font-semibold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Answer'
              )}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{data?.todayChallenge?.total_participants.toLocaleString() || 0}</div>
              <div className="text-sm text-white/80">Attempted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{data?.todayChallenge?.correct_participants.toLocaleString() || 0}</div>
              <div className="text-sm text-white/80">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold flex items-center gap-1">
                <Clock className="w-5 h-5" />
                {getTimeRemaining()}
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
            {data?.leaderboard.map((user) => (
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
              <div className="text-2xl font-bold text-slate-900">{data?.userStats.challengesAttempted || 0}</div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Correct Answers</div>
                  <div className="text-sm text-slate-500">Success rate: {data?.userStats.successRate.toFixed(0) || 0}%</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{data?.userStats.correctAnswers || 0}</div>
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
              <div className="text-2xl font-bold text-slate-900">
                {data?.userStats.bestRank ? `#${data.userStats.bestRank}` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChallengeSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-48"></div>
        </div>
        <div className="h-10 bg-slate-200 rounded w-24"></div>
      </div>

      <div className="bg-slate-200 rounded-2xl h-96"></div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="h-16 bg-slate-200 border-b"></div>
          <div className="divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 h-16 bg-slate-100"></div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="h-6 bg-slate-200 rounded w-32 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
