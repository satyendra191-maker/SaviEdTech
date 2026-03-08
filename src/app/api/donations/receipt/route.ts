import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';
import { generateDonationReceiptPDF } from '@/lib/pdf/donation-receipt';
import { fetchOrder, fetchPayment } from '@/lib/payments/razorpay';
import { buildDonationReceiptNumber } from '@/lib/finance/documents';
import type { Database } from '@/types/supabase';

interface DonationRecord {
    id: string;
    amount: number;
    currency: string;
    status: string;
    donor_name: string | null;
    donor_email: string | null;
    donor_phone: string | null;
    order_id: string | null;
    payment_id: string | null;
    metadata: unknown;
    created_at: string;
    completed_at: string | null;
}

async function recoverDonationFromGateway(orderId: string | null, paymentId: string | null): Promise<DonationRecord | null> {
    if (!paymentId) {
        return null;
    }

    const paymentResult = await fetchPayment(paymentId);
    if (!paymentResult.success || !paymentResult.payment) {
        console.error('Donation receipt recovery failed to fetch payment:', paymentResult.error);
        return null;
    }

    const payment = paymentResult.payment;
    if (payment.status !== 'captured') {
        console.error('Donation receipt recovery found non-captured payment:', payment.status);
        return null;
    }

    if (orderId && payment.order_id !== orderId) {
        console.error('Donation receipt recovery order mismatch:', { expected: orderId, actual: payment.order_id });
        return null;
    }

    const resolvedOrderId = payment.order_id || orderId;
    const orderResult = resolvedOrderId ? await fetchOrder(resolvedOrderId) : { success: false as const, error: 'Missing order id' };
    const order = orderResult.success ? orderResult.order : undefined;
    if (resolvedOrderId && !orderResult.success) {
        console.error('Donation receipt recovery failed to fetch order:', orderResult.error);
    }

    const orderNotes = order?.notes || {};
    const orderDonorEmail = typeof orderNotes.donor_email === 'string' && orderNotes.donor_email
        ? orderNotes.donor_email
        : null;
    const orderDonorName = typeof orderNotes.donor_name === 'string' && orderNotes.donor_name
        ? orderNotes.donor_name
        : null;
    const orderDonorPhone = typeof orderNotes.donor_phone === 'string' && orderNotes.donor_phone
        ? orderNotes.donor_phone
        : null;

    const completedAt = new Date(payment.created_at * 1000).toISOString();
    const createdAt = order
        ? new Date(order.created_at * 1000).toISOString()
        : completedAt;
    const receiptNumber = buildDonationReceiptNumber(completedAt, resolvedOrderId || payment.id);
    const metadata = {
        receipt: order?.receipt || null,
        receipt_number: receiptNumber,
        receipt_generated_at: completedAt,
        transaction_id: payment.id,
        notes: orderNotes,
        recovered_from_gateway: true,
    };

    const recoveredDonation: DonationRecord = {
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency || 'INR',
        status: 'completed',
        donor_name: orderDonorName,
        donor_email: payment.email || orderDonorEmail,
        donor_phone: payment.contact || orderDonorPhone,
        order_id: resolvedOrderId,
        payment_id: payment.id,
        metadata,
        created_at: createdAt,
        completed_at: completedAt,
    };

    try {
        const supabase = createAdminSupabaseClient();
        const { data: existingDonation, error: existingDonationError } = await supabase
            .from('donations')
            .select('id, metadata')
            .eq('order_id', resolvedOrderId)
            .maybeSingle();

        if (existingDonationError) {
            console.error('Donation receipt recovery failed to look up donation:', existingDonationError);
        }

        const existingMetadata = ((existingDonation as { metadata?: unknown } | null)?.metadata || {}) as Record<string, unknown>;
        const donationPayload: Database['public']['Tables']['donations']['Insert'] = {
            gateway: 'razorpay' as const,
            amount: recoveredDonation.amount,
            currency: recoveredDonation.currency,
            status: 'completed' as const,
            order_id: recoveredDonation.order_id,
            payment_id: recoveredDonation.payment_id,
            transaction_id: recoveredDonation.payment_id || recoveredDonation.order_id,
            donor_name: recoveredDonation.donor_name,
            donor_email: recoveredDonation.donor_email,
            donor_phone: recoveredDonation.donor_phone,
            email: recoveredDonation.donor_email,
            receipt_number: receiptNumber,
            metadata: {
                ...existingMetadata,
                ...metadata,
            },
            gateway_response: payment as unknown as Database['public']['Tables']['donations']['Row']['gateway_response'],
            timestamp: recoveredDonation.completed_at || recoveredDonation.created_at,
            completed_at: recoveredDonation.completed_at,
        };

        const persistenceOp = (existingDonation as { id: string } | null)?.id
            ? supabase
                .from('donations')
                .update(donationPayload as never)
                .eq('id', (existingDonation as { id: string }).id)
            : supabase
                .from('donations')
                .insert(donationPayload as never);

        const { error: persistenceError } = await persistenceOp;
        if (persistenceError) {
            console.error('Donation receipt recovery failed to persist donation:', persistenceError);
        }
    } catch (error) {
        console.error('Donation receipt recovery persistence error:', error);
    }

    return recoveredDonation;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');
        const paymentId = searchParams.get('paymentId');

        if (!orderId && !paymentId) {
            return NextResponse.json(
                { success: false, error: 'orderId or paymentId is required' },
                { status: 400 }
            );
        }

        const supabase = createAdminSupabaseClient();
        let query = supabase
            .from('donations')
            .select('id, amount, currency, status, donor_name, donor_email, donor_phone, order_id, payment_id, metadata, created_at, completed_at')
            .eq('status', 'completed')
            .limit(1);

        if (orderId) {
            query = query.eq('order_id', orderId);
        }
        if (paymentId) {
            query = query.eq('payment_id', paymentId);
        }

        const { data, error } = await query.maybeSingle();

        let donation = data as DonationRecord | null;
        if (error || !donation) {
            donation = await recoverDonationFromGateway(orderId, paymentId);
        }

        if (!donation) {
            return NextResponse.json(
                { success: false, error: 'Donation record not found or not completed' },
                { status: 404 }
            );
        }

        const metadata = (donation.metadata || {}) as Record<string, unknown>;
        const receiptNumber = typeof metadata.receipt_number === 'string'
            ? metadata.receipt_number
            : buildDonationReceiptNumber(donation.completed_at || donation.created_at, donation.order_id || donation.id);

        const transactionId = donation.payment_id || donation.order_id || donation.id;
        const donationDate = donation.completed_at || donation.created_at;

        const pdfBlob = await generateDonationReceiptPDF({
            donorName: donation.donor_name || 'Anonymous Donor',
            donorEmail: donation.donor_email,
            donorPhone: donation.donor_phone,
            transactionId,
            amount: donation.amount,
            currency: donation.currency || 'INR',
            receiptNumber,
            donationDate,
        });

        const arrayBuffer = await pdfBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', `attachment; filename="donation-receipt-${receiptNumber}.pdf"`);
        headers.set('Content-Length', String(buffer.length));
        headers.set('Cache-Control', 'no-store');

        return new NextResponse(buffer, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('Donation receipt generation error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate donation receipt' },
            { status: 500 }
        );
    }
}
