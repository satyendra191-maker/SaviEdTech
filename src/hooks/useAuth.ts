'use client';

import { useAuth as useAuthContext } from '@/lib/auth/AuthProvider';

/**
 * useAuth Hook
 * 
 * This hook is a simple wrapper around the AuthProvider context.
 * It provides access to the application's authentication state and methods.
 * 
 * Usage:
 * const { user, isAuthenticated, signIn, signOut } = useAuth();
 */
export const useAuth = () => {
    return useAuthContext();
};

export default useAuth;
