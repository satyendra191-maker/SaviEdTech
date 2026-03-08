export type OnlineExamMode = 'jee' | 'neet' | 'cbse_board';
export type OnlineExamQuestionType = 'MCQ' | 'NUMERICAL' | 'ASSERTION_REASON';
export type OnlineExamAttemptStatus = 'in_progress' | 'completed' | 'auto_submitted' | 'flagged' | 'abandoned';
export type ProctoringSeverity = 'info' | 'warning' | 'critical';

export interface OnlineExamSummary {
    id: string;
    title: string;
    description: string | null;
    examMode: OnlineExamMode;
    durationMinutes: number;
    totalMarks: number;
    questionCount: number;
    scheduledAt: string | null;
    startTime: string | null;
    endTime: string | null;
    isPublished: boolean;
    proctoringEnabled: boolean;
    desktopOnly: boolean;
    activeAttemptId: string | null;
}

export interface OnlineExamSectionDetail {
    id: string;
    name: string;
    subjectName: string;
    instructions: string[];
    displayOrder: number;
    totalQuestions: number;
}

export interface OnlineExamQuestionOption {
    id: string;
    optionLabel: string;
    optionText: string;
    optionImageUrl: string | null;
    displayOrder: number;
}

export interface OnlineExamQuestionDetail {
    id: string;
    examQuestionId: string;
    sectionId: string;
    sectionName: string;
    subjectName: string;
    topicId: string | null;
    topicName: string | null;
    questionType: OnlineExamQuestionType;
    questionText: string;
    questionImageUrl: string | null;
    solutionText: string;
    correctAnswer: string;
    marks: number;
    negativeMarks: number;
    displayOrder: number;
    options: OnlineExamQuestionOption[];
}

export interface OnlineExamAttemptSnapshot {
    id: string;
    examId: string;
    userId: string;
    status: OnlineExamAttemptStatus;
    startedAt: string;
    submittedAt: string | null;
    timeTakenSeconds: number | null;
    timeRemainingSeconds: number | null;
    warningCount: number;
    tabSwitchCount: number;
    fullscreenExitCount: number;
    autoSubmitted: boolean;
    lastActivityAt: string | null;
    answers: Record<string, string>;
    questionTimeMap: Record<string, number>;
    markedForReview: string[];
    currentQuestionId: string | null;
    currentSectionId: string | null;
}

export interface OnlineExamDetail {
    exam: OnlineExamSummary & {
        candidateName: string;
        candidateId: string;
        instructions: string[];
        warningThreshold: number;
        autoSubmitThreshold: number;
        retentionDays: number;
    };
    sections: OnlineExamSectionDetail[];
    questions: OnlineExamQuestionDetail[];
    attempt: OnlineExamAttemptSnapshot | null;
}

export interface OnlineExamHistoryItem {
    attemptId: string;
    examId: string;
    examTitle: string;
    examMode: OnlineExamMode;
    score: number;
    maxScore: number;
    accuracy: number;
    percentile: number;
    rankPrediction: number;
    attemptedAt: string;
    status: OnlineExamAttemptStatus;
}

export interface OnlineExamResultSection {
    sectionId: string;
    sectionName: string;
    subjectName: string;
    attempted: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    score: number;
    maxScore: number;
    accuracy: number;
}

export interface OnlineExamTopicPerformance {
    topicId: string | null;
    topicName: string;
    subjectName: string;
    attempted: number;
    correct: number;
    accuracy: number;
}

export interface OnlineExamQuestionReview {
    questionId: string;
    sectionId: string;
    sectionName: string;
    subjectName: string;
    topicName: string | null;
    questionText: string;
    questionType: OnlineExamQuestionType;
    selectedAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    isAttempted: boolean;
    marksObtained: number;
    maxMarks: number;
    timeSpentSeconds: number;
}

export interface OnlineExamResultDetail {
    attemptId: string;
    examId: string;
    examTitle: string;
    examMode: OnlineExamMode;
    submittedAt: string;
    score: number;
    maxScore: number;
    accuracy: number;
    percentile: number;
    rankPrediction: number;
    correctCount: number;
    incorrectCount: number;
    unattemptedCount: number;
    warningCount: number;
    flagged: boolean;
    autoSubmitted: boolean;
    weakTopics: string[];
    sections: OnlineExamResultSection[];
    topicPerformance: OnlineExamTopicPerformance[];
    questions: OnlineExamQuestionReview[];
}

export interface OnlineExamsDashboardPayload {
    availableExams: OnlineExamSummary[];
    history: OnlineExamHistoryItem[];
}

export interface ProctoringLogEntry {
    id: string;
    examId: string;
    examTitle: string;
    attemptId: string;
    userId: string;
    candidateName: string;
    eventType: string;
    severity: ProctoringSeverity;
    warningMessage: string | null;
    screenshotUrl: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
}

export interface AdminOnlineExamOverview {
    exams: Array<OnlineExamSummary & {
        attemptsCount: number;
        activeAttemptsCount: number;
        averageScore: number;
        flaggedAttemptsCount: number;
    }>;
    recentProctoringLogs: ProctoringLogEntry[];
    activeAttempts: number;
    flaggedAttempts: number;
}
