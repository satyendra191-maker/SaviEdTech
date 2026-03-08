/**
 * Database Schema Validation API
 * Part of Feature 21: Database Validation System
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/api/admin-auth';
import { clampInteger, monitoredRoute } from '@/lib/api/route-utils';
import { RECOMMENDED_INDEXES, validateDatabaseSchema } from '@/lib/database/schema-validator';
import { createApiError, ErrorType, errorResponse } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
    return monitoredRoute(request, async () => {
        const adminContext = await requireAdminRequest(request);
        if (!adminContext) {
            return errorResponse(
                createApiError(ErrorType.AUTHORIZATION, 'Admin access required.', { statusCode: 403 }),
                { path: '/api/admin/database-validate', method: request.method }
            );
        }

        const { searchParams } = new URL(request.url);
        const forceRefresh = searchParams.get('refresh') === 'true';
        const maxDetails = clampInteger(searchParams.get('limit'), 50, 5, 200);
        const result = await validateDatabaseSchema({ forceRefresh });

        return NextResponse.json(
            {
                success: result.valid,
                timestamp: result.timestamp,
                summary: result.summary,
                tables: {
                    total: result.tables.length,
                    valid: result.tables.filter((table) => table.exists && table.kindMatches && table.missingColumns.length === 0 && table.typeMismatches.length === 0).length,
                    invalid: result.tables.filter((table) => !table.exists || !table.kindMatches || table.missingColumns.length > 0 || table.typeMismatches.length > 0).length,
                    details: result.tables.slice(0, maxDetails),
                },
                foreignKeys: {
                    total: result.foreignKeys.length,
                    valid: result.foreignKeys.filter((foreignKey) => foreignKey.exists).length,
                    missing: result.foreignKeys.filter((foreignKey) => !foreignKey.exists).length,
                    details: result.foreignKeys.slice(0, maxDetails),
                },
                indexes: {
                    recommended: RECOMMENDED_INDEXES.length,
                    existing: result.indexes.filter((index) => index.exists).length,
                    missing: result.indexes.filter((index) => !index.exists).length,
                    details: result.indexes.slice(0, maxDetails),
                },
            },
            {
                headers: {
                    'Cache-Control': forceRefresh ? 'no-store' : 'private, max-age=60, stale-while-revalidate=120',
                },
            }
        );
    }, {
        routeLabel: '/api/admin/database-validate',
        defaultCacheControl: 'private, max-age=60, stale-while-revalidate=120',
        metadata: { feature: 'database-validation' },
    });
}
