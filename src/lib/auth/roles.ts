import type { UserRole } from '@/types';

export const ADMIN_PRIVILEGED_ROLES: readonly UserRole[] = [
    'admin',
    'super_admin',
    'platform_admin',
    'academic_director',
];

export const CONTENT_ROLES: readonly UserRole[] = [
    ...ADMIN_PRIVILEGED_ROLES,
    'content_manager',
    'video_production_manager',
    'ai_content_trainer',
    'ai_trainer',
];

export const TEACHING_ROLES: readonly UserRole[] = [
    ...ADMIN_PRIVILEGED_ROLES,
    'faculty',
    'teacher',
    'content_manager',
];

export const FINANCE_ROLES: readonly UserRole[] = [
    ...ADMIN_PRIVILEGED_ROLES,
    'finance',
    'finance_manager',
    'accounts_manager',
];

export const HR_ROLES: readonly UserRole[] = [
    ...ADMIN_PRIVILEGED_ROLES,
    'hr',
    'hr_manager',
];

export const MARKETING_ROLES: readonly UserRole[] = [
    ...ADMIN_PRIVILEGED_ROLES,
    'marketing',
    'marketing_manager',
    'social_media_manager',
];

export const SUPPORT_ROLES: readonly UserRole[] = [
    ...ADMIN_PRIVILEGED_ROLES,
    'technical_support',
    'support',
    'compliance',
    'compliance_team',
];

export const EMPLOYEE_ROLES: readonly UserRole[] = [
    ...ADMIN_PRIVILEGED_ROLES,
    'faculty',
    'teacher',
    'content_manager',
    'video_production_manager',
    'ai_content_trainer',
    'ai_trainer',
    'hr',
    'hr_manager',
    'finance',
    'finance_manager',
    'accounts_manager',
    'marketing',
    'marketing_manager',
    'social_media_manager',
    'technical_support',
    'support',
    'compliance',
    'compliance_team',
];

export const ADMIN_APP_ROLES: readonly UserRole[] = EMPLOYEE_ROLES;
