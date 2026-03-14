import { Metadata } from 'next';
import { Shield, Lock, Users, BookOpen, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service - SaviEduTech',
  description: 'SaviEduTech Terms of Service - Terms and conditions for using our platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Shield className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-slate-500">Last Updated: March 2026</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. Platform Description</h2>
            <p className="text-slate-600 mb-4">SaviEduTech provides digital educational services including:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Online courses for competitive exam preparation (JEE, NEET, etc.)</li>
              <li>AI tutoring assistance</li>
              <li>Practice exams and assessments</li>
              <li>Academic analytics and performance tracking</li>
              <li>Educational content and community discussion</li>
            </ul>
            <p className="text-slate-600 mt-4">These services are intended for educational purposes only.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. User Accounts</h2>
            <p className="text-slate-600 mb-4">Users must create an account to access certain features of the platform.</p>
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-indigo-900 font-medium mb-2">You agree to:</p>
              <ul className="list-disc list-inside space-y-1 text-indigo-800">
                <li>Provide accurate registration information</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </div>
            <p className="text-slate-600 mt-4">SaviEduTech reserves the right to suspend accounts suspected of misuse.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">3. Eligibility</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Users under the age of 18 must use the platform under parental supervision</li>
              <li>Parents or guardians are responsible for monitoring minor users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">4. Payment Terms</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Certain courses or services may require payment</li>
              <li>All payments are processed through authorized payment providers</li>
              <li>Refund eligibility is subject to the refund policy of the specific course</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">5. Intellectual Property</h2>
            <p className="text-slate-600 mb-4">All platform content including course materials, videos, practice questions, and AI-generated content are the intellectual property of SaviEduTech unless otherwise stated.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 font-medium">You may NOT:</p>
              <p className="text-amber-700 text-sm mt-2">Reproduce, distribute, or sell any content without permission.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">6. Academic Integrity</h2>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 font-medium">Prohibited Activities</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                <li>Cheat during exams</li>
                <li>Distribute exam content</li>
                <li>Misuse AI tools for dishonest purposes</li>
              </ul>
              <p className="text-red-800 text-sm mt-3">Violation may result in account suspension.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-slate-600">SaviEduTech provides educational services but does not guarantee specific exam results or outcomes. The platform shall not be liable for indirect or consequential damages.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">8. Termination</h2>
            <p className="text-slate-600">SaviEduTech may suspend or terminate accounts for violations of these terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">9. Changes to Terms</h2>
            <p className="text-slate-600">These Terms of Service may be updated periodically. Users will be notified of significant updates.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">10. Governing Law</h2>
            <p className="text-slate-600">These terms shall be governed by the laws of India.</p>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <p className="text-slate-500 text-sm">Questions? Contact us at <span className="text-indigo-600">support@saviedutech.com</span></p>
          </section>
        </div>

        <div className="mt-8 text-center space-x-4">
          <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>
          <Link href="/refund" className="text-indigo-600 hover:underline">Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
