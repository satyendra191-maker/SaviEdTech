import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { monitoredRoute } from '@/lib/api/route-utils';
import { createAdminSupabaseClient } from '@/lib/supabase';
import { createApiError, ErrorType } from '@/lib/error-handler';
import { sendEmail } from '@/lib/email/email-service';
import type { Database } from '@/types/supabase';

const contactSchema = z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().regex(/^\+?\d[\d\s-]{7,18}$/),
    email: z.string().trim().email().max(150),
    subject: z.string().trim().min(3).max(150),
    message: z.string().trim().min(10).max(2000),
});

export async function POST(request: NextRequest) {
    return monitoredRoute(request, async () => {
        const body = contactSchema.parse(await request.json());
        const supabase = createAdminSupabaseClient();
        const leadForms = supabase.from('lead_forms') as unknown as {
            insert: (
                values: Database['public']['Tables']['lead_forms']['Insert']
            ) => Promise<{ error: { message: string } | null }>;
        };

        const { error } = await leadForms.insert({
            name: body.name,
            phone: body.phone,
            email: body.email,
            exam_target: 'Other',
            class_level: 'Dropper',
            city: 'Contact Page',
            source: 'contact-page',
            notes: JSON.stringify({
                subject: body.subject,
                message: body.message,
            }),
        });

        if (error) {
            throw createApiError(ErrorType.DATABASE, 'Failed to store contact request.');
        }

        const adminEmail = process.env.CONTACT_NOTIFICATION_EMAIL || 'support@saviedutech.in';
        const emailResult = await sendEmail(
            'custom',
            {
                to: adminEmail,
                subject: `New Contact Form Submission: ${body.subject}`,
                replyTo: body.email,
            },
            {
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                        <h2>New SaviEduTech Contact Submission</h2>
                        <p><strong>Name:</strong> ${body.name}</p>
                        <p><strong>Phone:</strong> ${body.phone}</p>
                        <p><strong>Email:</strong> ${body.email}</p>
                        <p><strong>Subject:</strong> ${body.subject}</p>
                        <p><strong>Message:</strong><br/>${body.message.replace(/\n/g, '<br/>')}</p>
                    </div>
                `,
                text: `New SaviEduTech Contact Submission\n\nName: ${body.name}\nPhone: ${body.phone}\nEmail: ${body.email}\nSubject: ${body.subject}\nMessage: ${body.message}`,
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Thank you! Your message has been successfully submitted. Our team will contact you shortly.',
            emailQueued: emailResult.success,
        });
    }, {
        routeLabel: '/api/contact',
        defaultCacheControl: 'no-store',
        metadata: { feature: 'contact-form' },
    });
}
