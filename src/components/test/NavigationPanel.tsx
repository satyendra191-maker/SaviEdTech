'use client';

import { ChevronLeft, ChevronRight, Flag, CheckCircle, Circle, HelpCircle } from 'lucide-react';

export type QuestionStatus = 'not_visited' | 'visited' | 'answered' | 'marked_for_review' | 'answered_and_marked';

interface NavigationPanelProps {
    totalQuestions: number;
    currentQuestion: number;
    questionStatuses: QuestionStatus[];
    sectionBreakdown?: { name: string; startIndex: number; count: number }[];
    onQuestionSelect: (index: number) => void;
    onPrevious: () => void;
    onNext: () => void;
    onSubmit: () => void;
    answeredCount: number;
    markedCount: number;
    notVisitedCount: number;
    submitLabel?: string;
}

export function NavigationPanel({
    totalQuestions,
    currentQuestion,
    questionStatuses,
    sectionBreakdown,
    onQuestionSelect,
    onPrevious,
    onNext,
    onSubmit,
    answeredCount,
    markedCount,
    notVisitedCount,
    submitLabel = 'Submit Test',
}: NavigationPanelProps) {
    const getStatusStyles = (status: QuestionStatus, isCurrent: boolean) => {
        const baseStyles = 'relative flex items-center justify-center w-10 h-10 rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer';

        if (isCurrent) {
            return `${baseStyles} ring-2 ring-primary-500 ring-offset-2`;
        }

        switch (status) {
            case 'answered':
                return `${baseStyles} bg-green-500 text-white hover:bg-green-600`;
            case 'marked_for_review':
                return `${baseStyles} bg-purple-500 text-white hover:bg-purple-600`;
            case 'answered_and_marked':
                return `${baseStyles} bg-gradient-to-br from-green-500 to-purple-500 text-white hover:from-green-600 hover:to-purple-600`;
            case 'visited':
                return `${baseStyles} bg-orange-100 text-orange-700 border-2 border-orange-300 hover:bg-orange-200`;
            case 'not_visited':
            default:
                return `${baseStyles} bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200`;
        }
    };

    const getStatusBadge = (status: QuestionStatus) => {
        switch (status) {
            case 'marked_for_review':
                return (
                    <span className="absolute -right-1 -top-1 rounded-full bg-purple-600 p-0.5 text-white">
                        <Flag className="h-2.5 w-2.5" />
                    </span>
                );
            case 'answered_and_marked':
                return (
                    <>
                        <span className="absolute -left-1 -bottom-1 rounded-full bg-green-600 p-0.5 text-white">
                            <CheckCircle className="h-2.5 w-2.5" />
                        </span>
                        <span className="absolute -right-1 -top-1 rounded-full bg-purple-600 p-0.5 text-white">
                            <Flag className="h-2.5 w-2.5" />
                        </span>
                    </>
                );
            case 'answered':
                return (
                    <span className="absolute -right-1 -bottom-1 rounded-full bg-green-600 p-0.5 text-white">
                        <CheckCircle className="h-2.5 w-2.5" />
                    </span>
                );
            case 'visited':
                return (
                    <span className="absolute -right-1 -bottom-1 rounded-full bg-orange-500 p-0.5 text-white">
                        <HelpCircle className="h-2.5 w-2.5" />
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Question Navigator</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Jump to any question or review your progress
                </p>
            </div>

            {/* Legend */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 border-2 border-gray-200">
                            <Circle className="w-3 h-3 text-gray-500" />
                        </div>
                        <span className="text-gray-600">Not Visited ({notVisitedCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-orange-100 border-2 border-orange-300">
                            <HelpCircle className="w-3 h-3 text-orange-600" />
                        </div>
                        <span className="text-gray-600">Visited</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-green-500">
                            <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-600">Answered ({answeredCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-purple-500">
                            <Flag className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-600">Marked ({markedCount})</span>
                    </div>
                </div>
            </div>

            {/* Section Headers and Question Grid */}
            <div className="p-6 max-h-[400px] overflow-y-auto">
                {sectionBreakdown ? (
                    sectionBreakdown.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="mb-6 last:mb-0">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 sticky top-0 bg-white py-2 border-b border-gray-100">
                                {section.name} ({section.count} Questions)
                            </h4>
                            <div className="grid grid-cols-5 gap-2">
                                {questionStatuses
                                    .slice(section.startIndex, section.startIndex + section.count)
                                    .map((status, idx) => {
                                        const questionIndex = section.startIndex + idx;
                                        return (
                                            <button
                                                key={questionIndex}
                                                onClick={() => onQuestionSelect(questionIndex)}
                                                className={getStatusStyles(status, currentQuestion === questionIndex)}
                                                title={`Question ${questionIndex + 1}`}
                                            >
                                                <span>{questionIndex + 1}</span>
                                                {getStatusBadge(status)}
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="grid grid-cols-5 gap-2">
                        {questionStatuses.map((status, index) => (
                            <button
                                key={index}
                                onClick={() => onQuestionSelect(index)}
                                className={getStatusStyles(status, currentQuestion === index)}
                                title={`Question ${index + 1}`}
                            >
                                <span>{index + 1}</span>
                                {getStatusBadge(status)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
                <div className="flex gap-2">
                    <button
                        onClick={onPrevious}
                        disabled={currentQuestion === 0}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Previous</span>
                    </button>
                    <button
                        onClick={onNext}
                        disabled={currentQuestion === totalQuestions - 1}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                <button
                    onClick={onSubmit}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 active:scale-[0.98] transition-all"
                >
                    <CheckCircle className="w-5 h-5" />
                    {submitLabel}
                </button>
            </div>

            {/* Summary */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-center">
                <p className="text-sm text-gray-600">
                    <span className="font-semibold text-green-600">{answeredCount}</span> of{' '}
                    <span className="font-semibold">{totalQuestions}</span> answered
                </p>
            </div>
        </div>
    );
}

export default NavigationPanel;
