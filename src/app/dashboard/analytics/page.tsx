'use client';

import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Award, 
  BarChart3, 
  BookOpen, 
  AlertCircle,
  Activity,
  Zap,
  Brain,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { RankPredictionWidget } from '@/components/analytics/RankPredictionWidget';

interface AnalyticsData {
  rankPrediction: {
    rank: number | null;
    percentile: number | null;
    readiness: number;
    examType: string;
  };
  subjectStats: Array<{
    subject: string;
    accuracy: number;
    questions: number;
    time: number;
    color: string;
    rank: number;
  }>;
  topicStats: Array<{
    topic: string;
    subject: string;
    accuracy: number;
    strength: 'strong' | 'average' | 'weak';
  }>;
  testHistory: Array<{
    testId: string;
    testTitle: string;
    date: string;
    score: number;
    percentile: number;
    timeTaken: number;
  }>;
  dailyActivity: Array<{
    date: string;
    questions: number;
    time: number;
    tests: number;
  }>;
  overallStats: {
    questionsSolved: number;
    averageAccuracy: number;
    studyTime: number;
    testsCompleted: number;
    rank: number;
    percentile: number;
  };
  insights: {
    strongestSubject: string;
    weakestSubject: string;
    improvementTrend: 'improving' | 'declining' | 'stable';
    recommendedTopics: string[];
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    let isCancelled = false;

    async function fetchAnalyticsData() {
      if (!user) {
        setLoading(false);
        setData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          throw new Error('Analytics service is unavailable right now.');
        }

        const startDate = new Date();
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        startDate.setDate(startDate.getDate() - days);
        const startDateISO = startDate.toISOString();

        const [
          profileResult,
          studentProfileResult,
          subjectProgressResult,
          topicMasteryResult,
          testAttemptsResult,
          onlineExamResultsResult,
          dppAttemptsResult,
          questionAttemptsResult,
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('exam_target')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('student_profiles')
            .select('rank_prediction, percentile_prediction')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('student_progress')
            .select(`
              accuracy_percent,
              total_questions_attempted,
              total_study_minutes,
              tests_taken,
              subjects:subject_id (name, color)
            `)
            .eq('user_id', user.id),
          supabase
            .from('topic_mastery')
            .select(`
              accuracy_percent,
              strength_status,
              topics:topic_id (name, chapters:chapter_id (subjects:subject_id (name)))
            `)
            .eq('user_id', user.id),
          supabase
            .from('test_attempts')
            .select(`
              id,
              total_score,
              max_score,
              percentile,
              time_taken_seconds,
              submitted_at,
              tests:test_id (title, question_count)
            `)
            .eq('user_id', user.id)
            .in('status', ['completed', 'time_up'])
            .gte('submitted_at', startDateISO)
            .order('submitted_at', { ascending: false })
            .limit(50),
          supabase
            .from('exam_results')
            .select(`
              attempt_id,
              score,
              max_score,
              accuracy,
              percentile,
              created_at,
              exam:exam_id (title)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('dpp_attempts')
            .select(`
              id,
              submitted_at,
              time_taken_seconds,
              accuracy_percent,
              dpp_set:dpp_set_id (total_questions)
            `)
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .gte('submitted_at', startDateISO)
            .order('submitted_at', { ascending: false })
            .limit(200),
          supabase
            .from('question_attempts')
            .select('id, occurred_at, time_taken_seconds')
            .eq('user_id', user.id)
            .gte('occurred_at', startDateISO)
            .order('occurred_at', { ascending: false })
            .limit(500),
        ]);

        const queryError = [
          profileResult.error,
          studentProfileResult.error,
          subjectProgressResult.error,
          topicMasteryResult.error,
          testAttemptsResult.error,
          onlineExamResultsResult.error,
          dppAttemptsResult.error,
          questionAttemptsResult.error,
        ].find(Boolean);

        if (queryError) {
          throw queryError;
        }

        const subjectProgress = subjectProgressResult.data ?? [];
        const topicMastery = topicMasteryResult.data ?? [];
        const testAttempts = testAttemptsResult.data ?? [];
        const onlineExamResults = onlineExamResultsResult.data ?? [];
        const dppAttempts = dppAttemptsResult.data ?? [];
        const questionAttempts = questionAttemptsResult.data ?? [];
        const profile = profileResult.data as { exam_target?: string | null } | null;
        const studentProfile = studentProfileResult.data as {
          rank_prediction?: number | null;
          percentile_prediction?: number | null;
        } | null;

        // Process subject stats
        const subjectColors: Record<string, string> = {
          'Physics': '#3b82f6',
          'Chemistry': '#10b981',
          'Mathematics': '#f59e0b',
          'Biology': '#ef4444',
        };

        const subjectStats = subjectProgress.map((item: unknown, index: number) => {
          const s = item as {
            accuracy_percent: number;
            total_questions_attempted: number;
            total_study_minutes: number;
            tests_taken: number;
            subjects: { name: string; color: string | null } | null;
          };
          const hours = Math.floor((s.total_study_minutes || 0) / 60);
          return {
            subject: s.subjects?.name || `Subject ${index + 1}`,
            accuracy: s.accuracy_percent || 0,
            questions: s.total_questions_attempted || 0,
            time: hours,
            color: s.subjects?.color || subjectColors[s.subjects?.name || ''] || COLORS[index % COLORS.length],
            rank: index + 1,
          };
        }).sort((a, b) => b.accuracy - a.accuracy);

        // Process topic stats
        const topicStats = topicMastery.map((item: unknown) => {
          const t = item as {
            accuracy_percent: number;
            strength_status: string;
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
            strength: (t.strength_status as 'strong' | 'average' | 'weak') || 'average',
          };
        });

        // Process test history
        const mockTestHistory = testAttempts.map((item: unknown) => {
          const t = item as {
            id: string;
            total_score: number | null;
            max_score: number;
            percentile: number | null;
            time_taken_seconds: number | null;
            submitted_at: string | null;
            tests: { title: string; question_count: number } | null;
          };
          const scorePercent = t.max_score > 0
            ? Math.round(((t.total_score || 0) / t.max_score) * 100)
            : 0;

          return {
            testId: t.id,
            testTitle: t.tests?.title || 'Unknown Test',
            date: t.submitted_at ? new Date(t.submitted_at).toLocaleDateString('en-IN') : 'Pending',
            score: scorePercent,
            percentile: Math.round(t.percentile ?? scorePercent),
            timeTaken: Math.round((t.time_taken_seconds || 0) / 60),
            sortAt: t.submitted_at || new Date(0).toISOString(),
          };
        });

        const onlineExamHistory = onlineExamResults.map((item: unknown) => {
          const exam = item as {
            attempt_id: string;
            score: number | null;
            max_score: number;
            accuracy: number | null;
            percentile: number | null;
            created_at: string;
            exam: { title: string } | null;
          };

          return {
            testId: exam.attempt_id,
            testTitle: exam.exam?.title || 'Online Exam',
            date: exam.created_at ? new Date(exam.created_at).toLocaleDateString('en-IN') : 'Pending',
            score: exam.max_score > 0
              ? Math.round(((exam.score || 0) / exam.max_score) * 100)
              : Math.round(exam.accuracy || 0),
            percentile: Math.round(exam.percentile ?? exam.accuracy ?? 0),
            timeTaken: 0,
            sortAt: exam.created_at || new Date(0).toISOString(),
          };
        });

        const testHistory = [...mockTestHistory, ...onlineExamHistory]
          .sort((left, right) => new Date(left.sortAt).getTime() - new Date(right.sortAt).getTime())
          .map(({ sortAt, ...entry }) => entry);

        // Process daily activity
        const dailyActivityMap = new Map<string, { questions: number; time: number; tests: number }>();
        
        // Initialize based on timeRange days
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          dailyActivityMap.set(dateStr, { questions: 0, time: 0, tests: 0 });
        }

        // Add DPP attempts to daily activity
        dppAttempts.forEach((attempt: unknown) => {
          const a = attempt as {
            submitted_at: string | null;
            time_taken_seconds: number | null;
            dpp_set: { total_questions: number } | null;
          };
          if (!a.submitted_at) {
            return;
          }

          const dateStr = new Date(a.submitted_at).toISOString().split('T')[0];
          if (dailyActivityMap.has(dateStr)) {
            const current = dailyActivityMap.get(dateStr)!;
            current.questions += a.dpp_set?.total_questions || 0;
            current.time += Math.round((a.time_taken_seconds || 0) / 60);
            current.tests += 1;
          }
        });

        questionAttempts.forEach((attempt: unknown) => {
          const a = attempt as { occurred_at: string; time_taken_seconds: number | null };
          const dateStr = new Date(a.occurred_at).toISOString().split('T')[0];
          if (dailyActivityMap.has(dateStr)) {
            const current = dailyActivityMap.get(dateStr)!;
            current.questions += 1;
            current.time += Math.round((a.time_taken_seconds || 0) / 60);
          }
        });

        // Add test attempts to daily activity
        testAttempts.forEach((attempt: unknown) => {
          const a = attempt as {
            submitted_at: string | null;
            time_taken_seconds: number | null;
            tests: { question_count: number } | null;
          };
          if (!a.submitted_at) {
            return;
          }

          const dateStr = new Date(a.submitted_at).toISOString().split('T')[0];
          if (dailyActivityMap.has(dateStr)) {
            const current = dailyActivityMap.get(dateStr)!;
            current.questions += a.tests?.question_count || 0;
            current.time += Math.round((a.time_taken_seconds || 0) / 60);
            current.tests += 1;
          }
        });

        onlineExamResults.forEach((attempt: unknown) => {
          const a = attempt as {
            created_at: string;
            max_score: number;
          };
          const dateStr = new Date(a.created_at).toISOString().split('T')[0];
          if (dailyActivityMap.has(dateStr)) {
            const current = dailyActivityMap.get(dateStr)!;
            current.questions += a.max_score > 0 ? 1 : 0;
            current.tests += 1;
          }
        });

        const dailyActivity = Array.from(dailyActivityMap.entries()).map(([date, stats]) => ({
          date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          questions: stats.questions,
          time: stats.time,
          tests: stats.tests,
        }));

        // Calculate overall stats
        const totalQuestions = subjectStats.reduce((acc, s) => acc + s.questions, 0);
        const avgAccuracy = subjectStats.length > 0
          ? subjectStats.reduce((acc, s) => acc + s.accuracy, 0) / subjectStats.length
          : 0;
        const totalStudyMinutes = subjectProgress.reduce((acc: number, item: unknown) => {
          return acc + ((item as { total_study_minutes?: number }).total_study_minutes || 0);
        }, 0);
        const totalTests = subjectProgress.reduce((acc: number, item: unknown) => {
          return acc + ((item as { tests_taken?: number }).tests_taken || 0);
        }, 0);
        const totalAssessments = Math.max(totalTests, testAttempts.length + onlineExamResults.length);

        // Calculate insights
        const strongest = subjectStats.length > 0
          ? subjectStats.find((item) => item.accuracy === Math.max(...subjectStats.map((subject) => subject.accuracy)))
          : null;
        const weakest = subjectStats.length > 0
          ? subjectStats.find((item) => item.accuracy === Math.min(...subjectStats.map((subject) => subject.accuracy)))
          : null;
        
        // Calculate improvement trend
        const recentTests = testHistory.slice(-5);
        let improvementTrend: 'improving' | 'declining' | 'stable' = 'stable';
        if (recentTests.length >= 3) {
          const firstHalf = recentTests.slice(0, Math.floor(recentTests.length / 2));
          const secondHalf = recentTests.slice(Math.floor(recentTests.length / 2));
          const firstAvg = firstHalf.reduce((a, b) => a + b.score, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((a, b) => a + b.score, 0) / secondHalf.length;
          if (secondAvg > firstAvg + 2) improvementTrend = 'improving';
          else if (secondAvg < firstAvg - 2) improvementTrend = 'declining';
        }

        // Recommended topics (weak ones to focus on)
        const recommendedTopics = topicStats
          .filter(t => t.strength === 'weak' || t.strength === 'average')
          .slice(0, 5)
          .map(t => t.topic);

        if (!isCancelled) {
          setData({
          rankPrediction: {
            rank: studentProfile?.rank_prediction || null,
            percentile: studentProfile?.percentile_prediction || null,
            readiness: Math.round(avgAccuracy),
            examType: profile?.exam_target || 'JEE',
          },
          subjectStats,
          topicStats,
          testHistory,
          dailyActivity,
          overallStats: {
            questionsSolved: totalQuestions,
            averageAccuracy: Math.round(avgAccuracy * 10) / 10,
            studyTime: Math.floor(totalStudyMinutes / 60),
            testsCompleted: totalAssessments,
            rank: studentProfile?.rank_prediction || 0,
            percentile: studentProfile?.percentile_prediction || 0,
          },
          insights: {
            strongestSubject: strongest?.subject || 'N/A',
            weakestSubject: weakest?.subject || 'N/A',
            improvementTrend,
            recommendedTopics,
          },
        });
        }
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        if (!isCancelled) {
          setError('Failed to load analytics data. Please try again.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (!authLoading) {
      void fetchAnalyticsData();
    }

    return () => {
      isCancelled = true;
    };
  }, [user, authLoading, timeRange]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Performance Analytics</h1>
          <p className="text-slate-500">Track your progress and identify areas for improvement</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Rank Prediction Section */}
      <RankPredictionWidget showDetails />

      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-emerald-800">Strongest Subject</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{data?.insights.strongestSubject || 'N/A'}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-800">Needs Focus</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{data?.insights.weakestSubject || 'N/A'}</p>
        </div>
        <div className={`border rounded-xl p-4 ${
          data?.insights.improvementTrend === 'improving' ? 'bg-blue-50 border-blue-100' :
          data?.insights.improvementTrend === 'declining' ? 'bg-orange-50 border-orange-100' :
          'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-5 h-5 ${
              data?.insights.improvementTrend === 'improving' ? 'text-blue-600' :
              data?.insights.improvementTrend === 'declining' ? 'text-orange-600' :
              'text-slate-600'
            }`} />
            <span className="font-semibold text-slate-800">Trend</span>
          </div>
          <p className={`text-2xl font-bold ${
            data?.insights.improvementTrend === 'improving' ? 'text-blue-700' :
            data?.insights.improvementTrend === 'declining' ? 'text-orange-700' :
            'text-slate-700'
          }`}>
            {data?.insights.improvementTrend === 'improving' ? 'Improving' :
             data?.insights.improvementTrend === 'declining' ? 'Declining' :
             'Stable'}
          </p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subject Accuracy Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Subject-wise Accuracy</h3>
          {data?.subjectStats && data.subjectStats.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.subjectStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="subject" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Accuracy']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                    {data.subjectStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No performance data yet. Start practicing to see your stats!</p>
            </div>
          )}
        </div>

        {/* Test Score Trend */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Test Score Trend</h3>
          {data?.testHistory && data.testHistory.length > 1 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.testHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Score']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Take more tests to see your score trend!</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Daily Practice Activity */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-6">Daily Practice Activity</h3>
          {data?.dailyActivity && data.dailyActivity.some(d => d.questions > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="questions" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.2}
                    name="Questions"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tests" 
                    stroke="#8b5cf6" 
                    fill="#8b5cf6" 
                    fillOpacity={0.2}
                    name="Tests"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Start your daily practice to see activity!</p>
            </div>
          )}
        </div>

        {/* Study Time Analytics */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Study Time Analytics</h3>
          {data?.dailyActivity && data.dailyActivity.some(d => d.time > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${v}m`} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value} minutes`, 'Study Time']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="time"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.2}
                    name="Study Time"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Study sessions will appear here once you spend time practicing.</p>
            </div>
          )}
        </div>
      </div>

      {/* Topic Mastery Heatmap */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-slate-900">Topic Mastery Heatmap</h3>
        </div>
        {data?.topicStats && data.topicStats.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {data.topicStats.slice(0, 16).map((topic) => {
              const heatmapClasses = topic.accuracy >= 80
                ? 'bg-emerald-50 border-emerald-200'
                : topic.accuracy >= 60
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200';
              const valueClasses = topic.accuracy >= 80
                ? 'text-emerald-700'
                : topic.accuracy >= 60
                  ? 'text-amber-700'
                  : 'text-red-700';

              return (
                <div key={`${topic.subject}-${topic.topic}`} className={`rounded-xl border p-4 ${heatmapClasses}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{topic.subject}</p>
                      <h4 className="mt-1 font-medium text-slate-900 leading-5">{topic.topic}</h4>
                    </div>
                    <span className={`text-lg font-bold ${valueClasses}`}>
                      {topic.accuracy.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${topic.accuracy >= 80 ? 'bg-emerald-500' : topic.accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.max(topic.accuracy, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Brain className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Topic mastery will appear after you attempt more practice sets and tests.</p>
          </div>
        )}
      </div>

      {/* Weak Topics */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-900 mb-6">Topics Needing Attention</h3>
        {data?.topicStats && data.topicStats.filter(t => t.strength === 'weak' || t.strength === 'average').length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.topicStats
              .filter(t => t.strength === 'weak' || t.strength === 'average')
              .slice(0, 6)
              .map((topic) => (
                <div 
                  key={topic.topic} 
                  className={`p-4 rounded-xl border ${
                    topic.strength === 'weak' 
                      ? 'bg-red-50 border-red-100' 
                      : 'bg-amber-50 border-amber-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-slate-900">{topic.topic}</h4>
                      <p className="text-sm text-slate-500">{topic.subject}</p>
                    </div>
                    <span className={`font-semibold ${
                      topic.strength === 'weak' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {topic.accuracy.toFixed(0)}%
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${
                    topic.strength === 'weak' ? 'bg-red-200' : 'bg-amber-200'
                  }`}>
                    <div
                      className={`h-full rounded-full ${
                        topic.strength === 'weak' ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${topic.accuracy}%` }}
                    />
                  </div>
                  <button className="mt-3 text-sm font-medium hover:underline text-primary-600">
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

      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-xl"></div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
          <div className="h-80 bg-slate-100 rounded-xl"></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
          <div className="h-80 bg-slate-100 rounded-xl"></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6">
          <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-slate-100 rounded-xl"></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-slate-100 rounded-xl"></div>
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
