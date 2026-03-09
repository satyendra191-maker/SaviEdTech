import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { monitoredRoute } from '@/lib/api/route-utils';
import { createApiError, ErrorType } from '@/lib/error-handler';
import { solveAcademicDoubt } from '@/lib/ai/doubt-solver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function createRequestSupabaseClient(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw createApiError(ErrorType.SERVER, 'Supabase is not configured.');
    }

    return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
            get(name: string) {
                return request.cookies.get(name)?.value;
            },
            set() {},
            remove() {},
        },
    });
}

export async function POST(request: NextRequest): Promise<Response> {
    return monitoredRoute(
        request,
        async () => {
            const supabase = createRequestSupabaseClient(request);
            const { data: { user } } = await supabase.auth.getUser();

            const formData = await request.formData();
            const question = String(formData.get('question') || '').trim();
            const description = String(formData.get('description') || '').trim();
            const subject = String(formData.get('subject') || '').trim();
            const topic = String(formData.get('topic') || '').trim();
            const image = formData.get('image');
            const imageFile = image instanceof File && image.size > 0 ? image : null;

            if (!question && !description && !imageFile) {
                throw createApiError(ErrorType.VALIDATION, 'Add a question, description, or image before submitting.');
            }

            if (imageFile && imageFile.size > 2 * 1024 * 1024) {
                throw createApiError(ErrorType.VALIDATION, 'Image upload must be 2 MB or smaller.');
            }

            if (imageFile && imageFile.type && !imageFile.type.startsWith('image/')) {
                throw createApiError(ErrorType.VALIDATION, 'Only image uploads are supported for doubt solving.');
            }

            const solved = await solveAcademicDoubt({
                userId: user?.id,
                question,
                description,
                subject: subject || undefined,
                topic: topic || undefined,
                imageFile,
            });

            return NextResponse.json({
                success: true,
                data: solved,
            });
        },
        {
            routeLabel: '/api/ai/doubt-solver',
            defaultCacheControl: 'no-store',
        }
    );
}
