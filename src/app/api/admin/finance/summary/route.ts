import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceRequest } from '@/lib/api/admin-auth';
import { monitoredRoute } from '@/lib/api/route-utils';
import { createApiError, ErrorType } from '@/lib/error-handler';
import { getFinanceDashboardSummary } from '@/lib/finance/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
    return monitoredRoute(
        request,
        async () => {
            const financeUser = await requireFinanceRequest(request);
            if (!financeUser) {
                throw createApiError(ErrorType.AUTHORIZATION, 'Finance access is required.');
            }

            const data = await getFinanceDashboardSummary();

            return NextResponse.json(
                {
                    success: true,
                    data,
                },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'no-store',
                    },
                }
            );
        },
        {
            routeLabel: '/api/admin/finance/summary',
            defaultCacheControl: 'no-store',
        }
    );
}
