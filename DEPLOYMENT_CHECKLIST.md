# SaviEdTech Deployment Guide & Pre-Deployment Checklist

> **Version:** 1.0.0  
> **Last Updated:** March 2026  
> **Environment:** Vercel (Production) + Supabase + Next.js 15

---

## Table of Contents

1. [Pre-Deployment Checks](#1-pre-deployment-checks)
2. [GitHub Push Instructions](#2-github-push-instructions)
3. [Vercel Deployment Steps](#3-vercel-deployment-steps)
4. [Post-Deployment Verification](#4-post-deployment-verification)
5. [Rollback Procedure](#5-rollback-procedure)

---

## 1. Pre-Deployment Checks

### 1.1 TypeScript Compilation Verification

Run TypeScript type checking to ensure no type errors exist:

```bash
# Navigate to project root
cd c:/Users/Dell/Downloads/SaviEdTech

# Run TypeScript compiler (no emit - just type checking)
npm run typecheck
# OR
npx tsc --noEmit
```

✅ **Expected Output:** No errors (exit code 0)  
❌ **If Errors:** Fix all type errors before proceeding

### 1.2 Build Verification Steps

Test the production build locally:

```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Run production build
npm run build
```

**Build Checklist:**
- [ ] Build completes without errors
- [ ] No "Module not found" errors
- [ ] No webpack/compilation errors
- [ ] Static files generated in `.next/` directory
- [ ] No memory limit exceeded errors

**Verify Build Output:**
```bash
# Check if .next folder exists and has content
ls -la .next/

# Check for critical build artifacts
ls .next/static/
ls .next/server/
```

### 1.3 Environment Variables Checklist

Ensure all required environment variables are set in Vercel Dashboard:

| Variable | Required | Vercel Setting | Description |
|----------|----------|----------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Production | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Production | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Production | Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | Production | https://saviedutech.com |
| `CRON_SECRET` | ✅ Yes | Production | Secret for cron job authentication |
| `RESEND_API_KEY` | ⚠️ Optional | Production | Email service API key |
| `NEXT_PUBLIC_CLOUDFLARE_STREAM_TOKEN` | ⚠️ Optional | Production | Video streaming token |

**Verify Environment Variables in Vercel:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select `saviedutech` project
3. Click **Settings** → **Environment Variables**
4. Verify all required variables are set for **Production**
5. Ensure `NEXT_PUBLIC_*` variables are set correctly (exposed to browser)

**Local Environment Check:**
```bash
# Verify .env.local exists and is NOT tracked by git
cat .gitignore | grep env

# Verify .env.example is up to date
diff .env.example .env.local.example
```

### 1.4 Dependency Installation Check

```bash
# Clean dependency install test
rm -rf node_modules package-lock.json
npm ci

# Verify no peer dependency warnings
npm ls
```

**Critical Dependencies to Verify:**
- [ ] `next` >= 15.1.0
- [ ] `react` >= 19.0.0
- [ ] `@supabase/supabase-js` >= 2.47.0
- [ ] `typescript` >= 5.7.2

### 1.5 Database Migration Check

```bash
# Verify Supabase migrations are up to date
# Check for pending migrations in supabase/migrations/
ls supabase/migrations/

# Latest migration should match production schema
```

### 1.6 Pre-Deployment Quick Test

```bash
# Start production build locally
npm run build
npm start

# In another terminal, test critical endpoints
curl http://localhost:3000/api/health
```

---

## 2. GitHub Push Instructions

### 2.1 Pre-Push Checklist

Before pushing to GitHub:

- [ ] All tests pass (`npm test`)
- [ ] TypeScript compilation succeeds (`npm run typecheck`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No console.log statements left in production code
- [ ] No sensitive data in code (check for API keys, passwords)
- [ ] `.env.local` is in `.gitignore`
- [ ] No large binary files committed

### 2.2 Git Add, Commit, and Push Commands

```bash
# 1. Check current branch
git branch

# 2. Check status of changes
git status

# 3. Stage all changes
git add .

# 4. Review what's being committed
git diff --cached --stat

# 5. Commit with descriptive message
git commit -m "feat: add user authentication flow

- Implement JWT-based auth
- Add login/logout functionality
- Update middleware for protected routes

Closes #123"

# 6. Push to remote
git push origin main

# 7. Verify push was successful
git log --oneline -3
```

### 2.3 Branch Naming Recommendations

| Branch Type | Pattern | Example |
|-------------|---------|---------|
| Feature | `feature/description` | `feature/dark-mode` |
| Bug Fix | `fix/description` | `fix/login-redirect` |
| Hotfix | `hotfix/description` | `hotfix/payment-gateway` |
| Release | `release/vX.X.X` | `release/v1.2.0` |
| Experiment | `exp/description` | `exp/new-ui` |

**Protected Branches:**
- `main` - Production branch (protected)
- `develop` - Development branch (protected)

### 2.4 Commit Message Conventions

Use **Conventional Commits** format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add OAuth login` |
| `fix` | Bug fix | `fix(api): resolve timeout issue` |
| `docs` | Documentation only | `docs(readme): update setup instructions` |
| `style` | Code style changes | `style(lint): fix indentation` |
| `refactor` | Code refactoring | `refactor(utils): simplify date helpers` |
| `perf` | Performance improvements | `perf(db): optimize queries` |
| `test` | Add/update tests | `test(auth): add login tests` |
| `chore` | Maintenance tasks | `chore(deps): update packages` |
| `ci` | CI/CD changes | `ci(vercel): update build config` |

**Commit Message Examples:**
```bash
# Feature
git commit -m "feat(cron): add daily challenge scheduler

- Implement challenge generation at 00:00 UTC
- Add notification triggers for participants
- Update leaderboard calculations"

# Bug fix
git commit -m "fix(dashboard): resolve chart rendering error

Fixes issue where charts would not load on Safari browsers.
Root cause was incompatible date parsing."

# Breaking change
git commit -m "feat(api): redesign payment endpoints

BREAKING CHANGE: Payment API v2 requires new authentication headers.
Migration guide: docs/migration/payment-api-v2.md"
```

### 2.5 Pull Request Workflow (Recommended)

```bash
# 1. Create and switch to feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: implement feature X"

# 3. Push feature branch
git push -u origin feature/my-feature

# 4. Create Pull Request on GitHub
# - Set base: main
# - Set compare: feature/my-feature
# - Add description and link issues
# - Request review

# 5. After PR approval, merge to main
git checkout main
git pull origin main
```

---

## 3. Vercel Deployment Steps

### 3.1 Deployment Trigger Methods

**Method 1: Automatic Deployment (Recommended)**
1. Push code to `main` branch on GitHub
2. Vercel automatically detects push and starts deployment
3. Monitor deployment at [Vercel Dashboard](https://vercel.com/dashboard)

**Method 2: Manual Deployment via Vercel CLI**
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Deploy preview (non-production)
vercel
```

**Method 3: Redeploy from Vercel Dashboard**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select `saviedutech` project
3. Click **Deployments** tab
4. Find the deployment to redeploy
5. Click menu (⋮) → **Redeploy**

### 3.2 Environment Variable Configuration in Vercel

**Required Environment Variables:**

```bash
# Navigate to project settings
# Vercel Dashboard → Project → Settings → Environment Variables

# Add these variables for Production environment:

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_APP_URL=https://saviedutech.com
CRON_SECRET=your-secure-random-string-min-32-chars
```

**Variable Configuration Steps:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select `saviedutech` project
3. Click **Settings** → **Environment Variables**
4. Add each variable:
   - Name: Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Value: The actual value
   - Environment: Select **Production** (and Preview/Development as needed)
   - Click **Save**
5. **Redeploy** after adding/updating environment variables

**Security Best Practices:**
- Never commit `.env.local` to Git
- Use strong, unique values for `CRON_SECRET` (min 32 characters)
- Rotate API keys quarterly
- Use Vercel's environment variable encryption

### 3.3 Cron Job Verification After Deployment

**Configured Cron Jobs (from `vercel.json`):**

| Job | Schedule | Path | Description |
|-----|----------|------|-------------|
| DPP Generator | `30 2 * * *` | `/api/cron/dpp-generator` | Daily at 2:30 AM |
| Lecture Publisher | `0 2 * * *` | `/api/cron/lecture-publisher` | Daily at 2:00 AM |
| Revision Updater | `0 3 * * *` | `/api/cron/revision-updater` | Daily at 3:00 AM |
| Daily Challenge | `0 0 * * *` | `/api/cron/daily-challenge` | Daily at midnight |
| Rank Prediction | `0 4 * * *` | `/api/cron/rank-predictor` | Daily at 4:00 AM |
| Test Runner | `0 * * * *` | `/api/cron/test-runner` | Every hour |
| Health Monitor | `*/5 * * * *` | `/api/cron/health-monitor` | Every 5 minutes |

**Verify Cron Jobs:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select `saviedutech` project
3. Click **Crons** tab
4. Verify all 7 cron jobs are listed with correct schedules
5. Check **Last Run** and **Next Run** columns

**Test Cron Job Manually:**
```bash
# Trigger health monitor manually (requires CRON_SECRET)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://saviedutech.com/api/cron/health-monitor
```

### 3.4 Health Check Endpoints

**Primary Health Endpoints:**

| Endpoint | Method | Purpose | Expected Response |
|----------|--------|---------|-------------------|
| `/` | GET | Homepage | 200 OK, HTML content |
| `/api/cron/health-monitor` | GET | System health | 200 OK, JSON status |
| `/api/test-engine` | GET | Test engine status | 200 OK, JSON status |
| `/api/self-healing` | GET | Self-healing status | 200 OK, JSON status |
| `/api/security-audit` | GET | Security status | 200 OK, JSON status |
| `/api/performance-audit` | GET | Performance metrics | 200 OK, JSON status |

**Test Health Endpoints:**
```bash
# Test homepage
curl -I https://saviedutech.com

# Test API health (replace with actual CRON_SECRET)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://saviedutech.com/api/cron/health-monitor

# Test dashboard access
curl -I https://saviedutech.com/dashboard

# Test super admin
curl -I https://saviedutech.com/super-admin
```

---

## 4. Post-Deployment Verification

### 4.1 API Endpoint Testing Commands

**Test Critical API Endpoints:**

```bash
# Set base URL
BASE_URL="https://saviedutech.com"

# 1. Test homepage
echo "Testing homepage..."
curl -s -o /dev/null -w "%{http_code}" $BASE_URL/
echo ""

# 2. Test authentication callback
echo "Testing auth callback..."
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/callback"
echo ""

# 3. Test health monitor (requires auth)
echo "Testing health monitor..."
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  -o /dev/null -w "%{http_code}" "$BASE_URL/api/cron/health-monitor"
echo ""

# 4. Test test engine
echo "Testing test engine..."
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  -o /dev/null -w "%{http_code}" "$BASE_URL/api/test-engine"
echo ""

# 5. Test self-healing
echo "Testing self-healing..."
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  -o /dev/null -w "%{http_code}" "$BASE_URL/api/self-healing"
echo ""
```

**Expected Results:**
- Homepage: `200`
- API endpoints (with auth): `200`
- API endpoints (without auth): `401`

### 4.2 Dashboard Accessibility Checks

**Verify All Routes Load Correctly:**

| Route | Expected Status | Check |
|-------|-----------------|-------|
| `/` | 200 OK | ✅ Homepage loads |
| `/login` | 200 OK | ✅ Login page |
| `/register` | 200 OK | ✅ Register page |
| `/dashboard` | 200 OK/302 | ✅ Dashboard (redirects if not auth) |
| `/dashboard/analytics` | 200 OK | ✅ Analytics page |
| `/dashboard/tests` | 200 OK | ✅ Tests page |
| `/dashboard/practice` | 200 OK | ✅ Practice page |
| `/dashboard/dpp` | 200 OK | ✅ DPP page |
| `/dashboard/lectures` | 200 OK | ✅ Lectures page |
| `/dashboard/revision` | 200 OK | ✅ Revision page |
| `/dashboard/challenge` | 200 OK | ✅ Challenge page |
| `/dashboard/settings` | 200 OK | ✅ Settings page |
| `/admin` | 302 → /admin/dashboard | ✅ Admin redirect |
| `/super-admin` | 200 OK | ✅ Super Admin page |
| `/donate` | 200 OK | ✅ Donate page |

**Test Command:**
```bash
# Test all routes
ROUTES=("/" "/login" "/register" "/dashboard" "/admin" "/super-admin" "/donate")
for route in "${ROUTES[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "https://saviedutech.com$route")
  echo "$route: $status"
done
```

### 4.3 Cron Job Verification

**Verify Cron Jobs are Running:**

1. **Check Vercel Cron Dashboard:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select project → **Crons** tab
   - Verify all jobs show recent execution times

2. **Check Function Logs:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select project → **Functions** tab
   - Look for cron function executions
   - Check for errors in logs

3. **Manual Verification:**
```bash
# Trigger health monitor and check response
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://saviedutech.com/api/cron/health-monitor | jq .
```

**Expected Cron Response:**
```json
{
  "success": true,
  "monitor_id": "health_monitor_...",
  "overall_status": "healthy",
  "critical_issues": 0,
  "self_heal_triggered": false,
  "duration_ms": 1250
}
```

### 4.4 Error Monitoring Setup

**Vercel Monitoring:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project → **Monitoring** tab
3. Enable **Analytics** (if not already enabled)
4. Check **Errors** section for any runtime errors
5. Review **Web Vitals** for performance metrics

**Log Monitoring Commands:**
```bash
# View recent Vercel logs
vercel logs saviedutech --production

# Tail logs in real-time
vercel logs saviedutech --production --tail
```

**Key Metrics to Monitor:**
- [ ] Error rate < 1%
- [ ] 5xx errors = 0
- [ ] API response times < 1000ms
- [ ] Web Vitals (LCP, FID, CLS) in green

**Supabase Monitoring:**
1. Go to [Supabase Dashboard](https://app.supabase.io)
2. Select project → **Database** → **Logs**
3. Check for query errors or slow queries
4. Review **Reports** → **Usage** for connection limits

---

## 5. Rollback Procedure

### 5.1 How to Rollback if Issues Occur

**Method 1: Vercel Dashboard (Fastest - Recommended)**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select `saviedutech` project
3. Click **Deployments** tab
4. Find the last known **working** deployment
5. Click menu (⋮) → **Promote to Production**
6. Confirm the rollback

**Time to complete:** ~30 seconds

**Method 2: Git Revert**

```bash
# 1. Identify the commit to revert to
git log --oneline -10

# 2. Revert the problematic commit
git revert <commit-hash>

# 3. Push the revert
git push origin main

# 4. Vercel will auto-deploy the reverted code
```

**Method 3: Force Push Previous Commit**

```bash
# ⚠️ WARNING: Only use if you understand the implications

# 1. Find the last working commit
git log --oneline -10

# 2. Reset to that commit (locally)
git reset --hard <working-commit-hash>

# 3. Force push (this rewrites history)
git push --force origin main

# ⚠️ This will trigger a new deployment with the old code
```

### 5.2 Rollback Checklist

**Before Rollback:**
- [ ] Confirm issue is deployment-related
- [ ] Document the issue and error messages
- [ ] Notify team members of rollback
- [ ] Check if database migrations need rollback

**During Rollback:**
- [ ] Execute rollback via Vercel Dashboard or Git
- [ ] Monitor deployment progress
- [ ] Verify rollback deployment is successful

**After Rollback:**
- [ ] Test critical functionality
- [ ] Verify API endpoints respond correctly
- [ ] Check error logs have stopped
- [ ] Document what caused the issue
- [ ] Create fix for the issue
- [ ] Schedule post-mortem if needed

### 5.3 Emergency Contact Procedures

**Severity Levels:**

| Level | Description | Response Time | Action |
|-------|-------------|---------------|--------|
| P0 - Critical | Site completely down, no access | Immediate | Rollback immediately, page on-call |
| P1 - High | Core functionality broken | < 1 hour | Rollback if can't fix quickly |
| P2 - Medium | Non-critical features broken | < 4 hours | Fix forward if possible |
| P3 - Low | Minor UI issues, typos | < 24 hours | Schedule fix for next release |

**Emergency Contacts:**

```yaml
# Update these with actual contact information

Primary On-Call:
  Name: [Your Name]
  Phone: [Your Phone]
  Email: [Your Email]
  Slack: @[Your Slack Handle]

Secondary On-Call:
  Name: [Secondary Name]
  Phone: [Secondary Phone]
  Email: [Secondary Email]

Escalation:
  Manager: [Manager Name]
  Phone: [Manager Phone]

Vercel Support:
  URL: https://vercel.com/help
  Status: https://www.vercel-status.com/

Supabase Support:
  URL: https://supabase.com/support
  Status: https://status.supabase.com/
```

**Emergency Rollback Script:**

```bash
#!/bin/bash
# emergency-rollback.sh
# Usage: ./emergency-rollback.sh <deployment-id>

DEPLOYMENT_ID=$1

if [ -z "$DEPLOYMENT_ID" ]; then
  echo "Usage: ./emergency-rollback.sh <deployment-id>"
  echo "Find deployment ID in Vercel Dashboard"
  exit 1
fi

echo "🚨 EMERGENCY ROLLBACK INITIATED 🚨"
echo "Rolling back to deployment: $DEPLOYMENT_ID"

# Promote previous deployment using Vercel CLI
vercel promote $DEPLOYMENT_ID

echo "✅ Rollback initiated. Monitor at: https://vercel.com/dashboard"
echo "📧 Notify team: Deployment rolled back to $DEPLOYMENT_ID"
```

---

## Quick Reference Card

**Essential Commands:**
```bash
# Type check
npm run typecheck

# Build
npm run build

# Git workflow
git add .
git commit -m "type(scope): description"
git push origin main

# Vercel CLI
vercel --prod
vercel logs --tail

# Health checks
curl https://saviedutech.com
curl -H "Authorization: Bearer $CRON_SECRET" https://saviedutech.com/api/cron/health-monitor
```

**Critical URLs:**
- Production: https://saviedutech.com
- Vercel Dashboard: https://vercel.com/dashboard
- Vercel Status: https://www.vercel-status.com/
- Supabase Dashboard: https://app.supabase.io
- Supabase Status: https://status.supabase.com/

**Environment Variables Required:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=https://saviedutech.com
CRON_SECRET
```

---

## Appendix A: Troubleshooting Common Issues

### Build Failures

| Issue | Solution |
|-------|----------|
| "Module not found" | Run `npm install` locally, check import paths |
| TypeScript errors | Run `npm run typecheck` and fix all errors |
| Memory limit exceeded | Reduce build concurrency, optimize imports |
| "Cannot find module" | Check if dependency is in `package.json` |

### Deployment Failures

| Issue | Solution |
|-------|----------|
| Environment variable missing | Add variable in Vercel Dashboard, redeploy |
| Build timeout | Optimize build process, reduce bundle size |
| Function size exceeded | Split large API routes, use dynamic imports |
| Edge function error | Check middleware and edge runtime compatibility |

### Runtime Errors

| Issue | Solution |
|-------|----------|
| 500 errors on API | Check server logs in Vercel Dashboard |
| Database connection failed | Verify Supabase credentials, check connection limits |
| Cron job failing | Check CRON_SECRET, verify endpoint permissions |
| Static assets not loading | Check `next.config.ts`, verify output directory |

---

**Document Version:** 1.0.0  
**Last Updated:** March 2026  
**Maintained By:** Development Team
