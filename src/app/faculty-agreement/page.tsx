import { Metadata } from 'next';
import { GraduationCap, FileText, DollarSign, Clock, Shield, BookOpen, MessageSquare, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Faculty Agreement - SaviEduTech',
  description: 'SaviEduTech Faculty Agreement - Terms and conditions for instructors and educators.',
};

export default function FacultyAgreementPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <GraduationCap className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Faculty Agreement</h1>
          <p className="text-slate-500">Last Updated: March 2026</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. Overview</h2>
            <p className="text-slate-600 mb-4">
              This Faculty Agreement ("Agreement") governs the relationship between SaviEduTech and its affiliated instructors, educators, and content creators ("Faculty Members").
            </p>
            <p className="text-slate-600">
              By joining SaviEduTech as a Faculty Member, you agree to the terms outlined in this Agreement.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">2. Eligibility Requirements</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Minimum educational qualification: Bachelor's degree in relevant field</li>
              <li>Prior teaching experience (online or offline)</li>
              <li>Subject matter expertise in assigned courses</li>
              <li>Excellent communication skills</li>
              <li>Ability to commit to scheduled sessions</li>
              <li>Clean background check (if required)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">3. Responsibilities</h2>
            
            <h3 className="font-semibold text-slate-800 mb-2">Teaching Duties</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-600 mb-4">
              <li>Deliver high-quality lectures as per course curriculum</li>
              <li>Prepare course materials, presentations, and assessments</li>
              <li>Conduct live sessions at scheduled times</li>
              <li>Answer student queries within promised turnaround time</li>
              <li>Evaluate assignments and provide constructive feedback</li>
              <li>Update content periodically to maintain relevance</li>
            </ul>

            <h3 className="font-semibold text-slate-800 mb-2">Professional Conduct</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Maintain professional behavior in all interactions</li>
              <li>Respect diversity and promote inclusive learning</li>
              <li>Adhere to academic integrity standards</li>
              <li>Protect student privacy and confidential information</li>
              <li>Report any issues promptly to the administration</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">4. Content Ownership</h2>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4">
              <ul className="list-disc list-inside space-y-2 text-indigo-800">
                <li>Faculty Members retain ownership of pre-existing materials</li>
                <li>New materials created for courses become SaviEduTech property</li>
                <li>Faculty grants SaviEduTech license to use and modify content</li>
                <li>Cannot use course materials for competing platforms</li>
                <li>Must not infringe on third-party intellectual property</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">5. Compensation</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Compensation is as per the agreed fee structure</li>
              <li>Payments are processed monthly via bank transfer</li>
              <li>Tax deductions apply as per applicable laws</li>
              <li>Performance bonuses may be awarded for exceptional delivery</li>
              <li>Payment disputes must be raised within 30 days</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">6. Scheduling & Availability</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Must maintain minimum 90% attendance for scheduled sessions</li>
              <li>Provide minimum 48 hours notice for schedule changes</li>
              <li>Have reliable internet connection and suitable setup</li>
              <li>Be available for at least 10 hours per week for student queries</li>
              <li>Attend faculty meetings and training sessions</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">7. Communication</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Use official channels for student communication</li>
              <li>Respond to student messages within 24 hours</li>
              <li>Maintain professional tone in all communications</li>
              <li>Do not share personal contact information with students</li>
              <li>Report inappropriate student behavior immediately</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">8. Confidentiality</h2>
            </div>
            <p className="text-slate-600 mb-4">Faculty Members must maintain confidentiality regarding:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Student personal information and academic records</li>
              <li>Proprietary course content and materials</li>
              <li>Business strategies and platform operations</li>
              <li>Analytics data and performance metrics</li>
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-slate-900">9. Termination</h2>
            </div>
            <p className="text-slate-600 mb-4">This Agreement may be terminated by:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-800 font-medium mb-2">By SaviEduTech</p>
                <ul className="list-disc list-inside text-red-700 text-sm">
                  <li>Material breach of Agreement</li>
                  <li>Poor performance or reviews</li>
                  <li>Conduct violating policies</li>
                  <li>Misconduct or negligence</li>
                </ul>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-slate-800 font-medium mb-2">By Faculty Member</p>
                <ul className="list-disc list-inside text-slate-700 text-sm">
                  <li>30 days written notice</li>
                  <li>Completion of active courses</li>
                  <li>Handing over all materials</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">10. Non-Compete</h2>
            <p className="text-slate-600 mb-4">
              During the term of engagement and for 12 months after termination, Faculty Members may not create, teach, or promote competitive courses on rival platforms without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">11. Performance Review</h2>
            <p className="text-slate-600 mb-4">
              Faculty Members will be evaluated based on:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Student ratings and feedback</li>
              <li>Course completion rates</li>
              <li>Attendance and punctuality</li>
              <li>Content quality and updates</li>
              <li>Professional conduct</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">12. Agreement Acceptance</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800">
                By accepting engagement with SaviEduTech, you confirm that you have read, understood, and agree to be bound by the terms of this Faculty Agreement.
              </p>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <p className="text-slate-500 text-sm">Questions? Contact us at <span className="text-indigo-600">faculty@saviedutech.com</span></p>
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
