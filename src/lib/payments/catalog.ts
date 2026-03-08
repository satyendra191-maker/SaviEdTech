export interface CourseOffer {
    id: string;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    features: string[];
    duration?: string;
    accent: string;
    accessHref: string;
}

export interface SubscriptionPlan {
    id: string;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    durationDays: number;
    features: string[];
    accent: string;
    accessHref: string;
}

export const COURSE_OFFERS: CourseOffer[] = [
    {
        id: 'jee-main-pro',
        title: 'JEE Main Pro',
        description: 'Structured JEE Main preparation with lectures, practice, DPPs, mock tests, and analytics.',
        price: 4499,
        originalPrice: 7999,
        duration: '12 months',
        accent: 'from-blue-500 to-cyan-500',
        accessHref: '/jee',
        features: [
            'Full lecture library with progress tracking',
            'Daily practice sets and chapter-wise drills',
            'Mock tests with rank prediction',
            'Performance analytics and topic mastery',
        ],
    },
    {
        id: 'jee-advanced-elite',
        title: 'JEE Advanced Elite',
        description: 'Advanced problem-solving program for IIT aspirants with intensive tests and analytics.',
        price: 5999,
        originalPrice: 9999,
        duration: '12 months',
        accent: 'from-indigo-500 to-violet-500',
        accessHref: '/jee-advanced',
        features: [
            'Advanced-level lecture and question bank',
            'Multi-section mock tests with review mode',
            'Personalized weak-topic tracking',
            'Higher-order rank prediction and trend analysis',
        ],
    },
    {
        id: 'neet-complete',
        title: 'NEET Complete',
        description: 'Biology-heavy NEET preparation with daily revision, practice analytics, and timed simulations.',
        price: 4999,
        originalPrice: 8499,
        duration: '12 months',
        accent: 'from-emerald-500 to-teal-500',
        accessHref: '/neet',
        features: [
            'PCB-aligned lectures and revision plans',
            'Daily practice and NEET mock simulations',
            'Subject accuracy and mastery dashboard',
            'Exam-readiness insights and percentile tracking',
        ],
    },
    {
        id: 'foundation-board-booster',
        title: 'Foundation & Boards Booster',
        description: 'Class 9-10 foundation reinforcement with board-focused practice and revision analytics.',
        price: 2999,
        originalPrice: 5499,
        duration: '9 months',
        accent: 'from-amber-500 to-orange-500',
        accessHref: '/materials',
        features: [
            'Concept-first lecture library',
            'Daily homework-style practice sets',
            'Board and foundation test packs',
            'Parent-visible progress tracking',
        ],
    },
];

export const PREMIUM_PLAN: SubscriptionPlan = {
    id: 'premium-annual',
    title: 'Premium Subscription',
    description: 'Unlock premium analytics, enhanced rank prediction refresh, and priority access across the platform.',
    price: 2999,
    originalPrice: 4999,
    durationDays: 365,
    accent: 'from-slate-900 to-emerald-600',
    accessHref: '/dashboard/analytics',
    features: [
        'Premium analytics dashboard access',
        'Priority rank prediction refresh',
        'Enhanced progress tracking and insights',
        'Premium support and early feature access',
    ],
};

export function getCourseOffer(courseId: string) {
    return COURSE_OFFERS.find((course) => course.id === courseId) ?? null;
}

export function isPremiumPlan(courseId: string) {
    return courseId === PREMIUM_PLAN.id;
}
