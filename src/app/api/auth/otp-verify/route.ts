import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { identifier, token, isEmail } = await request.json();

    if (!identifier || !token) {
      return NextResponse.json(
        { error: 'Identifier and token are required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    let result;
    
    if (isEmail) {
      // For email, verify via the token in the URL (handled by callback)
      // This endpoint handles phone OTP verification
      return NextResponse.json(
        { error: 'Email OTP verification not supported via this endpoint' },
        { status: 400 }
      );
    } else {
      // Phone OTP verification
      // Format phone to E.164 format if needed
      let phone = identifier;
      if (!phone.startsWith('+')) {
        // Assume Indian number if 10 digits
        if (phone.length === 10) {
          phone = '+91' + phone;
        }
      }
      
      result = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      user: result.data.user,
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
