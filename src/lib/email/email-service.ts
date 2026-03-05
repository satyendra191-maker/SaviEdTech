/**
 * Email Service
 * Resend integration for sending transactional emails
 */

import { Resend } from 'resend';
import { welcomeTemplate } from './templates/welcome';
import { testReminderTemplate } from './templates/test-reminder';
import { passwordResetTemplate } from './templates/password-reset';
import { weeklyDigestTemplate } from './templates/weekly-digest';
import { courseCompletionTemplate } from './templates/course-completion';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender email
const DEFAULT_FROM = process.env.EMAIL_FROM || 'noreply@saviedutech.com';

// Email types
export type EmailType =
    | 'welcome'
    | 'test-reminder'
    | 'password-reset'
    | 'weekly-digest'
    | 'course-completion'
    | 'custom';

// Base email options
export interface EmailOptions {
    to: string | string[];
    subject: string;
    from?: string;
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    attachments?: Array<{
        filename: string;
        content?: string | Buffer;
        path?: string;
    }>;
}

// Template-specific data
export interface WelcomeEmailData {
    userName: string;
    dashboardUrl: string;
}

export interface TestReminderData {
    userName: string;
    testName: string;
    testDate: string;
    testTime: string;
    testUrl: string;
    timeRemaining: string;
}

export interface PasswordResetData {
    userName: string;
    resetUrl: string;
    expiresIn: string;
}

export interface WeeklyDigestData {
    userName: string;
    weekRange: string;
    testsCompleted: number;
    averageScore: number;
    rank: number;
    streakDays: number;
    upcomingTests: Array<{
        name: string;
        date: string;
    }>;
}

export interface CourseCompletionData {
    userName: string;
    courseName: string;
    completionDate: string;
    certificateUrl?: string;
    nextCourseUrl?: string;
}

export interface CustomEmailData {
    html: string;
    text?: string;
}

export type EmailData =
    | WelcomeEmailData
    | TestReminderData
    | PasswordResetData
    | WeeklyDigestData
    | CourseCompletionData
    | CustomEmailData;

// Email result
export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// Batch email result
export interface BatchEmailResult {
    successful: number;
    failed: number;
    results: EmailResult[];
}

/**
 * Send a single email
 */
export async function sendEmail(
    type: EmailType,
    options: EmailOptions,
    data: EmailData
): Promise<EmailResult> {
    try {
        // Validate API key
        if (!process.env.RESEND_API_KEY) {
            console.error('RESEND_API_KEY is not configured');
            return { success: false, error: 'Email service not configured' };
        }

        // Generate email content based on type
        const { html, text } = generateEmailContent(type, data);

        // Send email via Resend
        const { data: response, error } = await resend.emails.send({
            from: options.from || DEFAULT_FROM,
            to: options.to,
            cc: options.cc,
            bcc: options.bcc,
            replyTo: options.replyTo,
            subject: options.subject,
            html,
            text,
            attachments: options.attachments,
        });

        if (error) {
            console.error('Failed to send email:', error);
            return { success: false, error: error.message };
        }

        console.log(`Email sent successfully: ${response?.id}`);
        return { success: true, messageId: response?.id };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Email sending failed:', errorMessage);
        return { success: false, error: errorMessage };
    }
}

/**
 * Send emails to multiple recipients (batch)
 */
export async function sendBatchEmails(
    type: EmailType,
    recipients: Array<{ email: string; data: EmailData }>,
    subject: string,
    from?: string
): Promise<BatchEmailResult> {
    const results: EmailResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process in batches of 10 to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        const batchPromises = batch.map(async (recipient) => {
            const result = await sendEmail(
                type,
                { to: recipient.email, subject, from },
                recipient.data
            );

            if (result.success) {
                successful++;
            } else {
                failed++;
            }

            return result;
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches
        if (i + batchSize < recipients.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return { successful, failed, results };
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
    email: string,
    userName: string
): Promise<EmailResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return sendEmail(
        'welcome',
        {
            to: email,
            subject: 'Welcome to SaviEduTech! 🎉',
        },
        {
            userName,
            dashboardUrl: `${appUrl}/dashboard`,
        } as WelcomeEmailData
    );
}

/**
 * Send test reminder email
 */
export async function sendTestReminderEmail(
    email: string,
    data: TestReminderData
): Promise<EmailResult> {
    return sendEmail(
        'test-reminder',
        {
            to: email,
            subject: `Reminder: ${data.testName} is ${data.timeRemaining}`,
        },
        data
    );
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
    email: string,
    userName: string,
    resetToken: string
): Promise<EmailResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return sendEmail(
        'password-reset',
        {
            to: email,
            subject: 'Password Reset Request - SaviEduTech',
        },
        {
            userName,
            resetUrl: `${appUrl}/reset-password?token=${resetToken}`,
            expiresIn: '1 hour',
        } as PasswordResetData
    );
}

/**
 * Send weekly digest email
 */
export async function sendWeeklyDigestEmail(
    email: string,
    data: WeeklyDigestData
): Promise<EmailResult> {
    return sendEmail(
        'weekly-digest',
        {
            to: email,
            subject: `Your Weekly Progress Report - ${data.weekRange}`,
        },
        data
    );
}

/**
 * Send course completion email
 */
export async function sendCourseCompletionEmail(
    email: string,
    data: CourseCompletionData
): Promise<EmailResult> {
    return sendEmail(
        'course-completion',
        {
            to: email,
            subject: `🎉 Congratulations on completing ${data.courseName}!`,
        },
        data
    );
}

/**
 * Generate email content based on type
 */
function generateEmailContent(
    type: EmailType,
    data: EmailData
): { html: string; text: string } {
    switch (type) {
        case 'welcome':
            return welcomeTemplate(data as WelcomeEmailData);
        case 'test-reminder':
            return testReminderTemplate(data as TestReminderData);
        case 'password-reset':
            return passwordResetTemplate(data as PasswordResetData);
        case 'weekly-digest':
            return weeklyDigestTemplate(data as WeeklyDigestData);
        case 'course-completion':
            return courseCompletionTemplate(data as CourseCompletionData);
        case 'custom':
            const customData = data as CustomEmailData;
            return {
                html: customData.html,
                text: customData.text || 'Please view this email in an HTML-capable email client.',
            };
        default:
            throw new Error(`Unknown email type: ${type}`);
    }
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Get email sending statistics (mock for now, can be enhanced with Resend analytics)
 */
export async function getEmailStats(): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
}> {
    // In production, this could fetch from Resend API or database
    return {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
    };
}
