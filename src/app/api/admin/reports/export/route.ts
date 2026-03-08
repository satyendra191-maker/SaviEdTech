import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import { format } from 'date-fns';
import { requireAdminRequest } from '@/lib/api/admin-auth';
import { monitoredRoute } from '@/lib/api/route-utils';
import { createApiError, ErrorType } from '@/lib/error-handler';
import { createAdminSupabaseClient } from '@/lib/supabase';
import { generateAdminReportPDF } from '@/lib/pdf/admin-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ReportType = 'analytics' | 'payments';

async function buildAnalyticsReport(adminId: string) {
    const supabase = createAdminSupabaseClient();
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const last30DaysIso = last30Days.toISOString();

    const [
        totalStudents,
        tests,
        questions,
        payments,
        topPerformers,
    ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('test_attempts').select('submitted_at, total_score').gte('submitted_at', last30DaysIso).not('submitted_at', 'is', null),
        supabase.from('question_attempts').select('occurred_at').gte('occurred_at', last30DaysIso),
        supabase.from('payments').select('amount, created_at, status').gte('created_at', last30DaysIso),
        supabase
            .from('student_progress')
            .select('accuracy_percent, tests_taken, profiles:user_id(full_name)')
            .order('accuracy_percent', { ascending: false })
            .limit(5),
    ]);

    const completedRevenue = (payments.data || [])
        .filter((payment) => (payment as { status?: string }).status === 'completed')
        .reduce((total, payment) => total + ((payment as { amount?: number | null }).amount || 0), 0);

    const trendMap = new Map<string, number>();
    (tests.data || []).forEach((row) => {
        const key = String((row as { submitted_at?: string | null }).submitted_at || '').slice(5, 10);
        if (!key) return;
        trendMap.set(key, (trendMap.get(key) || 0) + 1);
    });

    return {
        title: 'Student Analytics Report',
        subtitle: 'User analytics, assessment throughput, and revenue summary.',
        generatedBy: adminId,
        metrics: [
            { label: 'Students', value: String(totalStudents.count || 0) },
            { label: 'Tests Attempted', value: String((tests.data || []).length) },
            { label: 'Questions Attempted', value: String((questions.data || []).length) },
            { label: 'Revenue', value: `Rs ${completedRevenue.toLocaleString('en-IN')}` },
        ],
        charts: [
            {
                title: 'Daily Test Activity',
                points: [...trendMap.entries()].slice(-8).map(([label, value]) => ({ label, value })),
            },
        ],
        tables: [
            {
                title: 'Top Performers',
                columns: ['Student', 'Accuracy', 'Tests'],
                rows: ((topPerformers.data as Array<Record<string, unknown>> | null) || []).map((row) => [
                    String((row.profiles as { full_name?: string | null } | null)?.full_name || 'Student'),
                    `${Math.round(Number(row.accuracy_percent || 0))}%`,
                    String(row.tests_taken || 0),
                ]),
            },
        ],
    };
}

async function buildPaymentsReport(adminId: string) {
    const supabase = createAdminSupabaseClient();
    const { data: payments } = await supabase
        .from('payments')
        .select('payment_type, amount, status, created_at, transaction_id, razorpay_order_id')
        .order('created_at', { ascending: false })
        .limit(20);

    const paymentRows = (payments || []) as Array<{
        payment_type: string;
        amount: number | null;
        status: string;
        created_at: string;
        transaction_id: string | null;
        razorpay_order_id: string | null;
    }>;

    const revenue = paymentRows
        .filter((payment) => payment.status === 'completed')
        .reduce((total, payment) => total + (payment.amount || 0), 0);

    return {
        title: 'Payment Operations Report',
        subtitle: 'Razorpay payment overview for donations, courses, and subscriptions.',
        generatedBy: adminId,
        metrics: [
            { label: 'Recent Payments', value: String(paymentRows.length) },
            { label: 'Completed Revenue', value: `Rs ${revenue.toLocaleString('en-IN')}` },
            { label: 'Failed Payments', value: String(paymentRows.filter((payment) => payment.status === 'failed').length) },
            { label: 'Pending Payments', value: String(paymentRows.filter((payment) => payment.status === 'pending').length) },
        ],
        tables: [
            {
                title: 'Latest Transactions',
                columns: ['Type', 'Amount', 'Status', 'Reference'],
                rows: paymentRows.map((payment) => [
                    payment.payment_type.replace('_', ' '),
                    `Rs ${(payment.amount || 0).toLocaleString('en-IN')}`,
                    payment.status,
                    payment.transaction_id || payment.razorpay_order_id || '-',
                ]),
            },
        ],
        charts: [
            {
                title: 'Recent Revenue Trend',
                points: paymentRows
                    .slice(0, 8)
                    .reverse()
                    .map((payment) => ({
                        label: format(new Date(payment.created_at), 'dd MMM'),
                        value: payment.status === 'completed' ? payment.amount || 0 : 0,
                    })),
            },
        ],
    };
}

export async function GET(request: NextRequest): Promise<Response> {
    return monitoredRoute(
        request,
        async () => {
            const admin = await requireAdminRequest(request);
            if (!admin) {
                throw createApiError(ErrorType.AUTHORIZATION, 'Admin access is required.');
            }

            const reportType = (request.nextUrl.searchParams.get('type') || 'analytics') as ReportType;
            const payload = reportType === 'payments'
                ? await buildPaymentsReport(admin.userId)
                : await buildAnalyticsReport(admin.userId);

            const pdfBlob = await generateAdminReportPDF(payload);
            const arrayBuffer = await pdfBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            return new NextResponse(buffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf"`,
                    'Cache-Control': 'no-store',
                },
            });
        },
        {
            routeLabel: '/api/admin/reports/export',
            defaultCacheControl: 'no-store',
        }
    );
}
