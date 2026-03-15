import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { identifier, isEmail } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    let result;
    
    if (isEmail) {
      // Email OTP (magic link)
      result = await supabase.auth.signInWithOtp({
        email: identifier,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
        },
      });
    } else {
      // Phone OTP
      // Format phone to E.164 format if needed
      let phone = identifier;
      if (!phone.startsWith('+')) {
        // Assume Indian number if 10 digits
        if (phone.length === 10) {
          phone = '+91' + phone;
        }
      }
      
      result = await supabase.auth.signInWithOtp({
        phone,
      });
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OTP request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
