import Link from 'next/link';

export default function SimulationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Virtual Simulations</h1>
        <p className="text-xl text-gray-300 mb-8">
          Interactive science simulations to enhance your learning experience
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/simulations/physics-101" className="block p-6 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition">
            <div className="text-4xl mb-4">⚛️</div>
            <h2 className="text-xl font-semibold mb-2">Physics Simulations</h2>
            <p className="text-gray-400">Explore mechanics, thermodynamics, and more</p>
          </Link>
          
          <Link href="/simulations/chemistry-lab" className="block p-6 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition">
            <div className="text-4xl mb-4">🧪</div>
            <h2 className="text-xl font-semibold mb-2">Chemistry Lab</h2>
            <p className="text-gray-400">Virtual chemistry experiments safely</p>
          </Link>
          
          <Link href="/simulations/biology-cell" className="block p-6 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition">
            <div className="text-4xl mb-4">🧬</div>
            <h2 className="text-xl font-semibold mb-2">Biology Cell</h2>
            <p className="text-gray-400">Explore cell structure and functions</p>
          </Link>
          
          <Link href="/simulations/math-3d" className="block p-6 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 transition">
            <div className="text-4xl mb-4">📐</div>
            <h2 className="text-xl font-semibold mb-2">3D Math</h2>
            <p className="text-gray-400">Visualize 3D geometry and calculus</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
