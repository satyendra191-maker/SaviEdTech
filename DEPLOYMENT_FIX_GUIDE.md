# 🚀 Deployment Fix Guide - Features Not Showing

## Issue Summary
The deployed site on Vercel is not showing the new admin features, UI changes, and other updates that exist in the codebase.

---

## ✅ Code Fix Applied

### Fixed: UserRole Type Mismatch
**File:** `src/types/index.ts` (line 2)

**Before:**
```typescript
export type UserRole = 'student' | 'admin' | 'content_manager';
```

**After:**
```typescript
export type UserRole = 'student' | 'admin' | 'super_admin' | 'content_manager';
```

**Why this matters:** The middleware and super-admin layout check for `'super_admin'` role, which was missing from the type definition. This could cause TypeScript compilation errors or runtime issues.

---

## 🔧 Deployment Checklist

### Step 1: Verify Environment Variables in Vercel

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Required variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**Important:** After adding environment variables, you **MUST redeploy** for them to take effect.

---

### Step 2: Force Fresh Build (Clear Cache)

In Vercel Dashboard:
1. Go to **Deployments**
2. Click the latest deployment
3. Click **Redeploy** → **Use existing Build Cache: NO**

Or via CLI:
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy with force (skips cache)
vercel --force
```

---

### Step 3: Verify Database Roles

In your **Supabase Dashboard**:

```sql
-- Check if your user has the correct role
SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';

-- If role is NULL or 'student', update it:
UPDATE profiles SET role = 'super_admin' WHERE email = 'your-email@example.com';
```

**Valid roles:** `student`, `admin`, `super_admin`, `content_manager`

---

### Step 4: Verify Build Logs

In Vercel Dashboard:
1. Go to the latest deployment
2. Click **Build Logs**
3. Look for any errors (shown in red)

Common build errors to watch for:
- TypeScript compilation errors
- Missing environment variables
- Module not found errors

---

### Step 5: Verify Deployment Source

Make sure Vercel is deploying from the correct branch:

1. Vercel Dashboard → **Settings** → **Git**
2. Check **Production Branch** is set to your working branch (usually `main` or `master`)
3. Verify the latest commit in Vercel matches your local:
   ```bash
   git log --oneline -1
   ```

---

## 🔍 Quick Diagnostic Commands

Run these locally to verify everything works:

```bash
# 1. Type check (catches type errors)
npm run typecheck

# 2. Build locally (catches build errors)
npm run build

# 3. Check if build output contains all routes
ls -la .next/server/app/

# 4. Verify environment variables are set
cat .env.local | grep NEXT_PUBLIC_SUPABASE
```

---

## 🎯 Feature Access Matrix

| Feature | URL | Required Role | Middleware Check |
|---------|-----|---------------|------------------|
| Admin Dashboard | `/admin` | `admin` or `super_admin` | ✅ Protected |
| Super Admin | `/super-admin` | `super_admin` | ✅ Protected |
| Student Dashboard | `/dashboard` | Any authenticated | ✅ Protected |
| Career Portal | `/careers` | Public | ❌ None |
| Daily Challenge | `/dashboard/challenge` | Any authenticated | ✅ Protected |
| Gamification | `/dashboard` | Any authenticated | ✅ Protected |

---

## 🚨 Common Issues & Solutions

### Issue 1: "This page could not be found"
**Cause:** Build cache is stale
**Solution:** Redeploy with "Use existing Build Cache: NO"

### Issue 2: Redirected to dashboard when accessing /admin
**Cause:** User role is not 'admin' or 'super_admin'
**Solution:** Update role in Supabase profiles table

### Issue 3: Blank page or 500 error
**Cause:** Missing environment variables
**Solution:** Add all required env vars in Vercel and redeploy

### Issue 4: TypeScript errors in build logs
**Cause:** Type mismatches (like the UserRole issue)
**Solution:** Run `npm run typecheck` locally and fix all errors

---

## 📋 Pre-Deployment Checklist

Before every deployment, verify:

- [ ] `npm run typecheck` passes with no errors
- [ ] `npm run build` succeeds locally
- [ ] All environment variables are set in Vercel
- [ ] Database migrations are applied (if any)
- [ ] User roles are properly configured in Supabase
- [ ] Redeploy with "Build Cache: NO" if issues persist

---

## 🆘 Still Not Working?

1. **Check Vercel Function Logs:**
   - Dashboard → Deployments → Latest → **Function Logs**
   - Look for runtime errors

2. **Check Browser Console:**
   - Open deployed site
   - Press F12 → Console
   - Look for 500 errors or missing chunks

3. **Verify API Routes:**
   - Test: `https://your-site.com/api/cron/health-monitor`
   - Should return JSON response (not 404)

4. **Contact Support with:**
   - Build logs from failed deployment
   - Screenshot of environment variables (with keys blurred)
   - Commit hash being deployed
