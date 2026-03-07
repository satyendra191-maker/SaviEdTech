import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us - SaviEduTech',
  description: 'Get in touch with SaviEduTech. We\'re here to help with your JEE and NEET preparation questions.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen page-bg-contact">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Contact Us</h1>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">Get in Touch</h2>
            <p className="text-slate-600 mb-8">
              Have questions about our courses or need assistance? Our team is here to help you.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900">Email</h3>
                <p className="text-slate-600">support@saviedutech.com</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Phone</h3>
                <p className="text-slate-600">+91 98765 43210</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Address</h3>
                <p className="text-slate-600">
                  SaviEduTech Technologies Pvt. Ltd.<br />
                  123 Education Lane<br />
                  New Delhi, India - 110001
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-8 rounded-lg">
            <form className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <input type="text" id="name" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input type="email" id="email" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                <textarea id="message" rows={4} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
