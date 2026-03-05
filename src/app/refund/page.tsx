import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy - SaviEduTech',
  description: 'SaviEduTech Refund Policy - Terms for refunds and cancellations.',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Refund Policy</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">1. Refund Eligibility</h2>
          <p className="text-slate-600 mb-4">
            We offer a 7-day money-back guarantee for all our paid courses. If you&apos;re not satisfied, 
            you can request a full refund within 7 days of purchase.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">2. How to Request a Refund</h2>
          <p className="text-slate-600 mb-4">
            To request a refund, please contact our support team at support@saviedutech.com with your 
            order details and reason for refund.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">3. Refund Processing</h2>
          <p className="text-slate-600 mb-4">
            Approved refunds will be processed within 5-7 business days and credited to your original 
            payment method.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">4. Non-Refundable Items</h2>
          <p className="text-slate-600 mb-4">
            Digital content that has been downloaded or accessed cannot be refunded. 
            Free trials and promotional offers are non-refundable.
          </p>
        </div>
      </div>
    </div>
  );
}
