import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Study Materials - SaviEduTech',
  description: 'Download comprehensive study materials for JEE and NEET preparation.',
};

export default function MaterialsPage() {
  const materials = [
    { title: 'Physics Notes', type: 'PDF', size: '25 MB' },
    { title: 'Chemistry Notes', type: 'PDF', size: '30 MB' },
    { title: 'Mathematics Notes', type: 'PDF', size: '20 MB' },
    { title: 'Biology Notes', type: 'PDF', size: '35 MB' },
    { title: 'Formula Sheets', type: 'PDF', size: '5 MB' },
    { title: 'Quick Revision Guide', type: 'PDF', size: '15 MB' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Study Materials</h1>
        <p className="text-lg text-slate-600 mb-12">Comprehensive study materials for your JEE and NEET preparation</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((material) => (
            <div key={material.title} className="bg-slate-50 p-6 rounded-lg border border-slate-200 hover:shadow-lg transition">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{material.title}</h3>
              <div className="flex justify-between text-sm text-slate-500 mb-4">
                <span>{material.type}</span>
                <span>{material.size}</span>
              </div>
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
