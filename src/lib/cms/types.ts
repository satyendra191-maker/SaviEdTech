export interface CMSPage {
    id: string;
    slug: string;
    title: string;
    description: string;
    content: string;
    sections: CMSSection[];
    seo: CMSSeo;
    status: 'draft' | 'published';
    createdAt: string;
    updatedAt: string;
}

export interface CMSSection {
    id: string;
    type: 'hero' | 'features' | 'stats' | 'testimonials' | 'cta' | 'faculty' | 'custom';
    title?: string;
    subtitle?: string;
    content?: string;
    items?: CMSItem[];
    settings?: Record<string, any>;
    order: number;
}

export interface CMSItem {
    id: string;
    title: string;
    description?: string;
    image?: string;
    link?: string;
    order: number;
    metadata?: Record<string, any>;
}

export interface CMSSeo {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
}

export interface CMSFaculty {
    id: string;
    name: string;
    subject: string;
    description: string;
    image: string;
    experience: string;
    students: string;
    videos: string;
    specialization: string;
    order: number;
    status: 'active' | 'inactive';
}

export interface CMSCourse {
    id: string;
    name: string;
    description: string;
    price: number;
    features: string[];
    image: string;
    category: string;
    order: number;
    status: 'active' | 'inactive';
}

export interface CMSBlogPost {
    id: string;
    slug: string;
    title: string;
    description: string;
    content: string;
    category: string;
    image: string;
    author: string;
    publishedAt: string;
    tags: string[];
    status: 'draft' | 'published';
}

export interface CMSSettings {
    siteName: string;
    tagline: string;
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    socialLinks: Record<string, string>;
}

export type PageType = 'home' | 'courses' | 'faculty' | 'blog' | 'career' | 'contact' | 'about';
