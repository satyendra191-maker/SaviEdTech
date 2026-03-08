import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/api/admin-auth';
import { monitoredRoute } from '@/lib/api/route-utils';
import { createApiError, ErrorType } from '@/lib/error-handler';
import {
    generateAcademicCalendar,
    generateDppPack,
    generateGrowthAssets,
    generateMockTestPack,
    type AutomationSuiteRequest,
} from '@/lib/ai/automation-suite';
import { validateGeneratedContent } from '@/lib/ai/content-quality-validator';

interface AdminSuiteRequestBody extends Partial<AutomationSuiteRequest> {
    action?: 'generate_dpp' | 'generate_mock_test' | 'academic_calendar' | 'growth_assets' | 'validate';
    content?: unknown;
    contentKind?: 'lecture' | 'question-set' | 'dpp' | 'mock-test';
}

export async function POST(request: NextRequest): Promise<Response> {
    return monitoredRoute(
        request,
        async () => {
            const admin = await requireAdminRequest(request);
            if (!admin) {
                throw createApiError(ErrorType.AUTHORIZATION, 'Admin access is required.');
            }

            const body = await request.json().catch(() => ({})) as AdminSuiteRequestBody;
            const action = body.action;

            if (!action) {
                throw createApiError(ErrorType.VALIDATION, 'Missing action.');
            }

            const baseRequest: AutomationSuiteRequest = {
                teacherId: body.teacherId || 'dharmendra',
                topic: body.topic || 'Motion in One Dimension',
                subject: body.subject || 'physics',
                targetExam: body.targetExam || 'jee-main',
                syllabusContext: body.syllabusContext,
                duration: body.duration,
                questionCount: body.questionCount,
                generationDays: body.generationDays,
            };

            switch (action) {
                case 'generate_dpp':
                    return NextResponse.json({
                        success: true,
                        data: await generateDppPack(baseRequest),
                    });
                case 'generate_mock_test':
                    return NextResponse.json({
                        success: true,
                        data: await generateMockTestPack(baseRequest),
                    });
                case 'academic_calendar':
                    return NextResponse.json({
                        success: true,
                        data: generateAcademicCalendar(baseRequest),
                    });
                case 'growth_assets':
                    return NextResponse.json({
                        success: true,
                        data: generateGrowthAssets(baseRequest),
                    });
                case 'validate':
                    return NextResponse.json({
                        success: true,
                        data: validateGeneratedContent(body.contentKind || 'question-set', body.content, {
                            topic: body.topic,
                            subject: body.subject,
                            targetExam: body.targetExam,
                        }),
                    });
                default:
                    throw createApiError(ErrorType.VALIDATION, `Unsupported action: ${action}`);
            }
        },
        {
            routeLabel: '/api/ai/admin-suite',
            defaultCacheControl: 'no-store',
        }
    );
}

