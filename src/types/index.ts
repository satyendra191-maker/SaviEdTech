// User Types
export type UserRole = 'student' | 'admin' | 'super_admin' | 'content_manager' | 'parent' | 'hr' | 'faculty';

// Exam target types
export type ExamTarget = 'JEE' | 'NEET' | 'Both' | 'JEE Mains' | 'JEE Advanced' | 'CBSE Board' | 'Foundation';

// Class level types
export type ClassLevel = '9' | '10' | '11' | '12' | 'Dropper' | 'Class 9' | 'Class 10' | 'Class 11' | 'Class 12';

export interface User {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: UserRole;
    exam_target: ExamTarget | null;
    class_level: ClassLevel | null;
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
    exam_target: ExamTarget | 'Other';
    class_level: ClassLevel;
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

// ============================================
// PLATFORM MANAGER TYPES
// ============================================

export type HealthStatus = 'healthy' | 'degraded' | 'critical';

// Error Log Types
export interface ErrorLog {
    id: string;
    error_type: string;
    error_message: string | null;
    stack_trace: string | null;
    user_id: string | null;
    request_path: string | null;
    request_method: string | null;
    user_agent: string | null;
    ip_address: string | null;
    metadata: Record<string, unknown>;
    occurred_at: string;
}

// System Health Types
export interface SystemHealth {
    id: string;
    check_name: string;
    status: HealthStatus;
    response_time_ms: number | null;
    error_count: number;
    details: Record<string, unknown>;
    checked_at: string;
}

// Cron Job Monitoring Types
export interface CronJobStatus {
    job_name: string;
    last_run: string | null;
    status: HealthStatus;
    execution_time_ms: number | null;
    error_count: number;
    success_count: number;
    last_error: string | null;
}

// Database Metrics Types
export interface DatabaseMetrics {
    total_connections: number;
    active_connections: number;
    idle_connections: number;
    waiting_connections: number;
    cache_hit_ratio: number;
    query_stats: {
        total_queries: number;
        slow_queries: number;
        avg_query_time_ms: number;
    };
    table_stats: {
        table_name: string;
        row_count: number;
        size_bytes: number;
    }[];
}

// Alert Types
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
    id: string;
    severity: AlertSeverity;
    title: string;
    message: string;
    source: string;
    status: AlertStatus;
    metadata: Record<string, unknown>;
    created_at: string;
    acknowledged_at: string | null;
    acknowledged_by: string | null;
    resolved_at: string | null;
}

export type AlertConditionType =
    | 'error_rate_threshold'
    | 'error_count_threshold'
    | 'health_check_failed'
    | 'cron_job_failed'
    | 'response_time_threshold'
    | 'custom';

export interface AlertCondition {
    type: AlertConditionType;
    threshold?: number;
    timeWindowMinutes?: number;
    checkName?: string;
    cronJobName?: string;
}

export type NotificationChannel =
    | { type: 'email'; recipients: string[] }
    | { type: 'webhook'; url: string; headers?: Record<string, string> }
    | { type: 'slack'; webhookUrl: string; channel?: string }
    | { type: 'console' };

export interface AlertRule {
    id: string;
    name: string;
    description: string;
    severity: AlertSeverity;
    condition: AlertCondition;
    is_enabled: boolean;
    cooldown_minutes: number;
    last_triggered_at: string | null;
    notification_channels: NotificationChannel[];
    created_at: string;
    updated_at: string;
}

// Health Check Types
export interface HealthCheckResult {
    check_name: string;
    status: HealthStatus;
    response_time_ms: number;
    message: string;
    details: Record<string, unknown>;
    timestamp: string;
}

export interface FullHealthReport {
    overall_status: HealthStatus;
    checks: HealthCheckResult[];
    summary: {
        total: number;
        healthy: number;
        degraded: number;
        critical: number;
    };
    generated_at: string;
}

// Monitoring Configuration
export interface MonitoringConfig {
    errorLimit?: number;
    timeWindowMinutes?: number;
    includeResolved?: boolean;
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

// ============================================
// PERFORMANCE OPTIMIZATION TYPES
// ============================================

export type PerformanceScore = number; // 0-100
export type OptimizationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface SlowQuery {
    queryid: string;
    query: string;
    calls: number;
    total_time: number;
    mean_time: number;
    stddev_time: number;
    rows: number;
    shared_blks_hit: number;
    shared_blks_read: number;
    temp_blks_written: number;
}

export interface IndexRecommendation {
    table: string;
    column: string;
    reason: string;
    priority: OptimizationPriority;
    estimatedImprovement: string;
    suggestedIndex: string;
}

export interface TablePerformance {
    tableName: string;
    rowCount: number;
    sizeBytes: number;
    seqScanCount: number;
    idxScanCount: number;
    seqScanRatio: number;
    deadTupleRatio: number;
    bloatRatio: number;
    recommendations: string[];
}

export interface QueryPerformanceReport {
    slowQueries: SlowQuery[];
    indexRecommendations: IndexRecommendation[];
    tablePerformance: TablePerformance[];
    summary: {
        totalSlowQueries: number;
        criticalQueries: number;
        tablesNeedingOptimization: number;
        overallQueryHealth: 'healthy' | 'degraded' | 'critical';
    };
}

export interface CacheStats {
    totalQueries: number;
    cachedQueries: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRatio: number;
    avgCacheResponseTime: number;
    avgDbResponseTime: number;
    cacheEfficiency: number;
}

export interface CacheStrategy {
    queryPattern: string;
    frequency: number;
    avgResponseTime: number;
    recommendedCacheDuration: number;
    priority: OptimizationPriority;
    estimatedMemoryUsage: string;
}

export interface CacheEfficiency {
    hitRatio: number;
    missRatio: number;
    evictionRate: number;
    memoryUtilization: number;
    score: number;
}

export interface BundleFile {
    name: string;
    size: number;
    gzipSize: number;
    type: 'js' | 'css' | 'json' | 'other';
    percentage: number;
}

export interface DependencyInfo {
    name: string;
    version: string;
    size: number;
    isDuplicate: boolean;
    isUnused: boolean;
}

export interface UnusedCodeInfo {
    file: string;
    unusedExports: string[];
    unusedImports: string[];
    deadCode: string[];
}

export interface DuplicateCodeInfo {
    modules: string[];
    size: number;
    occurrences: number;
}

export interface CodeSplittingRecommendation {
    route: string;
    currentSize: number;
    suggestedChunks: string[];
    potentialSavings: number;
    priority: OptimizationPriority;
}

export interface BundleReport {
    analysis: {
        totalSize: number;
        gzipSize: number;
        files: BundleFile[];
        dependencies: DependencyInfo[];
        unusedCode: UnusedCodeInfo[];
        duplicateCode: DuplicateCodeInfo[];
    };
    recommendations: CodeSplittingRecommendation[];
    summary: {
        totalSize: string;
        gzipSize: string;
        unusedCodeSize: string;
        duplicateCodeSize: string;
        potentialSavings: string;
        score: number;
    };
}

export interface APIEndpointPerformance {
    endpoint: string;
    method: string;
    totalRequests: number;
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number;
}

export interface APIOptimizationRecommendation {
    endpoint: string;
    issue: string;
    recommendation: string;
    priority: OptimizationPriority;
    estimatedImprovement: string;
}

export interface APIPerformanceReport {
    endpoints: APIEndpointPerformance[];
    recommendations: APIOptimizationRecommendation[];
    summary: {
        totalEndpoints: number;
        slowEndpoints: number;
        highErrorRateEndpoints: number;
        overallAPIHealth: 'healthy' | 'degraded' | 'critical';
    };
}

export interface OptimizationReport {
    timestamp: string;
    queryPerformance: QueryPerformanceReport;
    cacheStats: CacheStats;
    cacheStrategies: CacheStrategy[];
    bundleReport: BundleReport;
    apiPerformance: APIPerformanceReport;
    overallScore: PerformanceScore;
    criticalIssues: number;
    highPriorityIssues: number;
    mediumPriorityIssues: number;
    lowPriorityIssues: number;
}

export interface PerformanceMetrics {
    queryScore: number;
    cacheScore: number;
    bundleScore: number;
    apiScore: number;
    overallScore: number;
}

// ============================================
// PAYMENT TYPES
// ============================================

export type PaymentGateway = 'razorpay';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface Donation {
    id: string;
    gateway: PaymentGateway;
    amount: number;
    currency: string;
    status: PaymentStatus;
    donor_email: string | null;
    donor_name: string | null;
    donor_phone: string | null;
    order_id: string | null;
    payment_id: string | null;
    gateway_response: Record<string, unknown> | null;
    error_message: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
}

export interface GatewayHealth {
    gateway: PaymentGateway;
    status: 'healthy' | 'degraded' | 'critical' | 'unknown';
    responseTimeMs: number;
    lastChecked: string;
    successRate: number;
    errorCount: number;
    errorMessage?: string;
}

export interface Transaction {
    id: string;
    gateway: PaymentGateway;
    amount: number;
    currency: string;
    status: PaymentStatus;
    donorEmail?: string;
    donorName?: string;
    donorPhone?: string;
    orderId?: string;
    paymentId?: string;
    gatewayResponse?: Record<string, unknown>;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

export interface TransactionStats {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    refundedTransactions: number;
    totalRevenue: number;
    refundedAmount: number;
    netRevenue: number;
    successRate: number;
    averageTransactionAmount: number;
    timeRange: {
        start: string;
        end: string;
    };
    gatewayBreakdown: Record<PaymentGateway, {
        count: number;
        revenue: number;
        successRate: number;
    }>;
}