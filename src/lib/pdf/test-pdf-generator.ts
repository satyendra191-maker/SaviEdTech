import jsPDF from 'jspdf';
import { format } from 'date-fns';

// Types matching the results page
interface QuestionResult {
    id: string;
    questionNumber: number;
    questionText: string;
    questionType: 'MCQ' | 'NUMERICAL' | 'ASSERTION_REASON';
    yourAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    isAttempted: boolean;
    marksObtained: number;
    maxMarks: number;
    negativeMarks: number;
    solution: string;
    solutionImage?: string | null;
    section: string;
    timeSpent: number;
    options?: { label: string; text: string }[];
}

interface SectionResult {
    name: string;
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    score: number;
    maxScore: number;
    accuracy: number;
    avgTimePerQuestion: number;
}

interface TestResult {
    id: string;
    testTitle: string;
    testType: 'JEE' | 'NEET' | 'custom';
    submittedAt: string;
    duration: number;
    timeTaken: number;
    totalScore: number;
    maxScore: number;
    percentage: number;
    percentile: number;
    rank: number | null;
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    accuracy: number;
    sections: SectionResult[];
    questions: QuestionResult[];
}

interface StudentInfo {
    name: string;
    email?: string;
    rollNumber?: string;
}

// Constants for PDF layout
const PDF_CONSTANTS = {
    MARGIN: 20,
    PAGE_WIDTH: 210, // A4 width in mm
    PAGE_HEIGHT: 297, // A4 height in mm
    HEADER_COLOR: '#2563eb', // primary-600
    TEXT_COLOR: '#1f2937', // gray-900
    SUBTEXT_COLOR: '#6b7280', // gray-500
    CORRECT_COLOR: '#16a34a', // green-600
    INCORRECT_COLOR: '#dc2626', // red-600
    UNATTEMPTED_COLOR: '#6b7280', // gray-500
    LINE_HEIGHT: 6,
    SECTION_SPACING: 10,
};

/**
 * Generate a comprehensive PDF answer key with test results
 */
export async function generateAnswerKeyPDF(
    result: TestResult,
    studentInfo: StudentInfo
): Promise<Blob> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    // Set default font
    doc.setFont('helvetica', 'normal');

    // Page 1: Header and Summary
    addHeader(doc, result, studentInfo);
    addSummary(doc, result);
    addSectionPerformance(doc, result);

    // Page 2+: Question Paper with Answers and Solutions
    doc.addPage();
    addQuestionPaperHeader(doc, result);
    addQuestionsWithSolutions(doc, result);

    // Return as blob
    return doc.output('blob');
}

/**
 * Add header with logo, test info, and student info
 */
function addHeader(
    doc: jsPDF,
    result: TestResult,
    studentInfo: StudentInfo
): void {
    const { MARGIN, PAGE_WIDTH, HEADER_COLOR } = PDF_CONSTANTS;

    // Header background
    doc.setFillColor(HEADER_COLOR);
    doc.rect(0, 0, PAGE_WIDTH, 35, 'F');

    // Title
    doc.setTextColor('#ffffff');
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SaviEdTech', MARGIN, 15);

    // Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Comprehensive Test Answer Key', MARGIN, 22);

    // Test type badge
    doc.setFillColor('#ffffff');
    doc.setTextColor(HEADER_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.roundedRect(PAGE_WIDTH - 50, 8, 30, 8, 2, 2, 'F');
    doc.text(result.testType.toUpperCase(), PAGE_WIDTH - 35, 13.5, { align: 'center' });

    // Horizontal line below header
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 45, PAGE_WIDTH - MARGIN, 45);

    // Test Info Section
    doc.setTextColor(PDF_CONSTANTS.TEXT_COLOR);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(result.testTitle, MARGIN, 55);

    // Test metadata
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(PDF_CONSTANTS.SUBTEXT_COLOR);
    const submittedDate = format(new Date(result.submittedAt), 'MMMM d, yyyy • h:mm a');
    doc.text(`Submitted on: ${submittedDate}`, MARGIN, 62);
    doc.text(`Duration: ${result.duration} minutes`, MARGIN, 68);
    doc.text(`Time Taken: ${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s`, MARGIN, 74);

    // Student Info Box (right side)
    const infoBoxX = PAGE_WIDTH - MARGIN - 70;
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(249, 250, 251); // gray-50
    doc.roundedRect(infoBoxX, 52, 70, 30, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(PDF_CONSTANTS.SUBTEXT_COLOR);
    doc.text('Student Name:', infoBoxX + 5, 60);
    doc.setTextColor(PDF_CONSTANTS.TEXT_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text(studentInfo.name || 'Unknown', infoBoxX + 5, 66);

    if (studentInfo.rollNumber) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(PDF_CONSTANTS.SUBTEXT_COLOR);
        doc.text('Roll Number:', infoBoxX + 5, 72);
        doc.setTextColor(PDF_CONSTANTS.TEXT_COLOR);
        doc.text(studentInfo.rollNumber, infoBoxX + 5, 78);
    }
}

/**
 * Add score summary section
 */
function addSummary(doc: jsPDF, result: TestResult): void {
    const { MARGIN, PAGE_WIDTH } = PDF_CONSTANTS;
    let yPos = 95;

    // Section title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_CONSTANTS.TEXT_COLOR);
    doc.text('Performance Summary', MARGIN, yPos);
    yPos += 10;

    // Score box
    const boxWidth = 50;
    const boxHeight = 40;
    const startX = MARGIN;

    // Total Score Box
    doc.setFillColor(37, 99, 235); // primary-600
    doc.roundedRect(startX, yPos, boxWidth, boxHeight, 5, 5, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Score', startX + boxWidth / 2, yPos + 10, { align: 'center' });
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${result.totalScore}`, startX + boxWidth / 2, yPos + 25, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`/ ${result.maxScore}`, startX + boxWidth / 2, yPos + 32, { align: 'center' });

    // Percentage Box
    doc.setFillColor(22, 163, 74); // green-600
    doc.roundedRect(startX + boxWidth + 10, yPos, boxWidth, boxHeight, 5, 5, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(8);
    doc.text('Percentage', startX + boxWidth + 10 + boxWidth / 2, yPos + 10, { align: 'center' });
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${result.percentage.toFixed(1)}%`, startX + boxWidth + 10 + boxWidth / 2, yPos + 25, { align: 'center' });

    // Percentile Box
    doc.setFillColor(124, 58, 237); // purple-600
    doc.roundedRect(startX + (boxWidth + 10) * 2, yPos, boxWidth, boxHeight, 5, 5, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Percentile', startX + (boxWidth + 10) * 2 + boxWidth / 2, yPos + 10, { align: 'center' });
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${result.percentile.toFixed(1)}`, startX + (boxWidth + 10) * 2 + boxWidth / 2, yPos + 25, { align: 'center' });

    // Stats grid (right side)
    const statsX = PAGE_WIDTH - MARGIN - 70;
    const statsY = yPos;

    const stats = [
        { label: 'Correct', value: result.correct, color: '#16a34a', marks: `+${result.correct * 4}` },
        { label: 'Incorrect', value: result.incorrect, color: '#dc2626', marks: `-${result.incorrect}` },
        { label: 'Unattempted', value: result.unattempted, color: '#6b7280', marks: '0' },
        { label: 'Accuracy', value: `${result.accuracy.toFixed(1)}%`, color: '#2563eb', marks: '' },
    ];

    stats.forEach((stat, index) => {
        const rowY = statsY + (index * 10);
        doc.setFillColor(stat.color);
        doc.circle(statsX + 3, rowY + 3, 2, 'F');
        doc.setTextColor(PDF_CONSTANTS.TEXT_COLOR);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(stat.label, statsX + 8, rowY + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(String(stat.value), statsX + 50, rowY + 4);
        if (stat.marks) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(PDF_CONSTANTS.SUBTEXT_COLOR);
            doc.text(stat.marks, statsX + 60, rowY + 4);
            doc.setTextColor(PDF_CONSTANTS.TEXT_COLOR);
        }
    });
}

/**
 * Add section-wise performance
 */
function addSectionPerformance(doc: jsPDF, result: TestResult): void {
    const { MARGIN, PAGE_WIDTH, LINE_HEIGHT } = PDF_CONSTANTS;
    let yPos = 155;

    // Section title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_CONSTANTS.TEXT_COLOR);
    doc.text('Section-wise Performance', MARGIN, yPos);
    yPos += 12;

    // Table header
    const colWidths = [40, 25, 25, 25, 25, 35];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const startX = MARGIN;

    // Header background
    doc.setFillColor(243, 244, 246); // gray-100
    doc.rect(startX, yPos - 6, tableWidth, 8, 'F');

    const headers = ['Section', 'Questions', 'Correct', 'Wrong', 'Score', 'Accuracy'];
    let currentX = startX;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_CONSTANTS.TEXT_COLOR);

    headers.forEach((header, index) => {
        doc.text(header, currentX + 2, yPos);
        currentX += colWidths[index];
    });

    yPos += LINE_HEIGHT;

    // Section rows
    const sectionColors: Record<string, string> = {
        'Physics': '#3b82f6',
        'Chemistry': '#10b981',
        'Mathematics': '#8b5cf6',
        'Biology': '#f59e0b',
    };

    result.sections.forEach((section, index) => {
        currentX = startX;

        // Alternate row background
        if (index % 2 === 1) {
            doc.setFillColor(249, 250, 251); // gray-50
            doc.rect(startX, yPos - 5, tableWidth, 7, 'F');
        }

        // Section color indicator
        const color = sectionColors[section.name] || '#6b7280';
        doc.setFillColor(color);
        doc.circle(currentX + 3, yPos - 2, 2, 'F');

        // Section name
        doc.setFont('helvetica', 'bold');
        doc.text(section.name, currentX + 8, yPos);
        currentX += colWidths[0];

        // Data
        doc.setFont('helvetica', 'normal');
        const data = [
            `${section.attempted}/${section.totalQuestions}`,
            String(section.correct),
            String(section.incorrect),
            `${section.score}/${section.maxScore}`,
            `${section.accuracy.toFixed(1)}%`,
        ];

        data.forEach((value, dataIndex) => {
            doc.text(value, currentX + 2, yPos);
            currentX += colWidths[dataIndex + 1];
        });

        yPos += LINE_HEIGHT;
    });
}

/**
 * Add question paper header for subsequent pages
 */
function addQuestionPaperHeader(doc: jsPDF, result: TestResult): void {
    const { MARGIN, PAGE_WIDTH, HEADER_COLOR } = PDF_CONSTANTS;

    // Simple header for subsequent pages
    doc.setFillColor(HEADER_COLOR);
    doc.rect(0, 0, PAGE_WIDTH, 12, 'F');

    doc.setTextColor('#ffffff');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`SaviEdTech - ${result.testTitle} - Answer Key`, MARGIN, 8);

    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, PAGE_WIDTH - MARGIN - 10, 8, { align: 'right' });

    // Separator line
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN, 18, PAGE_WIDTH - MARGIN, 18);
}

/**
 * Add all questions with their answers and solutions
 */
function addQuestionsWithSolutions(doc: jsPDF, result: TestResult): void {
    const { MARGIN, PAGE_WIDTH, PAGE_HEIGHT, LINE_HEIGHT, SECTION_SPACING } = PDF_CONSTANTS;
    let yPos = 28;

    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_CONSTANTS.TEXT_COLOR);
    doc.text('Question Paper with Solutions', MARGIN, yPos);
    yPos += SECTION_SPACING;

    // Group questions by section
    const questionsBySection = groupQuestionsBySection(result.questions);

    questionsBySection.forEach(({ section, questions }) => {
        // Check if we need a new page
        if (yPos > PAGE_HEIGHT - 40) {
            doc.addPage();
            addQuestionPaperHeader(doc, result);
            yPos = 28;
        }

        // Section header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(MARGIN, yPos - 5, PAGE_WIDTH - MARGIN * 2, 8, 2, 2, 'F');
        doc.text(`${section} Section`, MARGIN + 5, yPos);
        yPos += SECTION_SPACING + 2;

        // Questions in this section
        questions.forEach((question) => {
            // Check page overflow
            if (yPos > PAGE_HEIGHT - 60) {
                doc.addPage();
                addQuestionPaperHeader(doc, result);
                yPos = 28;
            }

            // Question box
            const questionBoxY = yPos;
            const questionBoxHeight = calculateQuestionHeight(doc, question);

            // Question number badge
            const statusColor = question.isCorrect
                ? PDF_CONSTANTS.CORRECT_COLOR
                : question.isAttempted
                    ? PDF_CONSTANTS.INCORRECT_COLOR
                    : PDF_CONSTANTS.UNATTEMPTED_COLOR;

            doc.setFillColor(statusColor);
            doc.roundedRect(MARGIN, yPos, 12, 8, 2, 2, 'F');
            doc.setTextColor('#ffffff');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(String(question.questionNumber), MARGIN + 6, yPos + 5.5, { align: 'center' });

            // Question text
            doc.setTextColor(PDF_CONSTANTS.TEXT_COLOR);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');

            // Wrap question text
            const questionText = `Q${question.questionNumber}. ${question.questionText}`;
            const splitText = doc.splitTextToSize(questionText, PAGE_WIDTH - MARGIN * 2 - 20);
            doc.text(splitText, MARGIN + 16, yPos + 5);
            yPos += (splitText.length * LINE_HEIGHT) + 3;

            // Options (if MCQ)
            if (question.questionType === 'MCQ' && question.options && question.options.length > 0) {
                question.options.forEach((option) => {
                    const isCorrect = option.label === question.correctAnswer;
                    const isSelected = option.label === question.yourAnswer;

                    let optionColor = PDF_CONSTANTS.SUBTEXT_COLOR;
                    let optionPrefix = '';

                    if (isCorrect) {
                        optionColor = PDF_CONSTANTS.CORRECT_COLOR;
                        optionPrefix = '✓ ';
                    } else if (isSelected && !isCorrect) {
                        optionColor = PDF_CONSTANTS.INCORRECT_COLOR;
                        optionPrefix = '✗ ';
                    }

                    doc.setTextColor(optionColor);
                    doc.setFont('helvetica', isCorrect || (isSelected && !isCorrect) ? 'bold' : 'normal');
                    doc.text(`${optionPrefix}${option.label}. ${option.text}`, MARGIN + 16, yPos);
                    yPos += LINE_HEIGHT;
                });
                doc.setFont('helvetica', 'normal');
            }

            // Answer section
            yPos += 2;
            const answerBoxY = yPos;

            // Your Answer
            const answerBgColor = question.isCorrect
                ? [220, 252, 231] as [number, number, number]
                : question.isAttempted
                    ? [254, 226, 226] as [number, number, number]
                    : [243, 244, 246] as [number, number, number];
            doc.setFillColor(...answerBgColor);
            doc.roundedRect(MARGIN + 16, yPos, 55, 12, 2, 2, 'F');
            doc.setFontSize(7);
            doc.setTextColor(PDF_CONSTANTS.SUBTEXT_COLOR);
            doc.text('Your Answer:', MARGIN + 19, yPos + 4);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(
                question.isCorrect ? PDF_CONSTANTS.CORRECT_COLOR :
                    question.isAttempted ? PDF_CONSTANTS.INCORRECT_COLOR : PDF_CONSTANTS.UNATTEMPTED_COLOR
            );
            doc.text(question.yourAnswer || 'Not Attempted', MARGIN + 19, yPos + 9.5);

            // Correct Answer
            doc.setFillColor(220, 252, 231);
            doc.roundedRect(MARGIN + 75, yPos, 55, 12, 2, 2, 'F');
            doc.setFontSize(7);
            doc.setTextColor(PDF_CONSTANTS.SUBTEXT_COLOR);
            doc.setFont('helvetica', 'normal');
            doc.text('Correct Answer:', MARGIN + 78, yPos + 4);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(PDF_CONSTANTS.CORRECT_COLOR);
            doc.text(question.correctAnswer, MARGIN + 78, yPos + 9.5);

            // Marks
            doc.setFillColor(243, 244, 246);
            doc.roundedRect(MARGIN + 135, yPos, 30, 12, 2, 2, 'F');
            doc.setFontSize(7);
            doc.setTextColor(PDF_CONSTANTS.SUBTEXT_COLOR);
            doc.setFont('helvetica', 'normal');
            doc.text('Marks:', MARGIN + 138, yPos + 4);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            const marksColor = question.marksObtained > 0
                ? PDF_CONSTANTS.CORRECT_COLOR
                : question.marksObtained < 0
                    ? PDF_CONSTANTS.INCORRECT_COLOR
                    : PDF_CONSTANTS.UNATTEMPTED_COLOR;
            doc.setTextColor(marksColor);
            doc.text(`${question.marksObtained > 0 ? '+' : ''}${question.marksObtained}/${question.maxMarks}`, MARGIN + 138, yPos + 9.5);

            yPos += 16;

            // Solution
            if (question.solution) {
                doc.setFillColor(239, 246, 255);
                const solutionText = `Solution: ${question.solution}`;
                const splitSolution = doc.splitTextToSize(solutionText, PAGE_WIDTH - MARGIN * 2 - 25);
                const solutionHeight = splitSolution.length * LINE_HEIGHT + 6;

                doc.roundedRect(MARGIN + 16, yPos, PAGE_WIDTH - MARGIN * 2 - 20, solutionHeight, 2, 2, 'F');
                doc.setTextColor(30, 58, 138);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(splitSolution, MARGIN + 19, yPos + 5);

                yPos += solutionHeight + 2;
            }

            yPos += SECTION_SPACING;
        });

        yPos += 5;
    });

    // Add footer with disclaimer
    addFooter(doc);
}

/**
 * Calculate approximate height needed for a question
 */
function calculateQuestionHeight(doc: jsPDF, question: QuestionResult): number {
    const { PAGE_WIDTH, LINE_HEIGHT } = PDF_CONSTANTS;

    let height = LINE_HEIGHT * 2; // Question number and basic spacing

    // Question text
    const questionText = `Q${question.questionNumber}. ${question.questionText}`;
    const splitText = doc.splitTextToSize(questionText, PAGE_WIDTH - 40);
    height += splitText.length * LINE_HEIGHT;

    // Options
    if (question.questionType === 'MCQ' && question.options) {
        height += question.options.length * LINE_HEIGHT;
    }

    // Answer boxes
    height += 16;

    // Solution
    if (question.solution) {
        const splitSolution = doc.splitTextToSize(question.solution, PAGE_WIDTH - 45);
        height += splitSolution.length * LINE_HEIGHT + 8;
    }

    return height + PDF_CONSTANTS.SECTION_SPACING;
}

/**
 * Group questions by their sections
 */
function groupQuestionsBySection(questions: QuestionResult[]): { section: string; questions: QuestionResult[] }[] {
    const grouped: Record<string, QuestionResult[]> = {};

    questions.forEach((q) => {
        if (!grouped[q.section]) {
            grouped[q.section] = [];
        }
        grouped[q.section].push(q);
    });

    return Object.entries(grouped).map(([section, questions]) => ({
        section,
        questions: questions.sort((a, b) => a.questionNumber - b.questionNumber),
    }));
}

/**
 * Add footer to the current page
 */
function addFooter(doc: jsPDF): void {
    const { MARGIN, PAGE_WIDTH, PAGE_HEIGHT } = PDF_CONSTANTS;

    const footerY = PAGE_HEIGHT - 15;

    // Separator line
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGIN, footerY, PAGE_WIDTH - MARGIN, footerY);

    // Footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(PDF_CONSTANTS.SUBTEXT_COLOR);
    doc.text(
        '© SaviEdTech - Answer Key generated on ' + format(new Date(), 'MMMM d, yyyy • h:mm a'),
        MARGIN,
        footerY + 5
    );
    doc.text(
        'This answer key is for personal use only. Reproduction is prohibited.',
        PAGE_WIDTH - MARGIN,
        footerY + 5,
        { align: 'right' }
    );
}

/**
 * Generate and download PDF for client-side use
 */
export async function downloadAnswerKeyPDF(
    result: TestResult,
    studentInfo: StudentInfo,
    filename?: string
): Promise<void> {
    const blob = await generateAnswerKeyPDF(result, studentInfo);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `answer-key-${result.testTitle.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

// Re-export types for use in other modules
export type {
    TestResult,
    QuestionResult,
    SectionResult,
    StudentInfo,
};