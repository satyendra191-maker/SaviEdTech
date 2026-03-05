# SaviEduTech Security Documentation

## Overview

This document describes the security measures implemented in the SaviEduTech platform to protect against common web vulnerabilities and attacks.

## Critical Security Issues Fixed

### 1. CRON_SECRET Exposure (FIXED)

**Issue:** `NEXT_PUBLIC_CRON_SECRET` was exposed in client-side code at `src/app/super-admin/page.tsx`.

**Risk:** Anyone could trigger cron jobs by extracting the secret from browser code.

**Solution:**
- Removed direct cron endpoint calls from client
- Created secure API route at `/api/admin/cron-trigger`
- CRON_SECRET now only accessed server-side
- Added admin authentication and authorization checks
- Implemented rate limiting (3 attempts per hour)
- Added audit logging for all cron trigger actions

**Files Modified:**
- `src/app/super-admin/page.tsx` - Uses secure API now
- `src/app/api/admin/cron-trigger/route.ts` - New secure API route

### 2. Missing Rate Limiting (FIXED)

**Issue:** No rate limiting on API endpoints allowed brute force attacks.

**Solution:**
- Implemented rate limiting in `src/middleware.ts`
- Auth endpoints: 5 attempts per 15 minutes
- General API: 100 requests per minute
- Strict rate limiting: 3 attempts per hour for sensitive operations
- Rate limit headers included in responses
- Automatic cleanup of expired entries

**Configuration:**
```typescript
RATE_LIMITS = {
  AUTH: { maxRequests: 5, windowMs: 15 * 60 * 1000 },    // 15 minutes
  API: { maxRequests: 100, windowMs: 60 * 1000 },         // 1 minute
  STRICT: { maxRequests: 3, windowMs: 60 * 60 * 1000 },   // 1 hour
}
```

### 3. No Input Validation (FIXED)

**Issue:** Form submissions lacked comprehensive validation and sanitization.

**Solution:**
- Created `src/lib/security.ts` with Zod validation schemas
- Email validation with format checking
- Password validation with security requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- Phone number validation (Indian format)
- Input sanitization to prevent XSS
- Suspicious pattern detection

**Files Enhanced:**
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`

### 4. Service Role Key Risk (AUDITED & SECURED)

**Issue:** `createAdminSupabaseClient()` with service role key could be misused.

**Solution:**
- Added comprehensive security warnings in `src/lib/supabase.ts`
- Runtime check prevents usage in browser context
- Clear documentation of when/where to use each client type
- Added `verifyServerOnly()` helper function
- Enhanced error handling to prevent key leakage

**Client Types:**
| Function | Environment | Key Type | RLS |
|----------|-------------|----------|-----|
| `createBrowserSupabaseClient()` | Browser | Anon | ✅ Respected |
| `getSupabaseBrowserClient()` | Browser | Anon | ✅ Respected |
| `createServerSupabaseClient()` | Server | Anon | ✅ Respected |
| `createAdminSupabaseClient()` | Server Only | Service Role | ❌ Bypassed |

### 5. Security Headers (ENHANCED)

**Previous State:** Basic headers were present but insufficient.

**Enhancements:**
- `X-Frame-Options`: Changed from `SAMEORIGIN` to `DENY`
- `X-Content-Type-Options`: `nosniff` (prevents MIME sniffing)
- `Strict-Transport-Security`: HSTS with 2-year max-age
- `Content-Security-Policy`: Comprehensive CSP rules
- `Referrer-Policy`: `strict-origin-when-cross-origin`
- `Permissions-Policy`: Disables unused browser features
- `X-XSS-Protection`: Enabled for legacy browsers

**Files Modified:**
- `next.config.ts` - Headers for static files
- `src/middleware.ts` - Headers for dynamic responses

## Security Module (`src/lib/security.ts`)

### Features

#### Rate Limiting
```typescript
import { checkRateLimit, RATE_LIMITS } from '@/lib/security';

const result = checkRateLimit(identifier, RATE_LIMITS.AUTH);
if (!result.allowed) {
  // Handle rate limit exceeded
}
```

#### Input Validation Schemas
```typescript
import { emailSchema, passwordSchema, phoneSchema } from '@/lib/security';

// Use with Zod
const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
```

#### Input Sanitization
```typescript
import { sanitizeInput, sanitizeUrl } from '@/lib/security';

const clean = sanitizeInput(userInput);  // Removes XSS vectors
const safeUrl = sanitizeUrl(userInput);  // Validates URL format
```

#### Suspicious Pattern Detection
```typescript
import { containsSuspiciousPatterns } from '@/lib/security';

if (containsSuspiciousPatterns(input)) {
  // Block request
}
```

## Middleware Security (`src/middleware.ts`)

### Protection Layers

1. **Suspicious Request Blocking**
   - Checks URLs and query params for attack patterns
   - Blocks SQL injection attempts
   - Blocks XSS attempts
   - Blocks path traversal attempts

2. **Rate Limiting**
   - Different limits for auth vs API routes
   - IP-based identification
   - Automatic cleanup of old entries

3. **Authentication Checks**
   - Protects `/dashboard`, `/admin`, `/super-admin`
   - Redirects unauthenticated users
   - Admin role verification

4. **Security Headers**
   - Added to all responses
   - Prevents common attacks

## Authentication Security

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character

### Rate Limiting on Auth
- Login attempts: 5 per 15 minutes
- Password reset: 3 per hour
- Error messages don't reveal if email exists

### Session Security
- HTTPOnly cookies (handled by Supabase Auth)
- SameSite cookie policy
- Secure flag in production

## API Security

### Cron Trigger API (`/api/admin/cron-trigger`)
- Authentication required
- Admin role verification
- Rate limiting (3 per hour)
- Input validation with Zod
- Audit logging
- Server-side CRON_SECRET usage only

### Request Flow
```
Client Request
    ↓
Middleware (Rate Limit, Suspicious Pattern Check)
    ↓
Authentication Check
    ↓
Authorization Check (Admin routes)
    ↓
Input Validation (Zod)
    ↓
Business Logic
    ↓
Security Headers Added
    ↓
Response
```

## Environment Variables

### Required Server-Only Variables (Never expose to client)
```
SUPABASE_SERVICE_ROLE_KEY  # Admin operations only
CRON_SECRET                # Cron job authentication
```

### Safe for Client (NEXT_PUBLIC_ prefix)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Security Check
Run this to verify no secrets are exposed:
```bash
grep -r "NEXT_PUBLIC.*SECRET" src/ || echo "No exposed secrets found"
```

## Best Practices

### For Developers

1. **Never use `createAdminSupabaseClient()` in browser code**
   - It will throw an error if used in browser
   - Only for API routes and server components

2. **Always validate input with Zod**
   - Use schemas from `@/lib/security`
   - Sanitize all user inputs

3. **Check rate limits before expensive operations**
   - Use `checkRateLimit()` for custom endpoints
   - Middleware handles most routes automatically

4. **Log security events**
   - Use console.warn/error with `[Security]` prefix
   - Include requestId for tracing
   - Log admin actions

5. **Use proper error messages**
   - Don't leak sensitive information
   - Sanitize error messages before sending to client

### Security Checklist for New Features

- [ ] Input validation with Zod
- [ ] Rate limiting if applicable
- [ ] Authentication check if protected
- [ ] Authorization check if restricted
- [ ] Audit logging for sensitive operations
- [ ] No secrets in client code
- [ ] Error messages don't leak info

## Monitoring & Alerts

### Security Logs to Watch
- `[Security]` prefix - security events
- `[Audit]` prefix - admin actions
- Rate limit exceeded warnings
- Suspicious pattern detection

### Recommended Monitoring
- Failed authentication attempts
- Rate limit violations
- Admin action logs
- Cron job triggers

## Incident Response

### If You Suspect a Breach

1. **Immediately**
   - Rotate CRON_SECRET
   - Rotate SUPABASE_SERVICE_ROLE_KEY
   - Check admin audit logs

2. **Investigation**
   - Review security logs
   - Check for unusual cron triggers
   - Verify user roles weren't escalated

3. **Prevention**
   - Review code for exposed secrets
   - Verify all endpoints have proper auth
   - Check rate limiting is active

## Contact

For security concerns, contact the security team immediately.

---

**Last Updated:** March 4, 2026  
**Version:** 1.0.0  
**Classification:** Internal Use Only
