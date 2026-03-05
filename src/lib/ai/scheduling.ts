/**
 * AI Class Scheduling System
 * 
 * Manages automated lecture scheduling, content publication,
 * and curriculum progression for AI faculty.
 */

import { Subject, getTeacherById, getTeacherBySubject, getAllTeachers, TeacherPersona } from './teachers';

export type ScheduleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type ContentType = 'lecture' | 'practice' | 'revision' | 'test' | 'dpp';
export type ClassStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'published';

export interface ClassSchedule {
    id: string;
    teacherId: string;
    subject: Subject;
    title: string;
    description: string;
    topic: string;
    subtopic?: string;
    contentType: ContentType;
    scheduledDate: Date;
    duration: number; // in minutes
    difficulty: 'basic' | 'intermediate' | 'advanced';
    targetExam: 'jee-main' | 'jee-advanced' | 'neet' | 'boards';
    status: ClassStatus;
    prerequisites?: string[];
    nextTopics?: string[];
    metadata: {
        batchId?: string;
        courseId?: string;
        chapterId?: string;
        sequenceNumber: number;
        totalInChapter: number;
    };
    generatedContent?: {
        lectureId?: string;
        questionsId?: string;
        videoUrl?: string;
        notesUrl?: string;
    };
}

export interface WeeklySchedule {
    weekNumber: number;
    startDate: Date;
    endDate: Date;
    classes: ClassSchedule[];
    teachers: string[];
    subjects: Subject[];
    totalHours: number;
}

export interface CurriculumPlan {
    id: string;
    name: string;
    description: string;
    targetExam: 'jee-main' | 'jee-advanced' | 'neet' | 'boards';
    duration: number; // in weeks
    subjects: Subject[];
    chapters: ChapterPlan[];
    schedule: WeeklySchedule[];
    startDate: Date;
    endDate: Date;
    status: 'draft' | 'active' | 'completed' | 'archived';
}

export interface ChapterPlan {
    id: string;
    subject: Subject;
    name: string;
    description: string;
    topics: TopicPlan[];
    estimatedHours: number;
    lectureCount: number;
    practiceSessionCount: number;
    sequenceOrder: number;
    dependencies: string[];
}

export interface TopicPlan {
    id: string;
    name: string;
    subtopics: string[];
    estimatedDuration: number;
    difficulty: 'basic' | 'intermediate' | 'advanced';
    hasLecture: boolean;
    hasPractice: boolean;
    hasDPP: boolean;
}

export interface SchedulingConfig {
    dailyLectureLimit: number;
    preferredTimeSlots: TimeSlot[];
    subjectDistribution: Record<Subject, number>; // hours per week
    revisionFrequency: number; // every N days
    testFrequency: number; // every N weeks
    dppFrequency: number; // daily practice problems
    autoPublish: boolean;
    generateNarration: boolean;
}

export interface TimeSlot {
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
    startTime: string; // HH:MM format
    endTime: string;
    preferredSubjects?: Subject[];
    preferredTeachers?: string[];
}

export interface PublishQueue {
    id: string;
    scheduleId: string;
    contentType: ContentType;
    scheduledPublishTime: Date;
    status: 'pending' | 'processing' | 'published' | 'failed';
    retryCount: number;
    lastError?: string;
}

// Default scheduling configuration
export const DEFAULT_SCHEDULING_CONFIG: SchedulingConfig = {
    dailyLectureLimit: 4,
    preferredTimeSlots: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '10:30', preferredSubjects: ['physics', 'mathematics'] },
        { dayOfWeek: 1, startTime: '11:00', endTime: '12:30', preferredSubjects: ['chemistry'] },
        { dayOfWeek: 1, startTime: '14:00', endTime: '15:30', preferredSubjects: ['biology'] },
        { dayOfWeek: 2, startTime: '09:00', endTime: '10:30', preferredSubjects: ['mathematics', 'physics'] },
        { dayOfWeek: 2, startTime: '11:00', endTime: '12:30', preferredSubjects: ['chemistry'] },
        { dayOfWeek: 3, startTime: '09:00', endTime: '10:30', preferredSubjects: ['physics', 'chemistry'] },
        { dayOfWeek: 3, startTime: '11:00', endTime: '12:30', preferredSubjects: ['mathematics'] },
        { dayOfWeek: 4, startTime: '09:00', endTime: '10:30', preferredSubjects: ['chemistry', 'biology'] },
        { dayOfWeek: 4, startTime: '11:00', endTime: '12:30', preferredSubjects: ['physics'] },
        { dayOfWeek: 5, startTime: '09:00', endTime: '10:30', preferredSubjects: ['mathematics', 'chemistry'] },
        { dayOfWeek: 5, startTime: '11:00', endTime: '12:30', preferredSubjects: ['physics', 'biology'] },
        { dayOfWeek: 6, startTime: '09:00', endTime: '12:00' }, // Revision/Test slot
    ],
    subjectDistribution: {
        physics: 8,
        chemistry: 8,
        mathematics: 8,
        biology: 6,
    },
    revisionFrequency: 7, // Weekly revision
    testFrequency: 2, // Bi-weekly tests
    dppFrequency: 1, // Daily DPP
    autoPublish: true,
    generateNarration: true,
};

// Pre-defined curriculum templates
export const CURRICULUM_TEMPLATES: Record<string, Partial<CurriculumPlan>> = {
    'jee-one-year': {
        name: 'JEE Main + Advanced - 1 Year Program',
        description: 'Comprehensive 1-year program covering Physics, Chemistry, and Mathematics for JEE',
        targetExam: 'jee-advanced',
        duration: 52, // 52 weeks
        subjects: ['physics', 'chemistry', 'mathematics'],
    },
    'jee-two-year': {
        name: 'JEE Main + Advanced - 2 Year Program',
        description: 'Detailed 2-year foundation + advanced program for JEE',
        targetExam: 'jee-advanced',
        duration: 104,
        subjects: ['physics', 'chemistry', 'mathematics'],
    },
    'neet-one-year': {
        name: 'NEET - 1 Year Program',
        description: 'Complete NEET preparation covering Physics, Chemistry, and Biology',
        targetExam: 'neet',
        duration: 52,
        subjects: ['physics', 'chemistry', 'biology'],
    },
    'neet-two-year': {
        name: 'NEET - 2 Year Program',
        description: 'Comprehensive 2-year NEET preparation with foundation building',
        targetExam: 'neet',
        duration: 104,
        subjects: ['physics', 'chemistry', 'biology'],
    },
    'boards-complete': {
        name: 'Board Exams - Complete Program',
        description: 'Board exam preparation for all subjects',
        targetExam: 'boards',
        duration: 40,
        subjects: ['physics', 'chemistry', 'mathematics', 'biology'],
    },
};

// Chapter templates for each subject
export const CHAPTER_TEMPLATES: Record<Subject, Partial<ChapterPlan>[]> = {
    physics: [
        { name: 'Units and Measurements', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Motion in a Straight Line', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Motion in a Plane', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Laws of Motion', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Work, Energy and Power', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'System of Particles and Rotational Motion', estimatedHours: 8, lectureCount: 4, practiceSessionCount: 2 },
        { name: 'Gravitation', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Mechanical Properties of Solids', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Mechanical Properties of Fluids', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Thermal Properties of Matter', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Thermodynamics', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Kinetic Theory', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Oscillations', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Waves', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Electric Charges and Fields', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Electrostatic Potential and Capacitance', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Current Electricity', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Moving Charges and Magnetism', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Magnetism and Matter', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Electromagnetic Induction', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Alternating Current', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Electromagnetic Waves', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Ray Optics and Optical Instruments', estimatedHours: 8, lectureCount: 4, practiceSessionCount: 2 },
        { name: 'Wave Optics', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Dual Nature of Radiation and Matter', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Atoms', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Nuclei', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Semiconductor Electronics', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
    ],
    chemistry: [
        { name: 'Some Basic Concepts of Chemistry', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Structure of Atom', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Classification of Elements', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Chemical Bonding', estimatedHours: 8, lectureCount: 4, practiceSessionCount: 2 },
        { name: 'States of Matter', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Thermodynamics', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Equilibrium', estimatedHours: 8, lectureCount: 4, practiceSessionCount: 2 },
        { name: 'Redox Reactions', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Hydrogen', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 's-Block Elements', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'p-Block Elements', estimatedHours: 10, lectureCount: 5, practiceSessionCount: 3 },
        { name: 'Organic Chemistry Basics', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Hydrocarbons', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Environmental Chemistry', estimatedHours: 3, lectureCount: 1, practiceSessionCount: 1 },
        { name: 'Solutions', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Electrochemistry', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Chemical Kinetics', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Surface Chemistry', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'd and f Block Elements', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Coordination Compounds', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Haloalkanes and Haloarenes', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Alcohols, Phenols and Ethers', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Aldehydes, Ketones and Carboxylic Acids', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Amines', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Biomolecules', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Polymers', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Chemistry in Everyday Life', estimatedHours: 3, lectureCount: 1, practiceSessionCount: 1 },
    ],
    mathematics: [
        { name: 'Sets', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Relations and Functions', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Trigonometric Functions', estimatedHours: 8, lectureCount: 4, practiceSessionCount: 2 },
        { name: 'Complex Numbers', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Linear Inequalities', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Permutations and Combinations', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Binomial Theorem', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Sequences and Series', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Straight Lines', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Conic Sections', estimatedHours: 8, lectureCount: 4, practiceSessionCount: 2 },
        { name: 'Introduction to 3D Geometry', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Limits and Derivatives', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Mathematical Reasoning', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Statistics', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Probability', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Relations and Functions (Advanced)', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Inverse Trigonometric Functions', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Matrices', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Determinants', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Continuity and Differentiability', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Application of Derivatives', estimatedHours: 8, lectureCount: 4, practiceSessionCount: 2 },
        { name: 'Integrals', estimatedHours: 10, lectureCount: 5, practiceSessionCount: 3 },
        { name: 'Application of Integrals', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Differential Equations', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Vector Algebra', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: '3D Geometry', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Linear Programming', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Probability (Advanced)', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
    ],
    biology: [
        { name: 'The Living World', estimatedHours: 3, lectureCount: 1, practiceSessionCount: 1 },
        { name: 'Biological Classification', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Plant Kingdom', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Animal Kingdom', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Morphology of Flowering Plants', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Anatomy of Flowering Plants', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Structural Organisation in Animals', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Cell: The Unit of Life', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Biomolecules', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Cell Cycle and Cell Division', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Transport in Plants', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Mineral Nutrition', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Photosynthesis', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Respiration in Plants', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Plant Growth and Development', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Digestion and Absorption', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Breathing and Exchange of Gases', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Body Fluids and Circulation', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Excretory Products and Elimination', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Locomotion and Movement', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Neural Control and Coordination', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Chemical Coordination and Integration', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Reproduction in Organisms', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Sexual Reproduction in Flowering Plants', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Human Reproduction', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Reproductive Health', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Principles of Inheritance and Variation', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Molecular Basis of Inheritance', estimatedHours: 6, lectureCount: 3, practiceSessionCount: 2 },
        { name: 'Evolution', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Human Health and Disease', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Strategies for Enhancement in Food Production', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Microbes in Human Welfare', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Biotechnology: Principles and Processes', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Biotechnology and its Applications', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Organisms and Populations', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Ecosystem', estimatedHours: 5, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Biodiversity and Conservation', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
        { name: 'Environmental Issues', estimatedHours: 4, lectureCount: 2, practiceSessionCount: 1 },
    ],
};

// Scheduling functions
export function createWeeklySchedule(
    weekNumber: number,
    startDate: Date,
    config: SchedulingConfig = DEFAULT_SCHEDULING_CONFIG
): WeeklySchedule {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const classes: ClassSchedule[] = [];
    const teachers = getAllTeachers();

    // Generate classes based on time slots
    config.preferredTimeSlots.forEach((slot, index) => {
        const slotDate = new Date(startDate);
        slotDate.setDate(slotDate.getDate() + slot.dayOfWeek);

        // Skip if before start date
        if (slotDate < startDate) return;

        // Determine subject and teacher
        let subject: Subject;
        let teacher: TeacherPersona;

        if (slot.preferredSubjects && slot.preferredSubjects.length > 0) {
            subject = slot.preferredSubjects[weekNumber % slot.preferredSubjects.length];
        } else {
            const subjects = Object.keys(config.subjectDistribution) as Subject[];
            subject = subjects[index % subjects.length];
        }

        const foundTeacher = getTeacherBySubject(subject);
        if (!foundTeacher) return;
        teacher = foundTeacher;

        const startTime = new Date(slotDate);
        const [hours, minutes] = slot.startTime.split(':').map(Number);
        startTime.setHours(hours, minutes, 0, 0);

        const classSchedule: ClassSchedule = {
            id: `class-${weekNumber}-${index}`,
            teacherId: teacher.id,
            subject,
            title: `${teacher.subjectDisplay} Class - Week ${weekNumber}`,
            description: `Regular ${teacher.subjectDisplay} class covering important topics`,
            topic: 'To be determined',
            contentType: index % 5 === 4 ? 'revision' : 'lecture',
            scheduledDate: startTime,
            duration: calculateDuration(slot.startTime, slot.endTime),
            difficulty: 'intermediate',
            targetExam: 'jee-main',
            status: 'scheduled',
            metadata: {
                sequenceNumber: index + 1,
                totalInChapter: 10,
            },
        };

        classes.push(classSchedule);
    });

    const totalHours = classes.reduce((sum, c) => sum + c.duration, 0) / 60;

    return {
        weekNumber,
        startDate,
        endDate,
        classes,
        teachers: [...new Set(classes.map(c => c.teacherId))],
        subjects: [...new Set(classes.map(c => c.subject))],
        totalHours,
    };
}

function calculateDuration(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    return (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
}

export function generateCurriculumPlan(
    templateKey: string,
    startDate: Date,
    customizations?: Partial<CurriculumPlan>
): CurriculumPlan {
    const template = CURRICULUM_TEMPLATES[templateKey];
    if (!template) {
        throw new Error(`Template ${templateKey} not found`);
    }

    const duration = template.duration || 52;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (duration * 7));

    // Generate chapters from templates
    const chapters: ChapterPlan[] = [];
    let sequenceOrder = 0;

    template.subjects?.forEach(subject => {
        const subjectChapters = CHAPTER_TEMPLATES[subject];
        subjectChapters.forEach((chapterTemplate, index) => {
            chapters.push({
                id: `ch-${subject}-${index}`,
                subject,
                name: chapterTemplate.name || `Chapter ${index + 1}`,
                description: `Comprehensive coverage of ${chapterTemplate.name}`,
                topics: [],
                estimatedHours: chapterTemplate.estimatedHours || 5,
                lectureCount: chapterTemplate.lectureCount || 2,
                practiceSessionCount: chapterTemplate.practiceSessionCount || 1,
                sequenceOrder: sequenceOrder++,
                dependencies: index > 0 ? [`ch-${subject}-${index - 1}`] : [],
            });
        });
    });

    // Generate weekly schedules
    const schedule: WeeklySchedule[] = [];
    for (let week = 1; week <= duration; week++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + ((week - 1) * 7));
        schedule.push(createWeeklySchedule(week, weekStart));
    }

    return {
        id: `plan-${Date.now()}`,
        name: template.name || 'Custom Plan',
        description: template.description || 'Custom curriculum plan',
        targetExam: template.targetExam || 'jee-main',
        duration,
        subjects: template.subjects || ['physics', 'chemistry', 'mathematics'],
        chapters,
        schedule,
        startDate,
        endDate,
        status: 'draft',
        ...customizations,
    };
}

export function getNextClass(schedules: ClassSchedule[], afterDate: Date = new Date()): ClassSchedule | null {
    const upcoming = schedules
        .filter(s => s.scheduledDate > afterDate && s.status !== 'cancelled')
        .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

    return upcoming[0] || null;
}

export function getClassesForDate(schedules: ClassSchedule[], date: Date): ClassSchedule[] {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return schedules
        .filter(s => s.scheduledDate >= startOfDay && s.scheduledDate <= endOfDay)
        .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
}

export function getClassesForTeacher(schedules: ClassSchedule[], teacherId: string): ClassSchedule[] {
    return schedules
        .filter(s => s.teacherId === teacherId)
        .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
}

export function createPublishQueue(schedule: ClassSchedule): PublishQueue {
    return {
        id: `queue-${schedule.id}`,
        scheduleId: schedule.id,
        contentType: schedule.contentType,
        scheduledPublishTime: new Date(schedule.scheduledDate.getTime() - (24 * 60 * 60 * 1000)), // 24 hours before
        status: 'pending',
        retryCount: 0,
    };
}

// Utility functions
export function formatScheduleDate(date: Date): string {
    return date.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export function formatScheduleTime(date: Date): string {
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function isRevisionDay(date: Date): boolean {
    return date.getDay() === 6; // Saturday as revision day
}

export function isTestDay(date: Date, frequency: number = 2): boolean {
    const weekNumber = getWeekNumber(date);
    return weekNumber % frequency === 0 && date.getDay() === 0; // Sunday test
}

function getWeekNumber(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.floor(diff / oneWeek) + 1;
}

// Export all types and functions
export {
    getTeacherById,
    getTeacherBySubject,
    getAllTeachers,
};
