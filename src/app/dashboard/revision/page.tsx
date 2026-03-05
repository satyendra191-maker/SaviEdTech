'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, BookOpen, CheckCircle, Clock, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface RevisionData {
  revisionTasks: Array<{
    id: string;
    topic: string;
    subject: string;
    reason: string;
    priority: 'High' | 'Medium' | 'Low';
    type: 'lecture_review' | 'practice_questions';
    estimatedTime: string;
  }>;
  mistakeLog: Array<{
    topic: string;
    subject: string;
    type: string;
    date: string;
  }>;
  todaySchedule: Array<{
    id: string;
    title: string;
    status: 'completed' | 'in_progress' | 'pending';
    details: string;
    scheduledTime?: string;
  }>;
}

export default function RevisionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<RevisionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRevisionData() {
      if (!user) return;

      try {
        const supabase = getSupabaseBrowserClient();

        // Fetch weak topics from topic_mastery
        const { data: weakTopicsData } = await supabase
          .from('topic_mastery')
          .select(`
                        accuracy_percent,
                        topics:topic_id (
                            id,
                            name,
                            chapters:chapter_id (
                                name,
                                subjects:subject_id (name)
                            )
                        )
                    `)
          .eq('user_id', user.id)
          .in('strength_status', ['weak', 'average'])
          .order('accuracy_percent', { ascending: true })
          .limit(5);

        // Process revision tasks
        const revisionTasks = (weakTopicsData || []).map((item: unknown, index: number) => {
          const topic = item as {
            accuracy_percent: number;
            topics: {
              id: string;
              name: string;
              chapters: {
                name: string;
                subjects: { name: string } | null;
              } | null;
            } | null;
          };

          return {
            id: topic.topics?.id || String(index),
            topic: topic.topics?.name || 'Unknown Topic',
            subject: topic.topics?.chapters?.subjects?.name || 'General',
            reason: `Accuracy: ${topic.accuracy_percent.toFixed(0)}% - needs improvement`,
            priority: topic.accuracy_percent < 40 ? 'High' : 'Medium' as 'High' | 'Medium',
            type: index % 2 === 0 ? 'lecture_review' as const : 'practice_questions' as const,
            estimatedTime: '30 min',
          };
        });

        // For now, use mock data for schedule and mistake log
        // In production, these would come from dedicated tables
        const todaySchedule = [
          {
            id: '1',
            title: 'Watch: Thermodynamics Lecture',
            status: 'completed' as const,
            details: 'Completed at 10:30 AM',
          },
          {
            id: '2',
            title: 'Practice: Organic Chemistry Questions',
            status: 'in_progress' as const,
            details: '15 questions • 30 minutes',
          },
          {
            id: '3',
            title: 'Review: Integration Formulas',
            status: 'pending' as const,
            details: 'Scheduled for 4:00 PM',
          },
        ];

        const mistakeLog = [
          { topic: 'Newton Laws', subject: 'Physics', type: 'Conceptual', date: 'Dec 2' },
          { topic: 'Chemical Bonding', subject: 'Chemistry', type: 'Calculation', date: 'Dec 1' },
          { topic: 'Derivatives', subject: 'Mathematics', type: 'Misread', date: 'Nov 30' },
        ];

        setData({
          revisionTasks,
          mistakeLog,
          todaySchedule,
        });
      } catch (err) {
        console.error('Error fetching revision data:', err);
        setError('Failed to load revision data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchRevisionData();
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <RevisionSkeleton />;
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
        <h1 className="text-2xl font-bold text-slate-900">Smart Revision</h1>
        <p className="text-slate-500">AI-powered revision recommendations based on your weak areas</p>
      </div>

      {/* Priority Tasks */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-slate-900">Priority Revision Tasks</h3>
        </div>
        {data?.revisionTasks && data.revisionTasks.length > 0 ? (
          <div className="space-y-4">
            {data.revisionTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${task.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{task.topic}</h4>
                    <p className="text-sm text-slate-500">{task.subject} • {task.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${task.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                      {task.priority}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">{task.estimatedTime}</p>
                  </div>
                  <button className="p-2 hover:bg-white rounded-lg">
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p>Great job! No weak topics identified. Keep it up!</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revision Schedule */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Today's Revision Schedule</h3>
          <div className="space-y-4">
            {data?.todaySchedule.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 rounded-xl ${item.status === 'completed' ? 'bg-green-50' :
                    item.status === 'in_progress' ? 'bg-blue-50 border-2 border-blue-200' :
                      'bg-slate-50'
                  }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.status === 'completed' ? 'bg-green-100 text-green-600' :
                    item.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-100 text-slate-400'
                  }`}>
                  {item.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                    item.status === 'in_progress' ? <Clock className="w-5 h-5" /> :
                      <BookOpen className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${item.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {item.title}
                  </h4>
                  <p className={`text-sm ${item.status === 'completed' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {item.details}
                  </p>
                </div>
                {item.status === 'in_progress' && (
                  <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    Start
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mistake Log */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Recent Mistakes</h3>
          </div>
          {data?.mistakeLog && data.mistakeLog.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {data.mistakeLog.map((mistake, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <h4 className="font-medium text-slate-900">{mistake.topic}</h4>
                    <p className="text-sm text-slate-500">{mistake.subject} • {mistake.type}</p>
                  </div>
                  <span className="text-sm text-slate-400">{mistake.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>No recent mistakes. Excellent work!</p>
            </div>
          )}
          <div className="p-4 border-t border-slate-100">
            <button className="w-full py-3 text-primary-600 font-medium hover:bg-primary-50 rounded-xl transition-colors">
              View All Mistakes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevisionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-96"></div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-100 rounded-xl h-20"></div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl"></div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="h-16 bg-slate-200 border-b"></div>
          <div className="divide-y divide-slate-100">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 h-16 bg-slate-100"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
