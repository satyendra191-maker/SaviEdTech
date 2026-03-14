import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, simulation_type, parameters } = body;

    const simulationTemplate = {
      type: simulation_type || 'custom',
      parameters: parameters || {},
      created_at: new Date().toISOString()
    };

    const aiGenerated = {
      simulation: simulationTemplate,
      explanation: `Generated simulation based on: "${prompt}". This simulation demonstrates the key concepts and allows interactive parameter adjustment.`,
      suggestions: [
        'Adjust parameters to see real-time changes',
        'Compare different scenarios',
        'Note down observations for your journal'
      ],
      related_concepts: [
        'Fundamental principles',
        'Practical applications',
        'Common misconceptions'
      ]
    };

    return NextResponse.json({ 
      success: true, 
      ...aiGenerated
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate simulation' 
    }, { status: 500 });
  }
}

export async function GET() {
  const availableTypes = [
    { id: 'projectile-motion', name: 'Projectile Motion', category: 'Physics' },
    { id: 'pendulum', name: 'Simple Pendulum', category: 'Physics' },
    { id: 'wave-interference', name: 'Wave Interference', category: 'Physics' },
    { id: 'electric-field', name: 'Electric Field', category: 'Physics' },
    { id: 'bond-formation', name: 'Chemical Bond Formation', category: 'Chemistry' },
    { id: 'titration', name: 'Titration', category: 'Chemistry' },
    { id: 'cell-structure', name: 'Cell Structure', category: 'Biology' },
    { id: 'dna-replication', name: 'DNA Replication', category: 'Biology' },
    { id: 'quadratic-roots', name: 'Quadratic Equation', category: 'Mathematics' },
    { id: 'derivative-visualization', name: 'Derivative Visualization', category: 'Mathematics' },
    { id: 'custom', name: 'Custom Simulation', category: 'Other' },
  ];

  return NextResponse.json({ 
    simulation_types: availableTypes,
    message: 'AI Simulation Generator is ready'
  });
}
