import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sitemap - SaviEduTech',
  description: 'Sitemap of SaviEduTech - Find all pages on our platform.',
};

export default function SitemapPage() {
  const sitemap = {
    main: [
      { name: 'Home', href: '/' },
      { name: 'About Us', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Login', href: '/login' },
      { name: 'Register', href: '/register' },
    ],
    courses: [
      { name: 'Online Courses', href: '/courses' },
      { name: 'JEE Preparation', href: '/jee' },
      { name: 'NEET Preparation', href: '/neet' },
      { name: 'Video Lectures', href: '/lectures' },
      { name: 'Practice Questions', href: '/practice' },
      { name: 'Mock Tests', href: '/tests' },
    ],
    resources: [
      { name: 'Study Materials', href: '/materials' },
      { name: 'Previous Year Papers', href: '/papers' },
      { name: 'Success Stories', href: '/stories' },
    ],
    support: [
      { name: 'Help Center', href: '/help' },
      { name: 'FAQs', href: '/faq' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Refund Policy', href: '/refund' },
    ],
    faculty: [
      { name: 'Our Faculty', href: '/faculty' },
      { name: 'Dharmendra Sir', href: '/faculty/dharmendra-sir' },
      { name: 'Harendra Sir', href: '/faculty/harendra-sir' },
      { name: 'Ravindra Sir', href: '/faculty/ravindra-sir' },
      { name: 'Arvind Sir', href: '/faculty/arvind-sir' },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Sitemap</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Main</h2>
            <ul className="space-y-2">
              {sitemap.main.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-blue-600 hover:underline">{item.name}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Courses</h2>
            <ul className="space-y-2">
              {sitemap.courses.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-blue-600 hover:underline">{item.name}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Resources</h2>
            <ul className="space-y-2">
              {sitemap.resources.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-blue-600 hover:underline">{item.name}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Support</h2>
            <ul className="space-y-2">
              {sitemap.support.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-blue-600 hover:underline">{item.name}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Faculty</h2>
            <ul className="space-y-2">
              {sitemap.faculty.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-blue-600 hover:underline">{item.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
