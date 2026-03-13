import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function verifyCron(request: NextRequest): boolean {
    const auth = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;
    return !!secret && auth === `Bearer ${secret}`;
}

async function logCronJob(
    supabase: ReturnType<typeof createServerSupabaseClient>,
    jobName: string,
    status: 'running' | 'success' | 'failed',
    details: Record<string, unknown> = {},
    durationMs?: number
) {
    try {
        await (supabase as any).from('cron_job_logs').insert({
            job_name: jobName, status, details, duration_ms: durationMs ?? null,
            executed_at: new Date().toISOString(),
        });
    } catch { /* silently ignore */ }
}

export async function GET(request: NextRequest) {
    if (!verifyCron(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const startTime = Date.now();
    const jobId = `financial_${Date.now()}`;
    const supabase = createServerSupabaseClient();
    await logCronJob(supabase, 'financial-automation', 'running', { jobId });

    const results = {
        paymentsVerified: 0,
        invoicesGenerated: 0,
        donationReceiptsGenerated: 0,
        analyticsUpdated: 0,
        errors: [] as string[],
    };

    try {
        // Step 1: Verify pending course payments
        const { data: pendingPayments } = await (supabase as any)
            .from('payments')
            .select('id, amount, payment_type, razorpay_payment_id, created_at')
            .eq('status', 'pending')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(50);

        if (pendingPayments) {
            for (const payment of pendingPayments) {
                const isOld = Date.now() - new Date(payment.created_at).getTime() > 2 * 60 * 60 * 1000;
                if (isOld && !payment.razorpay_payment_id) {
                    await (supabase as any)
                        .from('payments')
                        .update({ status: 'failed', verified_at: new Date().toISOString() })
                        .eq('id', payment.id);
                }
                results.paymentsVerified++;
            }
        }

        // Step 2: Generate invoices for completed payments without invoices
        const { data: unInvoiced } = await (supabase as any)
            .from('payments')
            .select('id, user_id, amount, payment_type, created_at')
            .eq('status', 'completed')
            .is('invoice_number', null)
            .limit(50);

        if (unInvoiced) {
            for (const payment of unInvoiced) {
                const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                await (supabase as any)
                    .from('payments')
                    .update({
                        invoice_number: invoiceNumber,
                        invoice_generated_at: new Date().toISOString(),
                    })
                    .eq('id', payment.id);

                // Log invoice
                await (supabase as any).from('invoices').insert({
                    invoice_number: invoiceNumber,
                    payment_id: payment.id,
                    user_id: payment.user_id,
                    amount: payment.amount,
                    payment_type: payment.payment_type,
                    generated_at: new Date().toISOString(),
                });
                results.invoicesGenerated++;
            }
        }

        // Step 3: Generate donation receipts
        const { data: unReceipedDonations } = await (supabase as any)
            .from('payments')
            .select('id, user_id, amount, created_at')
            .eq('status', 'completed')
            .eq('payment_type', 'donation')
            .is('receipt_number', null)
            .limit(50);

        if (unReceipedDonations) {
            for (const donation of unReceipedDonations) {
                const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                await (supabase as any)
                    .from('payments')
                    .update({
                        receipt_number: receiptNumber,
                        receipt_generated_at: new Date().toISOString(),
                    })
                    .eq('id', donation.id);

                await (supabase as any).from('donation_receipts').insert({
                    receipt_number: receiptNumber,
                    payment_id: donation.id,
                    user_id: donation.user_id,
                    amount: donation.amount,
                    generated_at: new Date().toISOString(),
                });
                results.donationReceiptsGenerated++;
            }
        }

        // Step 4: Update financial analytics
        const today = new Date().toISOString().split('T')[0]!;

        const { data: todayRevenue } = await (supabase as any)
            .from('payments')
            .select('amount, payment_type')
            .eq('status', 'completed')
            .gte('created_at', `${today}T00:00:00.000Z`);

        const totalRevenue = todayRevenue?.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0) ?? 0;
        const donations = todayRevenue?.filter((p: { payment_type: string }) => p.payment_type === 'donation')
            .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0) ?? 0;
        const courseSales = todayRevenue?.filter((p: { payment_type: string }) => p.payment_type === 'course_purchase')
            .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0) ?? 0;

        await (supabase as any).from('financial_analytics').upsert({
            date: today,
            total_revenue: totalRevenue,
            donation_revenue: donations,
            course_revenue: courseSales,
            subscription_revenue: totalRevenue - donations - courseSales,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'date' });
        results.analyticsUpdated++;

        const duration = Date.now() - startTime;
        await logCronJob(supabase, 'financial-automation', 'success', results, duration);
        return NextResponse.json({ success: true, results, duration, jobId });
    } catch (error) {
        const duration = Date.now() - startTime;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(msg);
        await logCronJob(supabase, 'financial-automation', 'failed', { error: msg }, duration);
        return NextResponse.json({ success: false, error: msg, results, jobId }, { status: 500 });
    }
}
