'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, BookOpen, CheckCircle, Clock, Target } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface PracticeSubject {
  id: string;
  name: string;
  colorClass: string;
  questionCount: number;
  accuracyPercent: number;
}

interface RecentPracticeAttempt {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  status: 'Correct' | 'Incorrect';
  attemptedAt: string;
}

interface PracticeDashboardData {
  subjects: PracticeSubject[];
  recentAttempts: RecentPracticeAttempt[];
  totalQuestionBank: number;
  totalAttempted: number;
  averageAccuracy: number;
}

const SUBJECT_COLOR_MAP: Record<string, string> = {
  Physics: 'bg-blue-50 text-blue-600',
  Chemistry: 'bg-emerald-50 text-emerald-600',
  Mathematics: 'bg-amber-50 text-amber-600',
  Biology: 'bg-rose-50 text-rose-600',
};

export default function PracticePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<PracticeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPracticeData() {
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

        const [subjectsResult, progressResult, questionMetaResult, recentAttemptsResult] = await Promise.all([
          supabase.from('subjects').select('id, name, color').eq('is_active', true).order('display_order', { ascending: true }),
          supabase.from('student_progress').select('subject_id, total_questions_attempted, accuracy_percent').eq('user_id', user.id),
          supabase
            .from('questions')
            .select(`
              id,
              topic:topic_id(
                chapter:chapter_id(
                  subject_id
                )
              )
            `)
            .eq('is_published', true),
          supabase
            .from('question_attempts')
            .select(`
              id,
              is_correct,
              occurred_at,
              question:question_id(
                difficulty_level,
                topic:topic_id(
                  name,
                  chapter:chapter_id(
                    subject:subject_id(name)
                  )
                )
              )
            `)
            .eq('user_id', user.id)
            .order('occurred_at', { ascending: false })
            .limit(8),
        ]);

        if (subjectsResult.error) throw subjectsResult.error;
        if (progressResult.error) throw progressResult.error;
        if (questionMetaResult.error) throw questionMetaResult.error;
        if (recentAttemptsResult.error) throw recentAttemptsResult.error;

        const questionCountBySubject = new Map<string, number>();
        for (const row of (questionMetaResult.data ?? []) as Array<{
          topic: { chapter: { subject_id: string | null } | null } | null;
        }>) {
          const subjectId = row.topic?.chapter?.subject_id;
          if (!subjectId) {
            continue;
          }

          questionCountBySubject.set(subjectId, (questionCountBySubject.get(subjectId) ?? 0) + 1);
        }

        const progressRows = (progressResult.data ?? []) as Array<{
          subject_id: string | null;
          total_questions_attempted: number;
          accuracy_percent: number;
        }>;
        const progressBySubject = new Map(
          progressRows.map((row) => [row.subject_id ?? '', row])
        );

        const subjects = ((subjectsResult.data ?? []) as Array<{ id: string; name: string; color: string | null }>).map((subject) => ({
          id: subject.id,
          name: subject.name,
          colorClass: subject.color || SUBJECT_COLOR_MAP[subject.name] || 'bg-slate-50 text-slate-600',
          questionCount: questionCountBySubject.get(subject.id) ?? 0,
          accuracyPercent: progressBySubject.get(subject.id)?.accuracy_percent ?? 0,
        }));

        const recentAttempts: RecentPracticeAttempt[] = ((recentAttemptsResult.data ?? []) as Array<{
          id: string;
          is_correct: boolean;
          occurred_at: string;
          question: {
            difficulty_level: string | null;
            topic: {
              name: string;
              chapter: {
                subject: { name: string } | null;
              } | null;
            } | null;
          } | null;
        }>).map((attempt) => ({
          id: attempt.id,
          subject: attempt.question?.topic?.chapter?.subject?.name || 'General',
          topic: attempt.question?.topic?.name || 'Question',
          difficulty: attempt.question?.difficulty_level || 'Mixed',
          status: attempt.is_correct ? 'Correct' : 'Incorrect',
          attemptedAt: formatRelativeTime(attempt.occurred_at),
        }));

        const totalAttempted = progressRows.reduce((total, row) => total + (row.total_questions_attempted ?? 0), 0);
        const averageAccuracy = progressRows.length > 0
          ? progressRows.reduce((total, row) => total + (row.accuracy_percent ?? 0), 0) / progressRows.length
          : 0;

        setData({
          subjects,
          recentAttempts,
          totalQuestionBank: Array.from(questionCountBySubject.values()).reduce((total, count) => total + count, 0),
          totalAttempted,
          averageAccuracy,
        });
      } catch (fetchError) {
        console.error('Failed to load practice dashboard:', fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load practice dashboard');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      void fetchPracticeData();
    }
  }, [user, authLoading]);

  const summaryCards = useMemo(() => {
    return [
      {
        label: 'Question Bank',
        value: data?.totalQuestionBank.toLocaleString() || '0',
        icon: BookOpen,
      },
      {
        label: 'Attempted',
        value: data?.totalAttempted.toLocaleString() || '0',
        icon: Target,
      },
      {
        label: 'Accuracy',
        value: `${(data?.averageAccuracy || 0).toFixed(1)}%`,
        icon: CheckCircle,
      },
    ];
  }, [data]);

  if (authLoading || loading) {
    return <PracticeSkeleton />;
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
        <h1 className="text-2xl font-bold text-slate-900">Practice Questions</h1>
        <p className="text-slate-500">Build accuracy with subject-wise sessions and detailed review</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary-50 p-2 text-primary-600">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-lg font-semibold text-slate-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data?.subjects.map((subject) => (
          <Link
            key={subject.id}
            href={`/dashboard/practice/session?subjectId=${subject.id}&subjectName=${encodeURIComponent(subject.name)}`}
            className="rounded-2xl border border-slate-100 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${subject.colorClass}`}>
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-slate-900">{subject.name}</h3>
            <p className="text-sm text-slate-500">{subject.questionCount.toLocaleString()} questions</p>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-500">Accuracy</span>
                <span className="font-medium text-slate-700">{subject.accuracyPercent.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary-600"
                  style={{ width: `${Math.max(0, Math.min(subject.accuracyPercent, 100))}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold">Quick Practice Session</h3>
            <p className="mt-2 text-white/80">10 mixed questions with instant review and accuracy tracking.</p>
          </div>
          <Link
            href="/dashboard/practice/session"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-primary-600 hover:bg-white/90"
          >
            Start Now
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <div className="border-b border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900">Recent Activity</h3>
        </div>
        {data?.recentAttempts && data.recentAttempts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.recentAttempts.map((attempt) => (
              <div key={attempt.id} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${SUBJECT_COLOR_MAP[attempt.subject] || 'bg-slate-100 text-slate-600'}`}>
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{attempt.topic}</p>
                    <p className="text-sm text-slate-500">{attempt.subject} - {attempt.difficulty}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 text-sm font-medium ${attempt.status === 'Correct' ? 'text-green-600' : 'text-red-600'}`}>
                    {attempt.status === 'Correct' && <CheckCircle className="h-4 w-4" />}
                    {attempt.status}
                  </span>
                  <p className="mt-1 text-xs text-slate-400">{attempt.attemptedAt}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-500">
            <Clock className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p>No practice attempts yet. Start a quick session to populate your history.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PracticeSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="mb-2 h-8 w-64 rounded bg-slate-200"></div>
        <div className="h-4 w-80 rounded bg-slate-200"></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-200"></div>
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-slate-200"></div>
                <div className="h-5 w-20 rounded bg-slate-200"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-100 bg-white p-6">
            <div className="mb-4 h-12 w-12 rounded-xl bg-slate-200"></div>
            <div className="mb-2 h-5 w-24 rounded bg-slate-200"></div>
            <div className="h-4 w-32 rounded bg-slate-200"></div>
          </div>
        ))}
      </div>

      <div className="h-28 rounded-2xl bg-slate-200"></div>
      <div className="h-64 rounded-2xl bg-slate-200"></div>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const timestamp = new Date(dateString).getTime();
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (deltaSeconds < 60) {
    return 'Just now';
  }
  if (deltaSeconds < 3600) {
    return `${Math.floor(deltaSeconds / 60)} min ago`;
  }
  if (deltaSeconds < 86400) {
    return `${Math.floor(deltaSeconds / 3600)} hr ago`;
  }
  return `${Math.floor(deltaSeconds / 86400)} day ago`;
}
