'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle, BookOpen, ChevronRight, Trophy, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface DPPData {
  todayDPP: {
    id: string;
    title: string;
    subject: string;
    total_questions: number;
    time_limit_minutes: number;
    difficulty_mix: string;
  } | null;
  pastDPPs: Array<{
    id: string;
    date: string;
    title: string;
    score: string;
    accuracy: string;
    status: 'completed' | 'pending';
  }>;
  streakData: {
    currentStreak: number;
    longestStreak: number;
    weeklyProgress: Array<{
      day: string;
      completed: boolean;
    }>;
  };
}

export default function DPPPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DPPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDPPData() {
      if (!user) return;

      try {
        const supabase = getSupabaseBrowserClient();
        const today = new Date().toISOString().split('T')[0];

        // Fetch today's DPP
        const { data: todayDPPData } = await supabase
          .from('dpp_sets')
          .select(`
                        id,
                        title,
                        total_questions,
                        time_limit_minutes,
                        difficulty_mix,
                        subjects:subject_id (name)
                    `)
          .eq('scheduled_date', today)
          .eq('is_published', true)
          .single();

        // Fetch past DPP attempts
        const { data: pastAttempts } = await supabase
          .from('dpp_attempts')
          .select(`
                        id,
                        submitted_at,
                        total_score,
                        max_score,
                        accuracy_percent,
                        status,
                        dpp_sets:dpp_set_id (
                            title,
                            subjects:subject_id (name)
                        )
                    `)
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(10);

        // Fetch student profile for streak
        const { data: studentProfile } = await supabase
          .from('student_profiles')
          .select('study_streak, longest_streak')
          .eq('id', user.id)
          .single();

        // Process past DPPs
        const pastDPPs = (pastAttempts || []).map((item: unknown) => {
          const attempt = item as {
            id: string;
            submitted_at: string;
            total_score: number | null;
            max_score: number;
            accuracy_percent: number | null;
            status: string;
            dpp_sets: {
              title: string;
              subjects: { name: string } | null;
            } | null;
          };
          const date = new Date(attempt.submitted_at);
          return {
            id: attempt.id,
            date: formatDate(date),
            title: attempt.dpp_sets?.title || 'DPP Set',
            score: `${attempt.total_score || 0}/${attempt.max_score}`,
            accuracy: `${(attempt.accuracy_percent || 0).toFixed(0)}%`,
            status: attempt.status as 'completed' | 'pending',
          };
        });

        // Generate weekly progress (mock based on streak)
        const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const weeklyProgress = days.map((day, i) => ({
          day,
          completed: i < ((studentProfile as { study_streak?: number } | null)?.study_streak || 0) % 7,
        }));

        const todayDPP = todayDPPData as {
          id: string;
          title: string;
          total_questions: number;
          time_limit_minutes: number;
          difficulty_mix: string;
          subjects: { name: string } | null;
        } | null;

        setData({
          todayDPP: todayDPP ? {
            id: todayDPP.id,
            title: todayDPP.title,
            subject: todayDPP.subjects?.name || 'General',
            total_questions: todayDPP.total_questions,
            time_limit_minutes: todayDPP.time_limit_minutes,
            difficulty_mix: todayDPP.difficulty_mix,
          } : null,
          pastDPPs,
          streakData: {
            currentStreak: (studentProfile as { study_streak?: number } | null)?.study_streak || 0,
            longestStreak: (studentProfile as { longest_streak?: number } | null)?.longest_streak || 0,
            weeklyProgress,
          },
        });
      } catch (err) {
        console.error('Error fetching DPP data:', err);
        setError('Failed to load DPP data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchDPPData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <DPPSkeleton />;
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
          <span className="text-2xl font-bold text-slate-900">{data?.streakData.currentStreak || 0} Days</span>
        </div>
        <div className="flex justify-between">
          {data?.streakData.weeklyProgress.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${day.completed ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
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
            {data?.todayDPP ? (
              <>
                <h2 className="text-2xl font-bold mb-2">{data.todayDPP.title}</h2>
                <div className="flex items-center gap-4 text-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {data.todayDPP.total_questions} Questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {data.todayDPP.time_limit_minutes} Minutes
                  </span>
                  <span>Difficulty: {data.todayDPP.difficulty_mix}</span>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-2">No DPP Available</h2>
                <p className="text-white/80">Check back later for today's practice problems</p>
              </>
            )}
          </div>
          {data?.todayDPP && (
            <Link
              href={`/dashboard/dpp/${data.todayDPP.id}`}
              className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-white/90 transition-colors"
            >
              Start DPP
            </Link>
          )}
        </div>
      </div>

      {/* Past DPPs */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Past DPPs</h3>
        </div>
        {data?.pastDPPs && data.pastDPPs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.pastDPPs.map((dpp) => (
              <div key={dpp.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
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
        ) : (
          <div className="text-center py-8 text-slate-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No DPP attempts yet. Start with today's DPP!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DPPSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-96"></div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-slate-200 rounded w-32"></div>
          <div className="h-8 bg-slate-200 rounded w-20"></div>
        </div>
        <div className="flex justify-between">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
              <div className="h-4 bg-slate-200 rounded w-4"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-200 rounded-2xl h-40"></div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="h-16 bg-slate-200 border-b"></div>
        <div className="divide-y divide-slate-100">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 h-20 bg-slate-100"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
