// @ts-nocheck
import 'server-only';

import { createAdminSupabaseClient } from '@/lib/supabase';
import {
    calculateAccuracy,
    evaluateQuestion,
    sumMarks,
} from '@/lib/learning/assessment';
import { upsertLearningProgress } from '@/lib/learning/progress';
import { sendAlert } from '@/lib/platform-manager/alerts';
import { writePlatformAuditLog } from '@/lib/platform-manager/audit-log';
import type {
    AdminOnlineExamOverview,
    OnlineExamDetail,
    OnlineExamHistoryItem,
    OnlineExamResultDetail,
    OnlineExamSummary,
    OnlineExamsDashboardPayload,
    ProctoringLogEntry,
} from './types';

const DEFAULT_EXAM_INSTRUCTIONS = [
    'Read every question carefully before selecting an answer.',
    'Use Save & Next to preserve progress as you move through the exam.',
    'Do not refresh the page, switch tabs, or exit fullscreen mode during the exam.',
    'The exam auto-submits when the timer reaches zero.',
];

function getDb() {
    return createAdminSupabaseClient() as any;
}

function ensureArray<T>(value: T[] | null | undefined, fallback: T[] = []): T[] {
    return Array.isArray(value) ? value : fallback;
}

function ensureObject<T extends Record<string, unknown>>(value: T | null | undefined, fallback: T): T {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function buildCandidateId(userId: string): string {
    return `STU${userId.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

function getCandidatePool(examMode: string): number {
    switch (examMode) {
        case 'neet':
            return 2400000;
        case 'cbse_board':
            return 800000;
        case 'jee':
        default:
            return 1200000;
    }
}

function isExamAvailable(exam: {
    is_published?: boolean | null;
    start_time?: string | null;
    end_time?: string | null;
}): boolean {
    if (!exam?.is_published) {
        return false;
    }

    const now = Date.now();
    if (exam.start_time && new Date(exam.start_time).getTime() > now) {
        return false;
    }
    if (exam.end_time && new Date(exam.end_time).getTime() < now) {
        return false;
    }

    return true;
}

function normalizeSignedPath(pathOrUrl: string | null | undefined): string | null {
    if (!pathOrUrl) {
        return null;
    }

    return pathOrUrl.startsWith('http') ? pathOrUrl : pathOrUrl.replace(/^\/+/, '');
}

async function maybeCreateSignedSnapshotUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
    const normalized = normalizeSignedPath(pathOrUrl);
    if (!normalized) {
        return null;
    }

    if (normalized.startsWith('http')) {
        return normalized;
    }

    try {
        const db = getDb();
        const { data } = await db.storage
            .from('proctoring-snapshots')
            .createSignedUrl(normalized, 60 * 60);

        return data?.signedUrl || null;
    } catch (error) {
        console.error('Failed to sign proctoring snapshot url:', error);
        return null;
    }
}

async function loadExamCore(examId: string) {
    const db = getDb();
    const [{ data: exam, error: examError }, { data: sections, error: sectionsError }] = await Promise.all([
        db
            .from('online_exams')
            .select('*')
            .eq('id', examId)
            .maybeSingle(),
        db
            .from('exam_sections')
            .select('*')
            .eq('exam_id', examId)
            .order('display_order', { ascending: true }),
    ]);

    if (examError) {
        throw examError;
    }
    if (sectionsError) {
        throw sectionsError;
    }

    return {
        exam,
        sections: ensureArray(sections),
    };
}

async function loadExamQuestionRows(examId: string) {
    const db = getDb();
    const { data, error } = await db
        .from('exam_questions')
        .select(`
            id,
            exam_id,
            section_id,
            question_id,
            question_type,
            marks,
            negative_marks,
            display_order,
            correct_answer_override,
            section:section_id (
                id,
                name,
                subject_name,
                display_order
            ),
            question:question_id (
                id,
                topic_id,
                question_type,
                question_text,
                question_image_url,
                solution_text,
                correct_answer,
                marks,
                negative_marks,
                hint,
                topics:topic_id (
                    name,
                    chapters:chapter_id (
                        subjects:subject_id (
                            name
                        )
                    )
                ),
                options:question_options (
                    id,
                    option_label,
                    option_text,
                    option_image_url,
                    display_order
                )
            )
        `)
        .eq('exam_id', examId)
        .order('display_order', { ascending: true });

    if (error) {
        throw error;
    }

    return ensureArray(data);
}

async function loadAttemptForUser(userId: string, examId: string, attemptId?: string | null) {
    const db = getDb();

    if (attemptId) {
        const { data, error } = await db
            .from('exam_attempts')
            .select('*')
            .eq('id', attemptId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    }

    const { data, error } = await db
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', userId)
        .in('status', ['in_progress', 'flagged'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

async function loadCandidateProfile(userId: string) {
    const db = getDb();
    const { data, error } = await db
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

function mapAttemptSnapshot(attempt: any) {
    if (!attempt) {
        return null;
    }

    return {
        id: attempt.id,
        examId: attempt.exam_id,
        userId: attempt.user_id,
        status: attempt.status,
        startedAt: attempt.started_at,
        submittedAt: attempt.submitted_at,
        timeTakenSeconds: attempt.time_taken_seconds,
        timeRemainingSeconds: attempt.time_remaining_seconds,
        warningCount: attempt.warning_count || 0,
        tabSwitchCount: attempt.tab_switch_count || 0,
        fullscreenExitCount: attempt.fullscreen_exit_count || 0,
        autoSubmitted: attempt.auto_submitted || false,
        lastActivityAt: attempt.last_activity_at,
        answers: ensureObject(attempt.answers, {}),
        questionTimeMap: ensureObject(attempt.question_time_map, {}),
        markedForReview: ensureArray(attempt.marked_for_review, []),
        currentQuestionId: attempt.current_question_id,
        currentSectionId: attempt.current_section_id,
    };
}

function mapExamSummary(exam: any, activeAttemptId?: string | null): OnlineExamSummary {
    return {
        id: exam.id,
        title: exam.title,
        description: exam.description || null,
        examMode: exam.exam_mode,
        durationMinutes: exam.duration_minutes,
        totalMarks: exam.total_marks || 0,
        questionCount: exam.question_count || 0,
        scheduledAt: exam.scheduled_at || null,
        startTime: exam.start_time || null,
        endTime: exam.end_time || null,
        isPublished: Boolean(exam.is_published),
        proctoringEnabled: Boolean(exam.proctoring_enabled),
        desktopOnly: Boolean(exam.desktop_only),
        activeAttemptId: activeAttemptId || null,
    };
}

function resolveSectionForQuestion(questionRow: any, sections: any[]) {
    const rowSubjectName = questionRow?.question?.topics?.chapters?.subjects?.name || null;
    const directSection = questionRow.section || sections.find((section) => section.id === questionRow.section_id) || null;
    if (directSection) {
        return directSection;
    }

    if (rowSubjectName) {
        const subjectMatch = sections.find((section) =>
            (section.subject_name || section.name || '').toLowerCase() === rowSubjectName.toLowerCase()
        );
        if (subjectMatch) {
            return subjectMatch;
        }
    }

    return sections[0] || null;
}

function buildSectionCounts(questionRows: any[], sections: any[]) {
    const counts = new Map<string, number>();

    for (const row of questionRows) {
        const section = resolveSectionForQuestion(row, sections);
        const key = section?.id || 'general';
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    return counts;
}

export async function getOnlineExamsDashboardData(userId: string): Promise<OnlineExamsDashboardPayload> {
    const db = getDb();

    const [{ data: exams, error: examsError }, { data: attempts, error: attemptsError }, { data: results, error: resultsError }] = await Promise.all([
        db
            .from('online_exams')
            .select('*')
            .order('scheduled_at', { ascending: true })
            .order('created_at', { ascending: false }),
        db
            .from('exam_attempts')
            .select('id, exam_id, status')
            .eq('user_id', userId)
            .in('status', ['in_progress', 'flagged']),
        db
            .from('exam_results')
            .select(`
                attempt_id,
                exam_id,
                score,
                max_score,
                accuracy,
                percentile,
                rank_prediction,
                created_at,
                exam:exam_id (
                    title,
                    exam_mode
                ),
                attempt:attempt_id (
                    status
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20),
    ]);

    if (examsError) {
        throw examsError;
    }
    if (attemptsError) {
        throw attemptsError;
    }
    if (resultsError) {
        throw resultsError;
    }

    const activeAttemptByExamId = new Map<string, string>();
    for (const attempt of ensureArray(attempts)) {
        if (!activeAttemptByExamId.has(attempt.exam_id)) {
            activeAttemptByExamId.set(attempt.exam_id, attempt.id);
        }
    }

    const availableExams = ensureArray(exams)
        .filter((exam) => isExamAvailable(exam))
        .map((exam) => mapExamSummary(exam, activeAttemptByExamId.get(exam.id) || null));

    const history: OnlineExamHistoryItem[] = ensureArray(results).map((row) => ({
        attemptId: row.attempt_id,
        examId: row.exam_id,
        examTitle: row.exam?.title || 'Online Exam',
        examMode: row.exam?.exam_mode || 'jee',
        score: Number(row.score || 0),
        maxScore: Number(row.max_score || 0),
        accuracy: Number(row.accuracy || 0),
        percentile: Number(row.percentile || 0),
        rankPrediction: Number(row.rank_prediction || 0),
        attemptedAt: row.created_at,
        status: row.attempt?.status || 'completed',
    }));

    return {
        availableExams,
        history,
    };
}

export async function getOnlineExamDetail(userId: string, examId: string, attemptId?: string | null): Promise<OnlineExamDetail> {
    const [{ exam, sections }, questionRows, profile, attempt] = await Promise.all([
        loadExamCore(examId),
        loadExamQuestionRows(examId),
        loadCandidateProfile(userId),
        loadAttemptForUser(userId, examId, attemptId),
    ]);

    if (!exam) {
        throw new Error('Online exam not found.');
    }

    if (!isExamAvailable(exam) && !attempt) {
        throw new Error('This online exam is not available right now.');
    }

    const sectionCounts = buildSectionCounts(questionRows, sections);
    const mappedSections = sections.map((section) => ({
        id: section.id,
        name: section.name,
        subjectName: section.subject_name || section.name,
        instructions: ensureArray(section.instructions, []),
        displayOrder: section.display_order || 0,
        totalQuestions: sectionCounts.get(section.id) || 0,
    }));

    const mappedQuestions = questionRows.map((row, index) => {
        const section = resolveSectionForQuestion(row, sections);
        const topicName = row.question?.topics?.name || null;
        const subjectName = section?.subject_name || row.question?.topics?.chapters?.subjects?.name || section?.name || 'General';

        return {
            id: row.question.id,
            examQuestionId: row.id,
            sectionId: section?.id || row.section_id || 'general',
            sectionName: section?.name || 'General',
            subjectName,
            topicId: row.question.topic_id || null,
            topicName,
            questionType: row.question_type || row.question.question_type,
            questionText: row.question.question_text,
            questionImageUrl: row.question.question_image_url || null,
            solutionText: row.question.solution_text || '',
            correctAnswer: row.correct_answer_override || row.question.correct_answer,
            marks: Number(row.marks || row.question.marks || 0),
            negativeMarks: Number(row.negative_marks ?? row.question.negative_marks ?? 0),
            displayOrder: row.display_order || index + 1,
            options: ensureArray(row.question.options)
                .sort((left, right) => (left.display_order || 0) - (right.display_order || 0))
                .map((option) => ({
                    id: option.id,
                    optionLabel: option.option_label,
                    optionText: option.option_text,
                    optionImageUrl: option.option_image_url || null,
                    displayOrder: option.display_order || 0,
                })),
        };
    });

    return {
        exam: {
            ...mapExamSummary(exam, attempt?.id || null),
            candidateName: profile?.full_name || 'Student',
            candidateId: buildCandidateId(userId),
            instructions: ensureArray(exam.instructions, DEFAULT_EXAM_INSTRUCTIONS),
            warningThreshold: Number(exam.warning_threshold || 3),
            autoSubmitThreshold: Number(exam.auto_submit_threshold || 5),
            retentionDays: Number(exam.snapshot_retention_days || 30),
        },
        sections: mappedSections,
        questions: mappedQuestions,
        attempt: mapAttemptSnapshot(attempt),
    };
}

export async function startOnlineExamAttempt(userId: string, examId: string, deviceMetadata?: Record<string, unknown>) {
    const db = getDb();
    const { exam, sections } = await loadExamCore(examId);

    if (!exam) {
        throw new Error('Online exam not found.');
    }

    if (!isExamAvailable(exam)) {
        throw new Error('This online exam is not available right now.');
    }

    const existingAttempt = await loadAttemptForUser(userId, examId, null);
    if (existingAttempt) {
        return {
            attemptId: existingAttempt.id,
            resumed: true,
        };
    }

    const { count } = await db
        .from('exam_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', examId)
        .eq('user_id', userId);

    const questionRows = await loadExamQuestionRows(examId);
    const firstQuestion = questionRows[0];
    const firstSection = resolveSectionForQuestion(firstQuestion, sections);

    const { data: attempt, error } = await db
        .from('exam_attempts')
        .insert({
            exam_id: examId,
            user_id: userId,
            attempt_number: (count || 0) + 1,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            time_remaining_seconds: Number(exam.duration_minutes || 180) * 60,
            max_score: Number(exam.total_marks || 0),
            answers: {},
            question_time_map: {},
            marked_for_review: [],
            current_question_id: firstQuestion?.question_id || firstQuestion?.question?.id || null,
            current_section_id: firstSection?.id || null,
            last_activity_at: new Date().toISOString(),
            device_metadata: deviceMetadata || {},
        })
        .select('id')
        .single();

    if (error) {
        throw error;
    }

    return {
        attemptId: attempt.id,
        resumed: false,
    };
}

export async function saveOnlineExamProgress(
    userId: string,
    attemptId: string,
    payload: {
        answers?: Record<string, string>;
        questionTimeMap?: Record<string, number>;
        markedForReview?: string[];
        currentQuestionId?: string | null;
        currentSectionId?: string | null;
        timeRemainingSeconds?: number | null;
    }
) {
    const db = getDb();
    const { data: attempt, error: attemptError } = await db
        .from('exam_attempts')
        .select('id, user_id, status')
        .eq('id', attemptId)
        .maybeSingle();

    if (attemptError) {
        throw attemptError;
    }

    if (!attempt || attempt.user_id !== userId) {
        throw new Error('Exam attempt not found.');
    }

    if (!['in_progress', 'flagged'].includes(attempt.status)) {
        return { saved: false, status: attempt.status };
    }

    const { error } = await db
        .from('exam_attempts')
        .update({
            answers: payload.answers || {},
            question_time_map: payload.questionTimeMap || {},
            marked_for_review: payload.markedForReview || [],
            current_question_id: payload.currentQuestionId || null,
            current_section_id: payload.currentSectionId || null,
            time_remaining_seconds: payload.timeRemainingSeconds,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', attemptId)
        .eq('user_id', userId);

    if (error) {
        throw error;
    }

    return { saved: true };
}

export async function uploadProctoringSnapshot(
    userId: string,
    attemptId: string,
    examId: string,
    imageData: string
) {
    const db = getDb();
    const { data: attempt, error: attemptError } = await db
        .from('exam_attempts')
        .select('id, user_id')
        .eq('id', attemptId)
        .eq('exam_id', examId)
        .maybeSingle();

    if (attemptError) {
        throw attemptError;
    }

    if (!attempt || attempt.user_id !== userId) {
        throw new Error('Exam attempt not found.');
    }

    const matches = imageData.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!matches) {
        throw new Error('Invalid snapshot payload.');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.byteLength > 2 * 1024 * 1024) {
        throw new Error('Snapshot exceeds the 2MB limit.');
    }

    const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/${examId}/${attemptId}/${Date.now()}.${extension}`;

    const { error } = await db.storage
        .from('proctoring-snapshots')
        .upload(path, buffer, {
            contentType: mimeType,
            upsert: true,
        });

    if (error) {
        throw error;
    }

    return { snapshotPath: path };
}

export async function logProctoringEvent(
    userId: string,
    input: {
        examId: string;
        attemptId: string;
        eventType: string;
        severity: 'info' | 'warning' | 'critical';
        warningMessage?: string | null;
        screenshotUrl?: string | null;
        metadata?: Record<string, unknown>;
    }
) {
    const db = getDb();
    const { data: attempt, error: attemptError } = await db
        .from('exam_attempts')
        .select(`
            *,
            exam:exam_id (
                id,
                title,
                warning_threshold,
                auto_submit_threshold
            )
        `)
        .eq('id', input.attemptId)
        .eq('exam_id', input.examId)
        .maybeSingle();

    if (attemptError) {
        throw attemptError;
    }

    if (!attempt || attempt.user_id !== userId) {
        throw new Error('Exam attempt not found.');
    }

    const warningIncrement = input.severity === 'info' ? 0 : 1;
    const tabSwitchIncrement = input.eventType.includes('tab') ? 1 : 0;
    const fullscreenIncrement = input.eventType.includes('fullscreen') ? 1 : 0;
    const warningCount = Number(attempt.warning_count || 0) + warningIncrement;
    const tabSwitchCount = Number(attempt.tab_switch_count || 0) + tabSwitchIncrement;
    const fullscreenExitCount = Number(attempt.fullscreen_exit_count || 0) + fullscreenIncrement;
    const warningThreshold = Number(attempt.exam?.warning_threshold || 3);
    const autoSubmitThreshold = Number(attempt.exam?.auto_submit_threshold || 5);
    const shouldFlag = attempt.flagged || warningCount >= warningThreshold;
    const shouldAutoSubmit = warningCount >= autoSubmitThreshold;
    const nextStatus = shouldAutoSubmit
        ? 'auto_submitted'
        : shouldFlag && attempt.status === 'in_progress'
            ? 'flagged'
            : attempt.status;

    const [{ error: logError }, { error: updateError }] = await Promise.all([
        db.from('proctoring_logs').insert({
            attempt_id: input.attemptId,
            exam_id: input.examId,
            user_id: userId,
            event_type: input.eventType,
            severity: input.severity,
            warning_message: input.warningMessage || null,
            screenshot_url: input.screenshotUrl || null,
            metadata: input.metadata || {},
        }),
        db.from('exam_attempts').update({
            warning_count: warningCount,
            tab_switch_count: tabSwitchCount,
            fullscreen_exit_count: fullscreenExitCount,
            flagged: shouldFlag,
            auto_submitted: shouldAutoSubmit || attempt.auto_submitted || false,
            status: nextStatus,
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', input.attemptId),
    ]);

    if (logError) {
        throw logError;
    }
    if (updateError) {
        throw updateError;
    }

    if (input.severity === 'critical' || shouldAutoSubmit) {
        const title = shouldAutoSubmit
            ? 'Online exam auto-submitted after proctoring violations'
            : 'Critical online exam proctoring alert';
        const message = `${attempt.exam?.title || 'Online exam'} triggered ${input.eventType} for candidate ${buildCandidateId(userId)}.`;

        await sendAlert({
            severity: shouldAutoSubmit ? 'HIGH' : 'MEDIUM',
            title,
            message,
            source: 'online_exam_proctoring',
            metadata: {
                examId: input.examId,
                attemptId: input.attemptId,
                eventType: input.eventType,
                warningCount,
            },
        });

        await writePlatformAuditLog({
            auditType: 'online_exam_proctoring',
            auditSubtype: input.eventType,
            timeRange: 'live',
            status: shouldAutoSubmit ? 'critical' : 'warning',
            title,
            summary: message,
            affectedModule: 'online_exam',
            recoveryAction: shouldAutoSubmit ? 'auto_submit_exam' : null,
            recoveryStatus: shouldAutoSubmit ? 'success' : null,
            metadata: {
                examId: input.examId,
                attemptId: input.attemptId,
                warningCount,
                tabSwitchCount,
                fullscreenExitCount,
            },
            notifiedAdmin: true,
            notifiedEmail: false,
        });
    }

    return {
        warningCount,
        tabSwitchCount,
        fullscreenExitCount,
        flagged: shouldFlag,
        shouldAutoSubmit,
        status: nextStatus,
    };
}

function buildSectionAnalysis(questionRows: any[], outcomesByQuestionId: Map<string, any>) {
    const sections = new Map<string, {
        sectionId: string;
        sectionName: string;
        subjectName: string;
        attempted: number;
        correct: number;
        incorrect: number;
        unattempted: number;
        score: number;
        maxScore: number;
    }>();

    for (const row of questionRows) {
        const sectionId = row._resolvedSection?.id || row.section_id || 'general';
        const sectionName = row._resolvedSection?.name || 'General';
        const subjectName = row._resolvedSection?.subject_name || row.question?.topics?.chapters?.subjects?.name || sectionName;
        const outcome = outcomesByQuestionId.get(row.question.id);
        const existing = sections.get(sectionId) || {
            sectionId,
            sectionName,
            subjectName,
            attempted: 0,
            correct: 0,
            incorrect: 0,
            unattempted: 0,
            score: 0,
            maxScore: 0,
        };

        existing.maxScore += Number(row.marks || row.question?.marks || 0);
        existing.score += Number(outcome?.marksObtained || 0);

        if (!outcome?.isAttempted) {
            existing.unattempted += 1;
        } else if (outcome.isCorrect) {
            existing.attempted += 1;
            existing.correct += 1;
        } else {
            existing.attempted += 1;
            existing.incorrect += 1;
        }

        sections.set(sectionId, existing);
    }

    return Array.from(sections.values()).map((section) => ({
        ...section,
        accuracy: section.attempted > 0 ? Number(((section.correct / section.attempted) * 100).toFixed(2)) : 0,
    }));
}

function buildTopicPerformance(questionRows: any[], outcomesByQuestionId: Map<string, any>) {
    const topics = new Map<string, {
        topicId: string | null;
        topicName: string;
        subjectName: string;
        attempted: number;
        correct: number;
    }>();

    for (const row of questionRows) {
        const topicId = row.question?.topic_id || null;
        const topicName = row.question?.topics?.name || row._resolvedSection?.name || 'General';
        const subjectName = row._resolvedSection?.subject_name || row.question?.topics?.chapters?.subjects?.name || 'General';
        const key = `${topicId || 'general'}:${topicName}`;
        const outcome = outcomesByQuestionId.get(row.question.id);
        const existing = topics.get(key) || {
            topicId,
            topicName,
            subjectName,
            attempted: 0,
            correct: 0,
        };

        if (outcome?.isAttempted) {
            existing.attempted += 1;
            if (outcome.isCorrect) {
                existing.correct += 1;
            }
        }

        topics.set(key, existing);
    }

    return Array.from(topics.values()).map((entry) => ({
        ...entry,
        accuracy: entry.attempted > 0 ? Number(((entry.correct / entry.attempted) * 100).toFixed(2)) : 0,
    }));
}

async function calculateExamPercentile(examId: string, score: number) {
    const db = getDb();
    const { data, error } = await db
        .from('exam_results')
        .select('score')
        .eq('exam_id', examId);

    if (error) {
        throw error;
    }

    const scores = ensureArray(data)
        .map((row) => Number(row.score || 0))
        .filter((value) => Number.isFinite(value));

    if (scores.length === 0) {
        return 0;
    }

    const belowOrEqual = scores.filter((value) => value <= score).length;
    return Number(((belowOrEqual / scores.length) * 100).toFixed(2));
}

export async function submitOnlineExamAttempt(
    userId: string,
    attemptId: string,
    payload: {
        answers?: Record<string, string>;
        questionTimeMap?: Record<string, number>;
        markedForReview?: string[];
        timeTakenSeconds?: number;
        timeRemainingSeconds?: number | null;
        autoSubmitted?: boolean;
    }
): Promise<OnlineExamResultDetail> {
    const db = getDb();
    const { data: attempt, error: attemptError } = await db
        .from('exam_attempts')
        .select(`
            *,
            exam:exam_id (
                id,
                title,
                exam_mode,
                duration_minutes,
                total_marks
            )
        `)
        .eq('id', attemptId)
        .eq('user_id', userId)
        .maybeSingle();

    if (attemptError) {
        throw attemptError;
    }

    if (!attempt) {
        throw new Error('Exam attempt not found.');
    }

    if (['completed', 'auto_submitted'].includes(attempt.status)) {
        return getOnlineExamResult(userId, attemptId);
    }

    const questionRows = await loadExamQuestionRows(attempt.exam_id);
    if (questionRows.length === 0) {
        throw new Error('This online exam has no questions configured.');
    }

    const { sections } = await loadExamCore(attempt.exam_id);
    const answers = payload.answers || ensureObject(attempt.answers, {});
    const questionTimeMap = payload.questionTimeMap || ensureObject(attempt.question_time_map, {});
    const markedForReview = payload.markedForReview || ensureArray(attempt.marked_for_review, []);
    const markedSet = new Set(markedForReview);

    for (const row of questionRows) {
        row._resolvedSection = resolveSectionForQuestion(row, sections);
    }

    const outcomesByQuestionId = new Map<string, any>();
    const examAnswerRows: any[] = [];
    const questionAttemptRecords: Array<{
        questionId: string;
        isCorrect: boolean;
        timeTakenSeconds: number;
        userAnswer: string | null;
        correctAnswer: string;
    }> = [];
    const questionReview = [];

    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    for (const row of questionRows) {
        const question = row.question;
        const selectedAnswer = answers[question.id] || '';
        const correctAnswer = row.correct_answer_override || question.correct_answer;
        const outcome = evaluateQuestion(
            {
                id: question.id,
                question_type: row.question_type || question.question_type,
                correct_answer: correctAnswer,
                marks: Number(row.marks || question.marks || 0),
                negative_marks: Number(row.negative_marks ?? question.negative_marks ?? 0),
            },
            selectedAnswer,
            {
                marks: Number(row.marks || question.marks || 0),
                negativeMarks: Number(row.negative_marks ?? question.negative_marks ?? 0),
            }
        );

        outcomesByQuestionId.set(question.id, outcome);

        if (!outcome.isAttempted) {
            unattemptedCount += 1;
        } else if (outcome.isCorrect) {
            correctCount += 1;
        } else {
            incorrectCount += 1;
        }

        const timeSpentSeconds = Number(questionTimeMap[question.id] || 0);

        examAnswerRows.push({
            attempt_id: attemptId,
            question_id: question.id,
            section_id: row._resolvedSection?.id || null,
            selected_answer: outcome.userAnswer,
            correct_answer: correctAnswer,
            is_correct: outcome.isCorrect,
            marks_obtained: outcome.marksObtained,
            time_spent_seconds: timeSpentSeconds,
            is_marked_for_review: markedSet.has(question.id),
        });

        if (outcome.isAttempted) {
            questionAttemptRecords.push({
                questionId: question.id,
                isCorrect: outcome.isCorrect,
                timeTakenSeconds: timeSpentSeconds,
                userAnswer: outcome.userAnswer,
                correctAnswer,
            });
        }

        questionReview.push({
            questionId: question.id,
            sectionId: row._resolvedSection?.id || null,
            sectionName: row._resolvedSection?.name || 'General',
            subjectName: row._resolvedSection?.subject_name || question?.topics?.chapters?.subjects?.name || 'General',
            topicName: question?.topics?.name || null,
            questionText: question.question_text,
            questionType: row.question_type || question.question_type,
            selectedAnswer: outcome.userAnswer,
            correctAnswer,
            isCorrect: outcome.isCorrect,
            isAttempted: outcome.isAttempted,
            marksObtained: outcome.marksObtained,
            maxMarks: Number(row.marks || question.marks || 0),
            timeSpentSeconds,
        });
    }

    const totalScore = sumMarks(Array.from(outcomesByQuestionId.values()));
    const maxScore = questionRows.reduce((total, row) => total + Number(row.marks || row.question?.marks || 0), 0);
    const accuracy = calculateAccuracy(correctCount, correctCount + incorrectCount);
    const sectionAnalysis = buildSectionAnalysis(questionRows, outcomesByQuestionId);
    const topicPerformance = buildTopicPerformance(questionRows, outcomesByQuestionId);
    const weakTopics = topicPerformance
        .filter((topic) => topic.attempted > 0 && topic.accuracy < 65)
        .sort((left, right) => left.accuracy - right.accuracy)
        .slice(0, 6)
        .map((topic) => topic.topicName);
    const percentile = (await calculateExamPercentile(attempt.exam_id, totalScore)) || (maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(2)) : 0);
    const rankPrediction = Math.max(1, Math.round(getCandidatePool(attempt.exam?.exam_mode || 'jee') * (1 - (percentile / 100) * 0.93)));
    const timeTakenSeconds = typeof payload.timeTakenSeconds === 'number'
        ? payload.timeTakenSeconds
        : Math.max(0, Number(attempt.exam?.duration_minutes || 0) * 60 - Number(payload.timeRemainingSeconds ?? attempt.time_remaining_seconds ?? 0));
    const submittedAt = new Date().toISOString();
    const status = payload.autoSubmitted || attempt.auto_submitted || attempt.status === 'flagged'
        ? 'auto_submitted'
        : attempt.flagged
            ? 'flagged'
            : 'completed';
    const subjectTimeBreakdown = sectionAnalysis.map((section) => ({
        sectionId: section.sectionId,
        sectionName: section.sectionName,
        subjectName: section.subjectName,
        totalTimeSeconds: questionReview
            .filter((question) => question.sectionId === section.sectionId)
            .reduce((total, question) => total + Number(question.timeSpentSeconds || 0), 0),
    }));

    const deleteAnswersResult = await db
        .from('exam_answers')
        .delete()
        .eq('attempt_id', attemptId);

    if (deleteAnswersResult.error) {
        throw deleteAnswersResult.error;
    }

    if (examAnswerRows.length > 0) {
        const { error: insertAnswersError } = await db
            .from('exam_answers')
            .insert(examAnswerRows);

        if (insertAnswersError) {
            throw insertAnswersError;
        }
    }

    if (questionAttemptRecords.length > 0) {
        const { error: questionAttemptError } = await db
            .from('question_attempts')
            .insert(
                questionAttemptRecords.map((record) => ({
                    user_id: userId,
                    question_id: record.questionId,
                    is_correct: record.isCorrect,
                    time_taken_seconds: record.timeTakenSeconds,
                    user_answer: record.userAnswer,
                    correct_answer: record.correctAnswer,
                }))
            );

        if (questionAttemptError) {
            throw questionAttemptError;
        }

        await upsertLearningProgress(
            db,
            userId,
            questionAttemptRecords.map((record) => ({
                questionId: record.questionId,
                isCorrect: record.isCorrect,
                timeTakenSeconds: record.timeTakenSeconds,
            }))
        );
    }

    const [{ error: attemptUpdateError }, { error: resultUpsertError }] = await Promise.all([
        db
            .from('exam_attempts')
            .update({
                submitted_at: submittedAt,
                time_taken_seconds: timeTakenSeconds,
                time_remaining_seconds: payload.timeRemainingSeconds ?? 0,
                total_score: totalScore,
                max_score: maxScore,
                accuracy,
                correct_count: correctCount,
                incorrect_count: incorrectCount,
                unattempted_count: unattemptedCount,
                percentile,
                rank_prediction: rankPrediction,
                status,
                auto_submitted: payload.autoSubmitted || attempt.auto_submitted || false,
                answers,
                question_time_map: questionTimeMap,
                marked_for_review: markedForReview,
                last_activity_at: submittedAt,
                updated_at: submittedAt,
            })
            .eq('id', attemptId)
            .eq('user_id', userId),
        db
            .from('exam_results')
            .upsert({
                attempt_id: attemptId,
                exam_id: attempt.exam_id,
                user_id: userId,
                score: totalScore,
                max_score: maxScore,
                accuracy,
                percentile,
                rank_prediction: rankPrediction,
                correct_count: correctCount,
                incorrect_count: incorrectCount,
                unattempted_count: unattemptedCount,
                warning_count: Number(attempt.warning_count || 0),
                flagged: Boolean(attempt.flagged),
                auto_submitted: payload.autoSubmitted || attempt.auto_submitted || false,
                section_analysis: sectionAnalysis,
                topic_performance: topicPerformance,
                weak_topics: weakTopics,
                question_review: questionReview,
                subject_time_breakdown: subjectTimeBreakdown,
                updated_at: submittedAt,
            }, { onConflict: 'attempt_id' }),
    ]);

    if (attemptUpdateError) {
        throw attemptUpdateError;
    }
    if (resultUpsertError) {
        throw resultUpsertError;
    }

    await writePlatformAuditLog({
        auditType: 'online_exam',
        auditSubtype: 'submission',
        timeRange: 'live',
        status: 'healthy',
        title: 'Online exam submitted successfully',
        summary: `${attempt.exam?.title || 'Online exam'} submitted with score ${totalScore}/${maxScore}`,
        affectedModule: 'online_exam',
        metadata: {
            attemptId,
            examId: attempt.exam_id,
            score: totalScore,
            accuracy,
            percentile,
            rankPrediction,
        },
        notifiedAdmin: false,
        notifiedEmail: false,
    });

    return getOnlineExamResult(userId, attemptId);
}

export async function getOnlineExamResult(userId: string, attemptId: string): Promise<OnlineExamResultDetail> {
    const db = getDb();
    const { data, error } = await db
        .from('exam_results')
        .select(`
            *,
            exam:exam_id (
                title,
                exam_mode
            ),
            attempt:attempt_id (
                exam_id,
                submitted_at,
                warning_count,
                flagged,
                auto_submitted
            )
        `)
        .eq('attempt_id', attemptId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error('Exam result not found.');
    }

    return {
        attemptId,
        examId: data.exam_id,
        examTitle: data.exam?.title || 'Online Exam',
        examMode: data.exam?.exam_mode || 'jee',
        submittedAt: data.attempt?.submitted_at || data.created_at,
        score: Number(data.score || 0),
        maxScore: Number(data.max_score || 0),
        accuracy: Number(data.accuracy || 0),
        percentile: Number(data.percentile || 0),
        rankPrediction: Number(data.rank_prediction || 0),
        correctCount: Number(data.correct_count || 0),
        incorrectCount: Number(data.incorrect_count || 0),
        unattemptedCount: Number(data.unattempted_count || 0),
        warningCount: Number(data.warning_count || data.attempt?.warning_count || 0),
        flagged: Boolean(data.flagged || data.attempt?.flagged),
        autoSubmitted: Boolean(data.auto_submitted || data.attempt?.auto_submitted),
        weakTopics: ensureArray(data.weak_topics, []),
        sections: ensureArray(data.section_analysis, []),
        topicPerformance: ensureArray(data.topic_performance, []),
        questions: ensureArray(data.question_review, []),
    };
}

export async function getAdminOnlineExamDetail(examId: string) {
    const { exam, sections } = await loadExamCore(examId);
    if (!exam) {
        throw new Error('Online exam not found.');
    }

    const questionRows = await loadExamQuestionRows(examId);
    return {
        exam: {
            ...exam,
            instructions: ensureArray(exam.instructions, DEFAULT_EXAM_INSTRUCTIONS),
        },
        sections: sections.map((section) => ({
            id: section.id,
            name: section.name,
            subjectName: section.subject_name || section.name,
            instructions: ensureArray(section.instructions, []),
            displayOrder: section.display_order || 0,
        })),
        selectedQuestionIds: questionRows.map((row) => row.question_id),
    };
}

export async function getAdminOnlineExamOverview(): Promise<AdminOnlineExamOverview> {
    const db = getDb();
    const [{ data: exams, error: examsError }, { data: attempts, error: attemptsError }, { data: logs, error: logsError }] = await Promise.all([
        db
            .from('online_exams')
            .select('*')
            .order('created_at', { ascending: false }),
        db
            .from('exam_attempts')
            .select('exam_id, status, total_score, flagged'),
        db
            .from('proctoring_logs')
            .select(`
                *,
                exam:exam_id (
                    title
                ),
                candidate:user_id (
                    full_name
                )
            `)
            .order('created_at', { ascending: false })
            .limit(20),
    ]);

    if (examsError) {
        throw examsError;
    }
    if (attemptsError) {
        throw attemptsError;
    }
    if (logsError) {
        throw logsError;
    }

    const attemptRows = ensureArray(attempts);
    const recentProctoringLogs: ProctoringLogEntry[] = [];

    for (const row of ensureArray(logs)) {
        recentProctoringLogs.push({
            id: row.id,
            examId: row.exam_id,
            examTitle: row.exam?.title || 'Online Exam',
            attemptId: row.attempt_id,
            userId: row.user_id,
            candidateName: row.candidate?.full_name || 'Student',
            eventType: row.event_type,
            severity: row.severity,
            warningMessage: row.warning_message || null,
            screenshotUrl: await maybeCreateSignedSnapshotUrl(row.screenshot_url),
            metadata: ensureObject(row.metadata, {}),
            createdAt: row.created_at,
        });
    }

    return {
        exams: ensureArray(exams).map((exam) => {
            const examAttempts = attemptRows.filter((attempt) => attempt.exam_id === exam.id);
            const completedAttempts = examAttempts.filter((attempt) => ['completed', 'auto_submitted'].includes(attempt.status));
            const averageScore = completedAttempts.length > 0
                ? completedAttempts.reduce((total, attempt) => total + Number(attempt.total_score || 0), 0) / completedAttempts.length
                : 0;

            return {
                ...mapExamSummary(exam, null),
                attemptsCount: examAttempts.length,
                activeAttemptsCount: examAttempts.filter((attempt) => ['in_progress', 'flagged'].includes(attempt.status)).length,
                averageScore: Number(averageScore.toFixed(2)),
                flaggedAttemptsCount: examAttempts.filter((attempt) => attempt.flagged || attempt.status === 'flagged').length,
            };
        }),
        recentProctoringLogs,
        activeAttempts: attemptRows.filter((attempt) => ['in_progress', 'flagged'].includes(attempt.status)).length,
        flaggedAttempts: attemptRows.filter((attempt) => attempt.flagged || attempt.status === 'flagged').length,
    };
}

export async function saveOnlineExamAdmin(
    adminUserId: string,
    payload: {
        id?: string | null;
        title: string;
        description?: string | null;
        examMode: string;
        durationMinutes: number;
        scheduledAt?: string | null;
        startTime?: string | null;
        endTime?: string | null;
        instructions?: string[];
        isPublished?: boolean;
        showResultImmediately?: boolean;
        proctoringEnabled?: boolean;
        desktopOnly?: boolean;
        warningThreshold?: number;
        autoSubmitThreshold?: number;
        retentionDays?: number;
        sections: Array<{
            name: string;
            subjectName?: string | null;
            instructions?: string[];
            displayOrder?: number;
        }>;
        selectedQuestionIds: string[];
    }
) {
    const db = getDb();
    const examId = payload.id || undefined;
    const selectedQuestionIds = Array.from(new Set(ensureArray(payload.selectedQuestionIds).filter(Boolean)));

    const { data: questionRows, error: questionError } = selectedQuestionIds.length > 0
        ? await db
            .from('questions')
            .select(`
                id,
                question_type,
                marks,
                negative_marks,
                topic_id,
                topics:topic_id (
                    name,
                    chapters:chapter_id (
                        subjects:subject_id (
                            name
                        )
                    )
                )
            `)
            .in('id', selectedQuestionIds)
        : { data: [], error: null };

    if (questionError) {
        throw questionError;
    }

    const normalizedSections = ensureArray(payload.sections)
        .filter((section) => section.name?.trim())
        .map((section, index) => ({
            name: section.name.trim(),
            subject_name: (section.subjectName || section.name).trim(),
            instructions: ensureArray(section.instructions, []),
            display_order: typeof section.displayOrder === 'number' ? section.displayOrder : index,
        }));

    if (normalizedSections.length === 0) {
        throw new Error('At least one exam section is required.');
    }

    const questionSubjectMap = new Map<string, string>();
    for (const row of ensureArray(questionRows)) {
        questionSubjectMap.set(row.id, row.topics?.chapters?.subjects?.name || 'General');
    }

    const totalMarks = ensureArray(questionRows).reduce((total, row) => total + Number(row.marks || 0), 0);

    const { data: savedExam, error: examError } = await db
        .from('online_exams')
        .upsert({
            id: examId,
            title: payload.title,
            description: payload.description || null,
            exam_mode: payload.examMode,
            duration_minutes: Number(payload.durationMinutes || 180),
            total_marks: totalMarks,
            question_count: selectedQuestionIds.length,
            scheduled_at: payload.scheduledAt || null,
            start_time: payload.startTime || null,
            end_time: payload.endTime || null,
            instructions: ensureArray(payload.instructions, DEFAULT_EXAM_INSTRUCTIONS),
            is_published: Boolean(payload.isPublished),
            show_result_immediately: payload.showResultImmediately !== false,
            proctoring_enabled: payload.proctoringEnabled !== false,
            desktop_only: payload.desktopOnly !== false,
            warning_threshold: Number(payload.warningThreshold || 3),
            auto_submit_threshold: Number(payload.autoSubmitThreshold || 5),
            snapshot_retention_days: Number(payload.retentionDays || 30),
            section_config: normalizedSections,
            created_by: adminUserId,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select('id')
        .single();

    if (examError) {
        throw examError;
    }

    const resolvedExamId = savedExam.id;

    const deleteExamQuestionsResult = await db
        .from('exam_questions')
        .delete()
        .eq('exam_id', resolvedExamId);

    if (deleteExamQuestionsResult.error) {
        throw deleteExamQuestionsResult.error;
    }

    const deleteSectionsResult = await db
        .from('exam_sections')
        .delete()
        .eq('exam_id', resolvedExamId);

    if (deleteSectionsResult.error) {
        throw deleteSectionsResult.error;
    }

    const { data: insertedSections, error: sectionInsertError } = await db
        .from('exam_sections')
        .insert(
            normalizedSections.map((section) => ({
                exam_id: resolvedExamId,
                name: section.name,
                subject_name: section.subject_name,
                instructions: section.instructions,
                display_order: section.display_order,
            }))
        )
        .select('id, name, subject_name, display_order');

    if (sectionInsertError) {
        throw sectionInsertError;
    }

    const sectionByName = new Map<string, any>();
    for (const section of ensureArray(insertedSections)) {
        sectionByName.set((section.subject_name || section.name || '').toLowerCase(), section);
        sectionByName.set(section.name.toLowerCase(), section);
    }

    if (selectedQuestionIds.length > 0) {
        const examQuestionRows = ensureArray(questionRows).map((question, index) => {
            const subjectName = (questionSubjectMap.get(question.id) || 'General').toLowerCase();
            const matchedSection = sectionByName.get(subjectName) || ensureArray(insertedSections)[0];
            return {
                exam_id: resolvedExamId,
                section_id: matchedSection?.id || null,
                question_id: question.id,
                question_type: question.question_type,
                marks: Number(question.marks || 4),
                negative_marks: Number(question.negative_marks || 1),
                display_order: index + 1,
            };
        });

        const { error: examQuestionInsertError } = await db
            .from('exam_questions')
            .insert(examQuestionRows);

        if (examQuestionInsertError) {
            throw examQuestionInsertError;
        }
    }

    const sectionCounts = new Map<string, number>();
    for (const row of ensureArray(questionRows)) {
        const subjectName = (questionSubjectMap.get(row.id) || 'General').toLowerCase();
        const matchedSection = sectionByName.get(subjectName) || ensureArray(insertedSections)[0];
        if (matchedSection) {
            sectionCounts.set(matchedSection.id, (sectionCounts.get(matchedSection.id) || 0) + 1);
        }
    }

    for (const section of ensureArray(insertedSections)) {
        await db
            .from('exam_sections')
            .update({
                total_questions: sectionCounts.get(section.id) || 0,
            })
            .eq('id', section.id);
    }

    return {
        examId: resolvedExamId,
    };
}

export async function deleteOnlineExam(examId: string) {
    const db = getDb();
    const { error } = await db
        .from('online_exams')
        .delete()
        .eq('id', examId);

    if (error) {
        throw error;
    }

    return { deleted: true };
}
