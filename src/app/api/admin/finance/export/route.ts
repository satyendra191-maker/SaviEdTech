import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import * as XLSX from 'xlsx';
import { requireFinanceRequest } from '@/lib/api/admin-auth';
import { monitoredRoute } from '@/lib/api/route-utils';
import { clampInteger } from '@/lib/api/route-utils';
import { createApiError, ErrorType } from '@/lib/error-handler';
import {
    buildFinanceReportDataset,
    generateFinanceReportPdf,
    recordFinanceAuditAction,
    recordGstReportSnapshot,
    type FinanceReportType,
} from '@/lib/finance/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REPORT_TYPES: FinanceReportType[] = [
    'monthly-gst-sales',
    'course-sales',
    'donation-transactions',
    'revenue-summary',
    'transaction-ledger',
    'gstr1',
    'gstr3b',
];

const EXPORT_FORMATS = ['pdf', 'csv', 'xlsx'] as const;

function assertReportType(value: string | null): FinanceReportType {
    const reportType = (value || 'monthly-gst-sales') as FinanceReportType;
    if (!REPORT_TYPES.includes(reportType)) {
        throw createApiError(ErrorType.VALIDATION, 'Unsupported finance report type.');
    }

    return reportType;
}

function assertExportFormat(value: string | null): typeof EXPORT_FORMATS[number] {
    const format = (value || 'pdf') as typeof EXPORT_FORMATS[number];
    if (!EXPORT_FORMATS.includes(format)) {
        throw createApiError(ErrorType.VALIDATION, 'Unsupported finance export format.');
    }

    return format;
}

function buildCsv(rows: Array<Record<string, string | number>>): string {
    if (rows.length === 0) {
        return 'No data\n';
    }

    const headers = Object.keys(rows[0] || {});
    const lines = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => {
            const value = row[header];
            const stringValue = value === null || value === undefined ? '' : String(value);
            const escaped = stringValue.replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',')),
    ];

    return lines.join('\n');
}

export async function GET(request: NextRequest): Promise<Response> {
    return monitoredRoute(
        request,
        async () => {
            const financeUser = await requireFinanceRequest(request);
            if (!financeUser) {
                throw createApiError(ErrorType.AUTHORIZATION, 'Finance access is required.');
            }

            const reportType = assertReportType(request.nextUrl.searchParams.get('report'));
            const format = assertExportFormat(request.nextUrl.searchParams.get('format'));
            const month = request.nextUrl.searchParams.get('month');
            const rowsLimit = clampInteger(request.nextUrl.searchParams.get('limit'), 5000, 1, 20000);

            if (format === 'pdf') {
                const { dataset, pdf } = await generateFinanceReportPdf(reportType, month, financeUser.userId);
                await recordGstReportSnapshot(dataset, financeUser.userId, 'pdf');
                await recordFinanceAuditAction({
                    actorUserId: financeUser.userId,
                    actorRole: financeUser.role,
                    actionType: 'finance_export_generated',
                    referenceType: 'finance_report',
                    referenceId: reportType,
                    message: `Generated ${reportType} PDF export.`,
                    metadata: {
                        format,
                        month,
                    },
                });

                const arrayBuffer = await pdf.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                return new NextResponse(buffer, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="${dataset.fileBaseName}.pdf"`,
                        'Cache-Control': 'no-store',
                    },
                });
            }

            const dataset = await buildFinanceReportDataset(reportType, month);
            const trimmedRows = dataset.csvRows.slice(0, rowsLimit);

            if (format === 'csv') {
                await recordGstReportSnapshot(dataset, financeUser.userId, 'csv');
                await recordFinanceAuditAction({
                    actorUserId: financeUser.userId,
                    actorRole: financeUser.role,
                    actionType: 'finance_export_generated',
                    referenceType: 'finance_report',
                    referenceId: reportType,
                    message: `Generated ${reportType} CSV export.`,
                    metadata: {
                        format,
                        month,
                    },
                });
                const csv = buildCsv(trimmedRows);

                return new NextResponse(csv, {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/csv; charset=utf-8',
                        'Content-Disposition': `attachment; filename="${dataset.fileBaseName}.csv"`,
                        'Cache-Control': 'no-store',
                    },
                });
            }

            await recordGstReportSnapshot(dataset, financeUser.userId, 'xlsx');
            await recordFinanceAuditAction({
                actorUserId: financeUser.userId,
                actorRole: financeUser.role,
                actionType: 'finance_export_generated',
                referenceType: 'finance_report',
                referenceId: reportType,
                message: `Generated ${reportType} XLSX export.`,
                metadata: {
                    format,
                    month,
                },
            });
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(trimmedRows);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
            const workbookBuffer = XLSX.write(workbook, {
                bookType: 'xlsx',
                type: 'buffer',
            }) as Buffer;

            return new NextResponse(new Uint8Array(workbookBuffer), {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${dataset.fileBaseName}.xlsx"`,
                    'Cache-Control': 'no-store',
                },
            });
        },
        {
            routeLabel: '/api/admin/finance/export',
            defaultCacheControl: 'no-store',
        }
    );
}
