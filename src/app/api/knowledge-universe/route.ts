import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject');
  const user_id = searchParams.get('user_id');

  const knowledgeUniverse = {
    subjects: [
      {
        id: 'physics',
        name: 'Physics Galaxy',
        color: '#3b82f6',
        icon: 'atom',
        topics: [
          { id: 'mechanics', name: 'Mechanics', mastery: 75, simulations: ['projectile-motion', 'pendulum'], estimated_time: '45 min' },
          { id: 'thermodynamics', name: 'Thermodynamics', mastery: 60, simulations: ['heat-transfer'], estimated_time: '40 min' },
          { id: 'optics', name: 'Optics', mastery: 45, simulations: ['lens', 'refraction'], estimated_time: '35 min' },
          { id: 'electromagnetism', name: 'Electromagnetism', mastery: 30, simulations: ['electric-field', 'ohms-law'], estimated_time: '50 min' },
          { id: 'waves', name: 'Waves & Sound', mastery: 55, simulations: ['wave-interference'], estimated_time: '30 min' },
        ]
      },
      {
        id: 'chemistry',
        name: 'Chemistry Galaxy',
        color: '#10b981',
        icon: 'flask',
        topics: [
          { id: 'organic', name: 'Organic Chemistry', mastery: 70, simulations: ['bond-formation'], estimated_time: '55 min' },
          { id: 'inorganic', name: 'Inorganic Chemistry', mastery: 50, simulations: ['periodic-table'], estimated_time: '40 min' },
          { id: 'physical', name: 'Physical Chemistry', mastery: 40, simulations: ['reaction-kinetics'], estimated_time: '45 min' },
          { id: 'electrochemistry', name: 'Electrochemistry', mastery: 35, simulations: ['electrolysis'], estimated_time: '35 min' },
        ]
      },
      {
        id: 'mathematics',
        name: 'Mathematics Galaxy',
        color: '#8b5cf6',
        icon: 'calculator',
        topics: [
          { id: 'algebra', name: 'Algebra', mastery: 80, simulations: ['quadratic-roots'], estimated_time: '30 min' },
          { id: 'calculus', name: 'Calculus', mastery: 55, simulations: ['derivative-visualization'], estimated_time: '50 min' },
          { id: 'geometry', name: 'Coordinate Geometry', mastery: 65, simulations: ['conic-sections'], estimated_time: '40 min' },
          { id: 'trigonometry', name: 'Trigonometry', mastery: 45, simulations: ['trig-transformations'], estimated_time: '35 min' },
        ]
      },
      {
        id: 'biology',
        name: 'Biology Galaxy',
        color: '#f59e0b',
        icon: 'dna',
        topics: [
          { id: 'cell-biology', name: 'Cell Biology', mastery: 72, simulations: ['cell-structure'], estimated_time: '45 min' },
          { id: 'genetics', name: 'Genetics', mastery: 58, simulations: ['dna-replication'], estimated_time: '50 min' },
          { id: 'human-anatomy', name: 'Human Anatomy', mastery: 40, simulations: ['organ-systems'], estimated_time: '55 min' },
          { id: 'ecology', name: 'Ecosystems', mastery: 50, simulations: ['food-web'], estimated_time: '30 min' },
        ]
      },
    ]
  };

  if (subject) {
    const filtered = knowledgeUniverse.subjects.find(s => s.id === subject);
    return NextResponse.json({ subject: filtered || null });
  }

  return NextResponse.json(knowledgeUniverse);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic_id, mastery_score, user_id } = body;

    const progress = {
      topic_id,
      mastery_score,
      user_id,
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({ 
      success: true, 
      progress,
      message: 'Progress updated successfully'
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update progress' 
    }, { status: 500 });
  }
}
