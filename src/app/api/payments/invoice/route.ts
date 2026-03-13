import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { createApiError, ErrorType } from '@/lib/error-handler';
import {
    getCourseInvoiceByReference,
    getPaymentById,
    getPaymentByOrderOrPaymentId,
    syncFinancialRecordsForPaymentRecord,
} from '@/lib/finance/service';
import { generateCourseInvoicePDF } from '@/lib/pdf/course-invoice';
import { sendEmail } from '@/lib/email/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function createRequestSupabaseClient(request: NextRequest) {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set() {},
                remove() {},
            },
        }
    );
}

interface WhatsAppMessageRequest {
    phone: string;
    templateName: string;
    parameters?: Record<string, string>;
}

async function sendWhatsAppMessage(message: WhatsAppMessageRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const whatsappApiUrl = process.env.WHATSAPP_API_URL;
    const whatsappToken = process.env.WHATSAPP_TOKEN;

    if (!whatsappApiUrl || !whatsappToken) {
        console.warn('[Invoice WhatsApp] WhatsApp not configured');
        return { success: false, error: 'WhatsApp not configured' };
    }

    try {
        const response = await fetch(whatsappApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${whatsappToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: message.phone,
                type: 'template',
                template: {
                    name: message.templateName,
                    language: { code: 'en_US' },
                    components: message.parameters ? [{
                        type: 'body',
                        parameters: Object.entries(message.parameters).map(([key, value]) => ({
                            type: 'text',
                            parameter_name: key,
                            text: value,
                        })),
                    }] : undefined,
                },
            }),
        });

        if (response.ok) {
            const data = await response.json();
            return { success: true, messageId: data.messages?.[0]?.id };
        } else {
            const error = await response.text();
            return { success: false, error };
        }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

export async function GET(request: NextRequest): Promise<Response> {
    try {
        const invoiceNumber = request.nextUrl.searchParams.get('invoiceNumber');
        const orderId = request.nextUrl.searchParams.get('orderId');
        const paymentId = request.nextUrl.searchParams.get('paymentId');

        if (!invoiceNumber && !orderId && !paymentId) {
            throw createApiError(ErrorType.VALIDATION, 'invoiceNumber, orderId, or paymentId is required.');
        }

        const supabase = createRequestSupabaseClient(request);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw createApiError(ErrorType.AUTHENTICATION, 'Please sign in to download invoices.');
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        const role = (profile as { role?: string } | null)?.role || null;
        const isFinanceUser = role === 'admin' || role === 'finance_manager';

        let invoice = await getCourseInvoiceByReference({
            invoiceNumber,
            orderId,
            paymentId,
        });

        if (!invoice) {
            const payment = await getPaymentByOrderOrPaymentId({ orderId, paymentId });
            if (payment?.id) {
                await syncFinancialRecordsForPaymentRecord(payment.id);
                invoice = await getCourseInvoiceByReference({
                    invoiceNumber,
                    orderId,
                    paymentId,
                });
            }
        }

        if (!invoice) {
            throw createApiError(ErrorType.NOT_FOUND, 'Invoice not found.');
        }

        const payment = await getPaymentByOrderOrPaymentId({
            orderId,
            paymentId,
        }) || await getPaymentById(invoice.payment_id);

        const invoiceOwnerId = payment?.user_id || invoice.user_id;

        if (!isFinanceUser && invoiceOwnerId !== user.id) {
            throw createApiError(ErrorType.AUTHORIZATION, 'You do not have access to this invoice.');
        }

        const pdfBlob = await generateCourseInvoicePDF({
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            studentName: invoice.student_name,
            studentEmail: invoice.student_email,
            courseTitle: invoice.course_title,
            courseId: invoice.course_id,
            taxableValue: invoice.taxable_value,
            gstRate: invoice.gst_rate,
            gstAmount: invoice.gst_amount,
            totalAmount: invoice.total_amount,
            currency: invoice.currency,
            transactionId: invoice.transaction_id,
            orderId: invoice.payment_reference,
        });

        const arrayBuffer = await pdfBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        const appError = error as { statusCode?: number; message?: string };
        return NextResponse.json(
            {
                success: false,
                error: appError.message || 'Failed to generate invoice.',
            },
            {
                status: appError.statusCode || 500,
            }
        );
    }
}

export async function POST(request: NextRequest): Promise<Response> {
    try {
        const supabase = createRequestSupabaseClient(request);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            throw createApiError(ErrorType.AUTHENTICATION, 'Authentication required.');
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, name, email, phone')
            .eq('id', user.id)
            .maybeSingle();

        const role = (profile as { role?: string } | null)?.role || null;
        const isFinanceUser = role === 'admin' || role === 'super_admin' || role === 'finance_manager';

        if (!isFinanceUser) {
            throw createApiError(ErrorType.AUTHORIZATION, 'Only admins can generate invoices with notifications.');
        }

        const body = await request.json();
        const { 
            paymentId, 
            orderId, 
            sendEmail: shouldSendEmail = true, 
            sendWhatsApp = true,
            customEmail,
            customPhone,
        } = body;

        if (!paymentId && !orderId) {
            throw createApiError(ErrorType.VALIDATION, 'paymentId or orderId is required.');
        }

        let payment = await getPaymentByOrderOrPaymentId({ orderId, paymentId });
        
        if (!payment?.id) {
            throw createApiError(ErrorType.NOT_FOUND, 'Payment not found.');
        }

        await syncFinancialRecordsForPaymentRecord(payment.id);
        
        const invoice = await getCourseInvoiceByReference({
            invoiceNumber: null,
            orderId: payment.razorpay_order_id || undefined,
            paymentId: payment.id,
        });

        if (!invoice) {
            throw createApiError(ErrorType.NOT_FOUND, 'Invoice not found after sync.');
        }

        let recipientEmail = customEmail || invoice.student_email;
        let recipientPhone = customPhone;

        if (!recipientEmail && payment.user_id) {
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('email, phone')
                .eq('id', payment.user_id)
                .maybeSingle();
            recipientEmail = recipientEmail || (userProfile as { email?: string })?.email || '';
            recipientPhone = recipientPhone || (userProfile as { phone?: string })?.phone;
        }

        recipientPhone = recipientPhone || (profile as { phone?: string })?.phone;

        const pdfBlob = await generateCourseInvoicePDF({
            invoiceNumber: invoice.invoice_number,
            invoiceDate: invoice.invoice_date,
            studentName: invoice.student_name,
            studentEmail: recipientEmail,
            courseTitle: invoice.course_title,
            courseId: invoice.course_id,
            taxableValue: invoice.taxable_value,
            gstRate: invoice.gst_rate,
            gstAmount: invoice.gst_amount,
            totalAmount: invoice.total_amount,
            currency: invoice.currency,
            transactionId: invoice.transaction_id,
            orderId: invoice.payment_reference,
        });

        const notifications = {
            email: { sent: false, messageId: null, error: null as string | null },
            whatsapp: { sent: false, messageId: null, error: null as string | null },
        };

        if (shouldSendEmail && recipientEmail) {
            try {
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4F46E5;">SaviEduTech Invoice</h2>
                        <p>Dear ${invoice.student_name},</p>
                        <p>Thank you for your purchase. Please find your invoice attached.</p>
                        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                            <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                            <p><strong>Course:</strong> ${invoice.course_title}</p>
                            <p><strong>Amount:</strong> ₹${invoice.total_amount}</p>
                            <p><strong>Date:</strong> ${invoice.invoice_date}</p>
                        </div>
                        <p>Best regards,<br>SaviEduTech Team</p>
                    </div>
                `;
                const emailResult = await sendEmail(
                    'custom',
                    {
                        to: recipientEmail,
                        subject: `Invoice ${invoice.invoice_number} - SaviEduTech`,
                        attachments: [{
                            filename: `invoice-${invoice.invoice_number}.pdf`,
                            content: Buffer.from(await pdfBlob.arrayBuffer()),
                        }],
                    },
                    { html: emailHtml }
                );

                if (emailResult.success) {
                    notifications.email.sent = true;
                    notifications.email.messageId = emailResult.messageId || undefined;
                } else {
                    notifications.email.error = emailResult.error || 'Failed to send email';
                }
            } catch (emailError) {
                notifications.email.error = emailError instanceof Error ? emailError.message : 'Email error';
            }
        }

        if (sendWhatsApp && recipientPhone) {
            const cleanPhone = recipientPhone.replace(/\D/g, '');
            const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
            
            const whatsappResult = await sendWhatsAppMessage({
                phone: formattedPhone,
                templateName: 'invoice_notification',
                parameters: {
                    invoice_number: invoice.invoice_number,
                    amount: `₹${invoice.total_amount}`,
                    course_name: invoice.course_title.substring(0, 30),
                },
            });

            if (whatsappResult.success) {
                notifications.whatsapp.sent = true;
                notifications.whatsapp.messageId = whatsappResult.messageId;
            } else {
                notifications.whatsapp.error = whatsappResult.error || 'Failed to send WhatsApp';
            }
        }

        await (supabase as any)
            .from('invoices')
            .upsert({
                invoice_number: invoice.invoice_number,
                payment_id: payment.id,
                user_id: payment.user_id,
                amount: invoice.total_amount,
                payment_type: 'course',
                generated_at: new Date().toISOString(),
                email_sent: notifications.email.sent,
                whatsapp_sent: notifications.whatsapp.sent,
            }, { onConflict: 'invoice_number' });

        return NextResponse.json({
            success: true,
            invoice: {
                invoiceNumber: invoice.invoice_number,
                amount: invoice.total_amount,
                courseTitle: invoice.course_title,
                generatedAt: invoice.invoice_date,
            },
            notifications,
            message: 'Invoice generated and notifications sent successfully',
        });
    } catch (error) {
        const appError = error as { statusCode?: number; message?: string };
        return NextResponse.json(
            {
                success: false,
                error: appError.message || 'Failed to generate invoice.',
            },
            {
                status: appError.statusCode || 500,
            }
        );
    }
}
