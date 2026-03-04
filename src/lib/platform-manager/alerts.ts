/**
 * AI Autonomous Platform Manager - Alert Manager
 * 
 * Provides alert management capabilities:
 * - Alert severity levels
 * - Alert rules for error thresholds
 * - Alert deduplication
 * - Alert notifications
 */

import { createAdminSupabaseClient } from '@/lib/supabase';
import { getRecentErrors, getSystemHealth, getCronStatus } from './monitor';
import type { Database } from '@/types/supabase';

// Alert severity levels
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
    id: string;
    severity: AlertSeverity;
    title: string;
    message: string;
    source: string;
    status: AlertStatus;
    metadata: Record<string, unknown>;
    created_at: string;
    acknowledged_at: string | null;
    acknowledged_by: string | null;
    resolved_at: string | null;
}

export interface AlertRule {
    id: string;
    name: string;
    description: string;
    severity: AlertSeverity;
    condition: AlertCondition;
    is_enabled: boolean;
    cooldown_minutes: number;
    last_triggered_at: string | null;
    notification_channels: NotificationChannel[];
    created_at: string;
    updated_at: string;
}

export type AlertConditionType =
    | 'error_rate_threshold'
    | 'error_count_threshold'
    | 'health_check_failed'
    | 'cron_job_failed'
    | 'response_time_threshold'
    | 'custom';

export interface AlertCondition {
    type: AlertConditionType;
    threshold?: number;
    timeWindowMinutes?: number;
    checkName?: string;
    cronJobName?: string;
    customCheck?: () => Promise<boolean>;
}

export type NotificationChannel =
    | { type: 'email'; recipients: string[] }
    | { type: 'webhook'; url: string; headers?: Record<string, string> }
    | { type: 'slack'; webhookUrl: string; channel?: string }
    | { type: 'console' };

export interface AlertDeduplicationKey {
    severity: AlertSeverity;
    source: string;
    title: string;
}

// In-memory storage for active alerts (in production, this should be in database/cache)
const activeAlerts: Map<string, Alert> = new Map();
const alertRules: Map<string, AlertRule> = new Map();

// Default alert rules
const DEFAULT_ALERT_RULES: Omit<AlertRule, 'id' | 'created_at' | 'updated_at' | 'last_triggered_at'>[] = [
    {
        name: 'Critical Error Rate',
        description: 'Trigger when error rate exceeds 10 errors per minute',
        severity: 'CRITICAL',
        condition: {
            type: 'error_count_threshold',
            threshold: 10,
            timeWindowMinutes: 1,
        },
        is_enabled: true,
        cooldown_minutes: 5,
        notification_channels: [{ type: 'console' }],
    },
    {
        name: 'High Error Rate',
        description: 'Trigger when more than 50 errors occur in 5 minutes',
        severity: 'HIGH',
        condition: {
            type: 'error_count_threshold',
            threshold: 50,
            timeWindowMinutes: 5,
        },
        is_enabled: true,
        cooldown_minutes: 10,
        notification_channels: [{ type: 'console' }],
    },
    {
        name: 'System Health Critical',
        description: 'Trigger when any health check reports critical status',
        severity: 'CRITICAL',
        condition: {
            type: 'health_check_failed',
        },
        is_enabled: true,
        cooldown_minutes: 5,
        notification_channels: [{ type: 'console' }],
    },
    {
        name: 'Cron Job Failure',
        description: 'Trigger when a cron job fails',
        severity: 'HIGH',
        condition: {
            type: 'cron_job_failed',
        },
        is_enabled: true,
        cooldown_minutes: 15,
        notification_channels: [{ type: 'console' }],
    },
    {
        name: 'Slow Response Time',
        description: 'Trigger when response time exceeds 5 seconds',
        severity: 'MEDIUM',
        condition: {
            type: 'response_time_threshold',
            threshold: 5000, // 5 seconds in ms
        },
        is_enabled: true,
        cooldown_minutes: 10,
        notification_channels: [{ type: 'console' }],
    },
];

// Initialize default alert rules
let rulesInitialized = false;
function initializeDefaultRules(): void {
    if (rulesInitialized) return;

    DEFAULT_ALERT_RULES.forEach(rule => {
        const id = generateAlertId();
        alertRules.set(id, {
            ...rule,
            id,
            last_triggered_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    });

    rulesInitialized = true;
}

/**
 * Generate a unique alert ID
 */
function generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate deduplication key for an alert
 */
function generateDedupKey(alert: Pick<Alert, 'severity' | 'source' | 'title'>): string {
    return `${alert.severity}:${alert.source}:${alert.title}`;
}

/**
 * Check if alert is in cooldown period
 */
function isInCooldown(rule: AlertRule): boolean {
    if (!rule.last_triggered_at) return false;

    const cooldownMs = rule.cooldown_minutes * 60 * 1000;
    const lastTriggered = new Date(rule.last_triggered_at).getTime();
    return Date.now() - lastTriggered < cooldownMs;
}

/**
 * Check alert conditions and trigger alerts if needed
 */
export async function checkAlertConditions(): Promise<Alert[]> {
    initializeDefaultRules();
    const triggeredAlerts: Alert[] = [];

    for (const rule of alertRules.values()) {
        if (!rule.is_enabled || isInCooldown(rule)) {
            continue;
        }

        let shouldTrigger = false;
        let alertTitle = rule.name;
        let alertMessage = rule.description;
        let metadata: Record<string, unknown> = {};

        try {
            switch (rule.condition.type) {
                case 'error_count_threshold': {
                    const errors = await getRecentErrors({
                        timeWindowMinutes: rule.condition.timeWindowMinutes || 5,
                        errorLimit: rule.condition.threshold || 10,
                    });

                    shouldTrigger = errors.length >= (rule.condition.threshold || 10);
                    alertMessage = `${errors.length} errors in the last ${rule.condition.timeWindowMinutes} minutes`;
                    metadata = { errorCount: errors.length, errors: errors.slice(0, 5) };
                    break;
                }

                case 'error_rate_threshold': {
                    const errors = await getRecentErrors({
                        timeWindowMinutes: rule.condition.timeWindowMinutes || 1,
                    });
                    const errorRate = errors.length / (rule.condition.timeWindowMinutes || 1);

                    shouldTrigger = errorRate >= (rule.condition.threshold || 10);
                    alertMessage = `Error rate of ${errorRate.toFixed(2)} errors/minute`;
                    metadata = { errorRate, errorCount: errors.length };
                    break;
                }

                case 'health_check_failed': {
                    const healthChecks = await getSystemHealth();
                    const criticalChecks = healthChecks.filter(h => h.status === 'critical');

                    shouldTrigger = criticalChecks.length > 0;
                    if (shouldTrigger) {
                        alertTitle = `Critical Health Check: ${criticalChecks[0].check_name}`;
                        alertMessage = `${criticalChecks.length} health check(s) in critical state`;
                        metadata = { failedChecks: criticalChecks.map(h => h.check_name) };
                    }
                    break;
                }

                case 'cron_job_failed': {
                    const cronJobs = await getCronStatus();
                    const failedJobs = cronJobs.filter(j => j.status === 'critical' || j.error_count > 0);

                    shouldTrigger = failedJobs.length > 0;
                    if (shouldTrigger) {
                        alertTitle = `Cron Job Failure: ${failedJobs[0].job_name}`;
                        alertMessage = `${failedJobs.length} cron job(s) with failures`;
                        metadata = { failedJobs: failedJobs.map(j => j.job_name) };
                    }
                    break;
                }

                case 'response_time_threshold': {
                    const healthChecks = await getSystemHealth();
                    const slowChecks = healthChecks.filter(
                        h => h.response_time_ms && h.response_time_ms > (rule.condition.threshold || 5000)
                    );

                    shouldTrigger = slowChecks.length > 0;
                    if (shouldTrigger) {
                        alertTitle = `Slow Response: ${slowChecks[0].check_name}`;
                        alertMessage = `Response time ${slowChecks[0].response_time_ms}ms exceeds threshold`;
                        metadata = {
                            slowChecks: slowChecks.map(h => ({
                                name: h.check_name,
                                responseTime: h.response_time_ms,
                            })),
                        };
                    }
                    break;
                }

                case 'custom': {
                    if (rule.condition.customCheck) {
                        shouldTrigger = await rule.condition.customCheck();
                    }
                    break;
                }
            }

            if (shouldTrigger) {
                rule.last_triggered_at = new Date().toISOString();
                const alert = await sendAlert({
                    severity: rule.severity,
                    title: alertTitle,
                    message: alertMessage,
                    source: rule.name,
                    metadata,
                });
                triggeredAlerts.push(alert);
            }
        } catch (err) {
            console.error(`Error checking alert rule "${rule.name}":`, err);
        }
    }

    return triggeredAlerts;
}

/**
 * Send an alert with deduplication
 */
export async function sendAlert(alertData: {
    severity: AlertSeverity;
    title: string;
    message: string;
    source: string;
    metadata?: Record<string, unknown>;
}): Promise<Alert> {
    const alert: Alert = {
        id: generateAlertId(),
        severity: alertData.severity,
        title: alertData.title,
        message: alertData.message,
        source: alertData.source,
        status: 'active',
        metadata: alertData.metadata || {},
        created_at: new Date().toISOString(),
        acknowledged_at: null,
        acknowledged_by: null,
        resolved_at: null,
    };

    // Deduplication check
    const dedupKey = generateDedupKey(alert);
    const existingAlert = activeAlerts.get(dedupKey);

    if (existingAlert && existingAlert.status === 'active') {
        // Update existing alert with new occurrence
        existingAlert.metadata = {
            ...existingAlert.metadata,
            occurrenceCount: ((existingAlert.metadata.occurrenceCount as number) || 1) + 1,
            lastOccurrence: alert.created_at,
        };
        console.log(`Alert deduplicated: ${alert.title}`);
        return existingAlert;
    }

    // Store new alert
    activeAlerts.set(dedupKey, alert);

    // Send notifications
    await notifyChannels(alert);

    // Log to database if configured
    try {
        const supabase = createAdminSupabaseClient();
        await supabase.from('error_logs').insert({
            error_type: `alert_${alert.severity.toLowerCase()}`,
            error_message: `${alert.title}: ${alert.message}`,
            metadata: {
                alert_id: alert.id,
                alert_source: alert.source,
                alert_severity: alert.severity,
                ...alert.metadata,
            },
        } as any);
    } catch (err) {
        console.error('Failed to log alert to database:', err);
    }

    return alert;
}

/**
 * Send alert to configured notification channels
 */
async function notifyChannels(alert: Alert): Promise<void> {
    const rule = Array.from(alertRules.values()).find(r => r.name === alert.source);
    const channels = rule?.notification_channels || [{ type: 'console' }];

    for (const channel of channels) {
        try {
            switch (channel.type) {
                case 'console':
                    console.log(`[${alert.severity}] ${alert.title}: ${alert.message}`);
                    break;

                case 'email':
                    // TODO: Implement email notification
                    console.log(`Would send email to ${channel.recipients.join(', ')}: ${alert.title}`);
                    break;

                case 'webhook':
                    await fetch(channel.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...channel.headers,
                        },
                        body: JSON.stringify(alert),
                    });
                    break;

                case 'slack':
                    await sendSlackNotification(channel.webhookUrl, alert, channel.channel);
                    break;
            }
        } catch (err) {
            console.error(`Failed to send notification to ${channel.type}:`, err);
        }
    }
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(
    webhookUrl: string,
    alert: Alert,
    channel?: string
): Promise<void> {
    const severityColors: Record<AlertSeverity, string> = {
        CRITICAL: '#DC2626',
        HIGH: '#EA580C',
        MEDIUM: '#CA8A04',
        LOW: '#16A34A',
    };

    const payload = {
        channel,
        attachments: [{
            color: severityColors[alert.severity],
            title: `[${alert.severity}] ${alert.title}`,
            text: alert.message,
            fields: [
                { title: 'Source', value: alert.source, short: true },
                { title: 'Alert ID', value: alert.id, short: true },
                { title: 'Time', value: alert.created_at, short: true },
            ],
            footer: 'SaviEdTech Platform Manager',
            ts: Math.floor(new Date(alert.created_at).getTime() / 1000),
        }],
    };

    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

/**
 * Get all active (unresolved) alerts
 */
export function getActiveAlerts(severity?: AlertSeverity): Alert[] {
    const alerts = Array.from(activeAlerts.values());
    if (severity) {
        return alerts.filter(a => a.status === 'active' && a.severity === severity);
    }
    return alerts.filter(a => a.status === 'active');
}

/**
 * Get all alerts including resolved ones
 */
export function getAllAlerts(
    filters?: { severity?: AlertSeverity; source?: string; status?: AlertStatus }
): Alert[] {
    let alerts = Array.from(activeAlerts.values());

    if (filters?.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
    }
    if (filters?.source) {
        alerts = alerts.filter(a => a.source === filters.source);
    }
    if (filters?.status) {
        alerts = alerts.filter(a => a.status === filters.status);
    }

    return alerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
): Alert | null {
    for (const alert of activeAlerts.values()) {
        if (alert.id === alertId && alert.status === 'active') {
            alert.status = 'acknowledged';
            alert.acknowledged_at = new Date().toISOString();
            alert.acknowledged_by = acknowledgedBy;
            return alert;
        }
    }
    return null;
}

/**
 * Resolve an alert
 */
export function resolveAlert(alertId: string): Alert | null {
    for (const alert of activeAlerts.values()) {
        if (alert.id === alertId && (alert.status === 'active' || alert.status === 'acknowledged')) {
            alert.status = 'resolved';
            alert.resolved_at = new Date().toISOString();
            return alert;
        }
    }
    return null;
}

/**
 * Create a new alert rule
 */
export function createAlertRule(
    rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at' | 'last_triggered_at'>
): AlertRule {
    const id = generateAlertId();
    const newRule: AlertRule = {
        ...rule,
        id,
        last_triggered_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    alertRules.set(id, newRule);
    return newRule;
}

/**
 * Update an alert rule
 */
export function updateAlertRule(
    id: string,
    updates: Partial<Omit<AlertRule, 'id' | 'created_at'>>
): AlertRule | null {
    const rule = alertRules.get(id);
    if (!rule) return null;

    const updatedRule = {
        ...rule,
        ...updates,
        updated_at: new Date().toISOString(),
    };
    alertRules.set(id, updatedRule);
    return updatedRule;
}

/**
 * Delete an alert rule
 */
export function deleteAlertRule(id: string): boolean {
    return alertRules.delete(id);
}

/**
 * Get all alert rules
 */
export function getAlertRules(includeDisabled = false): AlertRule[] {
    const rules = Array.from(alertRules.values());
    if (!includeDisabled) {
        return rules.filter(r => r.is_enabled);
    }
    return rules;
}

/**
 * Clear all alerts (use with caution)
 */
export function clearAllAlerts(): void {
    activeAlerts.clear();
}