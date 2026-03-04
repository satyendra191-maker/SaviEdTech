# AI Autonomous Platform Manager - Comprehensive Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [System Components](#system-components)
4. [Setup and Configuration](#setup-and-configuration)
5. [Environment Variables](#environment-variables)
6. [Cron Job Schedules](#cron-job-schedules)
7. [API Endpoint Reference](#api-endpoint-reference)
8. [Security Considerations](#security-considerations)

---

## Overview

The **AI Autonomous Platform Manager** is a comprehensive monitoring and management infrastructure for the SaviEdTech digital learning platform. It provides autonomous monitoring, self-healing capabilities, security auditing, performance optimization, and operational intelligence to ensure platform stability at scale.

### Key Capabilities

- **24/7 Autonomous Monitoring**: Continuous health checks across all system components
- **Self-Healing**: Automatic recovery from deployment failures, server crashes, and database outages
- **Security Watchdog**: Real-time RLS policy auditing, authentication monitoring, and threat detection
- **Performance Optimization**: Query analysis, cache management, and bundle optimization
- **Automated Testing**: Continuous testing of critical user flows and features
- **Intelligent Alerting**: Smart alert routing with severity-based escalation

### Target Audience

- Platform Engineers
- DevOps Engineers
- System Administrators
- Security Engineers
- Technical Operations Teams

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI Autonomous Platform Manager                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  Monitoring      │  │  Alert Manager   │  │  Health Checker  │          │
│  │  Core            │  │                  │  │                  │          │
│  │  ├─ Error Logs   │  │  ├─ Rule Engine  │  │  ├─ API Health   │          │
│  │  ├─ System Health│  │  ├─ Deduplication│  │  ├─ DB Health    │          │
│  │  └─ Metrics      │  │  └─ Notifications│  │  └─ Cron Health  │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                     │                     │
│  ┌────────▼─────────┐  ┌────────▼─────────┐  ┌────────▼─────────┐          │
│  │ Security Watchdog│  │  Self-Healing    │  │ Auto-Testing     │          │
│  │                  │  │  System          │  │ Engine           │          │
│  │  ├─ RLS Auditor  │  │                  │  │                  │          │
│  │  ├─ Auth Monitor │  │  ├─ Failure      │  │  ├─ Auth Tests   │          │
│  │  ├─ Query        │  │  │   Detection    │  │  ├─ Core Tests   │          │
│  │  │   Analyzer     │  │  ├─ Recovery     │  │  ├─ Admin Tests  │          │
│  │  └─ Reporter     │  │  │   Actions      │  │  └─ Payment Tests│          │
│  └──────────────────┘  │  └─ Rollback     │  └──────────────────┘          │
│                        │    Management    │                                 │
│                        └──────────────────┘                                 │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │            Performance Optimization Engine                    │          │
│  │  ├─ Query Optimizer  ├─ Cache Manager  ├─ Bundle Analyzer     │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Data Storage Layer                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐ │
│  │  Supabase     │  │  error_logs   │  │ system_health │  │  Database     │ │
│  │  PostgreSQL   │  │               │  │               │  │  Metrics      │ │
│  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Super Admin Control Center                           │
│                     (Next.js App + Real-time Dashboard)                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Users     │────▶│  Next.js    │────▶│  API Routes │────▶│  Platform   │
│             │     │   Frontend  │     │             │     │  Manager    │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
                    ┌───────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Alert & Recovery Flow                          │
│                                                                       │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐          │
│  │ Detection│──▶│ Analysis │──▶│ Alert    │──▶│ Recovery │          │
│  │          │   │          │   │ Decision │   │ Action   │          │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘          │
│       │              │              │              │                  │
│       ▼              ▼              ▼              ▼                  │
│  ┌──────────────────────────────────────────────────────┐          │
│  │            Logging to Supabase Tables                 │          │
│  │  • error_logs  • system_health  • auth_events         │          │
│  └──────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## System Components

### 1. Monitoring Core (`src/lib/platform-manager/monitor.ts`)

The monitoring core provides foundational observability capabilities:

#### Features
- **Error Logging**: Structured error tracking with metadata, stack traces, and user context
- **System Health**: Recording health check results with response times and status
- **Cron Job Monitoring**: Tracking execution status, success/failure counts, and error rates
- **Database Metrics**: Connection pool monitoring, query performance, and table statistics

#### Key Functions

```typescript
// Get recent errors with filtering
const errors = await getRecentErrors({
    errorLimit: 100,
    timeWindowMinutes: 60,
    includeResolved: false
});

// Get system health status
const health = await getSystemHealth();

// Get database performance metrics
const dbMetrics = await getDatabaseMetrics();
```

#### Database Schema

**error_logs Table:**
```sql
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type TEXT NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    user_id UUID REFERENCES profiles(id),
    request_path TEXT,
    request_method TEXT,
    user_agent TEXT,
    ip_address TEXT,
    metadata JSONB,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);
```

**system_health Table:**
```sql
CREATE TABLE system_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_name TEXT NOT NULL,
    status TEXT CHECK (status IN ('healthy', 'degraded', 'critical')),
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    details JSONB,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Alert Manager (`src/lib/platform-manager/alerts.ts`)

Intelligent alerting with severity levels, deduplication, and multi-channel notifications.

#### Alert Severity Levels

| Severity | Description | Response Time |
|----------|-------------|---------------|
| `CRITICAL` | System down or data loss risk | Immediate |
| `HIGH` | Significant functionality impaired | < 15 minutes |
| `MEDIUM` | Degraded performance or warnings | < 1 hour |
| `LOW` | Informational, no immediate action | < 24 hours |

#### Default Alert Rules

| Rule Name | Condition | Severity | Cooldown |
|-----------|-----------|----------|----------|
| Critical Error Rate | > 10 errors/minute | CRITICAL | 5 min |
| High Error Rate | > 50 errors/5 minutes | HIGH | 10 min |
| System Health Critical | Any critical health check | CRITICAL | 5 min |
| Cron Job Failure | Job execution failure | HIGH | 15 min |
| Slow Response Time | > 5 seconds response | MEDIUM | 10 min |

#### Code Example

```typescript
import { sendAlert, createAlertRule, checkAlertConditions } from '@/lib/platform-manager/alerts';

// Send immediate alert
await sendAlert({
    severity: 'CRITICAL',
    title: 'Database Connection Failed',
    message: 'Unable to connect to primary database',
    source: 'database_monitor',
    metadata: { 
        connection_string: 'REDACTED',
        error_code: 'ECONNREFUSED'
    }
});

// Create custom alert rule
await createAlertRule({
    name: 'Payment Gateway Down',
    description: 'Trigger when payment processing fails',
    severity: 'CRITICAL',
    condition: {
        type: 'error_count_threshold',
        threshold: 5,
        timeWindowMinutes: 5
    },
    is_enabled: true,
    cooldown_minutes: 10,
    notification_channels: [
        { type: 'email', recipients: ['ops@saviedutech.com'] },
        { type: 'slack', webhookUrl: 'https://hooks.slack.com/...' }
    ]
});
```

### 3. Health Checker (`src/lib/platform-manager/health.ts`)

Comprehensive health checking for all platform components.

#### Health Check Types

```typescript
// Check API endpoint health
const apiHealth = await checkAPIHealth('/api/health', 'GET', 200);

// Check database connectivity
const dbHealth = await checkDatabaseHealth();

// Check authentication system
const authHealth = await checkAuthHealth();

// Run full health check suite
const fullReport = await runFullHealthCheck();
```

#### Response Time Thresholds

| Status | Response Time | Description |
|--------|---------------|-------------|
| `healthy` | < 500ms | Optimal performance |
| `degraded` | 500ms - 2000ms | Acceptable but monitoring needed |
| `critical` | > 2000ms | Immediate attention required |

#### Full Health Report Structure

```typescript
interface FullHealthReport {
    overall_status: 'healthy' | 'degraded' | 'critical';
    checks: HealthCheckResult[];
    summary: {
        total: number;
        healthy: number;
        degraded: number;
        critical: number;
    };
    generated_at: string;
}
```

### 4. Security Watchdog (`src/lib/platform-manager/security.ts`)

Comprehensive security auditing and threat detection system.

#### Components

**RLS Policy Auditor**
- Verifies Row Level Security policies on all tables
- Identifies tables without RLS protection
- Validates policy effectiveness through test queries

**Authentication Monitor**
- Tracks login/logout events
- Detects brute force attempts
- Monitors password reset patterns
- Blocks suspicious IP addresses

**Query Analyzer**
- Analyzes query patterns for anomalies
- Detects SQL injection attempts
- Monitors unauthorized data access
- Tracks admin privilege escalation attempts

#### Security Score Calculation

The security score (0-100) is calculated from:

| Component | Weight | Description |
|-----------|--------|-------------|
| RLS Score | 25% | RLS policy coverage and effectiveness |
| Auth Score | 25% | Authentication security metrics |
| Query Score | 25% | Query security and injection prevention |
| Config Score | 25% | Security configuration compliance |

```typescript
import { calculateSecurityScore, generateSecurityReport } from '@/lib/platform-manager/security';

// Get security score
const { overall_score, breakdown } = await calculateSecurityScore(
    rlsAudit, authStats, queries, suspiciousQueries, bruteForceAttempts
);

// Generate comprehensive security report
const report = await generateSecurityReport({ timeWindowHours: 24 });
```

### 5. Self-Healing System (`src/lib/platform-manager/selfhealing.ts`)

Autonomous failure detection and recovery.

#### Failure Detection

| Failure Type | Detection Method | Severity |
|--------------|------------------|----------|
| Deployment Failure | Error pattern analysis | CRITICAL |
| Server Crash | Connection error patterns | CRITICAL |
| Broken Build | Build error detection | HIGH |
| Database Outage | Connection timeout | CRITICAL |
| Cron Job Failure | Execution status monitoring | HIGH |

#### Recovery Actions

```typescript
type RecoveryActionType =
    | 'rollback'           // Rollback to previous deployment
    | 'restart_services'   // Restart application services
    | 'clear_cache'        // Clear application cache
    | 'reconnect_database' // Reestablish database connections
    | 'restore_cron'       // Restore failed cron jobs
    | 'reset_connections'; // Reset connection pools
```

#### Code Example

```typescript
import { selfHeal, getSystemStatus } from '@/lib/platform-manager/selfhealing';

// Check system status
const status = await getSystemStatus();

// Trigger self-healing
const result = await selfHeal();
console.log(`Self-healing triggered: ${result.triggered}`);
console.log(`Recovery actions: ${result.actions.length}`);
```

### 6. Auto-Testing Engine (`src/lib/platform-manager/testing.ts`)

Continuous automated testing of critical platform functionality.

#### Test Categories

| Category | Tests Included | Frequency |
|----------|---------------|-----------|
| Authentication | Login, Registration, Password Reset, OAuth | Hourly |
| Core Features | Course Pages, Lectures, Practice, Tests | Hourly |
| Payment | Gateway Integration, Webhooks | Every 6 hours |
| Admin | User Management, Content Publishing | Daily |

#### Test Execution

```typescript
import { runTests, generateTestReport } from '@/lib/platform-manager/testing';

// Run all tests
const results = await runTests('all', {
    timeoutMs: 30000,
    retries: 2,
    alertOnFailure: true
});

// Generate test report
const report = await generateTestReport();
```

### 7. Performance Optimization Engine (`src/lib/platform-manager/performance.ts`)

Comprehensive performance analysis and optimization.

#### Components

**Query Optimizer**
- Analyzes slow queries from `pg_stat_statements`
- Recommends indexes for optimization
- Identifies tables needing maintenance

**Cache Manager**
- Monitors cache hit ratios
- Recommends caching strategies
- Implements query result caching

**Bundle Analyzer**
- Analyzes JavaScript/CSS bundle sizes
- Identifies unused code
- Recommends code splitting

**API Optimizer**
- Tracks API response times
- Identifies slow endpoints
- Recommends optimization strategies

#### Performance Score

```typescript
// Get overall performance score (0-100)
const score = await getPerformanceScore();

// Get detailed metrics
const metrics = await getPerformanceMetrics();

// Run auto-optimization
const optimization = await runAutoOptimization();
```

---

## Setup and Configuration

### Prerequisites

- Node.js 18+ 
- Supabase project with PostgreSQL 14+
- Vercel account (for deployment)
- Admin access to configure environment variables

### Installation Steps

1. **Install Dependencies**

```bash
npm install
```

2. **Configure Environment Variables**

Copy the example environment file and configure:

```bash
cp .env.local.example .env.local
```

3. **Push Database Schema**

```bash
npx supabase db push
```

4. **Run Initial Health Check**

```bash
curl http://localhost:3000/api/health
```

5. **Verify Platform Manager**

```bash
# Check all components are operational
npm run typecheck
npm run build
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbG...` |
| `NEXT_PUBLIC_APP_URL` | Application base URL | `https://saviedutech.com` |
| `CRON_SECRET` | Secret for cron job authentication | `random-secret-string` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_API_KEY` | API key for admin endpoints | - |
| `SELF_HEALING_API_KEY` | API key for self-healing endpoints | Uses CRON_SECRET |
| `NEXT_PUBLIC_ANALYTICS_ID` | Google Analytics tracking ID | - |
| `RESEND_API_KEY` | Email service API key | - |
| `EMAIL_FROM` | Default sender email | `noreply@saviedutech.com` |

### Security Considerations

- **CRON_SECRET**: Generate a cryptographically secure random string (minimum 32 characters)
- **Service Role Key**: Never expose in client-side code; only use server-side
- **API Keys**: Rotate regularly; use different keys for different environments

---

## Cron Job Schedules

All cron jobs are defined in [`vercel.json`](vercel.json:76).

### Schedule Overview

| Job | Schedule (UTC) | Description | Endpoint |
|-----|---------------|-------------|----------|
| Health Monitor | Every 5 minutes | System health checks and self-healing | `/api/cron/health-monitor` |
| Test Runner | Hourly (0 * * * *) | Automated testing of critical flows | `/api/cron/test-runner` |
| Daily Challenge | Daily at 00:00 | Generate daily challenge questions | `/api/cron/daily-challenge` |
| Lecture Publisher | Daily at 02:00 | Publish scheduled lectures | `/api/cron/lecture-publisher` |
| DPP Generator | Daily at 02:30 | Generate daily practice papers | `/api/cron/dpp-generator` |
| Revision Updater | Daily at 03:00 | Update revision tasks | `/api/cron/revision-updater` |
| Rank Prediction | Daily at 04:00 | Update rank predictions | `/api/cron/rank-prediction` |

### Cron Job Details

#### Health Monitor (Every 5 minutes)

```
Schedule: */5 * * * *
```

**Responsibilities:**
- Detect deployment failures
- Detect server crashes
- Detect broken builds
- Detect database outages
- Trigger self-healing if critical issues found
- Log health status to database

#### Test Runner (Hourly)

```
Schedule: 0 * * * *
```

**Responsibilities:**
- Run authentication tests
- Test core features
- Verify payment flows
- Check admin functionality
- Report failures via alerts

#### Daily Challenge Generator (Daily 00:00)

```
Schedule: 0 0 * * *
```

**Responsibilities:**
- Generate new daily challenge for each exam type
- Select questions from question bank
- Set challenge availability window
- Update challenge leaderboards

#### Lecture Publisher (Daily 02:00)

```
Schedule: 0 2 * * *
```

**Responsibilities:**
- Publish scheduled lectures
- Update lecture availability status
- Notify subscribed users
- Generate lecture metadata

### Manual Cron Execution

To trigger a cron job manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://saviedutech.com/api/cron/health-monitor
```

---

## API Endpoint Reference

### Authentication

All API endpoints (except public health checks) require authentication:

- **Cron Jobs**: `Authorization: Bearer {CRON_SECRET}`
- **Admin APIs**: `Authorization: Bearer {token}` or `X-API-Key: {ADMIN_API_KEY}`

### Core Monitoring APIs

#### GET /api/cron/health-monitor

Runs comprehensive health checks and triggers self-healing if needed.

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "monitor_id": "health_monitor_1234567890",
        "timestamp": "2026-03-04T10:00:00.000Z",
        "detections": [...],
        "critical_issues": 0,
        "self_heal_triggered": false,
        "recovery_actions_count": 0,
        "overall_status": "healthy",
        "duration_ms": 1250
    }
}
```

#### GET /api/security-audit

Returns comprehensive security audit reports.

**Query Parameters:**
- `type`: `full` | `rls` | `auth` | `queries` | `score` | `vulnerabilities` | `recommendations`
- `hours`: Time window in hours (default: 24)

**Example:**
```bash
curl -H "Authorization: Bearer {token}" \
     "https://saviedutech.com/api/security-audit?type=score&hours=24"
```

**Response:**
```json
{
    "success": true,
    "audit_type": "score",
    "generated_at": "2026-03-04T10:00:00.000Z",
    "data": {
        "overall_score": 85,
        "grade": "B",
        "status": "good",
        "breakdown": {
            "rls_score": 90,
            "auth_score": 80,
            "query_score": 85,
            "config_score": 85
        }
    }
}
```

#### GET /api/test-engine

Retrieves test results and statistics.

**Query Parameters:**
- `runId`: Get results for specific test run
- `category`: Filter by test category
- `limit`: Number of results (default: 50)
- `history`: Get test run history (`true`/`false`)
- `stats`: Get test statistics (`true`/`false`)
- `report`: Generate comprehensive report (`true`/`false`)

#### POST /api/test-engine

Triggers test execution.

**Request Body:**
```json
{
    "category": "all",
    "alertOnFailure": true,
    "timeoutMs": 30000,
    "retries": 2
}
```

#### GET /api/performance-audit

Returns performance analysis and recommendations.

**Query Parameters:**
- `type`: `full` | `query` | `cache` | `bundle` | `api` | `score` | `metrics`
- `timeRange`: `1h` | `24h` | `7d` | `30d` (default: `24h`)
- `includeRecommendations`: `true`/`false` (default: `true`)

#### GET /api/self-healing

Get self-healing status and history.

**Query Parameters:**
- `action`: `status` | `detections` | `history` | `monitoring`

#### POST /api/self-healing

Trigger manual self-healing actions.

**Request Body:**
```json
{
    "action": "clear_cache"
}
```

### Error Response Format

All API errors follow this format:

```json
{
    "success": false,
    "error": "Error description",
    "message": "Detailed error message"
}
```

---

## Security Considerations

### API Security

1. **Cron Secret Verification**
   - All cron endpoints verify `Authorization: Bearer {CRON_SECRET}`
   - Secret should be minimum 32 characters, cryptographically random

2. **Role-Based Access Control**
   - Admin endpoints check user role from `profiles` table
   - Middleware enforces route-level protection

3. **SQL Injection Prevention**
   - All queries use Supabase client with parameterized queries
   - Query analyzer detects and logs suspicious patterns

### Data Protection

1. **Row Level Security (RLS)**
   - All user-facing tables have RLS policies
   - Policies verified by automated security audits

2. **Sensitive Data**
   - API keys and secrets never logged
   - Error messages sanitized in production
   - Stack traces only available to admins

### Monitoring & Alerting

1. **Security Events**
   - Authentication failures logged
   - Suspicious queries tracked
   - Brute force attempts detected and blocked

2. **Audit Trail**
   - All admin actions logged
   - Recovery actions tracked with timestamps
   - Security score changes monitored

---

## Related Documentation

- [OPERATIONAL_RUNBOOK.md](./OPERATIONAL_RUNBOOK.md) - Daily operations and troubleshooting
- [SUPER_ADMIN_GUIDE.md](./SUPER_ADMIN_GUIDE.md) - Using the Super Admin Control Center
- [AUDIT_REPORT.md](./AUDIT_REPORT.md) - Platform audit results and recommendations

---

## Support

For technical support or questions about the AI Autonomous Platform Manager:

1. Check the [OPERATIONAL_RUNBOOK.md](./OPERATIONAL_RUNBOOK.md) troubleshooting section
2. Review error logs in the Super Admin Dashboard
3. Run diagnostic tests via the Test Engine API
4. Contact the engineering team with system health reports
