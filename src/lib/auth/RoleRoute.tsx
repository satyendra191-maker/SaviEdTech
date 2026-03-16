'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { UserRole } from './authService';
import { ADMIN_APP_ROLES, TEACHING_ROLES } from './roles';

type Role = UserRole | readonly UserRole[];

interface RoleRouteProps {
  children: React.ReactNode;
  role: Role;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function RoleRoute({ children, role, fallback, redirectTo }: RoleRouteProps) {
  const { role: userRole, isLoading } = useAuth();
  const router = useRouter();

  const allowedRoles = Array.isArray(role) ? [...role] : [role];

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!userRole || !allowedRoles.includes(userRole)) {
      if (redirectTo) {
        router.push(redirectTo);
      }
    }
  }, [userRole, isLoading, router, allowedRoles, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return <>{children}</>;
}

export function AdminRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleRoute role={ADMIN_APP_ROLES} redirectTo="/unauthorized" fallback={fallback}>
      {children}
    </RoleRoute>
  );
}

export function TeacherRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleRoute role={TEACHING_ROLES} redirectTo="/unauthorized" fallback={fallback}>
      {children}
    </RoleRoute>
  );
}

export function StudentRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleRoute role="student" redirectTo="/unauthorized" fallback={fallback}>
      {children}
    </RoleRoute>
  );
}

export function ParentRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleRoute role="parent" redirectTo="/unauthorized" fallback={fallback}>
      {children}
    </RoleRoute>
  );
}

export default RoleRoute;
