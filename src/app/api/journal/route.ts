import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { experiment_id, user_id, observations, result } = body;

    const journal = {
      id: crypto.randomUUID(),
      experiment_id,
      user_id,
      observations,
      result,
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    return NextResponse.json({ 
      success: true, 
      journal,
      message: 'Journal saved successfully'
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save journal' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const experiment_id = searchParams.get('experiment_id');
  const user_id = searchParams.get('user_id');

  const journals = [
    { id: '1', experiment_id: 'projectile-motion', user_id: 'user1', completed_at: '2026-03-10' },
    { id: '2', experiment_id: 'ohms-law', user_id: 'user1', completed_at: '2026-03-12' },
  ];

  let filtered = journals;
  if (experiment_id) {
    filtered = filtered.filter(j => j.experiment_id === experiment_id);
  }
  if (user_id) {
    filtered = filtered.filter(j => j.user_id === user_id);
  }

  return NextResponse.json({ journals: filtered });
}
