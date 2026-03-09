import type { Metadata } from 'next';
import { ContactPageClient } from '@/components/contact-page-client';

export const metadata: Metadata = {
    title: 'Contact Us - SaviEduTech',
    description: 'Contact SaviEduTech for admissions guidance, platform support, and academic assistance.',
};

export default function ContactPage() {
    return <ContactPageClient />;
}
