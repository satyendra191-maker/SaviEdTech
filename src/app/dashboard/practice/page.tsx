'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Clock, CheckCircle, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface PracticeData {
  subjects: Array<{
    name: string;
    questions: number;
    color: string;
    progress: number;
  }>;
  recentQuestions: Array<{
    id: string;
    subject: string;
    topic: string;
    difficulty: string;
    status: 'Correct' | 'Incorrect';
    attempted_at: string;
  }>;
  totalQuestions: number;
}

export default function PracticePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<PracticeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPracticeData() {
      if (!user) return;

      try {
        const supabase = getSupabaseBrowserClient();

        // Fetch subjects with question counts and progress
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select(`
                        name,
                        color,
                        questions:questions(count)
                    `)
          .eq('is_active', true);

        // Fetch student progress by subject
        const { data: progressData } = await supabase
          .from('student_progress')
          .select(`
                        accuracy_percent,
                        total_questions_attempted,
                        subjects:subject_id (name)
                    `)
          .eq('user_id', user.id);

        // Fetch recent question attempts
        // Note: This assumes there's a question_attempts table
        // For now, we'll show mock data for recent questions

        // Process subjects
        const subjectColors: Record<string, string> = {
          'Physics': 'bg-blue-50 text-blue-600',
          'Chemistry': 'bg-emerald-50 text-emerald-600',
          'Mathematics': 'bg-amber-50 text-amber-600',
          'Biology': 'bg-red-50 text-red-600',
        };

        const subjects = (subjectsData || []).map((item: unknown) => {
          const subject = item as {
            name: string;
            color: string | null;
            questions: { count: number }[];
          };
          const progress = (progressData || []).find(
            (p: unknown) => (p as { subjects: { name: string } | null }).subjects?.name === subject.name
          );

          return {
            name: subject.name,
            questions: subject.questions?.[0]?.count || 0,
            color: subject.color || subjectColors[subject.name] || 'bg-slate-50 text-slate-600',
            progress: (progress as { accuracy_percent?: number })?.accuracy_percent || 0,
          };
        });

        // Calculate total questions
        const totalQuestions = subjects.reduce((acc, s) => acc + s.questions, 0);

        // Mock recent questions (in production, fetch from question_attempts table)
        const recentQuestions = [
          { id: '1', subject: 'Physics', topic: 'Mechanics', difficulty: 'Medium', status: 'Correct' as const, attempted_at: '2 hours ago' },
          { id: '2', subject: 'Chemistry', topic: 'Organic Chemistry', difficulty: 'Hard', status: 'Incorrect' as const, attempted_at: '5 hours ago' },
          { id: '3', subject: 'Mathematics', topic: 'Calculus', difficulty: 'Easy', status: 'Correct' as const, attempted_at: 'Yesterday' },
        ];

        setData({
          subjects,
          recentQuestions,
          totalQuestions,
        });
      } catch (err) {
        console.error('Error fetching practice data:', err);
        setError('Failed to load practice data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchPracticeData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <PracticeSkeleton />;
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
        <h1 className="text-2xl font-bold text-slate-900">Practice Questions</h1>
        <p className="text-slate-500">Master concepts with {data?.totalQuestions.toLocaleString() || '10,000+'} questions</p>
      </div>

      {/* Subject Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data?.subjects.map((subject) => (
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
                <span className="font-medium text-slate-700">{subject.progress.toFixed(0)}%</span>
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
        {data?.recentQuestions && data.recentQuestions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {data.recentQuestions.map((q) => (
              <div key={q.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${q.subject === 'Physics' ? 'bg-blue-100 text-blue-600' :
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
                <div className="text-right">
                  <span className={`flex items-center gap-1 text-sm font-medium ${q.status === 'Correct' ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {q.status === 'Correct' ? <CheckCircle className="w-4 h-4" /> : null}
                    {q.status}
                  </span>
                  <p className="text-xs text-slate-400">{q.attempted_at}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No practice activity yet. Start practicing today!</p>
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
        <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-96"></div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100">
            <div className="w-12 h-12 bg-slate-200 rounded-xl mb-4"></div>
            <div className="h-5 bg-slate-200 rounded w-24 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-32"></div>
            <div className="mt-4 h-2 bg-slate-200 rounded-full"></div>
          </div>
        ))}
      </div>

      <div className="bg-slate-200 rounded-2xl h-28"></div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="h-16 bg-slate-200 border-b"></div>
        <div className="divide-y divide-slate-100">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 h-20 bg-slate-100"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
