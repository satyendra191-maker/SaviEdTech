# AI Autonomous Platform Manager - Operational Runbook

## Table of Contents

1. [Daily Operations Checklist](#daily-operations-checklist)
2. [Responding to Common Alerts](#responding-to-common-alerts)
3. [Self-Healing System Behavior](#self-healing-system-behavior)
4. [Manual Intervention Procedures](#manual-intervention-procedures)
5. [Emergency Contacts and Escalation](#emergency-contacts-and-escalation)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Recovery Procedures](#recovery-procedures)

---

## Daily Operations Checklist

### Morning Check (Start of Day)

**Time: 09:00 IST (03:30 UTC)**

#### 1. System Health Dashboard Review

```bash
# Quick health check via API
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://saviedutech.com/api/cron/health-monitor
```

**Checklist:**
- [ ] Overall system status is "healthy"
- [ ] No critical alerts older than 1 hour
- [ ] Database connections < 80% of pool limit
- [ ] API response time average < 500ms
- [ ] All cron jobs executed successfully in last 24h

#### 2. Error Log Review

**Navigate to:** Super Admin Dashboard → Live Error Feed

**Checklist:**
- [ ] Review errors from last 24 hours
- [ ] Verify no new error patterns
- [ ] Check error rate is < 10 per hour
- [ ] Acknowledge any known/expected errors

#### 3. Security Status Check

```bash
# Get security score
curl -H "Authorization: Bearer {token}" \
     "https://saviedutech.com/api/security-audit?type=score"
```

**Checklist:**
- [ ] Security score > 80
- [ ] No critical vulnerabilities
- [ ] Failed auth attempts < 50 in last 24h
- [ ] No suspicious IP addresses flagged

#### 4. Performance Metrics Review

**Checklist:**
- [ ] Database cache hit ratio > 90%
- [ ] Slow query count < 5
- [ ] API p95 response time < 1000ms
- [ ] No memory or CPU warnings

### Mid-Day Check (13:00 IST / 07:30 UTC)

**Checklist:**
- [ ] Quick dashboard refresh
- [ ] Verify no new critical alerts
- [ ] Check test engine results from last run
- [ ] Review any self-healing actions taken

### Evening Check (End of Day)

**Time: 18:00 IST (12:30 UTC)**

**Checklist:**
- [ ] Generate daily system report
- [ ] Review all alerts from the day
- [ ] Check tomorrow's scheduled maintenance
- [ ] Verify backup status
- [ ] Document any incidents in incident log

---

## Responding to Common Alerts

### Alert Severity Levels

| Severity | Response Time | Who Responds | Escalation |
|----------|---------------|--------------|------------|
| **CRITICAL** | Immediate (5 min) | On-call Engineer | Auto-escalate to Lead after 15 min |
| **HIGH** | Within 15 minutes | On-call Engineer | Escalate if unresolved in 1 hour |
| **MEDIUM** | Within 1 hour | Operations Team | Escalate if unresolved in 4 hours |
| **LOW** | Within 24 hours | Operations Team | No escalation required |

### Alert Response Flowchart

```
┌─────────────┐
│ Alert Fired │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Check Severity   │
└──────┬───────────┘
       │
   ┌───┴───┐
   ▼       ▼       ▼       ▼
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│CRIT │ │HIGH │ │MED  │ │LOW  │
│ICAL │ │     │ │IUM  │ │     │
└─┬───┘ └─┬───┘ └─┬───┘ └─┬───┘
  │       │       │       │
  ▼       ▼       ▼       ▼
Immediate 15min  1hr    24hr
  │       │       │       │
  └───────┴───────┴───────┘
            │
            ▼
    ┌───────────────┐
    │ Acknowledge   │
    │ in Dashboard  │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Investigate   │
    │ & Resolve     │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │ Document      │
    │ Resolution    │
    └───────────────┘
```

### Critical Alerts

#### 1. Database Connection Failed (CRITICAL)

**Symptoms:**
- Error message: "Unable to connect to database"
- Multiple API endpoints returning 500 errors
- Health check status: CRITICAL

**Immediate Actions:**
1. **Check Database Status:**
   ```bash
   # Via Supabase dashboard or:
   curl -H "Authorization: Bearer {token}" \
        "https://saviedutech.com/api/security-audit?type=queries"
   ```

2. **Verify Connection Pool:**
   - Check Supabase Dashboard → Database → Connection Pool
   - If connections exhausted, wait for auto-recovery

3. **Trigger Self-Healing:**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer {CRON_SECRET}" \
        -H "Content-Type: application/json" \
        -d '{"action": "reconnect_database"}' \
        https://saviedutech.com/api/self-healing
   ```

4. **If Issue Persists:**
   - Contact Supabase support
   - Consider read replica failover (if configured)
   - Implement circuit breaker pattern

#### 2. Deployment Failure (CRITICAL)

**Symptoms:**
- New deployments failing
- Application version mismatch across instances
- Rollback indicators in logs

**Immediate Actions:**
1. **Check Vercel Deployment Status:**
   - Visit Vercel Dashboard
   - Review deployment logs

2. **Trigger Automatic Rollback:**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer {CRON_SECRET}" \
        -H "Content-Type: application/json" \
        -d '{"action": "rollback"}' \
        https://saviedutech.com/api/self-healing
   ```

3. **Manual Rollback (if auto fails):**
   ```bash
   # Via Vercel CLI
   vercel --version {previous_version}
   ```

#### 3. High Error Rate (CRITICAL)

**Symptoms:**
- > 10 errors per minute
- Error rate increasing trend
- Multiple endpoints affected

**Immediate Actions:**
1. **Identify Error Pattern:**
   ```bash
   # Get errors by type
   curl -H "Authorization: Bearer {token}" \
        "https://saviedutech.com/api/security-audit?type=queries"
   ```

2. **Check Recent Deployments:**
   - If errors started after deployment → Trigger rollback
   - If no deployment → Check for external service issues

3. **Clear Cache:**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer {CRON_SECRET}" \
        -H "Content-Type: application/json" \
        -d '{"action": "clear_cache"}' \
        https://saviedutech.com/api/self-healing
   ```

### High Severity Alerts

#### 1. Cron Job Failure (HIGH)

**Symptoms:**
- Specific cron job not executing
- Missing expected data updates
- Cron status shows "critical"

**Response:**
1. Check cron job logs in Super Admin Dashboard
2. Verify cron secret is valid
3. Manually trigger the job:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
        https://saviedutech.com/api/cron/{job-name}
   ```
4. If manual run succeeds: Monitor next scheduled run
5. If manual run fails: Check error logs and fix root cause

#### 2. Slow Response Time (HIGH)

**Symptoms:**
- API response times > 2000ms
- Degraded user experience
- Timeouts increasing

**Response:**
1. **Run Performance Audit:**
   ```bash
   curl -H "Authorization: Bearer {token}" \
        "https://saviedutech.com/api/performance-audit?type=query"
   ```

2. **Check Database:**
   - Review slow queries
   - Check for missing indexes
   - Verify connection pool status

3. **Implement Emergency Caching:**
   - Enable aggressive caching on affected endpoints
   - Consider CDN purging

#### 3. Security Score Drop (HIGH)

**Symptoms:**
- Security score drops below 70
- New vulnerabilities detected
- Suspicious activity patterns

**Response:**
1. **Get Detailed Security Report:**
   ```bash
   curl -H "Authorization: Bearer {token}" \
        "https://saviedutech.com/api/security-audit?type=vulnerabilities"
   ```

2. **Review RLS Policies:**
   - Check tables without RLS
   - Verify policy effectiveness

3. **Block Suspicious IPs:**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer {token}" \
        -H "Content-Type: application/json" \
        -d '{
          "action": "block_ip",
          "params": {
            "ip_address": "192.168.1.1",
            "reason": "Brute force attempt",
            "duration_minutes": 1440
          }
        }' \
        https://saviedutech.com/api/security-audit
   ```

### Medium Severity Alerts

#### 1. Test Failure (MEDIUM)

**Response:**
1. Review test results in Super Admin Dashboard
2. Check if failure is consistent or flaky
3. Re-run tests manually
4. If tests continue to fail, investigate affected feature

#### 2. Cache Hit Ratio Low (MEDIUM)

**Response:**
1. Review cache configuration
2. Analyze query patterns
3. Adjust cache TTL settings
4. Consider implementing additional caching layers

### Low Severity Alerts

#### 1. Informational Alerts (LOW)

**Examples:**
- Disk usage > 70%
- Memory usage trending up
- Non-critical index recommendations

**Response:**
- Schedule maintenance window
- Plan optimization work
- Monitor trends

---

## Self-Healing System Behavior

### How Self-Healing Works

The self-healing system operates on a continuous monitoring cycle:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Monitor   │───▶│   Detect    │───▶│   Analyze   │───▶│   Act       │
│   (Every 5  │    │   Failure   │    │   Severity  │    │   (Recovery │
│   min)      │    │             │    │             │    │   Action)   │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                 │
                    ┌────────────────────────────────────────────┘
                    │
                    ▼
            ┌───────────────┐
            │   Verify      │
            │   Recovery    │
            └───────┬───────┘
                    │
            ┌───────┴───────┐
            ▼               ▼
    ┌───────────┐   ┌───────────┐
    │  Success  │   │  Failure  │
    └─────┬─────┘   └─────┬─────┘
          │               │
          ▼               ▼
    ┌───────────┐   ┌───────────┐
    │   Log &   │   │ Escalate  │
    │   Alert   │   │ to Human  │
    └───────────┘   └───────────┘
```

### Failure Detection Thresholds

| Failure Type | Detection Threshold | Detection Method |
|--------------|---------------------|------------------|
| Deployment Failure | 5+ deployment errors in 5 min | Error pattern analysis |
| Server Crash | Connection refused/timeout patterns | Health check failures |
| Broken Build | Build error keywords in logs | Log analysis |
| Database Outage | Connection timeout > 5 seconds | Connection health checks |
| Error Spike | 50+ errors in 5 minutes | Error rate monitoring |

### Automatic Recovery Actions

#### Action: Rollback

**Triggered by:** Deployment failures, broken builds
**Process:**
1. Identify last known good deployment
2. Initiate Vercel rollback
3. Verify application health
4. Alert on-call engineer

**Expected Duration:** 2-5 minutes

#### Action: Restart Services

**Triggered by:** Server crashes, memory leaks
**Process:**
1. Clear application cache
2. Reset connection pools
3. Restart Next.js runtime
4. Verify health checks pass

**Expected Duration:** 1-3 minutes

#### Action: Clear Cache

**Triggered by:** Data inconsistency, stale cache issues
**Process:**
1. Flush Redis/cache layer
2. Clear Next.js ISR cache
3. Revalidate critical pages
4. Monitor for improvement

**Expected Duration:** < 1 minute

#### Action: Reconnect Database

**Triggered by:** Connection pool exhaustion, database timeouts
**Process:**
1. Reset database connections
2. Drain connection pool
3. Reestablish fresh connections
4. Verify query execution

**Expected Duration:** 30 seconds - 2 minutes

#### Action: Restore Cron Jobs

**Triggered by:** Cron job execution failures
**Process:**
1. Check cron job status
2. Re-register failed jobs
3. Trigger missed executions
4. Verify schedule restoration

**Expected Duration:** 1-2 minutes

### Self-Healing Safety Limits

To prevent cascading failures, the system implements safety limits:

| Limit | Value | Purpose |
|-------|-------|---------|
| Max Recovery Attempts | 3 per hour | Prevent recovery loops |
| Rollback Cooldown | 10 minutes | Prevent rapid rollback cycles |
| Database Reconnect | Max 5 per 15 min | Prevent connection thrashing |
| Cache Clear | Max 10 per hour | Prevent performance degradation |

### When Self-Healing Fails

If automatic recovery fails after maximum attempts:

1. **System Behavior:**
   - Escalates to CRITICAL alert
   - Notifies on-call engineer immediately
   - Maintains detailed logs of all recovery attempts

2. **Human Response Required:**
   - Acknowledge alert in dashboard
   - Review recovery attempt logs
   - Perform manual intervention
   - Document root cause

---

## Manual Intervention Procedures

### Procedure: Manual Health Check

**When to Use:**
- Suspicion of system issues
- After maintenance windows
- Before critical events (exams, launches)

**Steps:**

1. **Run Full Health Check:**
   ```bash
   curl -H "Authorization: Bearer {token}" \
        https://saviedutech.com/api/cron/health-monitor
   ```

2. **Review Results:**
   - Check overall_status
   - Review each detection result
   - Note any warnings or critical issues

3. **Run Test Suite:**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer {CRON_SECRET}" \
        -H "Content-Type: application/json" \
        -d '{"category": "all", "alertOnFailure": false}' \
        https://saviedutech.com/api/test-engine
   ```

4. **Document Findings:**
   - Save health check output
   - Note any anomalies
   - Update incident log if needed

### Procedure: Manual Cron Job Execution

**When to Use:**
- Cron job failure recovery
- Testing after configuration changes
- Emergency data refresh

**Steps:**

1. **Select Cron Job:**
   - Daily Challenge: `/api/cron/daily-challenge`
   - DPP Generator: `/api/cron/dpp-generator`
   - Lecture Publisher: `/api/cron/lecture-publisher`
   - Revision Updater: `/api/cron/revision-updater`
   - Rank Prediction: `/api/cron/rank-prediction`
   - Test Runner: `/api/cron/test-runner`

2. **Execute Job:**
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
        https://saviedutech.com/api/cron/{job-name}
   ```

3. **Monitor Execution:**
   - Check response for success status
   - Review logs in Super Admin Dashboard
   - Verify expected data changes

4. **Verify Results:**
   - Confirm job completed successfully
   - Check for any errors
   - Document execution in log

### Procedure: Security Incident Response

**When to Use:**
- Suspected security breach
- Brute force attack detected
- Unauthorized access attempts

**Steps:**

1. **Assess Severity:**
   ```bash
   curl -H "Authorization: Bearer {token}" \
        "https://saviedutech.com/api/security-audit?type=full&hours=1"
   ```

2. **Block Threats:**
   ```bash
   # Block suspicious IP
   curl -X POST \
        -H "Authorization: Bearer {token}" \
        -H "Content-Type: application/json" \
        -d '{
          "action": "block_ip",
          "params": {
            "ip_address": "xxx.xxx.xxx.xxx",
            "reason": "Suspicious activity",
            "duration_minutes": 1440
          }
        }' \
        https://saviedutech.com/api/security-audit
   ```

3. **Review Affected Accounts:**
   - Check for compromised accounts
   - Force password resets if needed
   - Review access logs

4. **Document Incident:**
   - Record incident details
   - Note actions taken
   - Plan follow-up improvements

### Procedure: Database Maintenance

**When to Use:**
- Performance degradation
- High disk usage
- Slow query issues

**Steps:**

1. **Analyze Current State:**
   ```bash
   curl -H "Authorization: Bearer {token}" \
        "https://saviedutech.com/api/performance-audit?type=query"
   ```

2. **Identify Issues:**
   - Review slow queries
   - Check table bloat
   - Analyze index usage

3. **Plan Maintenance:**
   - Schedule during low-traffic period
   - Notify stakeholders
   - Prepare rollback plan

4. **Execute Maintenance:**
   - Create database backup
   - Run VACUUM ANALYZE on affected tables
   - Create recommended indexes
   - Monitor query performance

5. **Verify Improvement:**
   - Re-run performance audit
   - Compare before/after metrics
   - Document results

---

## Emergency Contacts and Escalation

### Escalation Path

```
┌─────────────────────────────────────────────────────────────┐
│                    Escalation Levels                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Level 1: On-Call Engineer                                  │
│  ├── Response: 5 minutes                                    │
│  ├── Resolution Time: 30 minutes                            │
│  └── Escalates to: Level 2 after 30 min                     │
│                                                             │
│  Level 2: Senior Engineer / Platform Lead                   │
│  ├── Response: 15 minutes                                   │
│  ├── Resolution Time: 1 hour                                │
│  └── Escalates to: Level 3 after 1 hour                    │
│                                                             │
│  Level 3: Engineering Manager / CTO                         │
│  ├── Response: 30 minutes                                   │
│  ├── Resolution Time: 2 hours                               │
│  └── External vendor contact if needed                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Contact Information

**On-Call Engineer (Level 1):**
- Slack: #platform-alerts
- PagerDuty: Auto-assigned rotation
- Email: oncall@saviedutech.com

**Senior Engineering (Level 2):**
- Slack: @senior-engineers
- Phone: [Contact in secure vault]
- Email: senior-eng@saviedutech.com

**Engineering Leadership (Level 3):**
- Slack: @engineering-leads
- Phone: [Contact in secure vault]
- Email: eng-leads@saviedutech.com

### External Vendor Contacts

**Supabase (Database):**
- Support Portal: https://supabase.com/dashboard/support
- Status Page: https://status.supabase.com
- Emergency: Via support portal with "CRITICAL" priority

**Vercel (Hosting):**
- Support: Via Vercel Dashboard
- Status Page: https://www.vercel-status.com
- Enterprise: Account manager contact

**Cloudflare (CDN/DNS):**
- Status Page: https://www.cloudflarestatus.com
- Support: Via Cloudflare Dashboard

### Incident Communication

**Internal Communication:**
- Slack: #incidents channel
- Status updates every 30 minutes during active incidents
- Post-incident review within 24 hours

**External Communication:**
- Status page: https://status.saviedutech.com
- User notifications via in-app banner (for major incidents)
- Social media updates if widespread impact

---

## Troubleshooting Guide

### Issue: Website Not Loading

**Symptoms:**
- Browser shows connection error
- 404/500 errors on all pages
- DNS resolution failing

**Troubleshooting Steps:**

1. **Check Vercel Status:**
   - Visit https://www.vercel-status.com
   - Check for ongoing incidents

2. **Verify DNS:**
   ```bash
   nslookup saviedutech.com
   dig saviedutech.com
   ```

3. **Check CDN Status:**
   - Verify Cloudflare status
   - Purge CDN cache if needed

4. **Review Recent Deployments:**
   - Check Vercel deployment logs
   - Look for build failures

5. **Rollback if Needed:**
   ```bash
   # Via Vercel CLI
   vercel rollback
   ```

### Issue: Slow Page Load Times

**Symptoms:**
- Pages taking > 5 seconds to load
- Timeout errors
- Degraded user experience

**Troubleshooting Steps:**

1. **Run Performance Audit:**
   ```bash
   curl -H "Authorization: Bearer {token}" \
        "https://saviedutech.com/api/performance-audit?type=full"
   ```

2. **Check Database Performance:**
   - Review slow queries
   - Check connection pool usage
   - Analyze index effectiveness

3. **Check API Response Times:**
   ```bash
   curl -w "@curl-format.txt" -o /dev/null -s \
        https://saviedutech.com/api/health
   ```

4. **Review Bundle Size:**
   - Check for large JavaScript bundles
   - Look for unused code
   - Verify code splitting is working

5. **Clear Caches:**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer {CRON_SECRET}" \
        -H "Content-Type: application/json" \
        -d '{"action": "clear_cache"}' \
        https://saviedutech.com/api/self-healing
   ```

### Issue: Users Cannot Log In

**Symptoms:**
- Login page errors
- Authentication failures
- Session issues

**Troubleshooting Steps:**

1. **Check Authentication Service:**
   ```bash
   curl -H "Authorization: Bearer {token}" \
        "https://saviedutech.com/api/security-audit?type=auth"
   ```

2. **Review Auth Logs:**
   - Check error_logs table for AUTH_FAILED entries
   - Look for brute force patterns
   - Verify Supabase Auth status

3. **Test Auth Flow:**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer {CRON_SECRET}" \
        -H "Content-Type: application/json" \
        -d '{"category": "authentication"}' \
        https://saviedutech.com/api/test-engine
   ```

4. **Check Rate Limiting:**
   - Verify auth rate limits not exceeded
   - Check for IP blocking rules

5. **Clear Auth Cache:**
   - Reset Supabase Auth cache if applicable

### Issue: Database Connection Errors

**Symptoms:**
- "Connection refused" errors
- Query timeouts
- Pool exhaustion errors

**Troubleshooting Steps:**

1. **Check Connection Pool:**
   - Review Supabase Dashboard → Database
   - Check active vs. max connections

2. **Analyze Long-Running Queries:**
   ```sql
   SELECT pid, state, query_start, query
   FROM pg_stat_activity
   WHERE state = 'active'
   AND query_start < NOW() - INTERVAL '5 minutes';
   ```

3. **Reset Connections:**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer {CRON_SECRET}" \
        -H "Content-Type: application/json" \
        -d '{"action": "reconnect_database"}' \
        https://saviedutech.com/api/self-healing
   ```

4. **Check for Connection Leaks:**
   - Review application code for unclosed connections
   - Verify connection cleanup in error handlers

5. **Scale Database (if needed):**
   - Contact Supabase to increase connection limits
   - Consider connection pooling configuration

### Issue: Cron Jobs Not Running

**Symptoms:**
- Missing daily challenges
- Stale revision tasks
- No rank predictions updated

**Troubleshooting Steps:**

1. **Check Cron Status:**
   - Review Super Admin Dashboard → Cron Job Status
   - Check vercel.json configuration

2. **Verify Cron Secret:**
   - Ensure CRON_SECRET is set correctly
   - Test authentication:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
        https://saviedutech.com/api/cron/health-monitor
   ```

3. **Check Vercel Cron Limits:**
   - Verify cron job count within plan limits
   - Check for cron job execution logs

4. **Manual Execution:**
   - Trigger jobs manually to test
   - Review error logs for failures

5. **Re-register Jobs:**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer {CRON_SECRET}" \
        -H "Content-Type: application/json" \
        -d '{"action": "restore_cron"}' \
        https://saviedutech.com/api/self-healing
   ```

---

## Recovery Procedures

### Procedure: Complete System Recovery

**When to Use:**
- Complete system failure
- Major security incident
- Catastrophic data loss

**Steps:**

1. **Assess Situation:**
   - Determine scope of failure
   - Identify affected components
   - Gather all available logs

2. **Notify Stakeholders:**
   - Post in #incidents channel
   - Update status page
   - Alert engineering leadership

3. **Initiate Recovery:**
   ```bash
   # Step 1: Check current status
   curl -H "Authorization: Bearer $CRON_SECRET" \
        "https://saviedutech.com/api/self-healing?action=detections"

   # Step 2: Trigger comprehensive self-healing
   curl -X POST \
        -H "Authorization: Bearer $CRON_SECRET" \
        -H "Content-Type: application/json" \
        -d '{"action": "restart_services"}' \
        https://saviedutech.com/api/self-healing
   ```

4. **Verify Recovery:**
   - Run full health check
   - Execute test suite
   - Monitor error rates

5. **Document and Review:**
   - Create incident report
   - Schedule post-mortem
   - Implement preventive measures

### Procedure: Database Recovery

**When to Use:**
- Data corruption
- Accidental deletion
- Restore from backup needed

**Steps:**

1. **Stop Application Writes:**
   - Enable maintenance mode if available
   - Redirect traffic to maintenance page

2. **Identify Backup:**
   - Locate most recent clean backup
   - Verify backup integrity

3. **Execute Restore:**
   - Via Supabase Dashboard or CLI
   - Follow Supabase restore procedures

4. **Verify Data:**
   - Check critical tables
   - Run data integrity checks
   - Verify row counts

5. **Resume Operations:**
   - Disable maintenance mode
   - Monitor for errors
   - Notify users of any data loss

---

## Appendix

### Common Commands Reference

```bash
# Health Check
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://saviedutech.com/api/cron/health-monitor

# Security Audit
curl -H "Authorization: Bearer {token}" \
     "https://saviedutech.com/api/security-audit?type=score"

# Performance Audit
curl -H "Authorization: Bearer {token}" \
     "https://saviedutech.com/api/performance-audit?type=full"

# Run Tests
curl -X POST \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"category": "all"}' \
     https://saviedutech.com/api/test-engine

# Self-Healing
curl -X POST \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"action": "clear_cache"}' \
     https://saviedutech.com/api/self-healing
```

### Useful SQL Queries

```sql
-- Check recent errors
SELECT error_type, COUNT(*), MAX(occurred_at)
FROM error_logs
WHERE occurred_at > NOW() - INTERVAL '1 hour'
GROUP BY error_type
ORDER BY COUNT(*) DESC;

-- Check connection status
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

### Incident Report Template

```markdown
# Incident Report: [TITLE]

**Date:** YYYY-MM-DD
**Duration:** HH:MM
**Severity:** CRITICAL/HIGH/MEDIUM/LOW
**Affected Systems:** 

## Summary
Brief description of the incident

## Timeline
- HH:MM - Issue detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Resolution implemented
- HH:MM - Service restored

## Root Cause
Description of what caused the incident

## Resolution
Steps taken to resolve the issue

## Prevention
Measures to prevent recurrence

## Action Items
- [ ] Action item 1
- [ ] Action item 2
```

---

**Document Version:** 1.0  
**Last Updated:** March 4, 2026  
**Next Review:** April 4, 2026
