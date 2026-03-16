'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
  requireVerification?: boolean;
}

export function AuthGuard({ 
  children, 
  allowedRoles, 
  requireVerification = true 
}: AuthGuardProps) {
  const router = useRouter();
  const { 
    isAuthenticated, 
    isLoading, 
    role, 
    isVerified,
    verificationStatus,
    signOut 
  } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (requireVerification && !isVerified) {
      if (verificationStatus === 'blocked') {
        router.push('/auth/auth-code-error?error=account_blocked');
      } else {
        router.push('/pending-verification');
      }
      return;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
      router.push('/unauthorized');
      return;
    }
  }, [
    isAuthenticated, 
    isLoading, 
    role, 
    isVerified, 
    verificationStatus,
    requireVerification,
    allowedRoles,
    router,
    signOut
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireVerification && !isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Verifying account...</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 font-medium">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function RoleGuard({ 
  children, 
  allowedRoles 
}: { 
  children: ReactNode; 
  allowedRoles: string[];
}) {
  return (
    <AuthGuard allowedRoles={allowedRoles} requireVerification={true}>
      {children}
    </AuthGuard>
  );
}

export function VerificationGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireVerification={true}>
      {children}
    </AuthGuard>
  );
}

export default AuthGuard;
