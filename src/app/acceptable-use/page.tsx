import { Metadata } from 'next';
import { Shield, AlertTriangle, Ban, FileText, Globe, Mail } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy - SaviEduTech',
  description: 'SaviEduTech Acceptable Use Policy - Guidelines for using our platform.',
};

export default function AcceptableUsePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Shield className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Acceptable Use Policy</h1>
          <p className="text-slate-500">Last Updated: March 2026</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. Purpose</h2>
            <p className="text-slate-600 mb-4">
              This Acceptable Use Policy ("AUP") establishes the rules and guidelines for using SaviEduTech's platform. By using our services, you agree to comply with this policy.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Ban className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-slate-900">2. Prohibited Activities</h2>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-red-800 font-medium">You may NOT:</p>
              </div>
              <ul className="list-disc list-inside space-y-2 text-red-700">
                <li>Use the platform for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to systems or data</li>
                <li>Distribute malware, viruses, or other harmful software</li>
                <li>Engage in activities that disrupt or interfere with platform functionality</li>
                <li>Share account credentials with others</li>
                <li>Publish or transmit abusive, harassing, or threatening content</li>
                <li>Collect or store personal information about other users without consent</li>
                <li>Use automated tools (bots) to access or scrape platform content</li>
                <li>Resell or redistribute platform content without authorization</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">3. Content Guidelines</h2>
            </div>
            <p className="text-slate-600 mb-4">All content uploaded to the platform must:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Be original or properly attributed</li>
              <li>Not violate intellectual property rights</li>
              <li>Be appropriate for an educational environment</li>
              <li>Not contain misleading or false information</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">4. Network Security</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Do not attempt to circumvent security measures</li>
              <li>Report any security vulnerabilities you discover</li>
              <li>Do not probe, scan, or test system vulnerabilities</li>
              <li>Do not overload or flood the platform with traffic</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">5. Academic Integrity</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="text-amber-800 font-medium">Critical Requirements</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
                <li>Submit your own work for assessments</li>
                <li>Do not share exam questions or answers</li>
                <li>Do not use unauthorized materials during tests</li>
                <li>Report any academic dishonesty you witness</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">6. Respectful Communication</h2>
            <p className="text-slate-600 mb-4">All communications on the platform must be:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Professional and respectful</li>
              <li>Free from harassment or discrimination</li>
              <li>Free from spam or commercial promotion</li>
              <li>In compliance with our community guidelines</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">7. Enforcement</h2>
            <p className="text-slate-600 mb-4">Violations of this policy may result in:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Warning or suspension of account</li>
              <li>Termination of account</li>
              <li>Legal action for serious violations</li>
              <li>Reporting to law enforcement when required</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">8. Reporting Violations</h2>
            <p className="text-slate-600 mb-4">
              If you witness any violations of this policy, please report them immediately to:
            </p>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-indigo-600 font-medium">abuse@saviedutech.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">9. Policy Changes</h2>
            <p className="text-slate-600">
              We may update this policy periodically. Continued use of the platform constitutes acceptance of any changes.
            </p>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <p className="text-slate-500 text-sm">Questions? Contact us at <span className="text-indigo-600">support@saviedutech.com</span></p>
          </section>
        </div>

        <div className="mt-8 text-center space-x-4">
          <Link href="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
