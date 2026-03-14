import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { class_level, user_id, payment_id, amount } = body;

    const subscription = {
      id: crypto.randomUUID(),
      class_level,
      user_id,
      payment_id,
      amount,
      status: 'active',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };

    return NextResponse.json({ 
      success: true, 
      subscription,
      message: 'Subscription activated successfully'
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create subscription' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get('user_id');
  const class_level = searchParams.get('class');

  const subscriptions = [
    { id: '1', user_id: 'user1', class_level: 10, status: 'active', end_date: '2027-03-15' },
    { id: '2', user_id: 'user2', class_level: 12, status: 'active', end_date: '2027-03-15' },
  ];

  let filtered = subscriptions;
  if (user_id) {
    filtered = filtered.filter(s => s.user_id === user_id);
  }
  if (class_level) {
    filtered = filtered.filter(s => s.class_level === parseInt(class_level));
  }

  return NextResponse.json({ subscriptions: filtered });
}
