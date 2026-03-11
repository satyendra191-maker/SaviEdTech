import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyCronSecret(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    return token === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
    const requestId = `refund_automation_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient();
        
        const results = {
            refundRequestsProcessed: 0,
            autoRefundsInitiated: 0,
            refundAmount: 0,
            errors: [] as string[],
        };

        const { data: pendingRefunds } = await supabase
            .from('refund_requests')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(20);

        if (pendingRefunds) {
            for (const refund of pendingRefunds) {
                const daysSinceRequest = Math.floor(
                    (Date.now() - new Date(refund.created_at).getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysSinceRequest >= 3) {
                    const { data: enrollment } = await supabase
                        .from('enrollments')
                        .select('id, course_id')
                        .eq('id', refund.enrollment_id)
                        .single();

                    if (enrollment) {
                        await supabase
                            .from('refund_requests')
                            .update({ 
                                status: 'approved',
                                processed_at: new Date().toISOString()
                            })
                            .eq('id', refund.id);

                        await supabase
                            .from('enrollments')
                            .update({ status: 'refunded' })
                            .eq('id', enrollment.id);

                        await supabase
                            .from('financial_transactions')
                            .insert({
                                user_id: refund.user_id,
                                amount: -refund.amount,
                                transaction_type: 'refund',
                                payment_status: 'refunded',
                            });

                        results.refundRequestsProcessed++;
                        results.autoRefundsInitiated++;
                        results.refundAmount += refund.amount;
                    }
                }
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Refund Automation] Completed in ${duration}ms - Processed: ${results.refundRequestsProcessed}`);

        return NextResponse.json({
            success: true,
            message: 'Refund automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Refund Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
