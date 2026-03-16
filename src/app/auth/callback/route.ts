import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { resolvePostAuthDestination } from '@/lib/auth/redirects';
import { EMPLOYEE_ROLES } from '@/lib/auth/roles';

function isEmployeeRole(role: string | null): boolean {
  return role ? EMPLOYEE_ROLES.includes(role as (typeof EMPLOYEE_ROLES)[number]) : false;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const searchParams = requestUrl.searchParams;
  const origin = requestUrl.origin;
  
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const redirect = searchParams.get('redirect');
  const type = searchParams.get('type');

  // Capture Supabase error parameters if present
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const errorCode = searchParams.get('error_code');

  if (error) {
    console.error('Supabase Auth Error Param Detected:', { error, errorDescription, errorCode });
    const errorUrl = new URL('/auth/auth-code-error', origin);
    errorUrl.searchParams.set('error', error);
    errorUrl.searchParams.set('description', errorDescription || '');
    errorUrl.searchParams.set('code', errorCode || '');
    return NextResponse.redirect(errorUrl.toString());
  }

  const destination = resolvePostAuthDestination({
    next,
    redirect,
    type,
  });

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError || !sessionData.user) {
      console.error('Session exchange error:', sessionError);
      const errorUrl = new URL('/auth/auth-code-error', origin);
      errorUrl.searchParams.set('error', 'session_failed');
      errorUrl.searchParams.set('message', sessionError?.message || 'Failed to exchange code for session');
      return NextResponse.redirect(errorUrl.toString());
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionData.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error after login:', profileError);
      const errorUrl = new URL('/auth/auth-code-error', origin);
      errorUrl.searchParams.set('error', 'profile_not_found');
      if (profileError) errorUrl.searchParams.set('description', profileError.message);
      return NextResponse.redirect(errorUrl.toString());
    }

    const verificationStatus = profile.status || 'pending';
    const isVerified = (profile.is_verified === true || profile.is_verified === 1) && verificationStatus === 'active';
    const profileRole = profile.role || 'student';
    const isEmployee = isEmployeeRole(profileRole);

    if (verificationStatus === 'blocked') {
      await supabase.auth.signOut();
      const errorUrl = new URL('/auth/auth-code-error', origin);
      errorUrl.searchParams.set('error', 'account_blocked');
      return NextResponse.redirect(errorUrl.toString());
    }

    if (!isVerified) {
      await supabase.auth.signOut();
      const errorUrl = new URL('/auth/auth-code-error', origin);
      if (isEmployee) {
        errorUrl.searchParams.set('error', 'employee_pending');
      } else {
        errorUrl.searchParams.set('error', 'not_verified');
      }
      return NextResponse.redirect(errorUrl.toString());
    }

    return NextResponse.redirect(`${origin}${destination}`);
  }

  // If we reach here, no code and no error param was found.
  console.warn('Auth callback called with no code or error. Params:', searchParams.toString());
  const fallbackErrorUrl = new URL('/auth/auth-code-error', origin);
  fallbackErrorUrl.searchParams.set('error', 'invalid_request');
  fallbackErrorUrl.searchParams.set('description', 'Auth callback reached without authorization code or error details.');
  fallbackErrorUrl.searchParams.set('debug_params', searchParams.toString());
  return NextResponse.redirect(fallbackErrorUrl.toString());
}
