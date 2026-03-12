import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

const MAX_RESUME_SIZE = 1 * 1024 * 1024;

function sanitizeFileName(fileName: string): string {
    return fileName
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function resolveResumePath(resumeUrl?: string | null, resumeStoragePath?: string | null): string | null {
    if (typeof resumeStoragePath === 'string' && resumeStoragePath.trim()) {
        return resumeStoragePath.trim();
    }

    if (typeof resumeUrl !== 'string' || !resumeUrl.trim()) {
        return null;
    }

    const trimmed = resumeUrl.trim();
    const storagePrefix = 'storage://career-applications/';
    if (trimmed.startsWith(storagePrefix)) {
        return trimmed.slice(storagePrefix.length);
    }

    const marker = '/career-applications/';
    const markerIndex = trimmed.indexOf(marker);
    if (markerIndex >= 0) {
        return trimmed.slice(markerIndex + marker.length);
    }

    return null;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const resume = formData.get('resume');

        if (!(resume instanceof File)) {
            return NextResponse.json({ success: false, error: 'Resume file is required' }, { status: 400 });
        }

        const fileName = sanitizeFileName(resume.name || 'resume.pdf');
        const isPdf = resume.type === 'application/pdf' || fileName.endsWith('.pdf');

        if (!isPdf) {
            return NextResponse.json({ success: false, error: 'Resume must be a PDF file' }, { status: 400 });
        }

        if (resume.size > MAX_RESUME_SIZE) {
            return NextResponse.json({ success: false, error: 'Resume file size must be 1MB or less' }, { status: 400 });
        }

        const admin = createAdminSupabaseClient();
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const randomSuffix = Math.random().toString(36).slice(2, 10);
        const objectPath = `resumes/${now.getFullYear()}/${month}/${Date.now()}-${randomSuffix}.pdf`;
        const buffer = Buffer.from(await resume.arrayBuffer());

        const { error: uploadError } = await admin.storage
            .from('career-applications')
            .upload(objectPath, buffer, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error('Resume upload error:', uploadError);
            return NextResponse.json(
                { success: false, error: uploadError.message || 'Failed to upload resume' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            resumePath: objectPath,
            resumeUrl: `storage://career-applications/${objectPath}`,
            fileName: fileName || 'resume.pdf',
            fileSize: resume.size,
        });
    } catch (error) {
        console.error('Resume upload API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to upload resume' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const applicationId = request.nextUrl.searchParams.get('applicationId');

        if (!applicationId) {
            return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const authClient = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set() {},
                    remove() {},
                },
            }
        );

        const { data: { user } } = await authClient.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile, error: profileError } = await authClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const typedProfile = profile as { role?: string } | null;

        if (profileError || !typedProfile || !['admin', 'content_manager', 'hr'].includes(typedProfile.role || '')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const admin = createAdminSupabaseClient();
        const { data: application, error: applicationError } = await admin
            .from('job_applications')
            .select('id, resume_url, resume_storage_path, resume_file_name')
            .eq('id', applicationId)
            .single();

        const typedApplication = application as {
            id: string;
            resume_url?: string | null;
            resume_storage_path?: string | null;
            resume_file_name?: string | null;
        } | null;

        if (applicationError || !typedApplication) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 });
        }

        const resumePath = resolveResumePath(typedApplication.resume_url, typedApplication.resume_storage_path);
        const downloadName = typedApplication.resume_file_name || 'resume.pdf';

        if (resumePath) {
            const { data: signedUrl, error: signedUrlError } = await admin.storage
                .from('career-applications')
                .createSignedUrl(resumePath, 120, {
                    download: downloadName,
                });

            if (signedUrlError || !signedUrl?.signedUrl) {
                return NextResponse.json(
                    { error: signedUrlError?.message || 'Failed to generate resume download link' },
                    { status: 500 }
                );
            }

            return NextResponse.redirect(signedUrl.signedUrl);
        }

        if (typeof typedApplication.resume_url === 'string' && /^https?:\/\//i.test(typedApplication.resume_url)) {
            return NextResponse.redirect(typedApplication.resume_url);
        }

        return NextResponse.json({ error: 'Resume file path is missing' }, { status: 404 });
    } catch (error) {
        console.error('Resume download error:', error);
        return NextResponse.json({ error: 'Failed to download resume' }, { status: 500 });
    }
}
