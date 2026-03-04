// User Types
export type UserRole = 'student' | 'admin' | 'content_manager';

export interface User {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: UserRole;
    exam_target: 'JEE' | 'NEET' | 'Both' | null;
    class_level: '11' | '12' | 'Dropper' | null;
    city: string | null;
    state: string | null;
    created_at: string;
    updated_at: string;
    last_active_at: string;
    is_active: boolean;
}

export interface StudentProfile extends User {
    study_streak: number;
    longest_streak: number;
    total_study_minutes: number;
    rank_prediction: number | null;
    percentile_prediction: number | null;
    subscription_status: 'free' | 'basic' | 'premium';
    subscription_expires_at: string | null;
    preferred_subjects: string[];
    weak_topics: string[];
    strong_topics: string[];
}

// Lead Types
export interface LeadForm {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    exam_target: 'JEE' | 'NEET' | 'Both' | 'Other';
    class_level: '10' | '11' | '12' | 'Dropper';
    city: string | null;
    source: string;
    status: 'new' | 'contacted' | 'converted' | 'disqualified';
    converted_to_user_id: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

// Academic Structure Types
export interface Exam {
    id: string;
    name: string;
    code: string;
    description: string | null;
    subjects: string[];
    total_marks: number | null;
    duration_minutes: number | null;
    is_active: boolean;
    created_at: string;
}

export interface Subject {
    id: string;
    exam_id: string;
    name: string;
    code: string;
    faculty_id: string | null;
    description: string | null;
    color: string | null;
    icon: string | null;
    display_order: number;
    is_active: boolean;
    created_at: string;
}

export interface Chapter {
    id: string;
    subject_id: string;
    name: string;
    code: string;
    description: string | null;
    display_order: number;
    estimated_hours: number | null;
    difficulty_level: 'easy' | 'medium' | 'hard' | null;
    is_active: boolean;
    created_at: string;
}

export interface Topic {
    id: string;
    chapter_id: string;
    name: string;
    code: string;
    description: string | null;
    display_order: number;
    estimated_minutes: number | null;
    weightage_percent: number | null;
    is_active: boolean;
    created_at: string;
}

// Faculty Types
export interface Faculty {
    id: string;
    name: string;
    code: string;
    subject: string;
    avatar_url: string | null;
    bio: string | null;
    teaching_style: string | null;
    qualifications: string[];
    experience_years: number | null;
    color_theme: string | null;
    is_active: boolean;
    created_at: string;
}

// Lecture Types
export interface Lecture {
    id: string;
    topic_id: string;
    faculty_id: string;
    title: string;
    description: string | null;
    video_url: string;
    video_duration: number | null;
    thumbnail_url: string | null;
    lecture_notes: string | null;
    attachments: Attachment[];
    tags: string[];
    difficulty_level: 'easy' | 'medium' | 'hard' | null;
    view_count: number;
    like_count: number;
    is_published: boolean;
    published_at: string | null;
    scheduled_at: string | null;
    created_at: string;
    updated_at: string;
    // Joined fields
    faculty?: Faculty;
    topic?: Topic;
    chapter?: Chapter;
    subject?: Subject;
}

export interface Attachment {
    name: string;
    url: string;
    type: string;
    size: number;
}

export interface LectureProgress {
    id: string;
    user_id: string;
    lecture_id: string;
    progress_percent: number;
    last_position: number;
    is_completed: boolean;
    completed_at: string | null;
    watch_count: number;
    first_started_at: string;
    last_watched_at: string;
}

// Question Types
export type QuestionType = 'MCQ' | 'NUMERICAL' | 'ASSERTION_REASON';

export interface Question {
    id: string;
    topic_id: string;
    question_type: QuestionType;
    question_text: string;
    question_image_url: string | null;
    solution_text: string;
    solution_video_url: string | null;
    solution_image_url: string | null;
    correct_answer: string;
    marks: number;
    negative_marks: number;
    difficulty_level: 'easy' | 'medium' | 'hard' | null;
    estimated_time_minutes: number;
    average_solve_time: number | null;
    success_rate: number | null;
    attempt_count: number;
    correct_count: number;
    tags: string[];
    hint: string | null;
    is_published: boolean;
    created_at: string;
    updated_at: string;
    // Joined fields
    options?: QuestionOption[];
    topic?: Topic;
}

export interface QuestionOption {
    id: string;
    question_id: string;
    option_text: string;
    option_image_url: string | null;
    option_label: string;
    display_order: number;
}

// DPP Types
export interface DPPSet {
    id: string;
    title: string;
    exam_id: string | null;
    subject_id: string | null;
    topic_ids: string[];
    difficulty_mix: 'easy' | 'medium' | 'hard' | 'mixed';
    total_questions: number;
    time_limit_minutes: number;
    scheduled_date: string | null;
    is_published: boolean;
    published_at: string | null;
    created_at: string;
    // Joined fields
    questions?: Question[];
}

export interface DPPAttempt {
    id: string;
    user_id: string;
    dpp_set_id: string;
    started_at: string;
    submitted_at: string | null;
    time_taken_seconds: number | null;
    total_score: number | null;
    max_score: number;
    accuracy_percent: number | null;
    status: 'in_progress' | 'completed' | 'abandoned';
    answers: Record<string, string>;
}

// Test Types
export interface Test {
    id: string;
    exam_id: string | null;
    title: string;
    description: string | null;
    test_type: 'full_mock' | 'subject_test' | 'chapter_test' | 'custom';
    duration_minutes: number;
    total_marks: number;
    negative_marking: number;
    passing_percent: number;
    question_count: number;
    is_published: boolean;
    scheduled_at: string | null;
    start_time: string | null;
    end_time: string | null;
    allow_multiple_attempts: boolean;
    show_result_immediately: boolean;
    created_at: string;
    // Joined fields
    questions?: TestQuestion[];
}

export interface TestQuestion {
    id: string;
    test_id: string;
    question_id: string;
    marks: number;
    negative_marks: number;
    display_order: number;
    section: string | null;
    question?: Question;
}

export interface TestAttempt {
    id: string;
    user_id: string;
    test_id: string;
    attempt_number: number;
    started_at: string;
    submitted_at: string | null;
    time_taken_seconds: number | null;
    total_score: number | null;
    max_score: number;
    accuracy_percent: number | null;
    correct_count: number | null;
    incorrect_count: number | null;
    unattempted_count: number | null;
    percentile: number | null;
    rank: number | null;
    status: 'in_progress' | 'completed' | 'abandoned' | 'time_up';
    answers: Record<string, string>;
    section_scores: Record<string, number>;
    created_at: string;
}

// Analytics Types
export interface StudentProgress {
    id: string;
    user_id: string;
    subject_id: string;
    total_questions_attempted: number;
    correct_answers: number;
    incorrect_answers: number;
    accuracy_percent: number;
    average_time_per_question: number | null;
    total_study_minutes: number;
    tests_taken: number;
    average_test_score: number | null;
    best_rank: number | null;
    last_activity_at: string;
    updated_at: string;
    // Joined fields
    subject?: Subject;
}

export interface TopicMastery {
    id: string;
    user_id: string;
    topic_id: string;
    mastery_level: number;
    questions_attempted: number;
    correct_answers: number;
    accuracy_percent: number;
    last_practiced_at: string | null;
    strength_status: 'weak' | 'average' | 'strong' | 'mastered' | null;
    updated_at: string;
    // Joined fields
    topic?: Topic;
}

// Rank Prediction Types
export interface RankPrediction {
    id: string;
    user_id: string;
    exam_id: string | null;
    prediction_date: string;
    predicted_rank: number | null;
    predicted_percentile: number | null;
    confidence_score: number | null;
    exam_readiness_percent: number | null;
    test_scores_avg: number | null;
    accuracy_avg: number | null;
    solve_time_avg: number | null;
    model_version: string | null;
    factors: Record<string, unknown>;
    created_at: string;
}

// Revision Types
export interface MistakeLog {
    id: string;
    user_id: string;
    question_id: string;
    attempt_id: string | null;
    mistake_type: 'conceptual' | 'calculation' | 'misread' | 'time_pressure' | 'guess';
    user_answer: string;
    correct_answer: string;
    topic_id: string | null;
    difficulty_level: string | null;
    occurred_at: string;
    is_reviewed: boolean;
    reviewed_at: string | null;
    notes: string | null;
    // Joined fields
    question?: Question;
    topic?: Topic;
}

export interface RevisionTask {
    id: string;
    user_id: string;
    topic_id: string;
    task_type: 'lecture_review' | 'practice_questions' | 'mock_test' | 'revision_set';
    priority: 'high' | 'medium' | 'low';
    scheduled_for: string | null;
    completed_at: string | null;
    status: 'pending' | 'completed' | 'skipped';
    related_mistake_ids: string[];
    recommended_questions: string[];
    created_at: string;
    // Joined fields
    topic?: Topic;
}

// Daily Challenge Types
export interface DailyChallenge {
    id: string;
    exam_id: string | null;
    question_id: string;
    challenge_date: string;
    title: string | null;
    description: string | null;
    difficulty_level: string | null;
    total_participants: number;
    correct_participants: number;
    published_at: string;
    closes_at: string | null;
    // Joined fields
    question?: Question;
}

export interface ChallengeAttempt {
    id: string;
    user_id: string;
    challenge_id: string;
    answer: string;
    is_correct: boolean | null;
    time_taken_seconds: number | null;
    attempted_at: string;
    rank_for_day: number | null;
}

export interface Leaderboard {
    id: string;
    leaderboard_type: 'daily' | 'weekly' | 'monthly' | 'all_time';
    exam_id: string | null;
    user_id: string;
    score: number;
    correct_answers: number;
    total_attempts: number;
    average_time: number | null;
    rank: number;
    period_start: string;
    period_end: string;
    updated_at: string;
    // Joined fields
    user?: User;
}

// Gamification Types
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
    // Joined fields
    achievement?: Achievement;
}

export interface StudyStreak {
    id: string;
    user_id: string;
    streak_date: string;
    study_minutes: number;
    activities_count: number;
}

// Notification Types
export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    notification_type: 'dpp_ready' | 'revision_reminder' | 'test_reminder' | 'achievement' | 'challenge' | 'system';
    data: Record<string, unknown>;
    is_read: boolean;
    read_at: string | null;
    action_url: string | null;
    sent_via: string[];
    created_at: string;
}

// Popup Ad Types
export interface PopupAd {
    id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    button_text: string | null;
    button_url: string | null;
    display_duration_seconds: number;
    start_date: string | null;
    end_date: string | null;
    priority: number;
    max_impressions: number | null;
    current_impressions: number;
    target_audience: Record<string, unknown>;
    is_active: boolean;
    created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
    data: T | null;
    error: string | null;
    success: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// Dashboard Types
export interface AdminDashboardStats {
    totalStudents: number;
    activeUsers: number;
    totalLeads: number;
    dailyChallengeParticipants: number;
    totalRevenue: number;
    conversionRate: number;
    averageSessionTime: number;
    systemHealth: 'healthy' | 'degraded' | 'critical';
}

export interface StudentDashboardStats {
    studyStreak: number;
    rankPrediction: number;
    percentilePrediction: number;
    todayStudyMinutes: number;
    totalStudyMinutes: number;
    testsTaken: number;
    averageAccuracy: number;
    pendingRevisions: number;
    todayDPPCompleted: boolean;
    todayChallengeCompleted: boolean;
}