'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    Calendar,
    Clock,
    Plus,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Trash2,
    X
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface StudyPlan {
    id: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    created_at: string;
}

interface StudyPlanItem {
    id: string;
    plan_id: string;
    title: string;
    description: string | null;
    subject: string | null;
    topic: string | null;
    scheduled_date: string;
    scheduled_time: string | null;
    duration_minutes: number | null;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    completed_at: string | null;
    lecture_id: string | null;
}

export default function PlannerPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [plans, setPlans] = useState<StudyPlan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
    const [items, setItems] = useState<StudyPlanItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPlanTitle, setNewPlanTitle] = useState('');
    const [newPlanDescription, setNewPlanDescription] = useState('');
    const [newPlanStartDate, setNewPlanStartDate] = useState('');
    const [newPlanEndDate, setNewPlanEndDate] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());

    const fetchPlans = useCallback(async () => {
        if (!user) return;

        try {
            const supabase = getSupabaseBrowserClient();

            const { data: plansData, error: plansError } = await supabase
                .from('study_plans')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (plansError) throw plansError;

            setPlans((plansData as unknown as StudyPlan[]) || []);

            if (plansData && plansData.length > 0 && !selectedPlan) {
                const typedData = plansData as unknown as StudyPlan[];
                setSelectedPlan(typedData[0]);
            }
        } catch (err) {
            console.error('Error fetching plans:', err);
            setError('Failed to load study plans');
        }
    }, [user, selectedPlan]);

    const fetchPlanItems = useCallback(async (planId: string) => {
        if (!user || !planId) return;

        try {
            const supabase = getSupabaseBrowserClient();

            const { data: itemsData, error: itemsError } = await supabase
                .from('study_plan_items')
                .select('*')
                .eq('plan_id', planId)
                .order('scheduled_date', { ascending: true });

            if (itemsError) throw itemsError;

            setItems((itemsData as unknown as StudyPlanItem[]) || []);
        } catch (err) {
            console.error('Error fetching plan items:', err);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchPlans();
        }
    }, [user, authLoading, fetchPlans]);

    useEffect(() => {
        if (selectedPlan) {
            fetchPlanItems(selectedPlan.id);
        }
    }, [selectedPlan, fetchPlanItems]);

    useEffect(() => {
        if (!authLoading) {
            setLoading(false);
        }
    }, [authLoading]);

    const createPlan = async () => {
        if (!user || !newPlanTitle || !newPlanStartDate) return;

        try {
            const supabase = getSupabaseBrowserClient();

            const { data, error } = await supabase
                .from('study_plans')
                .insert({
                    user_id: user.id,
                    title: newPlanTitle,
                    description: newPlanDescription || null,
                    start_date: newPlanStartDate,
                    end_date: newPlanEndDate || null,
                    is_active: plans.length === 0,
                } as unknown as any)
                .select()
                .single();

            if (error) throw error;

            setPlans([(data as unknown as StudyPlan), ...plans]);
            setSelectedPlan(data as unknown as StudyPlan);
            setShowCreateModal(false);
            setNewPlanTitle('');
            setNewPlanDescription('');
            setNewPlanStartDate('');
            setNewPlanEndDate('');
        } catch (err) {
            console.error('Error creating plan:', err);
            setError('Failed to create study plan');
        }
    };

    const addQuickItem = async () => {
        if (!selectedPlan) return;

        try {
            const supabase = getSupabaseBrowserClient();
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('study_plan_items')
                .insert({
                    plan_id: selectedPlan.id,
                    title: 'New Study Task',
                    scheduled_date: today,
                    duration_minutes: 30,
                    status: 'pending',
                } as unknown as any)
                .select()
                .single();

            if (error) throw error;

            setItems([...(items as StudyPlanItem[]), data as unknown as StudyPlanItem]);
        } catch (err) {
            console.error('Error adding item:', err);
        }
    };

    const deletePlan = async (planId: string) => {
        if (!confirm('Are you sure you want to delete this plan?')) return;

        try {
            const supabase = getSupabaseBrowserClient();

            await supabase
                .from('study_plan_items')
                .delete()
                .eq('plan_id', planId);

            const { error } = await supabase
                .from('study_plans')
                .delete()
                .eq('id', planId);

            if (error) throw error;

            setPlans(plans.filter(p => p.id !== planId));
            if (selectedPlan?.id === planId) {
                setSelectedPlan(plans.find(p => p.id !== planId) || null);
                setItems([]);
            }
        } catch (err) {
            console.error('Error deleting plan:', err);
        }
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        const startPadding = firstDay.getDay();
        for (let i = startPadding - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            days.push({ date: d, isCurrentMonth: false });
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        const endPadding = 42 - days.length;
        for (let i = 1; i <= endPadding; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }

        return days;
    };

    const getItemsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return items.filter(item => item.scheduled_date === dateStr);
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

    const completedCount = items.filter(i => i.status === 'completed').length;
    const totalCount = items.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    if (authLoading || loading) {
        return <PlannerSkeleton />;
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
                    <h1 className="text-2xl font-bold text-slate-900">Study Planner</h1>
                    <p className="text-slate-500">Plan and track your study schedule</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Create Plan
                </button>
            </div>

            {plans.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {plans.map(plan => (
                        <button
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan)}
                            className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-colors ${selectedPlan?.id === plan.id
                                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <span className="font-medium">{plan.title}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deletePlan(plan.id);
                                }}
                                className="ml-2 text-slate-400 hover:text-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </button>
                    ))}
                </div>
            )}

            {plans.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Study Plans Yet</h3>
                    <p className="text-slate-500 mb-4">Create your first study plan to get started</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                    >
                        Create Your First Plan
                    </button>
                </div>
            ) : selectedPlan ? (
                <>
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-slate-900">{selectedPlan.title}</h3>
                                <p className="text-sm text-slate-500">
                                    {selectedPlan.start_date} {selectedPlan.end_date && `to ${selectedPlan.end_date}`}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-slate-900">{progress}%</div>
                                <div className="text-sm text-slate-500">{completedCount}/{totalCount} tasks</div>
                            </div>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-slate-900">
                                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth(currentDate).map((day, i) => {
                                const dayItems = getItemsForDate(day.date);
                                const isToday = day.date.toDateString() === new Date().toDateString();

                                return (
                                    <div
                                        key={i}
                                        className={`min-h-[80px] p-2 border rounded-lg ${day.isCurrentMonth ? 'bg-white' : 'bg-slate-50'
                                            } ${isToday ? 'border-primary-500 ring-2 ring-primary-100' : 'border-slate-100'}`}
                                    >
                                        <div className={`text-sm font-medium ${isToday ? 'text-primary-600' : 'text-slate-700'}`}>
                                            {day.date.getDate()}
                                        </div>
                                        {dayItems.slice(0, 2).map(item => (
                                            <div
                                                key={item.id}
                                                className={`text-xs p-1 mt-1 rounded truncate ${item.status === 'completed'
                                                        ? 'bg-green-100 text-green-700'
                                                        : item.status === 'in_progress'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}
                                            >
                                                {item.title}
                                            </div>
                                        ))}
                                        {dayItems.length > 2 && (
                                            <div className="text-xs text-slate-500 mt-1">
                                                +{dayItems.length - 2} more
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900">Today's Tasks</h3>
                            <button onClick={addQuickItem} className="p-2 hover:bg-slate-100 rounded-lg">
                                <Plus className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        {items.filter(i => i.scheduled_date === new Date().toISOString().split('T')[0]).length > 0 ? (
                            <div className="space-y-3">
                                {items
                                    .filter(i => i.scheduled_date === new Date().toISOString().split('T')[0])
                                    .map(item => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl"
                                        >
                                            <div className="w-6 h-6 rounded-full border-2 border-slate-300"></div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-slate-900">{item.title}</h4>
                                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                                    {item.subject && <span>{item.subject}</span>}
                                                    {item.duration_minutes && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {item.duration_minutes} min
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p>No tasks scheduled for today</p>
                            </div>
                        )}
                    </div>
                </>
            ) : null}

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900">Create Study Plan</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Plan Title *</label>
                                <input
                                    type="text"
                                    value={newPlanTitle}
                                    onChange={(e) => setNewPlanTitle(e.target.value)}
                                    placeholder="e.g., JEE 2026 Preparation"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    value={newPlanDescription}
                                    onChange={(e) => setNewPlanDescription(e.target.value)}
                                    placeholder="Describe your study plan..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                                    <input
                                        type="date"
                                        value={newPlanStartDate}
                                        onChange={(e) => setNewPlanStartDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={newPlanEndDate}
                                        onChange={(e) => setNewPlanEndDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={createPlan}
                                disabled={!newPlanTitle || !newPlanStartDate}
                                className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Create Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PlannerSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div>
                <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-64"></div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="h-6 bg-slate-200 rounded w-32 mb-4"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
                <div className="grid grid-cols-7 gap-2">
                    {[...Array(35)].map((_, i) => (
                        <div key={i} className="h-20 bg-slate-100 rounded"></div>
                    ))}
                </div>
            </div>
        </div>
    );
}
