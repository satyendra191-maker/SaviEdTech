import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Previous Year Papers - SaviEduTech',
  description: 'Access previous year question papers for JEE and NEET.',
};

export default function PapersPage() {
  const papers = [
    { year: '2024', exam: 'JEE Main', sessions: ['Session 1', 'Session 2'] },
    { year: '2023', exam: 'JEE Main', sessions: ['Session 1', 'Session 2'] },
    { year: '2023', exam: 'JEE Advanced', sessions: ['Paper 1', 'Paper 2'] },
    { year: '2024', exam: 'NEET', sessions: ['UG'] },
    { year: '2023', exam: 'NEET', sessions: ['UG'] },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Previous Year Papers</h1>
        <p className="text-lg text-slate-600 mb-12">Practice with authentic previous year question papers</p>

        <div className="space-y-4">
          {papers.map((paper) => (
            <div key={`${paper.exam}-${paper.year}`} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{paper.exam} - {paper.year}</h3>
                  <p className="text-slate-600">{paper.sessions.join(', ')}</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                  View Papers
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
