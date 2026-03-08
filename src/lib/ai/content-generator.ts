/**
 * AI Content Generation System
 * 
 * Generates educational content including lectures, questions,
 * and video narrations using AI faculty personas.
 */

import {
    TeacherPersona,
    Subject,
    getTeacherById,
    getTeacherBySubject,
    SUBJECT_CONFIG
} from './teachers';

export interface LectureRequest {
    teacherId: string;
    topic: string;
    subtopic?: string;
    duration: number; // in minutes
    difficulty: 'basic' | 'intermediate' | 'advanced';
    targetExam: 'jee-main' | 'jee-advanced' | 'neet' | 'boards';
    language: 'english' | 'hinglish';
    includeExamples?: boolean;
    includePractice?: boolean;
}

export interface LectureContent {
    title: string;
    description: string;
    duration: number;
    sections: LectureSection[];
    keyPoints: string[];
    formulas?: string[];
    practiceProblems?: PracticeProblem[];
    summary: string;
    narrationScript?: NarrationScript;
    metadata: {
        teacherId: string;
        subject: Subject;
        topic: string;
        difficulty: string;
        generatedAt: string;
    };
}

export interface LectureSection {
    id: string;
    title: string;
    content: string;
    duration: number; // estimated minutes
    type: 'introduction' | 'concept' | 'example' | 'derivation' | 'application' | 'summary';
    narration?: string;
}

export interface PracticeProblem {
    id: string;
    question: string;
    solution: string;
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: number;
    hint?: string;
    teacherTip?: string;
}

export interface NarrationScript {
    intro: string;
    sections: NarrationSection[];
    outro: string;
    totalDuration: number;
    language: string;
}

export interface NarrationSection {
    sectionId: string;
    teacherDialogue: string;
    screenInstructions?: string;
    estimatedDuration: number;
}

export interface QuestionRequest {
    teacherId: string;
    topic: string;
    count: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
    questionType: 'mcq' | 'numerical' | 'theoretical' | 'assertion_reason' | 'mixed';
    targetExam: 'jee-main' | 'jee-advanced' | 'neet' | 'boards';
    includeSolution?: boolean;
}

export interface GeneratedQuestion {
    id: string;
    question: string;
    questionType: 'mcq' | 'numerical' | 'theoretical' | 'assertion_reason';
    options?: string[];
    correctAnswer?: string;
    solution: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
    subtopic?: string;
    estimatedTime: number;
    marks: number;
    teacherExplanation: string;
    commonMistakes?: string[];
    relatedConcepts?: string[];
}

export interface QuestionSet {
    title: string;
    description: string;
    questions: GeneratedQuestion[];
    totalMarks: number;
    estimatedTime: number;
    metadata: {
        teacherId: string;
        subject: Subject;
        topic: string;
        difficulty: string;
        generatedAt: string;
    };
}

// Content generation prompts
export function generateLecturePrompt(request: LectureRequest, teacher: TeacherPersona): string {
    const subjectConfig = SUBJECT_CONFIG[teacher.subject];

    return `
${teacher.promptTemplate.systemPrompt}

Create a comprehensive lecture on "${request.topic}"${request.subtopic ? ` - ${request.subtopic}` : ''}.

LECTURE PARAMETERS:
- Target Duration: ${request.duration} minutes
- Difficulty Level: ${request.difficulty}
- Target Exam: ${request.targetExam.toUpperCase()}
- Language for Lecture Script: ${request.language}
- Include Examples: ${request.includeExamples !== false ? 'Yes' : 'No'}
- Include Practice Problems: ${request.includePractice !== false ? 'Yes' : 'No'}

${teacher.promptTemplate.lectureFormat}

NARRATION REQUIREMENTS (Hinglish):
${teacher.promptTemplate.narrationStyle}

OUTPUT FORMAT (JSON):
{
  "title": "Lecture title",
  "description": "Brief description",
  "sections": [
    {
      "id": "section-1",
      "title": "Section title",
      "content": "Detailed content in English",
      "duration": 5,
      "type": "introduction|concept|example|derivation|application|summary",
      "narration": "Hinglish narration script"
    }
  ],
  "keyPoints": ["Key point 1", "Key point 2"],
  "formulas": ["Formula 1", "Formula 2"],
  "practiceProblems": [
    {
      "id": "p1",
      "question": "Problem statement",
      "solution": "Step-by-step solution",
      "difficulty": "easy|medium|hard",
      "estimatedTime": 5,
      "hint": "Optional hint",
      "teacherTip": "Teacher's special tip"
    }
  ],
  "summary": "Lecture summary"
}

TEACHING STYLE GUIDELINES:
- Tone: ${teacher.personality.tone}
- Humor Level: ${teacher.personality.humor}
- Strictness: ${teacher.personality.strictness}
- Encouragement: ${teacher.personality.encouragement}

CATCHPHRASES (use naturally): ${teacher.catchphrases.join(', ')}

Ensure the content is accurate, exam-focused, and follows the teaching style described above.
`;
}

export function generateQuestionPrompt(request: QuestionRequest, teacher: TeacherPersona): string {
    return `
${teacher.promptTemplate.systemPrompt}

Generate ${request.count} ${request.difficulty} difficulty questions on "${request.topic}".

QUESTION PARAMETERS:
- Question Type: ${request.questionType}
- Target Exam: ${request.targetExam.toUpperCase()}
- Include Detailed Solutions: ${request.includeSolution !== false ? 'Yes' : 'No'}

${teacher.promptTemplate.questionFormat}

OUTPUT FORMAT (JSON):
{
  "title": "Question Set Title",
  "description": "Brief description",
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "questionType": "mcq|numerical|theoretical|assertion_reason",
      "options": ["A", "B", "C", "D"], // For MCQ only
      "correctAnswer": "Answer",
      "solution": "Detailed solution",
      "difficulty": "easy|medium|hard",
      "topic": "Topic name",
      "subtopic": "Subtopic name",
      "estimatedTime": 3,
      "marks": 4,
      "teacherExplanation": "Teacher's explanation style",
      "commonMistakes": ["Mistake 1", "Mistake 2"],
      "relatedConcepts": ["Concept 1", "Concept 2"]
    }
  ],
  "totalMarks": 100,
  "estimatedTime": 60
}

EXAM-SPECIFIC GUIDELINES:
${getExamGuidelines(request.targetExam, teacher.subject)}

Ensure questions are original, exam-relevant, and match the difficulty level specified.
`;
}

function getExamGuidelines(exam: string, subject: Subject): string {
    const guidelines: Record<string, Record<Subject, string>> = {
        'jee-main': {
            physics: 'Focus on numerical problems, concept application, and formula-based questions. Time management is key.',
            chemistry: 'Balance between Organic, Inorganic, and Physical. NCERT-based Inorganic is crucial.',
            mathematics: 'Focus on calculation speed and multiple approaches. Coordinate geometry and Calculus are high-weightage.',
            biology: 'Not applicable for JEE Main',
        },
        'jee-advanced': {
            physics: 'Multi-concept problems, advanced applications, and deep conceptual understanding required.',
            chemistry: 'Complex mechanisms in Organic, advanced Physical Chemistry calculations, and NCERT+ level Inorganic.',
            mathematics: 'Proof-based questions, advanced Calculus, and complex Algebra problems.',
            biology: 'Not applicable for JEE Advanced',
        },
        'neet': {
            physics: 'Conceptual clarity over complex calculations. NCERT-based approach.',
            chemistry: 'Heavy weightage on Organic mechanisms and NCERT Inorganic. Physical Chemistry calculations moderate.',
            mathematics: 'Not applicable for NEET',
            biology: 'NCERT is Bible. Focus on diagrams, processes, and terminology. Zoology and Botany equally important.',
        },
        'boards': {
            physics: 'Theory-focused with derivations. Step-marking important.',
            chemistry: 'Balanced coverage. Definitions, equations, and basic numericals.',
            mathematics: 'Step-by-step solutions required. All topics carry weight.',
            biology: 'Diagrams are crucial. Process descriptions and definitions.',
        },
    };

    return guidelines[exam]?.[subject] || 'Follow standard curriculum guidelines.';
}

// Mock content generation (replace with actual AI API calls)
export async function generateLecture(request: LectureRequest): Promise<LectureContent> {
    const teacher = getTeacherById(request.teacherId);
    if (!teacher) {
        throw new Error(`Teacher with ID ${request.teacherId} not found`);
    }

    // In production, this would call an AI API (OpenAI, Claude, etc.)
    // For now, return structured mock content
    const prompt = generateLecturePrompt(request, teacher);

    // Simulate AI generation with structured content
    return generateMockLecture(request, teacher);
}

export async function generateQuestions(request: QuestionRequest): Promise<QuestionSet> {
    const teacher = getTeacherById(request.teacherId);
    if (!teacher) {
        throw new Error(`Teacher with ID ${request.teacherId} not found`);
    }

    const prompt = generateQuestionPrompt(request, teacher);

    // Simulate AI generation
    return generateMockQuestionSet(request, teacher);
}

// Mock generators for demonstration
function generateMockLecture(request: LectureRequest, teacher: TeacherPersona): LectureContent {
    const sections: LectureSection[] = [
        {
            id: 'intro',
            title: 'Introduction & Motivation',
            content: `Welcome to today's lecture on ${request.topic}. ${teacher.catchphrases[0]}`,
            duration: Math.ceil(request.duration * 0.1),
            type: 'introduction',
            narration: `Namaste students! Aaj hum ${request.topic} padhenge. ${teacher.catchphrases[0]} Dekho, yeh topic kitna important hai...`,
        },
        {
            id: 'concept',
            title: 'Core Concept',
            content: `Detailed explanation of ${request.topic} with fundamental principles and definitions.`,
            duration: Math.ceil(request.duration * 0.3),
            type: 'concept',
            narration: `Sabse pehle concept samajhte hain. ${request.topic} ka matlab kya hai? Dekho...`,
        },
        {
            id: 'example1',
            title: 'Example 1 - Basic',
            content: 'First solved example demonstrating the basic application.',
            duration: Math.ceil(request.duration * 0.15),
            type: 'example',
            narration: `Ab ek simple example dekhte hain. Dhyan se dekho...`,
        },
        {
            id: 'example2',
            title: 'Example 2 - Advanced',
            content: 'Second solved example with increased complexity.',
            duration: Math.ceil(request.duration * 0.2),
            type: 'example',
            narration: `Ab thoda advanced level ka question. ${teacher.catchphrases[2]}`,
        },
        {
            id: 'summary',
            title: 'Summary & Key Takeaways',
            content: 'Recap of all important points covered in this lecture.',
            duration: Math.ceil(request.duration * 0.1),
            type: 'summary',
            narration: `Toh summary mein, aaj humne kya kya seekha...`,
        },
    ];

    const practiceProblems: PracticeProblem[] = request.includePractice !== false ? [
        {
            id: 'p1',
            question: `Practice problem 1 on ${request.topic} (Easy)`,
            solution: 'Step-by-step solution with clear explanation.',
            difficulty: 'easy',
            estimatedTime: 5,
            hint: 'Think about the basic formula.',
            teacherTip: `${teacher.displayName} Tip: Always start with the given data.`,
        },
        {
            id: 'p2',
            question: `Practice problem 2 on ${request.topic} (Medium)`,
            solution: 'Detailed solution with intermediate steps.',
            difficulty: 'medium',
            estimatedTime: 10,
            teacherTip: `${teacher.displayName} Tip: Don't skip steps in calculations.`,
        },
    ] : [];

    return {
        title: `${request.topic} - ${teacher.displayName}`,
        description: `Comprehensive lecture on ${request.topic} for ${request.targetExam.toUpperCase()} preparation`,
        duration: request.duration,
        sections,
        keyPoints: [
            `Fundamental concept of ${request.topic}`,
            'Key formulas and their applications',
            'Common problem-solving approaches',
            'Exam-focused strategies',
        ],
        formulas: teacher.subject === 'mathematics' || teacher.subject === 'physics' || teacher.subject === 'chemistry'
            ? ['Formula 1', 'Formula 2', 'Formula 3']
            : undefined,
        practiceProblems,
        summary: `In this lecture, we covered the fundamentals of ${request.topic}. Remember to practice regularly and focus on conceptual understanding. ${teacher.catchphrases[0]}`,
        narrationScript: {
            intro: `Welcome students! ${teacher.catchphrases[0]} Aaj ka topic hai ${request.topic}.`,
            sections: sections.map(s => ({
                sectionId: s.id,
                teacherDialogue: s.narration || '',
                estimatedDuration: s.duration,
            })),
            outro: `Aaj ke lecture mein itna hi. Practice zaroor karna! ${teacher.catchphrases[1]}`,
            totalDuration: request.duration,
            language: request.language,
        },
        metadata: {
            teacherId: teacher.id,
            subject: teacher.subject,
            topic: request.topic,
            difficulty: request.difficulty,
            generatedAt: new Date().toISOString(),
        },
    };
}

function generateMockQuestionSet(request: QuestionRequest, teacher: TeacherPersona): QuestionSet {
    const questions: GeneratedQuestion[] = [];
    const count = Math.min(request.count, 20);

    const difficulties: ('easy' | 'medium' | 'hard')[] = request.difficulty === 'mixed'
        ? ['easy', 'medium', 'hard']
        : [request.difficulty];

    for (let i = 1; i <= count; i++) {
        const difficulty = difficulties[(i - 1) % difficulties.length];
        const isAssertionReason = request.questionType === 'assertion_reason'
            || (request.questionType === 'mixed' && i % 5 === 0);
        const isMCQ = request.questionType === 'mcq' || (request.questionType === 'mixed' && i % 2 === 1 && !isAssertionReason);

        questions.push({
            id: `q${i}`,
            question: `Question ${i}: Sample question on ${request.topic} (${difficulty})`,
            questionType: isAssertionReason ? 'assertion_reason' : isMCQ ? 'mcq' : 'numerical',
            options: isAssertionReason
                ? [
                    'Both assertion and reason are true, and reason is the correct explanation.',
                    'Both assertion and reason are true, but reason is not the correct explanation.',
                    'Assertion is true but reason is false.',
                    'Assertion is false but reason is true.',
                ]
                : isMCQ
                    ? ['Option A', 'Option B', 'Option C', 'Option D']
                    : undefined,
            correctAnswer: isAssertionReason ? 'Both assertion and reason are true, and reason is the correct explanation.' : isMCQ ? 'Option A' : '42',
            solution: `Detailed step-by-step solution for question ${i}.\n\n${teacher.displayName}'s approach: Start by identifying the key concept, then apply the appropriate formula/method.`,
            difficulty,
            topic: request.topic,
            subtopic: `Subtopic ${i}`,
            estimatedTime: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6,
            marks: difficulty === 'easy' ? 4 : difficulty === 'medium' ? 4 : 4,
            teacherExplanation: `${teacher.displayName}: Is question mein concept test ho raha hai ${request.topic} ka. Dekho kaise approach karna hai...`,
            commonMistakes: ['Common mistake 1', 'Common mistake 2'],
            relatedConcepts: ['Related concept 1', 'Related concept 2'],
        });
    }

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const estimatedTime = questions.reduce((sum, q) => sum + q.estimatedTime, 0);

    return {
        title: `${request.topic} - Practice Questions (${request.difficulty})`,
        description: `${count} ${request.difficulty} level questions on ${request.topic} for ${request.targetExam.toUpperCase()} preparation`,
        questions,
        totalMarks,
        estimatedTime,
        metadata: {
            teacherId: teacher.id,
            subject: teacher.subject,
            topic: request.topic,
            difficulty: request.difficulty,
            generatedAt: new Date().toISOString(),
        },
    };
}

// Content formatting utilities
export function formatLectureForDisplay(content: LectureContent): string {
    let output = `# ${content.title}\n\n`;
    output += `${content.description}\n\n`;
    output += `**Duration:** ${content.duration} minutes\n`;
    output += `**Teacher:** ${content.metadata.teacherId}\n\n`;

    content.sections.forEach(section => {
        output += `## ${section.title}\n\n`;
        output += `${section.content}\n\n`;
        if (section.narration) {
            output += `**Narration:** ${section.narration}\n\n`;
        }
    });

    if (content.keyPoints.length > 0) {
        output += `## Key Points\n\n`;
        content.keyPoints.forEach(point => {
            output += `- ${point}\n`;
        });
        output += '\n';
    }

    if (content.practiceProblems && content.practiceProblems.length > 0) {
        output += `## Practice Problems\n\n`;
        content.practiceProblems.forEach((problem, index) => {
            output += `### Problem ${index + 1} (${problem.difficulty})\n\n`;
            output += `${problem.question}\n\n`;
            output += `**Solution:** ${problem.solution}\n\n`;
            if (problem.teacherTip) {
                output += `💡 ${problem.teacherTip}\n\n`;
            }
        });
    }

    return output;
}

export function formatQuestionsForDisplay(questionSet: QuestionSet): string {
    let output = `# ${questionSet.title}\n\n`;
    output += `${questionSet.description}\n\n`;
    output += `**Total Questions:** ${questionSet.questions.length}\n`;
    output += `**Total Marks:** ${questionSet.totalMarks}\n`;
    output += `**Estimated Time:** ${questionSet.estimatedTime} minutes\n\n`;

    questionSet.questions.forEach((q, index) => {
        output += `## Question ${index + 1} [${q.marks} marks]\n\n`;
        output += `${q.question}\n\n`;

        if (q.options) {
            q.options.forEach((opt, i) => {
                output += `${String.fromCharCode(65 + i)}. ${opt}\n`;
            });
            output += '\n';
        }

        output += `**Correct Answer:** ${q.correctAnswer}\n\n`;
        output += `**Solution:**\n${q.solution}\n\n`;
        output += `_${q.teacherExplanation}_\n\n`;

        if (q.commonMistakes && q.commonMistakes.length > 0) {
            output += `**Common Mistakes:** ${q.commonMistakes.join(', ')}\n\n`;
        }
    });

    return output;
}

// Export for use in API routes
export { getTeacherById, getTeacherBySubject, SUBJECT_CONFIG };
