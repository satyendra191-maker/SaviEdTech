/**
 * Notifications Send API
 * Endpoint for sending transactional emails
 * Protected by admin/super-admin authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';
import {
    sendEmail,
    sendBatchEmails,
    EmailType,
    EmailData,
    EmailResult,
    BatchEmailResult,
    validateEmail
} from '@/lib/email/email-service';

// Email type validation
const VALID_EMAIL_TYPES: EmailType[] = [
    'welcome',
    'test-reminder',
    'password-reset',
    'weekly-digest',
    'course-completion',
    'custom'
];

interface SendEmailRequest {
    type: EmailType;
    to: string | string[];
    subject: string;
    data: EmailData;
    from?: string;
    cc?: string | string[];
    bcc?: string | string[];
}

interface BatchEmailRequest {
    type: EmailType;
    recipients: Array<{
        email: string;
        data: EmailData;
    }>;
    subject: string;
    from?: string;
}

/**
 * POST /api/notifications/send
 * Send a single email or batch emails
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // Check authorization
        const authResult = await checkAuthorization(request);
        if (!authResult.authorized) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        // Parse request body
        const body = await request.json();

        // Determine if it's a batch or single email request
        if ('recipients' in body) {
            return handleBatchEmail(body as BatchEmailRequest);
        } else {
            return handleSingleEmail(body as SendEmailRequest);
        }
    } catch (error) {
        console.error('Error in notifications send endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Handle single email sending
 */
async function handleSingleEmail(body: SendEmailRequest): Promise<NextResponse> {
    // Validate required fields
    if (!body.type || !body.to || !body.subject || !body.data) {
        return NextResponse.json(
            { error: 'Missing required fields: type, to, subject, data' },
            { status: 400 }
        );
    }

    // Validate email type
    if (!VALID_EMAIL_TYPES.includes(body.type)) {
        return NextResponse.json(
            { error: `Invalid email type. Valid types: ${VALID_EMAIL_TYPES.join(', ')}` },
            { status: 400 }
        );
    }

    // Validate email addresses
    const emails = Array.isArray(body.to) ? body.to : [body.to];
    const invalidEmails = emails.filter(email => !validateEmail(email));
    if (invalidEmails.length > 0) {
        return NextResponse.json(
            { error: `Invalid email addresses: ${invalidEmails.join(', ')}` },
            { status: 400 }
        );
    }

    // Send email
    const result: EmailResult = await sendEmail(
        body.type,
        {
            to: body.to,
            subject: body.subject,
            from: body.from,
            cc: body.cc,
            bcc: body.bcc,
        },
        body.data
    );

    if (result.success) {
        return NextResponse.json({
            success: true,
            messageId: result.messageId,
            message: 'Email sent successfully'
        });
    } else {
        return NextResponse.json(
            { error: result.error || 'Failed to send email' },
            { status: 500 }
        );
    }
}

/**
 * Handle batch email sending
 */
async function handleBatchEmail(body: BatchEmailRequest): Promise<NextResponse> {
    // Validate required fields
    if (!body.type || !body.recipients || !body.subject) {
        return NextResponse.json(
            { error: 'Missing required fields: type, recipients, subject' },
            { status: 400 }
        );
    }

    // Validate email type
    if (!VALID_EMAIL_TYPES.includes(body.type)) {
        return NextResponse.json(
            { error: `Invalid email type. Valid types: ${VALID_EMAIL_TYPES.join(', ')}` },
            { status: 400 }
        );
    }

    // Validate recipients
    if (!Array.isArray(body.recipients) || body.recipients.length === 0) {
        return NextResponse.json(
            { error: 'Recipients must be a non-empty array' },
            { status: 400 }
        );
    }

    // Validate email addresses
    const invalidEmails = body.recipients
        .filter(r => !validateEmail(r.email))
        .map(r => r.email);
    if (invalidEmails.length > 0) {
        return NextResponse.json(
            { error: `Invalid email addresses: ${invalidEmails.join(', ')}` },
            { status: 400 }
        );
    }

    // Limit batch size
    if (body.recipients.length > 100) {
        return NextResponse.json(
            { error: 'Batch size cannot exceed 100 recipients' },
            { status: 400 }
        );
    }

    // Send batch emails
    const result: BatchEmailResult = await sendBatchEmails(
        body.type,
        body.recipients,
        body.subject,
        body.from
    );

    return NextResponse.json({
        success: true,
        summary: {
            total: body.recipients.length,
            successful: result.successful,
            failed: result.failed
        },
        results: result.results
    });
}

/**
 * GET /api/notifications/send
 * Get email service status and available templates
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        // Check authorization
        const authResult = await checkAuthorization(request);
        if (!authResult.authorized) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        // Return available email types and service status
        return NextResponse.json({
            status: 'active',
            emailTypes: VALID_EMAIL_TYPES,
            features: {
                singleEmail: true,
                batchEmail: true,
                templates: true,
                scheduling: true
            }
        });
    } catch (error) {
        console.error('Error in notifications status endpoint:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Check if the request is authorized
 * Requires admin or super-admin role
 */
async function checkAuthorization(request: NextRequest): Promise<{
    authorized: boolean;
    error?: string;
    status?: number;
}> {
    try {
        const supabase = createAdminSupabaseClient();

        // Get user from authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return { authorized: false, error: 'Unauthorized', status: 401 };
        }

        const token = authHeader.substring(7);

        // Verify the JWT token and get user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return { authorized: false, error: 'Unauthorized', status: 401 };
        }

        // Check user role from metadata or profiles table
        const userRole = user.user_metadata?.role || user.user_metadata?.user_role;

        if (userRole === 'super-admin' || userRole === 'admin') {
            return { authorized: true };
        }

        // Fallback: check profiles table
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return { authorized: false, error: 'Unauthorized', status: 401 };
        }

        const role = (profile as { role?: string }).role;
        if (role === 'super-admin' || role === 'admin') {
            return { authorized: true };
        }

        return { authorized: false, error: 'Forbidden - Admin access required', status: 403 };
    } catch (error) {
        console.error('Authorization check failed:', error);
        return { authorized: false, error: 'Authorization failed', status: 500 };
    }
}
