// @ts-nocheck
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';

export type SupportedExamType = 'jee_main' | 'jee_advanced' | 'neet';

export interface RankPredictionFactors {
    accuracy: number;
    avgScore: number;
    testsTaken: number;
    questionsSolved: number;
    studyTime: number;
    topicMastery: number;
    avgSolveTime: number;
}

export interface RankPredictionComputation {
    predictedRank: number;
    percentile: number;
    examReadiness: string;
    readinessLevel: number;
    confidenceScore: number;
    factors: RankPredictionFactors;
    predictionDate: string;
}

interface StudentProgressRow {
    accuracy_percent: number | null;
    total_questions_attempted: number | null;
    total_study_minutes: number | null;
    tests_taken: number | null;
    average_test_score: number | null;
    average_time_per_question: number | null;
}

interface TestAttemptRow {
    total_score: number | null;
    max_score: number;
    time_taken_seconds: number | null;
    submitted_at: string | null;
}

interface DppAttemptRow {
    total_score: number | null;
    max_score: number;
    accuracy_percent: number | null;
    time_taken_seconds: number | null;
    submitted_at: string | null;
}

interface OnlineExamResultRow {
    score: number | null;
    max_score: number;
    accuracy: number | null;
    created_at: string;
}

interface QuestionAttemptRow {
    time_taken_seconds: number | null;
}

interface TopicMasteryRow {
    accuracy_percent: number | null;
    strength_status: 'weak' | 'average' | 'strong' | 'mastered' | null;
}

function average(values: number[]): number {
    if (values.length === 0) {
        return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function getReadinessDetails(percentile: number) {
    if (percentile >= 97) return { examReadiness: 'Strong', readinessLevel: 5 };
    if (percentile >= 88) return { examReadiness: 'Advanced', readinessLevel: 4 };
    if (percentile >= 72) return { examReadiness: 'Building', readinessLevel: 3 };
    if (percentile >= 55) return { examReadiness: 'Foundation', readinessLevel: 2 };
    return { examReadiness: 'Early Stage', readinessLevel: 1 };
}

function getCandidatePool(examType: SupportedExamType): number {
    switch (examType) {
        case 'neet':
            return 2400000;
        case 'jee_advanced':
            return 180000;
        case 'jee_main':
        default:
            return 1200000;
    }
}

function normalizeSolveTime(avgSolveTimeSeconds: number): number {
    if (avgSolveTimeSeconds <= 0) {
        return 40;
    }

    return clamp(100 - ((avgSolveTimeSeconds - 60) / 240) * 100, 20, 100);
}

function mapExamTargetToExamType(examTarget: string | null | undefined): SupportedExamType {
    switch (examTarget) {
        case 'NEET':
            return 'neet';
        case 'JEE Advanced':
            return 'jee_advanced';
        default:
            return 'jee_main';
    }
}

export async function detectExamType(
    supabase: SupabaseClient<Database>,
    userId: string,
    fallbackExamType?: SupportedExamType
): Promise<SupportedExamType> {
    if (fallbackExamType) {
        return fallbackExamType;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('exam_target')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return mapExamTargetToExamType((data as { exam_target?: string | null } | null)?.exam_target);
}

export async function calculateRankPredictionForUser(
    supabase: SupabaseClient<Database>,
    userId: string,
    examType?: SupportedExamType
): Promise<RankPredictionComputation | null> {
    const resolvedExamType = await detectExamType(supabase, userId, examType);
    const [
        studentProgressResult,
        testAttemptsResult,
        onlineExamResultsResult,
        dppAttemptsResult,
        questionAttemptsResult,
        topicMasteryResult,
    ] = await Promise.all([
        supabase
            .from('student_progress')
            .select(`
                accuracy_percent,
                total_questions_attempted,
                total_study_minutes,
                tests_taken,
                average_test_score,
                average_time_per_question
            `)
            .eq('user_id', userId),
        supabase
            .from('test_attempts')
            .select('total_score, max_score, time_taken_seconds, submitted_at')
            .eq('user_id', userId)
            .in('status', ['completed', 'time_up'])
            .order('submitted_at', { ascending: false })
            .limit(20),
        supabase
            .from('exam_results')
            .select('score, max_score, accuracy, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20),
        supabase
            .from('dpp_attempts')
            .select('total_score, max_score, accuracy_percent, time_taken_seconds, submitted_at')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('submitted_at', { ascending: false })
            .limit(30),
        supabase
            .from('question_attempts')
            .select('time_taken_seconds')
            .eq('user_id', userId)
            .order('occurred_at', { ascending: false })
            .limit(500),
        supabase
            .from('topic_mastery')
            .select('accuracy_percent, strength_status')
            .eq('user_id', userId)
            .limit(200),
    ]);

    const queryError = [
        studentProgressResult.error,
        testAttemptsResult.error,
        onlineExamResultsResult.error,
        dppAttemptsResult.error,
        questionAttemptsResult.error,
        topicMasteryResult.error,
    ].find(Boolean);

    if (queryError) {
        throw queryError;
    }

    const studentProgress = (studentProgressResult.data ?? []) as StudentProgressRow[];
    const testAttempts = (testAttemptsResult.data ?? []) as TestAttemptRow[];
    const onlineExamResults = (onlineExamResultsResult.data ?? []) as OnlineExamResultRow[];
    const dppAttempts = (dppAttemptsResult.data ?? []) as DppAttemptRow[];
    const questionAttempts = (questionAttemptsResult.data ?? []) as QuestionAttemptRow[];
    const topicMastery = (topicMasteryResult.data ?? []) as TopicMasteryRow[];

    const totalQuestions = Math.max(
        studentProgress.reduce((sum, row) => sum + (row.total_questions_attempted || 0), 0),
        questionAttempts.length
    );
    const totalStudyMinutes = studentProgress.reduce((sum, row) => sum + (row.total_study_minutes || 0), 0);
    const totalTestsTaken = Math.max(
        studentProgress.reduce((sum, row) => sum + (row.tests_taken || 0), 0),
        testAttempts.length + onlineExamResults.length
    );

    const progressAccuracy = average(
        studentProgress
            .map((row) => row.accuracy_percent || 0)
            .filter((value) => value > 0)
    );
    const dppAccuracy = average(
        dppAttempts
            .map((row) => row.accuracy_percent || 0)
            .filter((value) => value > 0)
    );
    const masteryAccuracy = average(
        topicMastery
            .map((row) => row.accuracy_percent || 0)
            .filter((value) => value > 0)
    );

    const weightedAccuracy = average(
        [progressAccuracy, dppAccuracy, masteryAccuracy].filter((value) => value > 0)
    );

    const assessmentScores = [
        ...testAttempts.map((attempt) => ({
            submittedAt: attempt.submitted_at,
            scorePercent: attempt.max_score > 0 ? ((attempt.total_score || 0) / attempt.max_score) * 100 : 0,
            timeTakenSeconds: attempt.time_taken_seconds || 0,
        })),
        ...onlineExamResults.map((attempt) => ({
            submittedAt: attempt.created_at,
            scorePercent: attempt.max_score > 0
                ? ((attempt.score || 0) / attempt.max_score) * 100
                : (attempt.accuracy || 0),
            timeTakenSeconds: 0,
        })),
        ...dppAttempts.map((attempt) => ({
            submittedAt: attempt.submitted_at,
            scorePercent: attempt.max_score > 0
                ? ((attempt.total_score || 0) / attempt.max_score) * 100
                : (attempt.accuracy_percent || 0),
            timeTakenSeconds: attempt.time_taken_seconds || 0,
        })),
    ]
        .filter((attempt) => Boolean(attempt.submittedAt))
        .sort((left, right) => new Date(right.submittedAt as string).getTime() - new Date(left.submittedAt as string).getTime());

    const avgScoreFromProgress = average(
        studentProgress
            .map((row) => row.average_test_score || 0)
            .filter((value) => value > 0)
    );
    const avgScore = avgScoreFromProgress || average(assessmentScores.map((attempt) => attempt.scorePercent)) || weightedAccuracy;

    const avgQuestionSolveTime = average(
        questionAttempts
            .map((row) => row.time_taken_seconds || 0)
            .filter((value) => value > 0)
    );
    const avgProgressSolveTime = average(
        studentProgress
            .map((row) => row.average_time_per_question || 0)
            .filter((value) => value > 0)
    );
    const avgAssessmentSolveTime = average(
        assessmentScores
            .map((attempt) => attempt.timeTakenSeconds || 0)
            .filter((value) => value > 0)
    );
    const avgSolveTime = avgQuestionSolveTime || avgProgressSolveTime || avgAssessmentSolveTime || 0;

    if (totalQuestions === 0 && assessmentScores.length === 0 && topicMastery.length === 0) {
        return null;
    }

    const masteryStrengthScore = average(
        topicMastery.map((row) => {
            switch (row.strength_status) {
                case 'mastered':
                    return 100;
                case 'strong':
                    return 85;
                case 'average':
                    return 62;
                case 'weak':
                    return 35;
                default:
                    return row.accuracy_percent || 0;
            }
        })
    );

    const recentScores = assessmentScores.slice(0, 6).map((attempt) => attempt.scorePercent).reverse();
    let trendScore = 50;
    if (recentScores.length >= 3) {
        const midpoint = Math.floor(recentScores.length / 2);
        const firstAverage = average(recentScores.slice(0, midpoint));
        const secondAverage = average(recentScores.slice(midpoint));
        trendScore = clamp(50 + ((secondAverage - firstAverage) * 2), 20, 100);
    }

    const normalizedAccuracy = clamp(weightedAccuracy || progressAccuracy || dppAccuracy, 0, 100);
    const normalizedScore = clamp(avgScore, 0, 100);
    const normalizedMastery = clamp(masteryAccuracy || masteryStrengthScore || normalizedAccuracy, 0, 100);
    const normalizedConsistency = clamp((totalTestsTaken / 20) * 100, 15, 100);
    const normalizedPracticeVolume = clamp((totalQuestions / 2500) * 100, 10, 100);
    const normalizedSpeed = normalizeSolveTime(avgSolveTime);

    const predictionFactor = (
        normalizedAccuracy * 0.30 +
        normalizedScore * 0.26 +
        normalizedMastery * 0.16 +
        normalizedSpeed * 0.10 +
        normalizedConsistency * 0.10 +
        normalizedPracticeVolume * 0.04 +
        trendScore * 0.04
    ) / 100;

    const percentile = Number(clamp(predictionFactor * 100, 1, 99.99).toFixed(2));
    const candidatePool = getCandidatePool(resolvedExamType);
    const predictedRank = Math.max(1, Math.round(candidatePool * (1 - (percentile / 100) * 0.93)));
    const { examReadiness, readinessLevel } = getReadinessDetails(percentile);
    const confidenceScore = Math.round(clamp(
        35 +
        normalizedConsistency * 0.22 +
        normalizedPracticeVolume * 0.18 +
        normalizedMastery * 0.12 +
        (assessmentScores.length >= 5 ? 18 : assessmentScores.length * 3),
        35,
        96
    ));
    const predictionDate = new Date().toISOString().split('T')[0] || new Date().toISOString();

    return {
        predictedRank,
        percentile,
        examReadiness,
        readinessLevel,
        confidenceScore,
        predictionDate,
        factors: {
            accuracy: Math.round(normalizedAccuracy),
            avgScore: Math.round(normalizedScore),
            testsTaken: totalTestsTaken,
            questionsSolved: totalQuestions,
            studyTime: Math.round(totalStudyMinutes / 60),
            topicMastery: Math.round(normalizedMastery),
            avgSolveTime: Math.round(avgSolveTime),
        },
    };
}

export async function storeRankPrediction(
    supabase: SupabaseClient<Database>,
    userId: string,
    result: RankPredictionComputation
): Promise<void> {
    const payload = {
        user_id: userId,
        student_id: userId,
        exam_id: null,
        prediction_date: result.predictionDate,
        predicted_rank: result.predictedRank,
        predicted_percentile: result.percentile,
        percentile: result.percentile,
        confidence_score: result.confidenceScore,
        exam_readiness_percent: result.readinessLevel * 20,
        exam_readiness: result.examReadiness,
        test_scores_avg: result.factors.avgScore,
        accuracy_avg: result.factors.accuracy,
        solve_time_avg: result.factors.avgSolveTime,
        model_version: 'v3.0',
        factors: result.factors as unknown as Json,
    };

    const { error: insertError } = await supabase
        .from('rank_predictions')
        .insert(payload);

    if (insertError) {
        throw insertError;
    }

    const { error: profileError } = await supabase
        .from('student_profiles')
        .upsert({
            id: userId,
            rank_prediction: result.predictedRank,
            percentile_prediction: result.percentile,
            updated_at: new Date().toISOString(),
        });

    if (profileError) {
        throw profileError;
    }
}
