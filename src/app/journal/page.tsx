import Link from 'next/link';

export default function JournalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Experiment Journal</h1>
        <p className="text-xl text-gray-300 mb-8">
          Document and track your virtual lab experiments
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/journal/1" className="block p-6 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition">
            <div className="text-4xl mb-4">📝</div>
            <h2 className="text-xl font-semibold mb-2">My Experiments</h2>
            <p className="text-gray-400">View your experiment history</p>
          </Link>
          
          <Link href="/journal/new" className="block p-6 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition">
            <div className="text-4xl mb-4">➕</div>
            <h2 className="text-xl font-semibold mb-2">New Experiment</h2>
            <p className="text-gray-400">Start a new experiment entry</p>
          </Link>
          
          <Link href="/journal/templates" className="block p-6 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-xl font-semibold mb-2">Templates</h2>
            <p className="text-gray-400">Use pre-made experiment templates</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
