export { authService, type OAuthProvider, type AuthProvider, type UserRole } from './authService';
export { AuthProvider as AuthProviderComponent, useAuth, type Profile, type VerificationStatus } from './AuthProvider';
export { AuthGuard, RoleGuard, VerificationGuard } from './AuthGuard';
export { ProtectedRoute } from './ProtectedRoute';
export { RoleRoute, AdminRoute, TeacherRoute, StudentRoute, ParentRoute } from './RoleRoute';
