import { Metadata } from 'next';
import { Shield, Lock, Eye, Database, Bell, Users, Globe } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - SaviEduTech',
  description: 'SaviEduTech Privacy Policy - How we collect, use, and protect your personal information.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Shield className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-500">Last Updated: March 2026</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">1. Introduction</h2>
            </div>
            <p className="text-slate-600 mb-4">
              SaviEduTech ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our digital coaching platform.
            </p>
            <p className="text-slate-600">
              By using SaviEduTech, you consent to the data practices described in this policy.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">2. Information We Collect</h2>
            </div>
            
            <h3 className="font-semibold text-slate-800 mb-2">Personal Information</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-600 mb-4">
              <li>Name, email address, and phone number</li>
              <li>Date of birth and demographic information</li>
              <li>Educational background and academic records</li>
              <li>Payment information (processed securely through third parties)</li>
              <li>Profile pictures and user-generated content</li>
            </ul>

            <h3 className="font-semibold text-slate-800 mb-2">Automatically Collected Information</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage data (pages visited, time spent, features used)</li>
              <li>Learning analytics (test scores, progress, performance metrics)</li>
              <li>Cookies and tracking technologies</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">3. How We Use Your Information</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Provide and personalize educational services</li>
              <li>Track academic progress and generate performance reports</li>
              <li>Communicate with you about courses, updates, and support</li>
              <li>Process payments and manage subscriptions</li>
              <li>Improve our platform through analytics and research</li>
              <li>Comply with legal obligations and enforce our policies</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">4. Information Sharing & Disclosure</h2>
            </div>
            <p className="text-slate-600 mb-4">We may share your information with:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li><strong>Service Providers:</strong> Third-party vendors who assist in platform operations</li>
              <li><strong>Educational Partners:</strong> Institutions collaborating on courses</li>
              <li><strong>Legal Authorities:</strong> When required by law or to protect rights</li>
              <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
              <p className="text-amber-800 font-medium">We do NOT sell your personal information to third parties.</p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">5. Data Security</h2>
            </div>
            <p className="text-slate-600 mb-4">
              We implement industry-standard security measures including encryption, access controls, and regular security audits to protect your information.
            </p>
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-indigo-900 font-medium">Data Retention</p>
              <p className="text-indigo-800 text-sm mt-1">We retain your data as long as your account is active or as needed to provide services. You may request deletion of your data at any time.</p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">6. Your Rights</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify inaccurate or incomplete data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to processing of your data</li>
              <li>Data portability - receive your data in a structured format</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">7. Cookies & Tracking</h2>
            </div>
            <p className="text-slate-600 mb-4">
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, and personalize content. You can manage cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">8. Children's Privacy</h2>
            <p className="text-slate-600 mb-4">
              Our platform is intended for users of all ages. For users under 18, we collect minimal information with parental consent. Parents can review, update, or delete their child's information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">9. Third-Party Links</h2>
            <p className="text-slate-600">
              Our platform may contain links to third-party websites. We are not responsible for the privacy practices of those websites. We encourage you to review their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-slate-600">
              We may update this Privacy Policy periodically. We will notify you of any material changes by posting the new policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">11. Contact Us</h2>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-600">For questions about this Privacy Policy, contact us at:</p>
              <p className="text-indigo-600 font-medium mt-2">privacy@saviedutech.com</p>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <p className="text-slate-500 text-sm">Questions? Contact us at <span className="text-indigo-600">support@saviedutech.com</span></p>
          </section>
        </div>

        <div className="mt-8 text-center space-x-4">
          <Link href="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>
          <Link href="/refund" className="text-indigo-600 hover:underline">Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
