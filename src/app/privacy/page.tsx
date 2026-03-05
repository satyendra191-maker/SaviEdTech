import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - SaviEduTech',
  description: 'SaviEduTech Privacy Policy - How we protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">1. Introduction</h2>
          <p className="text-slate-600 mb-4">
            At SaviEduTech, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, 
            and safeguard your information when you use our platform.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">2. Information We Collect</h2>
          <p className="text-slate-600 mb-4">
            We collect information you provide directly to us, including name, email, phone number, and exam preferences.
            We also collect usage data and device information automatically.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">3. How We Use Your Information</h2>
          <p className="text-slate-600 mb-4">
            We use the information we collect to provide, maintain, and improve our services, to communicate with you,
            and to comply with legal obligations.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">4. Data Security</h2>
          <p className="text-slate-600 mb-4">
            We implement appropriate technical and organizational security measures to protect your personal information.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">5. Contact Us</h2>
          <p className="text-slate-600 mb-4">
            If you have any questions about this Privacy Policy, please contact us at support@saviedutech.com.
          </p>
        </div>
      </div>
    </div>
  );
}
