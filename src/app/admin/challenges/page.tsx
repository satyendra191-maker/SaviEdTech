'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
    Plus,
    Trophy,
    Calendar,
    Clock,
    CheckCircle,
} from 'lucide-react';

interface DailyChallenge {
    id: string;
    title: string;
    description: string | null;
    question_ids: string[];
    difficulty_level: 'easy' | 'medium' | 'hard';
    total_marks: number;
    time_limit_minutes: number;
    scheduled_date: string;
    is_active: boolean;
    created_at: string;
}

export default function ChallengesPage() {
    const supabase = createBrowserSupabaseClient();
    const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchChallenges = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('daily_challenges')
                .select('*')
                .order('scheduled_date', { ascending: false });

            if (error) throw error;
            setChallenges((data as DailyChallenge[]) || []);
        } catch (error) {
            console.error('Error fetching challenges:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchChallenges();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getDifficultyColor = (level: string) => {
        switch (level) {
            case 'easy': return 'bg-green-100 text-green-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'hard': return 'bg-red-100 text-red-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Daily Challenges</h1>
                    <p className="text-slate-600 mt-1">Manage daily practice challenges for students</p>
                </div>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                    <Plus className="w-5 h-5" />
                    Create Challenge
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Trophy} label="Total Challenges" value={challenges.length} />
                <StatCard icon={Calendar} label="This Week" value={challenges.filter(c => {
                    const date = new Date(c.scheduled_date);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return date >= weekAgo;
                }).length} />
                <StatCard icon={CheckCircle} label="Active" value={challenges.filter(c => c.is_active).length} />
                <StatCard icon={Clock} label="Avg Time" value="15m" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Challenge</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Difficulty</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Questions</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                            ) : challenges.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No challenges found</td></tr>
                            ) : (
                                challenges.map((challenge) => (
                                    <tr key={challenge.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{challenge.title}</div>
                                            {challenge.description && (
                                                <div className="text-sm text-slate-500 truncate max-w-xs">{challenge.description}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600">
                                                {new Date(challenge.scheduled_date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(challenge.difficulty_level)}`}>
                                                {challenge.difficulty_level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600">
                                                {challenge.question_ids?.length || 0} questions
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${challenge.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-slate-100 text-slate-800'
                                                }`}>
                                                {challenge.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-xl font-bold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    );
}
