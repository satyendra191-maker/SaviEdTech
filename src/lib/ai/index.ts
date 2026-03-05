/**
 * AI Faculty Content Generation System
 * 
 * A comprehensive system for generating educational content using AI faculty personas.
 * Includes teacher personalities, content generation, and class scheduling.
 */

// Teacher Personas
export {
    TEACHERS,
    SUBJECT_CONFIG,
    getTeacherById,
    getTeacherBySubject,
    getAllTeachers,
    getTeachersByStyle,
} from './teachers';

export type {
    TeacherPersona,
    Subject,
    TeachingStyle,
    Language,
} from './teachers';

// Content Generation
export {
    generateLecture,
    generateQuestions,
    generateLecturePrompt,
    generateQuestionPrompt,
    formatLectureForDisplay,
    formatQuestionsForDisplay,
} from './content-generator';

export type {
    LectureRequest,
    LectureContent,
    LectureSection,
    PracticeProblem,
    NarrationScript,
    NarrationSection,
    QuestionRequest,
    GeneratedQuestion,
    QuestionSet,
} from './content-generator';

// Scheduling
export {
    DEFAULT_SCHEDULING_CONFIG,
    CURRICULUM_TEMPLATES,
    CHAPTER_TEMPLATES,
    createWeeklySchedule,
    generateCurriculumPlan,
    getNextClass,
    getClassesForDate,
    getClassesForTeacher,
    createPublishQueue,
    formatScheduleDate,
    formatScheduleTime,
    isRevisionDay,
    isTestDay,
} from './scheduling';

export type {
    ClassSchedule,
    WeeklySchedule,
    CurriculumPlan,
    ChapterPlan,
    TopicPlan,
    SchedulingConfig,
    TimeSlot,
    PublishQueue,
    ScheduleFrequency,
    ContentType,
    ClassStatus,
} from './scheduling';
