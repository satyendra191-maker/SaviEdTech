import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Notes & Study Materials – SaviEduTech',
  description: 'Access your study notes, lecture materials, and resources for JEE and NEET preparation.',
};

// /notes redirects to the dashboard lectures section
// Students can access their notes and materials after logging in
export default function NotesPage() {
  redirect('/dashboard/lectures');
}
