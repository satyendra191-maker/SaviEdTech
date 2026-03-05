'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Question, Test, TestAttempt } from '@/types';

export type QuestionStatus = 'not_visited' | 'visited' | 'answered' | 'marked_for_review' | 'answered_and_marked';

interface TestState {
    currentQuestionIndex: number;
    answers: Record<string, string>;
    markedQuestions: Set<string>;
    questionStatuses: QuestionStatus[];
    timeRemaining: number;
    isSubmitting: boolean;
    isSubmitted: boolean;
    startTime: Date | null;
}

interface UseTestProps {
    test: Test;
    questions: Question[];
    attemptId?: string;
    onSubmit: (answers: Record<string, string>, timeTakenSeconds: number) => Promise<void>;
    onAutoSave?: (answers: Record<string, string>) => Promise<void>;
}

interface UseTestReturn extends TestState {
    // Navigation
    goToQuestion: (index: number) => void;
    goToNext: () => void;
    goToPrevious: () => void;
    
    // Answering
    selectAnswer: (questionId: string, answer: string) => void;
    clearAnswer: (questionId: string) => void;
    
    // Marking
    toggleMarkForReview: (questionId: string) => void;
    isMarkedForReview: (questionId: string) => boolean;
    
    // Status
    getQuestionStatus: (index: number) => QuestionStatus;
    getAnsweredCount: () => number;
    getMarkedCount: () => number;
    getNotVisitedCount: () => number;
    
    // Submission
    submitTest: () => Promise<void>;
    handleTimeUp: () => void;
    
    // Current question
    currentQuestion: Question | null;
    currentAnswer: string | undefined;
}

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const VISITED_TIMEOUT = 3000; // 3 seconds to consider a question as "visited"

export function useTest({
    test,
    questions,
    attemptId,
    onSubmit,
    onAutoSave,
}: UseTestProps): UseTestReturn {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
    const [questionStatuses, setQuestionStatuses] = useState<QuestionStatus[]>(
        () => Array(questions.length).fill('not_visited')
    );
    const [timeRemaining, setTimeRemaining] = useState(test.duration_minutes * 60);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [startTime] = useState<Date | null>(new Date());
    
    const visitedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedAnswersRef = useRef<Record<string, string>>({});

    // Load saved state from localStorage on mount
    useEffect(() => {
        if (!attemptId) return;
        
        const savedKey = `test_progress_${attemptId}`;
        const savedState = localStorage.getItem(savedKey);
        
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (parsed.answers) setAnswers(parsed.answers);
                if (parsed.markedQuestions) setMarkedQuestions(new Set(parsed.markedQuestions));
                if (parsed.currentQuestionIndex !== undefined) setCurrentQuestionIndex(parsed.currentQuestionIndex);
                if (parsed.timeRemaining !== undefined) setTimeRemaining(parsed.timeRemaining);
            } catch (e) {
                console.error('Failed to load saved test state:', e);
            }
        }
    }, [attemptId]);

    // Auto-save to localStorage and server
    useEffect(() => {
        if (!attemptId || isSubmitted) return;

        const saveProgress = async () => {
            // Save to localStorage
            const saveData = {
                answers,
                markedQuestions: Array.from(markedQuestions),
                currentQuestionIndex,
                timeRemaining,
                lastSaved: new Date().toISOString(),
            };
            localStorage.setItem(`test_progress_${attemptId}`, JSON.stringify(saveData));

            // Auto-save to server if answers have changed
            const answersChanged = JSON.stringify(answers) !== JSON.stringify(lastSavedAnswersRef.current);
            if (answersChanged && onAutoSave) {
                try {
                    await onAutoSave(answers);
                    lastSavedAnswersRef.current = { ...answers };
                } catch (e) {
                    console.error('Auto-save failed:', e);
                }
            }
        };

        // Save immediately when answers change
        saveProgress();

        // Set up interval for periodic saves
        autoSaveIntervalRef.current = setInterval(saveProgress, AUTO_SAVE_INTERVAL);

        return () => {
            if (autoSaveIntervalRef.current) {
                clearInterval(autoSaveIntervalRef.current);
            }
        };
    }, [answers, markedQuestions, currentQuestionIndex, timeRemaining, attemptId, isSubmitted, onAutoSave]);

    // Timer countdown
    useEffect(() => {
        if (isSubmitted) return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isSubmitted]);

    // Mark current question as visited after a delay
    useEffect(() => {
        if (visitedTimeoutRef.current) {
            clearTimeout(visitedTimeoutRef.current);
        }

        visitedTimeoutRef.current = setTimeout(() => {
            setQuestionStatuses((prev) => {
                const newStatuses = [...prev];
                const currentStatus = newStatuses[currentQuestionIndex];
                if (currentStatus === 'not_visited') {
                    newStatuses[currentQuestionIndex] = 'visited';
                }
                return newStatuses;
            });
        }, VISITED_TIMEOUT);

        return () => {
            if (visitedTimeoutRef.current) {
                clearTimeout(visitedTimeoutRef.current);
            }
        };
    }, [currentQuestionIndex]);

    const goToQuestion = useCallback((index: number) => {
        if (index >= 0 && index < questions.length) {
            setCurrentQuestionIndex(index);
        }
    }, [questions.length]);

    const goToNext = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
        }
    }, [currentQuestionIndex, questions.length]);

    const goToPrevious = useCallback(() => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex((prev) => prev - 1);
        }
    }, [currentQuestionIndex]);

    const selectAnswer = useCallback((questionId: string, answer: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: answer }));
        
        // Update status to answered
        const questionIndex = questions.findIndex(q => q.id === questionId);
        if (questionIndex !== -1) {
            setQuestionStatuses((prev) => {
                const newStatuses = [...prev];
                const currentStatus = newStatuses[questionIndex];
                if (currentStatus === 'marked_for_review' || currentStatus === 'answered_and_marked') {
                    newStatuses[questionIndex] = 'answered_and_marked';
                } else {
                    newStatuses[questionIndex] = 'answered';
                }
                return newStatuses;
            });
        }
    }, [questions]);

    const clearAnswer = useCallback((questionId: string) => {
        setAnswers((prev) => {
            const newAnswers = { ...prev };
            delete newAnswers[questionId];
            return newAnswers;
        });

        // Update status
        const questionIndex = questions.findIndex(q => q.id === questionId);
        if (questionIndex !== -1) {
            setQuestionStatuses((prev) => {
                const newStatuses = [...prev];
                const currentStatus = newStatuses[questionIndex];
                if (currentStatus === 'answered_and_marked') {
                    newStatuses[questionIndex] = 'marked_for_review';
                } else if (currentStatus === 'answered') {
                    newStatuses[questionIndex] = 'visited';
                }
                return newStatuses;
            });
        }
    }, [questions]);

    const toggleMarkForReview = useCallback((questionId: string) => {
        setMarkedQuestions((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(questionId)) {
                newSet.delete(questionId);
            } else {
                newSet.add(questionId);
            }
            return newSet;
        });

        // Update status
        const questionIndex = questions.findIndex(q => q.id === questionId);
        if (questionIndex !== -1) {
            setQuestionStatuses((prev) => {
                const newStatuses = [...prev];
                const currentStatus = newStatuses[questionIndex];
                const hasAnswer = answers[questionId];
                
                if (currentStatus === 'marked_for_review') {
                    newStatuses[questionIndex] = hasAnswer ? 'answered' : 'visited';
                } else if (currentStatus === 'answered_and_marked') {
                    newStatuses[questionIndex] = 'answered';
                } else if (hasAnswer) {
                    newStatuses[questionIndex] = 'answered_and_marked';
                } else {
                    newStatuses[questionIndex] = 'marked_for_review';
                }
                return newStatuses;
            });
        }
    }, [questions, answers]);

    const isMarkedForReview = useCallback((questionId: string) => {
        return markedQuestions.has(questionId);
    }, [markedQuestions]);

    const getQuestionStatus = useCallback((index: number): QuestionStatus => {
        return questionStatuses[index] || 'not_visited';
    }, [questionStatuses]);

    const getAnsweredCount = useCallback(() => {
        return Object.keys(answers).length;
    }, [answers]);

    const getMarkedCount = useCallback(() => {
        return markedQuestions.size;
    }, [markedQuestions]);

    const getNotVisitedCount = useCallback(() => {
        return questionStatuses.filter(s => s === 'not_visited').length;
    }, [questionStatuses]);

    const submitTest = useCallback(async () => {
        if (isSubmitting || isSubmitted) return;

        setIsSubmitting(true);
        try {
            const timeTakenSeconds = test.duration_minutes * 60 - timeRemaining;
            await onSubmit(answers, timeTakenSeconds);
            setIsSubmitted(true);
            
            // Clear saved progress
            if (attemptId) {
                localStorage.removeItem(`test_progress_${attemptId}`);
            }
        } catch (error) {
            console.error('Failed to submit test:', error);
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, isSubmitted, test.duration_minutes, timeRemaining, onSubmit, answers, attemptId]);

    const handleTimeUp = useCallback(() => {
        if (!isSubmitted) {
            submitTest();
        }
    }, [isSubmitted, submitTest]);

    const currentQuestion = questions[currentQuestionIndex] || null;
    const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

    return {
        // State
        currentQuestionIndex,
        answers,
        markedQuestions: new Set(markedQuestions),
        questionStatuses,
        timeRemaining,
        isSubmitting,
        isSubmitted,
        startTime,
        
        // Navigation
        goToQuestion,
        goToNext,
        goToPrevious,
        
        // Answering
        selectAnswer,
        clearAnswer,
        
        // Marking
        toggleMarkForReview,
        isMarkedForReview,
        
        // Status
        getQuestionStatus,
        getAnsweredCount,
        getMarkedCount,
        getNotVisitedCount,
        
        // Submission
        submitTest,
        handleTimeUp,
        
        // Current question
        currentQuestion,
        currentAnswer,
    };
}

export default useTest;
