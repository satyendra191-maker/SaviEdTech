# Super Admin Control Center - User Guide

## Table of Contents

1. [Accessing the Control Center](#accessing-the-control-center)
2. [Dashboard Overview](#dashboard-overview)
3. [System Health Metrics](#system-health-metrics)
4. [Running Manual Health Checks](#running-manual-health-checks)
5. [Managing Cron Jobs](#managing-cron-jobs)
6. [Understanding Security Scores](#understanding-security-scores)
7. [Viewing and Responding to Alerts](#viewing-and-responding-to-alerts)
8. [Quick Actions](#quick-actions)
9. [Reports and Exporting](#reports-and-exporting)
10. [Best Practices](#best-practices)

---

## Accessing the Control Center

### Prerequisites

To access the Super Admin Control Center, you must:
- Have an active account on the SaviEdTech platform
- Have been assigned the `admin` role in the database
- Use a modern web browser (Chrome, Firefox, Safari, Edge)

### Login Process

1. **Navigate to the Login Page:**
   - URL: `https://saviedutech.com/login`
   - Or click "Login" from the homepage

2. **Enter Credentials:**
   - Use your registered email address
   - Enter your password
   - Click "Sign In"

3. **Access Super Admin Dashboard:**
   - After login, navigate to: `https://saviedutech.com/super-admin`
   - Or select "Super Admin" from the user menu (if available)

4. **Verify Access:**
   - You should see the "Super Admin Mode" badge at the top
   - Dashboard will display system metrics and controls

### Access Denied?

If you see "Access Denied" or are redirected to the dashboard:

1. **Verify Your Role:**
   ```sql
   -- Check your role in the database
   SELECT role FROM profiles WHERE email = 'your-email@example.com';
   ```

2. **Contact System Administrator:**
   - Request admin role assignment
   - Provide justification for access

3. **Clear Browser Cache:**
   - Sometimes old sessions can cause issues
   - Log out and log back in

---

## Dashboard Overview

### Layout Description

The Super Admin Dashboard is organized into several key sections:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Header Bar                                          [Refresh] [User]│
├─────────────────────────────────────────────────────────────────────┤
│  Super Admin Mode Badge    Welcome back, [Admin Name]               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ System  │ │ Active  │ │ API     │ │Database │ │ Error   │       │
│  │ Uptime  │ │Students │ │Response │ │ Health  │ │ Rate    │       │
│  │ 99.9%   │ │ 12,543  │ │  245ms  │ │ Healthy │ │   3     │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────────────────┐    │
│  │ Live Error Feed      │  │ System Health History Chart      │    │
│  │                      │  │                                  │    │
│  │ • Error 1            │  │  [Response Time Graph]           │    │
│  │ • Error 2            │  │                                  │    │
│  │ • Error 3            │  │                                  │    │
│  └──────────────────────┘  └──────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│  Cron Job Execution Status                                          │
│  [Daily Challenge] [DPP Gen] [Lecture Pub] [Rank Pred] [Revision]   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Security Overview│  │ Security Score   │  │ Error            │  │
│  │                  │  │                  │  │ Distribution     │  │
│  │ Failed Auths: 12 │  │    [85/100]      │  │ [Bar Chart]      │  │
│  │ Active Sessions  │  │    Grade: B      │  │                  │  │
│  │ Suspicious: 0    │  │    Status: Good  │  │                  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  Quick Actions                                                      │
│  [Run Health Check] [Clear Old Logs] [Export Report] [Trigger Cron] │
└─────────────────────────────────────────────────────────────────────┘
```

### Dashboard Sections Explained

#### 1. System Overview Cards (Top Row)

Five key metrics displayed in real-time:

| Card | Description | Normal Range | Action if Abnormal |
|------|-------------|--------------|-------------------|
| **System Uptime** | Platform availability percentage | > 99% | Check server status |
| **Active Students** | Total registered user count | N/A | Monitor growth trends |
| **API Response Time** | Average API response time | < 500ms | Optimize slow endpoints |
| **Database Health** | Database connection status | Healthy | Check connection pool |
| **Error Rate (24h)** | Total errors in last 24 hours | < 10 | Investigate error patterns |

#### 2. Live Error Feed (Left Panel)

Displays the last 50 errors from the past 24 hours:

**Error Item Format:**
```
┌─────────────────────────────────────┐
│ 🔴 [ERROR_TYPE]              2m ago │
│ Error message summary...            │
│ /api/path • POST                    │
└─────────────────────────────────────┘
```

**Features:**
- Color-coded by severity (Red = Critical, Amber = Warning)
- Click to expand full error details
- Auto-refreshes every 30 seconds
- Shows relative time (e.g., "2m ago", "1h ago")

#### 3. System Health History (Right Panel)

Interactive area chart showing response times:

**Chart Elements:**
- X-axis: Time (last 20 data points)
- Y-axis: Response time in milliseconds
- Gradient fill: Visual representation of load
- Tooltip: Hover for exact values

**Interpretation:**
- **Smooth line**: Consistent performance
- **Spikes**: Potential issues or high traffic
- **Trending up**: Performance degradation

---

## System Health Metrics

### Understanding Health Status

The platform uses three health status levels:

| Status | Color | Meaning | Response Required |
|--------|-------|---------|-------------------|
| **Healthy** | 🟢 Green | System operating normally | None |
| **Degraded** | 🟠 Amber | Performance issues present | Monitor closely |
| **Critical** | 🔴 Red | System failure or major issues | Immediate action |

### Response Time Thresholds

Health status is determined by response times:

- **Healthy**: < 500ms
- **Degraded**: 500ms - 2000ms
- **Critical**: > 2000ms

### Available Metrics

#### Database Metrics

Access via the Database card or API:

```
Total Connections: 45/100
Active Connections: 12
Idle Connections: 33
Cache Hit Ratio: 94.5%
```

**Key Metrics to Watch:**
- **Cache Hit Ratio**: Should be > 90%
- **Active Connections**: Should be < 80% of max
- **Slow Queries**: Should be < 5 per hour

#### Cron Job Status

Each cron job displays:

```
┌─────────────────────────────┐
│ Daily Challenge             │
│ ━━━━━━━━━━━━░░░░ 80%        │
│ Last run: 2 hours ago       │
│ Status: Healthy             │
└─────────────────────────────┘
```

**Status Indicators:**
- **Progress Bar**: Success rate over last 24 hours
- **Last Run**: Time since last execution
- **Status**: Current health state

#### Error Statistics

View error distribution by type:

```
Error Type          Count    Latest
────────────────────────────────────
AUTH_FAILED         12       10m ago
DATABASE_ERROR       3       1h ago
API_TIMEOUT          1       3h ago
VALIDATION_ERROR     5       30m ago
```

---

## Running Manual Health Checks

### When to Run Manual Checks

- After deploying new features
- Before high-traffic events (exam days)
- When investigating reported issues
- As part of daily operations

### How to Run a Health Check

**Method 1: Dashboard Button (Recommended)**

1. Scroll to "Quick Actions" section
2. Click **"Run Health Check"** button
3. Wait for completion (typically 10-30 seconds)
4. Review results in the notification toast

**Method 2: Using the API**

```bash
# Run health check via API
curl -X POST \
     -H "Authorization: Bearer {CRON_SECRET}" \
     https://saviedutech.com/api/admin/health-check
```

**Response:**
```json
{
    "success": true,
    "data": {
        "overall_status": "healthy",
        "checks_performed": 12,
        "passed": 12,
        "failed": 0,
        "duration_ms": 2540
    }
}
```

### Understanding Health Check Results

**Successful Check:**
- Green notification: "Health check completed successfully"
- All system components operating normally
- No action required

**Issues Detected:**
- Red notification with details
- Specific components listed
- Recommended actions provided

**Example Output:**
```
Health Check Results:
✓ Database Connection: 12ms (Healthy)
✓ API Endpoints: 245ms avg (Healthy)
✓ Authentication: 89ms (Healthy)
✓ Cron Jobs: All running (Healthy)
✓ Memory Usage: 45% (Healthy)
```

---

## Managing Cron Jobs

### Understanding Cron Jobs

The platform runs 7 automated cron jobs:

| Job Name | Schedule (IST) | Purpose |
|----------|---------------|---------|
| Health Monitor | Every 5 min | System monitoring & self-healing |
| Test Runner | Every hour | Automated testing |
| Daily Challenge | 05:30 AM | Generate daily questions |
| Lecture Publisher | 07:30 AM | Publish scheduled content |
| DPP Generator | 08:00 AM | Create practice papers |
| Revision Updater | 08:30 AM | Update revision tasks |
| Rank Prediction | 09:30 AM | Update predictions |

### Viewing Cron Job Status

1. **Dashboard View:**
   - Scroll to "Cron Job Execution Status" section
   - View all 5 content cron jobs in card format

2. **Status Card Anatomy:**
   ```
   ┌──────────────────────┐
   │ Daily Challenge      │ ← Job Name
   │ ━━━━━━━━━━━━░░░░     │ ← Success Rate Bar
   │ Last: 2h ago         │ ← Last Execution
   │ Next: In 22h         │ ← Next Scheduled
   │ Status: ✅ Healthy   │ ← Current Status
   └──────────────────────┘
   ```

### Manually Triggering a Cron Job

**When to Trigger Manually:**
- Job failed and needs immediate re-run
- Testing new cron job configuration
- Emergency data refresh needed

**Steps:**

1. **Select Job:**
   - Scroll to "Quick Actions" section
   - Find "Trigger Cron Job" dropdown
   - Select desired job from list

2. **Execute:**
   - Click "Run Job" button
   - Confirm in dialog (if prompted)
   - Wait for execution

3. **Verify Results:**
   - Green toast: Job completed successfully
   - Red toast: Job failed, check logs

**Available Jobs in Dropdown:**
- Daily Challenge Generator
- DPP Generator
- Lecture Publisher
- Rank Prediction Updater
- Revision Task Updater

**API Method:**
```bash
# Trigger specific cron job
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://saviedutech.com/api/cron/daily-challenge
```

### Monitoring Job Execution

After triggering a job:

1. **Check Toast Notification:**
   - Success: "Daily Challenge triggered successfully"
   - Failure: "Failed to trigger cron job"

2. **Review Dashboard:**
   - Wait 30 seconds for refresh
   - Check job status card for updates
   - Review error feed for any issues

3. **Verify Data:**
   - Navigate to affected feature
   - Confirm expected changes applied
   - Report any discrepancies

---

## Understanding Security Scores

### Security Score Overview

The Security Score (0-100) provides a quick assessment of platform security posture.

**Score Display:**
```
        ┌─────────┐
       ╱           ╲
      ╱    [85]    ╲    ← Overall Score
     │    /100      │
      ╲   Grade: B  ╱
       ╲  Good    ╱
        └─────────┘
```

### Score Components

The overall score is calculated from four components:

| Component | Weight | Description | Good Score |
|-----------|--------|-------------|------------|
| **RLS Score** | 25% | Row Level Security policy coverage | > 90 |
| **Auth Score** | 25% | Authentication security metrics | > 85 |
| **Query Score** | 25% | Query security & injection prevention | > 85 |
| **Config Score** | 25% | Security configuration compliance | > 90 |

### Grade Scale

| Score Range | Grade | Status | Action Required |
|-------------|-------|--------|-----------------|
| 90-100 | A | Excellent | None |
| 80-89 | B | Good | Monitor trends |
| 70-79 | C | Fair | Review recommendations |
| 60-69 | D | Poor | Address issues soon |
| < 60 | F | Critical | Immediate action |

### Security Overview Panel

Located on the dashboard, shows:

```
Security Overview
─────────────────
Failed Auth Attempts: 12    🔒
Active Sessions:      45    👥
Suspicious Activities: 0    👁️
```

**Metrics Explained:**

- **Failed Auth Attempts**: Login failures in last 24h
  - < 10: Normal
  - 10-50: Monitor for patterns
  - > 50: Potential brute force attack

- **Active Sessions**: Currently logged-in users
  - Indicates platform usage
  - Sudden drops may indicate issues

- **Suspicious Activities**: Detected anomalies
  - Includes SQL injection attempts
  - Unauthorized access attempts
  - Admin privilege escalation

### Improving Security Score

**If RLS Score is Low:**
1. Review tables without RLS policies
2. Add appropriate RLS policies
3. Test policy effectiveness

**If Auth Score is Low:**
1. Enable rate limiting
2. Implement MFA for admins
3. Review password policies

**If Query Score is Low:**
1. Review and block suspicious IPs
2. Update query sanitization
3. Monitor for injection attempts

---

## Viewing and Responding to Alerts

### Alert Display

Alerts appear in multiple locations:

1. **Toast Notifications:**
   - Slide in from top-right
   - Auto-dismiss after 5 seconds
   - Click to view details

2. **Error Feed:**
   - Live stream of errors
   - Last 50 errors from 24 hours
   - Color-coded by severity

3. **Dashboard Cards:**
   - Error count summaries
   - Status indicators

### Alert Severity Colors

| Color | Severity | Description |
|-------|----------|-------------|
| 🔴 Red | Critical | Immediate action required |
| 🟠 Amber | High | Attention needed soon |
| 🟡 Yellow | Medium | Monitor situation |
| 🔵 Blue | Low | Informational |
| 🟢 Green | Resolved | Issue cleared |

### Reading Error Details

Click any error in the Live Error Feed to expand:

```
┌─────────────────────────────────────────┐
│ 🔴 DATABASE_ERROR                 5m ago │
├─────────────────────────────────────────┤
│ Message: Connection timeout             │
│                                         │
│ Path: /api/cron/dpp-generator           │
│ Method: GET                             │
│ User: system                            │
│ IP: 10.0.0.1                            │
│                                         │
│ Stack Trace:                            │
│ Error: timeout expired                  │
│   at Query.execute (...)
│                                         │
│ Metadata:                               │
│ { "query_time": 5000 }                  │
└─────────────────────────────────────────┘
```

### Responding to Alerts

**Step 1: Acknowledge**
- Note the alert in your operations log
- If critical, begin immediate investigation

**Step 2: Investigate**
- Review error details
- Check related metrics
- Look for patterns

**Step 3: Take Action**
- For known issues: Apply documented fix
- For new issues: Follow troubleshooting guide
- For critical issues: Escalate to engineering

**Step 4: Verify Resolution**
- Monitor metrics for improvement
- Confirm no new related errors
- Document actions taken

### Common Alert Patterns

**Pattern: Database Connection Errors**
- Multiple DB_ERROR entries
- Related to cron jobs
- **Action**: Check connection pool, trigger reconnect

**Pattern: Authentication Failures**
- Multiple AUTH_FAILED from same IP
- Pattern suggests brute force
- **Action**: Block IP address, enable rate limiting

**Pattern: API Timeouts**
- SLOW_RESPONSE_TIME alerts
- Specific endpoints affected
- **Action**: Check endpoint performance, optimize queries

---

## Quick Actions

### Available Quick Actions

The dashboard provides four quick action buttons:

```
┌────────────────────────────────────────────────────────────────────┐
│ Quick Actions                                                      │
│                                                                    │
│ [🔄 Run Health Check]  [🗑️ Clear Old Logs]  [📊 Export Report]  │
│                                                                    │
│ [⚡ Trigger Cron Job ▼]                                           │
└────────────────────────────────────────────────────────────────────┘
```

### 1. Run Health Check

**Purpose:** Perform immediate system health assessment

**When to Use:**
- Suspected issues
- After maintenance
- Before high-traffic events

**Expected Time:** 10-30 seconds

**Success Indicator:** Green toast notification

### 2. Clear Old Error Logs

**Purpose:** Delete error logs older than 30 days

**When to Use:**
- Database storage optimization
- After resolving long-term issues
- Monthly maintenance

**Safety:** Confirmation dialog prevents accidental deletion

**Warning:** This action cannot be undone

### 3. Export Report

**Purpose:** Download comprehensive system report

**Output Format:** JSON file with structure:
```json
{
    "generatedAt": "2026-03-04T10:00:00Z",
    "systemHealth": { ... },
    "cronJobs": [ ... ],
    "dbMetrics": { ... },
    "errorSummary": [ ... ]
}
```

**Use Cases:**
- Monthly reporting
- Incident documentation
- Capacity planning

### 4. Trigger Cron Job

**Purpose:** Manually execute scheduled tasks

**Dropdown Options:**
- Daily Challenge
- DPP Generator
- Lecture Publisher
- Rank Prediction
- Revision Updater

**Confirmation:** Required before execution

---

## Reports and Exporting

### Types of Reports Available

#### 1. System Health Report

**Contents:**
- Overall system status
- Component health details
- Response time metrics
- Error summaries

**Export Method:**
- Click "Export Report" button
- JSON file automatically downloads

#### 2. Security Audit Report

**API Endpoint:**
```bash
curl -H "Authorization: Bearer {token}" \
     "https://saviedutech.com/api/security-audit?type=full" \
     -o security-report.json
```

**Contents:**
- RLS policy audit
- Authentication statistics
- Vulnerability list
- Recommendations

#### 3. Performance Audit Report

**API Endpoint:**
```bash
curl -H "Authorization: Bearer {token}" \
     "https://saviedutech.com/api/performance-audit?type=full" \
     -o performance-report.json
```

**Contents:**
- Slow queries
- Cache statistics
- Bundle analysis
- Optimization recommendations

#### 4. Test Results Report

**API Endpoint:**
```bash
curl -H "Authorization: Bearer {CRON_SECRET}" \
     "https://saviedutech.com/api/test-engine?report=true" \
     -o test-report.json
```

**Contents:**
- Test execution summary
- Passed/failed counts
- Detailed test results
- Failure analysis

### Automated Reporting

**Schedule:** Daily at 06:00 IST

**Contents:**
- 24-hour error summary
- Performance metrics
- Security score
- Cron job status

**Delivery:** Email to admin team

---

## Best Practices

### Daily Operations

1. **Morning Review (09:00 IST):**
   - Check system health status
   - Review overnight errors
   - Verify all cron jobs ran

2. **Mid-Day Check (13:00 IST):**
   - Quick dashboard refresh
   - Check for new alerts
   - Monitor error trends

3. **End of Day (18:00 IST):**
   - Generate daily report
   - Document any incidents
   - Plan next day priorities

### Weekly Tasks

1. **Security Review:**
   - Check security score trend
   - Review blocked IPs
   - Update security rules if needed

2. **Performance Analysis:**
   - Review slow queries
   - Check cache hit ratios
   - Analyze bundle sizes

3. **Backup Verification:**
   - Confirm automated backups ran
   - Test restore procedures
   - Document backup status

### Monthly Tasks

1. **Comprehensive Audit:**
   - Full security audit
   - Performance optimization review
   - Access log analysis

2. **Report Generation:**
   - Export monthly metrics
   - Analyze trends
   - Present to stakeholders

3. **Maintenance:**
   - Clear old error logs
   - Update documentation
   - Review and update runbooks

### Security Best Practices

1. **Access Control:**
   - Regularly review admin list
   - Remove access for departed staff
   - Use strong passwords + MFA

2. **Monitoring:**
   - Watch for unusual patterns
   - Review failed login attempts
   - Monitor for data exfiltration

3. **Incident Response:**
   - Document all incidents
   - Learn from failures
   - Update procedures

### Performance Optimization

1. **Proactive Monitoring:**
   - Watch for degrading trends
   - Address issues before critical
   - Regular health checks

2. **Capacity Planning:**
   - Monitor user growth
   - Track resource usage
   - Plan scaling ahead of need

3. **Optimization:**
   - Implement cache recommendations
   - Add suggested indexes
   - Optimize slow queries

---

## Troubleshooting Dashboard Issues

### Dashboard Not Loading

**Symptoms:**
- Blank page
- Loading spinner forever
- Error messages

**Solutions:**

1. **Refresh Page:**
   - Press F5 or Ctrl+R
   - Wait for full load

2. **Clear Cache:**
   - Ctrl+Shift+R (hard refresh)
   - Clear browser cache

3. **Check Authentication:**
   - Ensure still logged in
   - Re-login if session expired

4. **Verify Network:**
   - Check internet connection
   - Try different browser

### Data Not Updating

**Symptoms:**
- Old data displayed
- Metrics seem stale
- No new errors showing

**Solutions:**

1. **Manual Refresh:**
   - Click "Refresh" button in header
   - Wait for data fetch

2. **Check Auto-Refresh:**
   - Dashboard auto-refreshes every 30 seconds
   - Verify browser tab is active

3. **Check API Status:**
   - Visit `/api/health` directly
   - Verify API responding

### Actions Not Working

**Symptoms:**
- Buttons don't respond
- Actions complete but no effect
- Error toasts appear

**Solutions:**

1. **Check Permissions:**
   - Verify admin role
   - Check for permission errors

2. **Verify Environment:**
   - Check CRON_SECRET configured
   - Verify API keys valid

3. **Review Logs:**
   - Check browser console for errors
   - Review server logs

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `R` | Refresh dashboard |
| `H` | Run health check |
| `E` | Export report |
| `?` | Show keyboard shortcuts |

---

## Getting Help

### In-Dashboard Help

- Hover over metrics for tooltips
- Click error items for details
- Review toast notifications

### Documentation

- [Platform Manager Guide](./PLATFORM_MANAGER_GUIDE.md)
- [Operational Runbook](./OPERATIONAL_RUNBOOK.md)
- [Audit Report](./AUDIT_REPORT.md)

### Support Channels

- **Slack:** #platform-support
- **Email:** platform-ops@saviedutech.com
- **Emergency:** On-call engineer (see Operational Runbook)

---

**Document Version:** 1.0  
**Last Updated:** March 4, 2026  
**Dashboard Version:** 1.0.0
