import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - SaviEduTech',
  description: 'Frequently Asked Questions about SaviEduTech.',
};

export default function FAQPage() {
  const faqs = [
    {
      question: 'What is SaviEduTech?',
      answer: 'SaviEduTech is India\'s premier digital coaching platform for JEE and NEET preparation, offering expert video lectures, mock tests, and practice questions.'
    },
    {
      question: 'How do I enroll in a course?',
      answer: 'Simply create an account, browse our courses, and click on the course you want to enroll in. You can pay online through various payment methods.'
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We accept all major credit/debit cards, UPI, net banking, and popular digital wallets through our secure Razorpay payment gateway.'
    },
    {
      question: 'Can I get a refund?',
      answer: 'Yes, we offer a 7-day money-back guarantee. If you\'re not satisfied with a course, contact our support team within 7 days for a full refund.'
    },
    {
      question: 'How do I access the study materials?',
      answer: 'All enrolled students can access study materials from their dashboard. Download PDFs and other resources directly from the course page.'
    },
    {
      question: 'Are the lectures available offline?',
      answer: 'Currently, our video lectures are streaming-only. You can download study materials and practice questions for offline use.'
    },
    {
      question: 'How do I track my progress?',
      answer: 'Your dashboard shows detailed analytics including test scores, study time, weak areas, and overall progress. Regular bi-weekly tests help measure your preparation level.'
    },
    {
      question: 'Can I interact with faculty?',
      answer: 'Yes, you can ask doubts through our discussion forums and live Q&A sessions with faculty members.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">Frequently Asked Questions</h1>
        
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{faq.question}</h3>
              <p className="text-slate-600">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">Still have questions?</p>
          <a href="/contact" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}
