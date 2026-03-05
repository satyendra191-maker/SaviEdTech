import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - SaviEduTech',
  description: 'SaviEduTech Terms of Service - Terms and conditions for using our platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-slate-600 mb-4">
            By accessing and using SaviEduTech, you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">2. Use License</h2>
          <p className="text-slate-600 mb-4">
            Permission is granted to temporarily use SaviEduTech for personal, non-commercial use only.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">3. User Account</h2>
          <p className="text-slate-600 mb-4">
            You are responsible for maintaining the confidentiality of your account and password.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">4. Prohibited Uses</h2>
          <p className="text-slate-600 mb-4">
            You may not use our services for any unlawful purpose or to violate any applicable regulations.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">5. Contact</h2>
          <p className="text-slate-600 mb-4">
            For questions about these terms, contact support@saviedutech.com.
          </p>
        </div>
      </div>
    </div>
  );
}
