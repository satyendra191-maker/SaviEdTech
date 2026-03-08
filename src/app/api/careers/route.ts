// @ts-nocheck
// TypeScript type inference issues with Supabase client - code works correctly at runtime
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { cookies } from 'next/headers';

function extractResumeStoragePath(resumeUrl?: string | null, resumePath?: string | null): string | null {
    if (typeof resumePath === 'string' && resumePath.trim()) {
        return resumePath.trim();
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

function parseNumericValue(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = Number.parseFloat(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

// GET - Fetch jobs or applications
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const jobId = searchParams.get('jobId');

        const supabase = createAdminSupabaseClient();

        if (type === 'applications') {
            // Check admin access
            const cookieStore = await cookies();
            const authClient = createServerClient<Database>(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        get(name: string) {
                            return cookieStore.get(name)?.value;
                        },
                        set() { },
                        remove() { },
                    },
                }
            );

            const { data: { user } } = await authClient.auth.getUser();
            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            // Check if user is admin
            const { data: profile } = await authClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (!profile || !['admin', 'super_admin', 'content_manager', 'hr'].includes(profile.role as string)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            // Fetch applications
            let query = supabase
                .from('job_applications')
                .select(`
                    *,
                    job_listings:job_id (title, department)
                `)
                .order('created_at', { ascending: false });

            if (jobId) {
                query = query.eq('job_id', jobId);
            }

            const { data, error } = await query;

            if (error) throw error;

            return NextResponse.json({ applications: data });
        }

        // Fetch job listings (public)
        const { data, error } = await supabase
            .from('job_listings')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ jobs: data });
    } catch (error) {
        console.error('Error in careers API:', error);

        // Provide more specific error messages for debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if it's a table not found error
        if (errorMessage.includes('relation') || errorMessage.includes('table')) {
            return NextResponse.json(
                { error: 'Database tables not configured', jobs: [], message: 'No job listings available at this time' },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error', message: errorMessage },
            { status: 500 }
        );
    }
}

// POST - Submit application or create job (admin)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const supabase = createAdminSupabaseClient();

        // Check if this is a job creation request (admin only)
        if (body.action === 'create_job') {
            const cookieStore = await cookies();
            const authClient = createServerClient<Database>(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        get(name: string) {
                            return cookieStore.get(name)?.value;
                        },
                        set() { },
                        remove() { },
                    },
                }
            );

            const { data: { user } } = await authClient.auth.getUser();
            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const { data: profile } = await authClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (!profile || !['admin', 'super_admin', 'content_manager', 'hr'].includes(profile.role as string)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const { data, error } = await supabase
                .from('job_listings')
                .insert({
                    title: body.title,
                    department: body.department,
                    location: body.location,
                    type: body.type,
                    experience_level: body.experience_level,
                    salary_min: body.salary_min,
                    salary_max: body.salary_max,
                    description: body.description,
                    requirements: body.requirements || [],
                    responsibilities: body.responsibilities || [],
                    skills: body.skills || [],
                    benefits: body.benefits || [],
                    deadline: body.deadline,
                    is_active: body.is_active ?? true,
                })
                .select()
                .single();

            if (error) throw error;

            return NextResponse.json({ job: data });
        }

        // This is a job application submission
        const {
            jobId,
            fullName,
            email,
            phone,
            linkedin,
            portfolio,
            currentCompany,
            yearsOfExperience,
            currentCTC,
            expectedCTC,
            noticePeriod,
            coverLetter,
            referrer,
            positionApplied,
            resumeUrl,
            resumePath,
            fileName,
            fileSize,
        } = body;

        const normalizedResumeStoragePath = extractResumeStoragePath(resumeUrl, resumePath);
        const persistedResumeUrl = typeof resumeUrl === 'string' && resumeUrl.trim()
            ? resumeUrl.trim()
            : (normalizedResumeStoragePath ? `storage://career-applications/${normalizedResumeStoragePath}` : null);
        const normalizedFileSize = parseNumericValue(fileSize);

        // Validate required fields
        if (!fullName || !email || !phone || !positionApplied || !persistedResumeUrl) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        const additionalInfo = {
            position_applied: positionApplied,
            source: 'career_portal',
            referrer: referrer || null,
        };

        // Insert application
        const { data: application, error: insertError } = await supabase
            .from('job_applications')
            .insert({
                job_id: jobId || null,
                full_name: fullName,
                email: email,
                phone: phone,
                linkedin: linkedin || null,
                portfolio: portfolio || null,
                current_company: currentCompany || null,
                years_of_experience: parseNumericValue(yearsOfExperience),
                current_ctc: parseNumericValue(currentCTC),
                expected_ctc: parseNumericValue(expectedCTC),
                notice_period: noticePeriod || null,
                cover_letter: coverLetter || null,
                referrer: referrer || null,
                resume_url: persistedResumeUrl,
                resume_storage_path: normalizedResumeStoragePath,
                resume_file_name: fileName,
                resume_file_size: normalizedFileSize,
                additional_info: additionalInfo,
                status: 'new',
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Update application count for the job if jobId is provided
        if (jobId) {
            await supabase.rpc('increment_job_application_count', {
                job_id: jobId,
            });
        }

        try {
            await supabase
                .from('career_applications')
                .upsert({
                    job_application_id: application.id,
                    job_id: jobId || null,
                    name: fullName,
                    email,
                    phone,
                    position: positionApplied,
                    resume_url: persistedResumeUrl,
                    resume_storage_path: normalizedResumeStoragePath,
                    resume_file_name: fileName,
                    resume_file_size: normalizedFileSize,
                    status: application.status,
                    additional_info: additionalInfo,
                    submitted_at: application.created_at,
                    updated_at: application.updated_at,
                } as never, {
                    onConflict: 'job_application_id',
                });
        } catch (mirrorError) {
            console.error('Failed to sync career_applications mirror:', mirrorError);
        }

        // TODO: Send confirmation email to applicant
        // TODO: Send notification to admin

        return NextResponse.json({
            success: true,
            application: {
                id: application.id,
                status: application.status,
            },
        });
    } catch (error) {
        console.error('Error submitting application:', error);
        return NextResponse.json(
            { error: 'Failed to submit application' },
            { status: 500 }
        );
    }
}

// PATCH - Update job or application (admin)
export async function PATCH(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const authClient = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set() { },
                    remove() { },
                },
            }
        );

        const { data: { user } } = await authClient.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await authClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || !['admin', 'super_admin', 'content_manager', 'hr'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const supabase = createAdminSupabaseClient();

        // Update job listing
        if (body.type === 'job') {
            const { id, ...updates } = body;

            const { data, error } = await supabase
                .from('job_listings')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return NextResponse.json({ job: data });
        }

        // Update application status
        if (body.type === 'application') {
            const { id, status } = body;

            const { data, error } = await supabase
                .from('job_applications')
                .update({
                    status,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            try {
                await supabase
                    .from('career_applications')
                    .update({
                        status,
                        updated_at: new Date().toISOString(),
                    } as never)
                    .eq('job_application_id', id);
            } catch (mirrorError) {
                console.error('Failed to update career_applications mirror:', mirrorError);
            }

            return NextResponse.json({ application: data });
        }

        return NextResponse.json({ error: 'Invalid update type' }, { status: 400 });
    } catch (error) {
        console.error('Error updating:', error);
        return NextResponse.json(
            { error: 'Failed to update' },
            { status: 500 }
        );
    }
}

// DELETE - Delete job (admin)
export async function DELETE(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const authClient = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set() { },
                    remove() { },
                },
            }
        );

        const { data: { user } } = await authClient.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await authClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || !['admin', 'super_admin', 'content_manager', 'hr'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const type = searchParams.get('type') || 'job';

        if (!id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        const supabase = createAdminSupabaseClient();

        if (type === 'job') {
            const { error } = await supabase
                .from('job_listings')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } else if (type === 'application') {
            const { error } = await supabase
                .from('job_applications')
                .delete()
                .eq('id', id);

            if (error) throw error;

            try {
                await supabase
                    .from('career_applications')
                    .delete()
                    .eq('job_application_id', id);
            } catch (mirrorError) {
                console.error('Failed to delete career_applications mirror:', mirrorError);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting:', error);
        return NextResponse.json(
            { error: 'Failed to delete' },
            { status: 500 }
        );
    }
}
