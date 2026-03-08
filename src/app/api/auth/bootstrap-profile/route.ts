import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type ProfileRole = Database['public']['Tables']['profiles']['Row']['role'];

const ALLOWED_ROLES: ProfileRole[] = [
    'student',
    'admin',
    'content_manager',
    'super_admin',
    'parent',
    'hr',
    'finance_manager',
];

function normalizeRole(value: unknown): ProfileRole {
    if (value === 'faculty') return 'content_manager';
    if (typeof value === 'string' && ALLOWED_ROLES.includes(value as ProfileRole)) {
        return value as ProfileRole;
    }
    return 'student';
}

export async function POST() {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name: string, value: string, options: Record<string, unknown>) {
                        cookieStore.set({ name, value, ...options });
                    },
                    remove(name: string, options: Record<string, unknown>) {
                        cookieStore.set({ name, value: '', ...options });
                    },
                },
            }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const admin = createAdminSupabaseClient();

        const { data: existingProfile } = await admin
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (existingProfile) {
            return NextResponse.json({ success: true, created: false });
        }

        const meta = (user.user_metadata || {}) as Record<string, unknown>;
        const role = normalizeRole(meta.role);

        const { error: insertError } = await (admin.from('profiles') as any).insert({
            id: user.id,
            email: user.email || '',
            full_name: typeof meta.full_name === 'string' ? meta.full_name : null,
            phone: typeof meta.phone === 'string' ? meta.phone : null,
            role,
            exam_target: typeof meta.exam_target === 'string' ? meta.exam_target : null,
            class_level: typeof meta.class_level === 'string' ? meta.class_level : null,
            city: typeof meta.city === 'string' ? meta.city : null,
            is_active: true,
        });

        if (insertError) {
            console.error('Profile bootstrap insert error:', insertError);
            return NextResponse.json(
                { success: false, error: 'Failed to create profile' },
                { status: 500 }
            );
        }

        if (role === 'student') {
            const { error: studentProfileError } = await (admin.from('student_profiles') as any).upsert({
                id: user.id,
                subscription_status: 'free',
                total_points: 0,
                study_streak: 0,
                longest_streak: 0,
                total_study_minutes: 0,
            });

            if (studentProfileError) {
                console.warn('Student profile bootstrap warning:', studentProfileError.message);
            }
        }

        return NextResponse.json({ success: true, created: true });
    } catch (error) {
        console.error('Bootstrap profile API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
