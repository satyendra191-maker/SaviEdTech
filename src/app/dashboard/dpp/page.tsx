'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, BookOpen, Calendar, CheckCircle, Clock, Trophy } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface TodayDpp {
  id: string;
  title: string;
  subject: string;
  totalQuestions: number;
  timeLimitMinutes: number;
  difficultyMix: string;
}

interface PastDppAttempt {
  id: string;
  dppSetId: string;
  title: string;
  date: string;
  score: string;
  accuracy: string;
  status: 'completed' | 'pending';
}

interface DppPageData {
  todayDpp: TodayDpp | null;
  streakDays: number;
  longestStreak: number;
  weeklyProgress: Array<{ day: string; completed: boolean }>;
  pastAttempts: PastDppAttempt[];
}

export default function DPPPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DppPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDppData() {
      if (!user) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          throw new Error('Supabase client is unavailable');
        }

        const today = new Date().toISOString().split('T')[0];
        const [todayResult, attemptsResult, studentProfileResult] = await Promise.all([
          supabase
            .from('dpp_sets')
            .select('id, title, total_questions, time_limit_minutes, difficulty_mix, subject:subject_id(name)')
            .eq('scheduled_date', today)
            .eq('is_published', true)
            .maybeSingle(),
          supabase
            .from('dpp_attempts')
            .select(`
              id,
              dpp_set_id,
              submitted_at,
              total_score,
              max_score,
              accuracy_percent,
              status,
              dpp_set:dpp_set_id(
                title,
                subject:subject_id(name)
              )
            `)
            .eq('user_id', user.id)
            .order('started_at', { ascending: false })
            .limit(12),
          supabase
            .from('student_profiles')
            .select('study_streak, longest_streak')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

        if (todayResult.error) throw todayResult.error;
        if (attemptsResult.error) throw attemptsResult.error;
        if (studentProfileResult.error) throw studentProfileResult.error;

        const studentProfile = studentProfileResult.data ?? { study_streak: 0, longest_streak: 0 };
        const streakDays = studentProfile.study_streak || 0;
        const weeklyProgress = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => ({
          day,
          completed: index < (streakDays % 7),
        }));

        const todayDppRow = todayResult.data as {
          id: string;
          title: string;
          total_questions: number;
          time_limit_minutes: number;
          difficulty_mix: string;
          subject: { name: string } | null;
        } | null;

        const pastAttempts: PastDppAttempt[] = ((attemptsResult.data ?? []) as Array<{
          id: string;
          dpp_set_id: string | null;
          submitted_at: string | null;
          total_score: number | null;
          max_score: number;
          accuracy_percent: number | null;
          status: string;
          dpp_set: { title: string; subject: { name: string } | null } | null;
        }>).map((attempt) => ({
          id: attempt.id,
          dppSetId: attempt.dpp_set_id || '',
          title: attempt.dpp_set?.title || 'DPP Set',
          date: attempt.submitted_at ? formatDate(attempt.submitted_at) : 'In progress',
          score: `${attempt.total_score || 0}/${attempt.max_score}`,
          accuracy: `${(attempt.accuracy_percent || 0).toFixed(0)}%`,
          status: attempt.status === 'completed' ? 'completed' : 'pending',
        }));

        setData({
          todayDpp: todayDppRow ? {
            id: todayDppRow.id,
            title: todayDppRow.title,
            subject: todayDppRow.subject?.name || 'General',
            totalQuestions: todayDppRow.total_questions,
            timeLimitMinutes: todayDppRow.time_limit_minutes,
            difficultyMix: todayDppRow.difficulty_mix,
          } : null,
          streakDays,
          longestStreak: studentProfile.longest_streak || 0,
          weeklyProgress,
          pastAttempts,
        });
      } catch (fetchError) {
        console.error('Failed to load DPP page:', fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load DPP page');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      void fetchDppData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <DppSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <AlertCircle className="h-16 w-16 text-red-500" />
        <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
        <p className="text-slate-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-primary-600 px-6 py-3 text-white hover:bg-primary-700"
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
        <p className="text-slate-500">Daily 15-question sets with review and accuracy tracking</p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-slate-900">Your Streak</h3>
          </div>
          <span className="text-2xl font-bold text-slate-900">{data?.streakDays || 0} Days</span>
        </div>
        <div className="flex justify-between gap-2">
          {data?.weeklyProgress.map((day) => (
            <div key={day.day} className="flex flex-col items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${day.completed ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {day.completed ? <CheckCircle className="h-5 w-5" /> : <span className="text-sm">{day.day}</span>}
              </div>
              <span className="text-xs text-slate-500">{day.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 p-8 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-white/80">
              <Calendar className="h-5 w-5" />
              <span>Today's DPP</span>
            </div>
            {data?.todayDpp ? (
              <>
                <h2 className="text-2xl font-bold">{data.todayDpp.title}</h2>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/80">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {data.todayDpp.totalQuestions} Questions
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {data.todayDpp.timeLimitMinutes} Minutes
                  </span>
                  <span>Difficulty: {formatDifficultyMix(data.todayDpp.difficultyMix)}</span>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold">No DPP available</h2>
                <p className="mt-2 text-white/80">Check back later for today's generated set.</p>
              </>
            )}
          </div>
          {data?.todayDpp && (
            <Link
              href={`/dashboard/dpp/${data.todayDpp.id}`}
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-primary-600 hover:bg-white/90"
            >
              Start DPP
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <div className="border-b border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900">Recent DPP Attempts</h3>
        </div>
        {data?.pastAttempts && data.pastAttempts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.pastAttempts.map((attempt) => (
              <Link
                key={attempt.id}
                href={attempt.dppSetId ? `/dashboard/dpp/${attempt.dppSetId}?attempt=${attempt.id}&review=1` : '/dashboard/dpp'}
                className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${attempt.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    {attempt.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{attempt.title}</h4>
                    <p className="text-sm text-slate-500">{attempt.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{attempt.score}</div>
                  <div className="text-xs text-slate-500">{attempt.accuracy} accuracy</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-500">
            <BookOpen className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p>No DPP attempts yet. Start today's set to populate your review history.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DppSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="mb-2 h-8 w-64 rounded bg-slate-200"></div>
        <div className="h-4 w-80 rounded bg-slate-200"></div>
      </div>
      <div className="h-40 rounded-2xl bg-slate-200"></div>
      <div className="h-48 rounded-2xl bg-slate-200"></div>
      <div className="h-72 rounded-2xl bg-slate-200"></div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDifficultyMix(difficultyMix: string): string {
  if (difficultyMix === 'mixed') {
    return '5 Easy · 6 Medium · 4 Advanced';
  }

  return difficultyMix;
}
