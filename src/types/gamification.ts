/**
 * Gamification Types
 * 
 * Type definitions for the gamification system
 */

// Achievement types
export interface Achievement {
    id: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    badge_color: string | null;
    criteria_type: string;
    criteria_value: number;
    points: number;
    is_active: boolean;
    created_at: string;
}

export interface UserAchievement {
    id: string;
    user_id: string;
    achievement_id: string;
    earned_at: string;
    achievement?: Achievement;
}

// Streak types
export interface StudyStreak {
    id: string;
    user_id: string;
    streak_date: string;
    study_minutes: number;
    activities_count: number;
    created_at: string;
}

// Points types
export interface PointTransaction {
    id: string;
    user_id: string;
    activity_type: string;
    points: number;
    description: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

// Leaderboard types
export interface LeaderboardSnapshot {
    id: string;
    period: string;
    leaderboard_type: string;
    data: Record<string, unknown>;
    updated_at: string;
}

// Extended student profile with gamification fields
export interface ExtendedStudentProfile {
    id: string;
    study_streak: number;
    longest_streak: number;
    total_study_minutes: number;
    total_points: number;
    streak_freeze_used_at: string | null;
    rank_prediction: number | null;
    percentile_prediction: number | null;
    subscription_status: 'free' | 'basic' | 'premium';
    subscription_expires_at: string | null;
    preferred_subjects: string[];
    weak_topics: string[];
    strong_topics: string[];
}

// Activity types for tracking
export type ActivityType =
    | 'lecture_completed'
    | 'correct_answer'
    | 'test_completed'
    | 'daily_challenge'
    | 'achievement_unlocked'
    | 'streak_milestone'
    | 'practice_session'
    | 'revision_completed'
    | 'dpp_completed'
    | 'referral';

// Leaderboard types
export type LeaderboardType = 'points' | 'streaks' | 'accuracy' | 'tests_completed' | 'study_time';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

// Achievement IDs
export type AchievementId =
    | 'first_steps'
    | 'scholar'
    | 'problem_solver'
    | 'test_taker'
    | 'week_warrior'
    | 'monthly_master'
    | 'challenger'
    | 'lecture_lover'
    | 'perfectionist'
    | 'speed_demon'
    | 'consistent_learner'
    | 'topic_master';
