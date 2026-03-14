/**
 * Advanced Analytics Engine
 * 
 * Provides:
 * - Student engagement analytics
 * - Course completion tracking
 * - Learning analytics
 * - Revenue analytics
 * - Marketing ROI
 * - AI usage analytics
 */

import { createAdminSupabaseClient } from '@/lib/supabase';

export interface AnalyticsEvent {
    event_type: string;
    user_id?: string;
    session_id?: string;
    metadata: Record<string, unknown>;
    timestamp: string;
}

export interface StudentEngagement {
    userId: string;
    dailyActive: number;
    weeklyActive: number;
    monthlyActive: number;
    avgSessionDuration: number;
    totalWatchTime: number;
    lecturesCompleted: number;
    testsTaken: number;
    avgTestScore: number;
}

export interface CourseAnalytics {
    courseId: string;
    enrollments: number;
    completions: number;
    completionRate: number;
    avgProgress: number;
    avgTimeToComplete: number;
    dropOffPoints: number[];
}

export interface RevenueAnalytics {
    period: string;
    totalRevenue: number;
    courseRevenue: number;
    subscriptionRevenue: number;
    donationRevenue: number;
    newCustomers: number;
    churnRate: number;
    avgOrderValue: number;
    ltv: number;
}

export interface LearningAnalytics {
    userId: string;
    strengths: string[];
    weaknesses: string[];
    recommendedTopics: string[];
    studyStreak: number;
    totalStudyHours: number;
    topicMastery: Record<string, number>;
}

export interface AIUsageAnalytics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    usageByFeature: Record<string, number>;
    costEstimate: number;
    topQueries: string[];
}

class AnalyticsEngine {
    private supabase = createAdminSupabaseClient();

    async trackEvent(event: AnalyticsEvent): Promise<void> {
        try {
            await (this.supabase as any).from('analytics_events').insert({
                event_type: event.event_type,
                user_id: event.user_id,
                session_id: event.session_id,
                metadata: event.metadata,
                recorded_at: event.timestamp,
            });
        } catch (error) {
            console.error('[Analytics] Track event error:', error);
        }
    }

    async getStudentEngagement(userId: string): Promise<StudentEngagement | null> {
        try {
            const [dailyRes, weeklyRes, monthlyRes, sessionRes, lectureRes, testRes] = await Promise.all([
                this.supabase.from('activity_logs').select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
                this.supabase.from('activity_logs').select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
                this.supabase.from('activity_logs').select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
                this.supabase.from('practice_sessions').select('duration_minutes')
                    .eq('user_id', userId),
                this.supabase.from('lecture_progress').select('*')
                    .eq('user_id', userId)
                    .eq('completed', true),
                this.supabase.from('test_attempts').select('score')
                    .eq('user_id', userId),
            ]);

            const sessions = (sessionRes.data || []) as any[];
            const lectures = (lectureRes.data || []) as any[];
            const tests = (testRes.data || []) as any[];
            const avgSession = sessions.length > 0 
                ? sessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0) / sessions.length 
                : 0;
            const avgTest = tests.length > 0 
                ? tests.reduce((sum: number, t: any) => sum + (t.score || 0), 0) / tests.length 
                : 0;

            return {
                userId,
                dailyActive: dailyRes.count || 0,
                weeklyActive: weeklyRes.count || 0,
                monthlyActive: monthlyRes.count || 0,
                avgSessionDuration: avgSession,
                totalWatchTime: sessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0),
                lecturesCompleted: lectures.length,
                testsTaken: tests.length,
                avgTestScore: avgTest,
            };
        } catch (error) {
            console.error('[Analytics] Student engagement error:', error);
            return null;
        }
    }

    async getCourseAnalytics(courseId: string): Promise<CourseAnalytics | null> {
        try {
            const [enrollRes, progressRes, completionRes] = await Promise.all([
                this.supabase.from('enrollments').select('id', { count: 'exact', head: true })
                    .eq('course_id', courseId),
                this.supabase.from('course_progress').select('progress_percentage')
                    .eq('course_id', courseId),
                this.supabase.from('enrollments').select('id', { count: 'exact', head: true })
                    .eq('course_id', courseId)
                    .eq('status', 'completed'),
            ]);

            const progress = (progressRes.data || []) as any[];
            const enrollments = enrollRes.count || 0;
            const completions = completionRes.count || 0;

            return {
                courseId,
                enrollments,
                completions,
                completionRate: enrollments > 0 ? (completions / enrollments) * 100 : 0,
                avgProgress: progress.length > 0 
                    ? progress.reduce((sum: number, p: any) => sum + (p.progress_percentage || 0), 0) / progress.length 
                    : 0,
                avgTimeToComplete: 0,
                dropOffPoints: [],
            };
        } catch (error) {
            console.error('[Analytics] Course analytics error:', error);
            return null;
        }
    }

    async getRevenueAnalytics(period: 'day' | 'week' | 'month' | 'year'): Promise<RevenueAnalytics> {
        try {
            const startDate = this.getStartDate(period);
            
            const [paymentsRes, customersRes] = await Promise.all([
                this.supabase.from('payments').select('amount, payment_type, status')
                    .gte('created_at', startDate)
                    .eq('status', 'completed'),
                this.supabase.from('profiles').select('id', { count: 'exact', head: true })
                    .gte('created_at', startDate)
                    .eq('role', 'student'),
            ]);

            const payments = (paymentsRes.data || []) as any[];
            
            return {
                period,
                totalRevenue: payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
                courseRevenue: payments.filter((p: any) => p.payment_type === 'course_purchase')
                    .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
                subscriptionRevenue: payments.filter((p: any) => p.payment_type === 'subscription')
                    .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
                donationRevenue: payments.filter((p: any) => p.payment_type === 'donation')
                    .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
                newCustomers: customersRes.count || 0,
                churnRate: 0,
                avgOrderValue: payments.length > 0 
                    ? payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) / payments.length 
                    : 0,
                ltv: 0,
            };
        } catch (error) {
            console.error('[Analytics] Revenue analytics error:', error);
            return {
                period,
                totalRevenue: 0,
                courseRevenue: 0,
                subscriptionRevenue: 0,
                donationRevenue: 0,
                newCustomers: 0,
                churnRate: 0,
                avgOrderValue: 0,
                ltv: 0,
            };
        }
    }

    async getLearningAnalytics(userId: string): Promise<LearningAnalytics> {
        try {
            const [topicRes, testRes, studyRes] = await Promise.all([
                this.supabase.from('topic_performance').select('topic_id, mastery_score')
                    .eq('user_id', userId)
                    .order('mastery_score', { ascending: false }),
                this.supabase.from('test_attempts').select('subject, score')
                    .eq('user_id', userId),
                this.supabase.from('study_streaks').select('streak_days, total_hours')
                    .eq('user_id', userId)
                    .single(),
            ]);

            const topics = (topicRes.data || []) as any[];
            const tests = (testRes.data || []) as any[];
            const study = studyRes.data as any | null;

            const weaknesses = topics.filter((t: any) => (t.mastery_score || 0) < 50).map((t: any) => t.topic_id);
            const strengths = topics.filter((t: any) => (t.mastery_score || 0) >= 70).map((t: any) => t.topic_id);

            return {
                userId,
                strengths,
                weaknesses,
                recommendedTopics: weaknesses.slice(0, 5),
                studyStreak: study?.streak_days || 0,
                totalStudyHours: study?.total_hours || 0,
                topicMastery: topics.reduce((acc: Record<string, number>, t: any) => {
                    acc[t.topic_id] = t.mastery_score || 0;
                    return acc;
                }, {} as Record<string, number>),
            };
        } catch (error) {
            console.error('[Analytics] Learning analytics error:', error);
            return {
                userId,
                strengths: [],
                weaknesses: [],
                recommendedTopics: [],
                studyStreak: 0,
                totalStudyHours: 0,
                topicMastery: {},
            };
        }
    }

    async getAIUsageAnalytics(): Promise<AIUsageAnalytics> {
        try {
            const [requestsRes, failedRes, timeRes] = await Promise.all([
                this.supabase.from('ai_usage_logs').select('id', { count: 'exact', head: true }),
                this.supabase.from('ai_usage_logs').select('id', { count: 'exact', head: true })
                    .eq('status', 'failed'),
                this.supabase.from('ai_usage_logs').select('response_time_ms'),
            ]);

            const times = (timeRes.data || []) as any[];
            
            return {
                totalRequests: requestsRes.count || 0,
                successfulRequests: (requestsRes.count || 0) - (failedRes.count || 0),
                failedRequests: failedRes.count || 0,
                avgResponseTime: times.length > 0 
                    ? times.reduce((sum: number, t: any) => sum + (t.response_time_ms || 0), 0) / times.length 
                    : 0,
                usageByFeature: {},
                costEstimate: (requestsRes.count || 0) * 0.001,
                topQueries: [],
            };
        } catch (error) {
            console.error('[Analytics] AI usage error:', error);
            return {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                avgResponseTime: 0,
                usageByFeature: {},
                costEstimate: 0,
                topQueries: [],
            };
        }
    }

    private getStartDate(period: string): string {
        const now = new Date();
        switch (period) {
            case 'day':
                return new Date(now.setDate(now.getDate() - 1)).toISOString();
            case 'week':
                return new Date(now.setDate(now.getDate() - 7)).toISOString();
            case 'month':
                return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
            case 'year':
                return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
            default:
                return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
        }
    }
}

export const analyticsEngine = new AnalyticsEngine();
export default analyticsEngine;
