'use client';

import { useEffect, useState } from 'react';
import { HelpCircle, Image as ImageIcon, Calculator, BookOpen } from 'lucide-react';

interface QuestionOption {
    id: string;
    option_label: string;
    option_text: string;
    option_image_url?: string | null;
}

interface Question {
    id: string;
    question_text: string;
    question_image_url?: string | null;
    question_type: 'MCQ' | 'NUMERICAL' | 'ASSERTION_REASON';
    options?: QuestionOption[];
    marks: number;
    negative_marks: number;
    hint?: string | null;
}

interface QuestionCardProps {
    question: Question;
    questionNumber: number;
    totalQuestions: number;
    selectedAnswer?: string;
    onAnswerSelect: (answer: string) => void;
    onMarkForReview: () => void;
    isMarkedForReview: boolean;
    sectionName?: string;
}

export function QuestionCard({
    question,
    questionNumber,
    totalQuestions,
    selectedAnswer,
    onAnswerSelect,
    onMarkForReview,
    isMarkedForReview,
    sectionName,
}: QuestionCardProps) {
    const [showHint, setShowHint] = useState(false);
    const [numericalInput, setNumericalInput] = useState(selectedAnswer || '');

    useEffect(() => {
        setNumericalInput(selectedAnswer || '');
    }, [selectedAnswer, question.id]);

    const handleNumericalChange = (value: string) => {
        // Allow only numbers and decimal point
        if (/^-?\d*\.?\d*$/.test(value)) {
            setNumericalInput(value);
            onAnswerSelect(value);
        }
    };

    const getQuestionTypeIcon = () => {
        switch (question.question_type) {
            case 'NUMERICAL':
                return <Calculator className="w-4 h-4" />;
            case 'ASSERTION_REASON':
                return <BookOpen className="w-4 h-4" />;
            default:
                return <HelpCircle className="w-4 h-4" />;
        }
    };

    const getQuestionTypeLabel = () => {
        switch (question.question_type) {
            case 'NUMERICAL':
                return 'Numerical';
            case 'ASSERTION_REASON':
                return 'Assertion-Reason';
            default:
                return 'Multiple Choice';
        }
    };

    const renderLatexText = (text: string) => {
        // Simple LaTeX-like rendering for common patterns
        // This is a basic implementation - for production, use a proper LaTeX library like KaTeX or MathJax
        const processedText = text
            // Superscripts
            .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
            .replace(/\^([0-9a-zA-Z])/g, '<sup>$1</sup>')
            // Subscripts
            .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
            .replace(/_([0-9a-zA-Z])/g, '<sub>$1</sub>')
            // Fractions
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="inline-flex flex-col items-center mx-1"><span class="border-b border-current px-1">$1</span><span class="px-1">$2</span></span>')
            // Square roots
            .replace(/\\sqrt\{([^}]+)\}/g, '√<span class="border-t border-current">$1</span>')
            .replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, '<sup>$1</sup>√<span class="border-t border-current">$2</span>')
            // Common symbols
            .replace(/\\times/g, '×')
            .replace(/\\div/g, '÷')
            .replace(/\\pm/g, '±')
            .replace(/\\pi/g, 'π')
            .replace(/\\alpha/g, 'α')
            .replace(/\\beta/g, 'β')
            .replace(/\\gamma/g, 'γ')
            .replace(/\\delta/g, 'δ')
            .replace(/\\Delta/g, 'Δ')
            .replace(/\\theta/g, 'θ')
            .replace(/\\omega/g, 'ω')
            .replace(/\\sum/g, 'Σ')
            .replace(/\\int/g, '∫')
            .replace(/\\infty/g, '∞')
            .replace(/\\neq/g, '≠')
            .replace(/\\leq/g, '≤')
            .replace(/\\geq/g, '≥')
            .replace(/\\approx/g, '≈')
            .replace(/\\rightarrow/g, '→')
            .replace(/\\leftarrow/g, '←')
            .replace(/\\degree/g, '°')
            // Line breaks
            .replace(/\\\\/g, '<br />')
            // Remove remaining LaTeX backslashes for display
            .replace(/\\([a-zA-Z]+)/g, '$1');

        return <span dangerouslySetInnerHTML={{ __html: processedText }} />;
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 text-primary-700 font-bold text-lg">
                        {questionNumber}
                    </span>
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            Question {questionNumber} of {totalQuestions}
                        </p>
                        {sectionName && (
                            <p className="text-xs text-gray-500">{sectionName}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm">
                        {getQuestionTypeIcon()}
                        <span className="hidden sm:inline">{getQuestionTypeLabel()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600 font-medium">+{question.marks}</span>
                        {question.negative_marks > 0 && (
                            <span className="text-red-500 font-medium">-{question.negative_marks}</span>
                        )}
                    </div>
                    <button
                        onClick={onMarkForReview}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isMarkedForReview
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <svg
                            className={`w-4 h-4 ${isMarkedForReview ? 'fill-current' : ''}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span className="hidden sm:inline">
                            {isMarkedForReview ? 'Marked' : 'Mark for Review'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Question Content */}
            <div className="p-6">
                {/* Question Text */}
                <div className="text-lg text-gray-900 leading-relaxed mb-6">
                    {renderLatexText(question.question_text)}
                </div>

                {/* Question Image */}
                {question.question_image_url && (
                    <div className="mb-6">
                        <img
                            src={question.question_image_url}
                            alt="Question diagram"
                            className="max-w-full rounded-xl border border-gray-200"
                        />
                    </div>
                )}

                {/* Options for MCQ */}
                {question.question_type === 'MCQ' && question.options && (
                    <div className="space-y-3">
                        {question.options.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => onAnswerSelect(option.option_label)}
                                className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${selectedAnswer === option.option_label
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <span
                                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm transition-colors ${selectedAnswer === option.option_label
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    {option.option_label}
                                </span>
                                <div className="flex-1 pt-0.5">
                                    <span className="text-gray-900">
                                        {renderLatexText(option.option_text)}
                                    </span>
                                    {option.option_image_url && (
                                        <img
                                            src={option.option_image_url}
                                            alt={`Option ${option.option_label}`}
                                            className="mt-2 max-h-32 rounded-lg border border-gray-200"
                                        />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Numerical Input */}
                {question.question_type === 'NUMERICAL' && (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                            Enter your answer (numerical value):
                        </label>
                        <input
                            type="text"
                            value={numericalInput}
                            onChange={(e) => handleNumericalChange(e.target.value)}
                            placeholder="Enter a number..."
                            className="w-full max-w-xs px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all text-lg"
                        />
                        <p className="text-sm text-gray-500">
                            Enter the numerical answer. Decimal values are allowed.
                        </p>
                    </div>
                )}

                {/* Assertion-Reason Options */}
                {question.question_type === 'ASSERTION_REASON' && question.options && (
                    <div className="space-y-3">
                        {question.options.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => onAnswerSelect(option.option_label)}
                                className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${selectedAnswer === option.option_label
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <span
                                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm transition-colors ${selectedAnswer === option.option_label
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    {option.option_label}
                                </span>
                                <span className="flex-1 pt-0.5 text-gray-900">
                                    {renderLatexText(option.option_text)}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Hint Section */}
                {question.hint && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <button
                            onClick={() => setShowHint(!showHint)}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <HelpCircle className="w-4 h-4" />
                            {showHint ? 'Hide Hint' : 'Show Hint'}
                        </button>
                        {showHint && (
                            <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                                <strong className="block mb-1">Hint:</strong>
                                {renderLatexText(question.hint)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default QuestionCard;
