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
