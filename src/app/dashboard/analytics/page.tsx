'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Target, Clock, Award, BarChart3, BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface AnalyticsData {
  rankPrediction: {
    rank: number | null;
    percentile: number | null;
    readiness: number;
  };
  subjectStats: Array<{
    subject: string;
    accuracy: number;
    questions: number;
    time: number;
    color: string;
  }>;
  weakTopics: Array<{
    topic: string;
    subject: string;
    accuracy: number;
  }>;
  overallStats: {
    questionsSolved: number;
    averageAccuracy: number;
    studyTime: number;
    testsCompleted: number;
  };
}

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalyticsData() {
      if (!user) return;

      try {
        const supabase = getSupabaseBrowserClient();

        // Fetch student profile for rank prediction
        const { data: studentProfile } = await supabase
          .from('student_profiles')
          .select('rank_prediction, percentile_prediction')
          .eq('id', user.id)
          .single();

        // Fetch subject-wise progress
        const { data: subjectProgress } = await supabase
          .from('student_progress')
          .select(`
                        accuracy_percent,
                        total_questions_attempted,
                        total_study_minutes,
                        tests_taken,
                        subjects:subject_id (name, color)
                    `)
          .eq('user_id', user.id);

        // Fetch weak topics from topic_mastery
        const { data: weakTopicsData } = await supabase
          .from('topic_mastery')
          .select(`
                        accuracy_percent,
                        topics:topic_id (name, chapters:chapter_id (subjects:subject_id (name)))
                    `)
          .eq('user_id', user.id)
          .in('strength_status', ['weak', 'average'])
          .order('accuracy_percent', { ascending: true })
          .limit(5);

        // Process subject stats
        const subjectColors: Record<string, string> = {
          'Physics': 'bg-blue-500',
          'Chemistry': 'bg-emerald-500',
          'Mathematics': 'bg-amber-500',
          'Biology': 'bg-red-500',
        };

        const subjectStats = (subjectProgress || []).map((item: unknown) => {
          const s = item as {
            accuracy_percent: number;
            total_questions_attempted: number;
            total_study_minutes: number;
            subjects: { name: string; color: string | null } | null;
          };
          const hours = Math.floor((s.total_study_minutes || 0) / 60);
          return {
            subject: s.subjects?.name || 'General',
            accuracy: s.accuracy_percent || 0,
            questions: s.total_questions_attempted || 0,
            time: hours,
            color: s.subjects?.color || subjectColors[s.subjects?.name || ''] || 'bg-slate-500',
          };
        });

        // Process weak topics
        const weakTopics = (weakTopicsData || []).map((item: unknown) => {
          const t = item as {
            accuracy_percent: number;
            topics: {
              name: string;
              chapters: {
                subjects: { name: string } | null;
              } | null;
            } | null;
          };
          return {
            topic: t.topics?.name || 'Unknown Topic',
            subject: t.topics?.chapters?.subjects?.name || 'General',
            accuracy: t.accuracy_percent || 0,
          };
        }).filter(t => t.accuracy < 60);

        // Calculate overall stats
        const totalQuestions = subjectStats.reduce((acc, s) => acc + s.questions, 0);
        const avgAccuracy = subjectStats.length > 0
          ? subjectStats.reduce((acc, s) => acc + s.accuracy, 0) / subjectStats.length
          : 0;
        const totalStudyMinutes = (subjectProgress || []).reduce((acc: number, item: unknown) => {
          return acc + ((item as { total_study_minutes?: number }).total_study_minutes || 0);
        }, 0);
        const totalTests = (subjectProgress || []).reduce((acc: number, item: unknown) => {
          return acc + ((item as { tests_taken?: number }).tests_taken || 0);
        }, 0);

        const profile = studentProfile as { rank_prediction?: number | null; percentile_prediction?: number | null } | null;

        setData({
          rankPrediction: {
            rank: profile?.rank_prediction || null,
            percentile: profile?.percentile_prediction || null,
            readiness: Math.round(avgAccuracy),
          },
          subjectStats,
          weakTopics,
          overallStats: {
            questionsSolved: totalQuestions,
            averageAccuracy: Math.round(avgAccuracy * 10) / 10,
            studyTime: Math.floor(totalStudyMinutes / 60),
            testsCompleted: totalTests,
          },
        });
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchAnalyticsData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <AnalyticsSkeleton />;
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

  const rankDisplay = data?.rankPrediction.rank ? `AIR ${data.rankPrediction.rank.toLocaleString()}` : 'N/A';
  const percentileDisplay = data?.rankPrediction.percentile ? `${data.rankPrediction.percentile}%` : 'N/A';
  const readinessDisplay = `${data?.rankPrediction.readiness || 0}%`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Performance Analytics</h1>
        <p className="text-slate-500">Track your progress and identify areas for improvement</p>
      </div>

      {/* Rank Prediction Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Predicted JEE Main Rank</h2>
            <p className="text-slate-400">Based on your test performance and practice history</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-400">{rankDisplay}</div>
              <div className="text-sm text-slate-400">Predicted Rank</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400">{percentileDisplay}</div>
              <div className="text-sm text-slate-400">Percentile</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400">{readinessDisplay}</div>
              <div className="text-sm text-slate-400">Readiness</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Subject-wise Performance</h3>
          {data?.subjectStats && data.subjectStats.length > 0 ? (
            <div className="space-y-4">
              {data.subjectStats.map((stat) => (
                <div key={stat.subject} className="flex items-center gap-4">
                  <div className={`w-3 h-12 rounded-full ${stat.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-900">{stat.subject}</span>
                      <span className="font-semibold text-slate-900">{stat.accuracy.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stat.color}`}
                        style={{ width: `${stat.accuracy}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      <span>{stat.questions} questions</span>
                      <span>{stat.time}h spent</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No performance data yet. Start practicing to see your stats!</p>
            </div>
          )}
        </div>

        {/* Weak Topics */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Topics Needing Attention</h3>
          {data?.weakTopics && data.weakTopics.length > 0 ? (
            <div className="space-y-4">
              {data.weakTopics.map((topic) => (
                <div key={topic.topic} className="p-4 bg-red-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-slate-900">{topic.topic}</h4>
                      <p className="text-sm text-slate-500">{topic.subject}</p>
                    </div>
                    <span className="text-red-600 font-semibold">{topic.accuracy.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-red-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${topic.accuracy}%` }}
                    />
                  </div>
                  <button className="mt-3 text-sm text-red-600 font-medium hover:underline">
                    Practice this topic
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Target className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Great job! No weak topics identified. Keep it up!</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data?.overallStats.questionsSolved.toLocaleString() || 0}</div>
          <div className="text-sm text-slate-500">Questions Solved</div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3">
            <Target className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data?.overallStats.averageAccuracy.toFixed(1) || 0}%</div>
          <div className="text-sm text-slate-500">Average Accuracy</div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data?.overallStats.studyTime || 0}h</div>
          <div className="text-sm text-slate-500">Study Time</div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Award className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data?.overallStats.testsCompleted || 0}</div>
          <div className="text-sm text-slate-500">Tests Completed</div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-96"></div>
      </div>

      <div className="bg-slate-200 rounded-2xl h-32"></div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-3 h-12 bg-slate-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-2 bg-slate-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100">
            <div className="w-10 h-10 bg-slate-200 rounded-xl mb-3"></div>
            <div className="h-8 bg-slate-200 rounded w-20 mb-1"></div>
            <div className="h-4 bg-slate-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
