/**
 * Career Portal Type Definitions
 * 
 * These types extend the Supabase Database types for the career portal feature.
 */

export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead';
export type ApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired';

export interface JobListing {
    id: string;
    title: string;
    department: string;
    location: string;
    type: JobType;
    experience_level: ExperienceLevel;
    salary_min: number | null;
    salary_max: number | null;
    description: string;
    requirements: string[];
    responsibilities: string[];
    skills: string[];
    benefits: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deadline: string | null;
    applications_count: number;
}

export interface JobApplication {
    id: string;
    job_id: string | null;
    full_name: string;
    email: string;
    phone: string;
    linkedin: string | null;
    portfolio: string | null;
    current_company: string | null;
    years_of_experience: string | null;
    current_ctc: string | null;
    expected_ctc: string | null;
    notice_period: string | null;
    cover_letter: string | null;
    referrer: string | null;
    resume_url: string;
    resume_file_name: string;
    resume_file_size: number;
    status: ApplicationStatus;
    created_at: string;
    updated_at: string;
}

export interface ApplicationWithJob extends JobApplication {
    job_listings?: {
        title: string;
        department: string;
    } | null;
}

export interface CreateJobInput {
    title: string;
    department: string;
    location: string;
    type: JobType;
    experience_level: ExperienceLevel;
    salary_min?: number | null;
    salary_max?: number | null;
    description: string;
    requirements?: string[];
    responsibilities?: string[];
    skills?: string[];
    benefits?: string[];
    deadline?: string | null;
    is_active?: boolean;
}

export interface UpdateJobInput extends Partial<CreateJobInput> {
    id: string;
}

export interface SubmitApplicationInput {
    jobId?: string | null;
    fullName: string;
    email: string;
    phone: string;
    linkedin?: string;
    portfolio?: string;
    currentCompany?: string;
    yearsOfExperience?: string;
    currentCTC?: string;
    expectedCTC?: string;
    noticePeriod?: string;
    coverLetter?: string;
    referrer?: string;
    resumeUrl: string;
    fileName: string;
    fileSize: number;
}

export interface JobFilters {
    search?: string;
    department?: string;
    type?: JobType | 'all';
    experience_level?: ExperienceLevel | 'all';
}
