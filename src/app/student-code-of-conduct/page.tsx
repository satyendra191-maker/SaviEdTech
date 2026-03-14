import { Metadata } from 'next';
import { BookOpen, Award, AlertTriangle, Users, Scale, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Student Code of Conduct - SaviEduTech',
  description: 'SaviEduTech Student Code of Conduct - Expected behavior and academic standards.',
};

export default function StudentCodeOfConductPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <BookOpen className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Student Code of Conduct</h1>
          <p className="text-slate-500">Last Updated: March 2026</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. Our Values</h2>
            <p className="text-slate-600 mb-4">
              SaviEduTech is committed to fostering an environment of academic excellence, integrity, and mutual respect. This Code of Conduct outlines the behavior expected from all students.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <Award className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-indigo-900 font-medium">Excellence</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <Scale className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-indigo-900 font-medium">Integrity</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <Users className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-indigo-900 font-medium">Respect</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. Academic Integrity</h2>
            <p className="text-slate-600 mb-4">Students must maintain the highest standards of academic honesty:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Submit original work for all assignments and assessments</li>
              <li>Properly cite sources when using others' work</li>
              <li>Do not collaborate on individual assignments unless permitted</li>
              <li>Do not share exam questions or answers with others</li>
              <li>Report any academic dishonesty witnessed</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-slate-900">3. Prohibited Behavior</h2>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 font-medium mb-2">The following behaviors are strictly prohibited:</p>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                <li>Cheating, plagiarism, or fabrication</li>
                <li>Using unauthorized materials during exams</li>
                <li>Impersonating another student</li>
                <li>Sharing account credentials</li>
                <li>Harassing or bullying other students or faculty</li>
                <li>Disrupting online classes or sessions</li>
                <li>Posting inappropriate content</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">4. Respectful Conduct</h2>
            <p className="text-slate-600 mb-4">All students are expected to:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Treat fellow students, faculty, and staff with respect</li>
              <li>Participate constructively in discussions</li>
              <li>Listen to and consider diverse perspectives</li>
              <li>Communicate professionally in all interactions</li>
              <li>Respect others' privacy and confidentiality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">5. Learning Environment</h2>
            <p className="text-slate-600 mb-4">Students should contribute to a positive learning environment by:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Attending scheduled classes and sessions regularly</li>
              <li>Being prepared and completing assigned work</li>
              <li>Asking questions and seeking help when needed</li>
              <li>Providing constructive feedback</li>
              <li>Following technical etiquette for online learning</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">6. Use of Technology</h2>
            <p className="text-slate-600 mb-4">Students must use technology responsibly:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Use only authorized devices and accounts</li>
              <li>Protect personal login credentials</li>
              <li>Not attempt to bypass security systems</li>
              <li>Not download or distribute unauthorized software</li>
              <li>Follow all IT policies and guidelines</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">7. Dress and Appearance</h2>
            <p className="text-slate-600">
              For live video sessions and virtual classes, students should dress appropriately in clean, modest attire that reflects a professional educational environment.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-slate-900">8. Benefits of Compliance</h2>
            </div>
            <p className="text-slate-600 mb-4">Following this Code of Conduct ensures:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-green-800 font-medium">Fair Evaluation</p>
                <p className="text-green-700 text-sm">All students are evaluated on equal grounds</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-green-800 font-medium">Quality Education</p>
                <p className="text-green-700 text-sm">Receive the full benefit of our programs</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-green-800 font-medium">Respectful Community</p>
                <p className="text-green-700 text-sm">Learn in a supportive environment</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-green-800 font-medium">Skill Development</p>
                <p className="text-green-700 text-sm">Build character alongside knowledge</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">9. Reporting Concerns</h2>
            <p className="text-slate-600 mb-4">
              Students who witness violations of this Code should report them to:
            </p>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-indigo-600 font-medium">conduct@saviedutech.com</p>
            </div>
            <p className="text-slate-600 text-sm mt-3">
              All reports will be handled confidentially.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">10. Consequences</h2>
            <p className="text-slate-600 mb-4">Violations may result in:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Warning or reprimand</li>
              <li>Assignment of remedial work</li>
              <li>Suspension from courses or platform</li>
              <li>Permanent expulsion</li>
              <li>Revocation of certificates or credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">11. Acknowledgment</h2>
            <p className="text-slate-600">
              By enrolling in SaviEduTech courses, students acknowledge that they have read, understood, and agree to abide by this Code of Conduct.
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
