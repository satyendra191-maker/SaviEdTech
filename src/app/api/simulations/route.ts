import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const simulationId = searchParams.get('id');

  const simulations = [
    { id: 'projectile-motion', name: 'Projectile Motion', type: 'physics', engine: 'canvas-2d', parameters: ['velocity', 'angle', 'gravity'] },
    { id: 'ohms-law', name: "Ohm's Law", type: 'physics', engine: 'canvas-2d', parameters: ['voltage', 'resistance'] },
    { id: 'pendulum', name: 'Simple Pendulum', type: 'physics', engine: 'canvas-2d', parameters: ['length', 'gravity'] },
    { id: 'lens', name: 'Focal Length of Lens', type: 'physics', engine: 'canvas-2d', parameters: ['focal-length', 'object-distance'] },
    { id: 'electric-field', name: 'Electric Field', type: 'physics', engine: 'canvas-2d', parameters: ['charge', 'distance'] },
    { id: 'wave-interference', name: 'Wave Interference', type: 'physics', engine: 'canvas-2d', parameters: ['wavelength', 'amplitude'] },
    { id: 'bond-formation', name: 'Chemical Bond Formation', type: 'chemistry', engine: 'canvas-2d', parameters: ['atoms', 'bond-energy'] },
    { id: 'periodic-table', name: 'Periodic Table', type: 'chemistry', engine: 'interactive', parameters: ['element'] },
    { id: 'reaction-kinetics', name: 'Reaction Kinetics', type: 'chemistry', engine: 'canvas-2d', parameters: ['concentration', 'temperature'] },
    { id: 'electrolysis', name: 'Electrolysis', type: 'chemistry', engine: 'canvas-2d', parameters: ['current', 'time'] },
    { id: 'cell-structure', name: 'Cell Structure', type: 'biology', engine: 'interactive', parameters: ['magnification'] },
    { id: 'dna-replication', name: 'DNA Replication', type: 'biology', engine: 'interactive', parameters: ['speed'] },
    { id: 'organ-systems', name: 'Organ Systems', type: 'biology', engine: 'interactive', parameters: ['organ'] },
    { id: 'food-web', name: 'Food Web', type: 'biology', engine: 'interactive', parameters: ['ecosystem'] },
    { id: 'quadratic-roots', name: 'Quadratic Equation', type: 'mathematics', engine: 'canvas-2d', parameters: ['a', 'b', 'c'] },
    { id: 'derivative-visualization', name: 'Derivative Visualization', type: 'mathematics', engine: 'canvas-2d', parameters: ['function', 'point'] },
    { id: 'conic-sections', name: 'Conic Sections', type: 'mathematics', engine: 'canvas-2d', parameters: ['eccentricity'] },
    { id: 'trig-transformations', name: 'Trigonometric Transformations', type: 'mathematics', engine: 'canvas-2d', parameters: ['amplitude', 'frequency', 'phase'] },
  ];

  if (simulationId) {
    const sim = simulations.find(s => s.id === simulationId);
    if (!sim) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }
    return NextResponse.json({ simulation: sim });
  }

  return NextResponse.json({ simulations });
}
