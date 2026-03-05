import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center - SaviEduTech',
  description: 'Get help and support from SaviEduTech.',
};

export default function HelpPage() {
  const helpTopics = [
    { title: 'Account & Login', description: 'Issues with login, password reset, account settings' },
    { title: 'Payments & Billing', description: 'Payment methods, invoices, subscription plans' },
    { title: 'Courses & Content', description: 'Accessing courses, video playback, downloads' },
    { title: 'Technical Support', description: 'Browser issues, app problems, compatibility' },
    { title: 'Exams & Tests', description: 'Mock tests, test submissions, results' },
    { title: 'Certificates', description: 'Certificate generation, verification' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Help Center</h1>
        <p className="text-lg text-slate-600 mb-12">How can we help you today?</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {helpTopics.map((topic) => (
            <div key={topic.title} className="bg-slate-50 p-6 rounded-lg border border-slate-200 hover:shadow-lg transition cursor-pointer">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{topic.title}</h3>
              <p className="text-slate-600">{topic.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-blue-50 p-8 rounded-lg">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">Still Need Help?</h2>
          <p className="text-slate-600 mb-6">Our support team is available 24/7 to assist you.</p>
          <a href="mailto:support@saviedutech.com" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
