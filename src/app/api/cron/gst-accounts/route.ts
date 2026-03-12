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
    const requestId = `gst_accounts_automation_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient() as any;
        
        const results = {
            gstReportsGenerated: 0,
            invoicesProcessed: 0,
            paymentsReconciled: 0,
            ledgersUpdated: 0,
            errors: [] as string[],
        };

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const { data: monthlyTransactions } = await supabase
            .from('financial_transactions')
            .select('id, amount, transaction_type, gst_amount, gst_rate, created_at, payment_status')
            .gte('created_at', `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}-01`)
            .eq('payment_status', 'captured');

        if (monthlyTransactions) {
            const totalRevenue = monthlyTransactions
                .filter(t => t.transaction_type === 'course_purchase')
                .reduce((sum, t) => sum + Number(t.amount), 0);
            
            const totalGst = monthlyTransactions
                .filter(t => t.transaction_type === 'course_purchase')
                .reduce((sum, t) => sum + Number(t.gst_amount || 0), 0);

            const totalDonations = monthlyTransactions
                .filter(t => t.transaction_type === 'donation')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const { data: gstReport, error: gstError } = await supabase
                .from('gst_reports')
                .insert({
                    report_type: 'monthly_gst_sales',
                    report_month: `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}`,
                    total_taxable_value: totalRevenue - totalGst,
                    total_gst_amount: totalGst,
                    total_invoice_value: totalRevenue,
                    file_format: 'json',
                })
                .select()
                .single();

            if (!gstError && gstReport) {
                results.gstReportsGenerated++;
            }
        }

        const { data: pendingInvoices } = await supabase
            .from('invoices')
            .select('id, invoice_number, amount, gst_amount, status, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(50);

        if (pendingInvoices) {
            for (const invoice of pendingInvoices) {
                const daysPending = Math.floor(
                    (Date.now() - new Date(invoice.created_at).getTime()) / (1000 * 60 * 60 * 24)
                );

                let newStatus = invoice.status;
                if (daysPending > 30) {
                    newStatus = 'overdue';
                } else if (daysPending > 7) {
                    newStatus = 'due_soon';
                }

                if (newStatus !== invoice.status) {
                    const { error } = await supabase
                        .from('invoices')
                        .update({ status: newStatus })
                        .eq('id', invoice.id);

                    if (!error) {
                        results.invoicesProcessed++;
                    }
                }
            }
        }

        const { data: pendingPayments } = await supabase
            .from('payments')
            .select('id, amount, payment_status, razorpay_payment_id, created_at')
            .eq('payment_status', 'pending')
            .limit(20);

        if (pendingPayments) {
            for (const payment of pendingPayments) {
                const hoursPending = Math.floor(
                    (Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60)
                );

                if (hoursPending > 24) {
                    const { error } = await supabase
                        .from('payments')
                        .update({ payment_status: 'failed', failure_reason: 'Timeout' })
                        .eq('id', payment.id);

                    if (!error) {
                        results.paymentsReconciled++;
                    }
                }
            }
        }

        const { data: recentTransactions } = await supabase
            .from('financial_transactions')
            .select('id, ledger_account_code, amount, transaction_type, created_at')
            .order('created_at', { ascending: false })
            .limit(100);

        if (recentTransactions) {
            const ledgerMap = new Map<string, number>();
            
            for (const tx of recentTransactions) {
                const code = tx.ledger_account_code || 'default';
                const current = ledgerMap.get(code) || 0;
                ledgerMap.set(code, current + Number(tx.amount));
            }

            for (const [code, total] of ledgerMap) {
                const { error: ledgerError } = await supabase
                    .from('ledger_entries')
                    .insert({
                        ledger_account_code: code,
                        total_amount: total,
                        entry_date: new Date().toISOString().split('T')[0],
                        entry_type: 'auto_reconciliation',
                    });

                if (!ledgerError) {
                    results.ledgersUpdated++;
                }
            }
        }

        const { data: accountsSummary } = await supabase
            .from('accounts_summary')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (accountsSummary && accountsSummary.length > 0) {
            const lastSummary = accountsSummary[0];
            const lastSummaryDate = new Date(lastSummary.created_at);
            const daysSinceLastSummary = Math.floor(
                (Date.now() - lastSummaryDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysSinceLastSummary >= 1) {
                const { data: newSummary } = await supabase
                    .from('accounts_summary')
                    .insert({
                        total_revenue: lastSummary.total_revenue || 0,
                        total_expenses: lastSummary.total_expenses || 0,
                        net_profit: lastSummary.net_profit || 0,
                        summary_date: new Date().toISOString().split('T')[0],
                    })
                    .select()
                    .single();

                if (newSummary) {
                    results.ledgersUpdated++;
                }
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[GST & Accounts Automation] Completed in ${duration}ms - GST Reports: ${results.gstReportsGenerated}, Invoices: ${results.invoicesProcessed}`);

        return NextResponse.json({
            success: true,
            message: 'GST & accounts automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[GST & Accounts Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
