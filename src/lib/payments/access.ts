// @ts-nocheck
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type PaymentType = 'donation' | 'course_purchase' | 'subscription';

export interface PaymentMetadata {
    type: PaymentType;
    courseId?: string | null;
    courseTitle?: string | null;
    planId?: string | null;
    durationDays?: number | null;
    accessHref?: string | null;
    description?: string | null;
    donorMessage?: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

export function parsePaymentMetadata(value: unknown): PaymentMetadata {
    const record = asRecord(value);
    const type = record.type === 'course_purchase' || record.type === 'subscription'
        ? record.type
        : 'donation';

    return {
        type,
        courseId: typeof record.courseId === 'string' && record.courseId ? record.courseId : null,
        courseTitle: typeof record.courseTitle === 'string' && record.courseTitle ? record.courseTitle : null,
        planId: typeof record.planId === 'string' && record.planId ? record.planId : null,
        durationDays: typeof record.durationDays === 'number' && Number.isFinite(record.durationDays)
            ? Math.max(1, Math.round(record.durationDays))
            : null,
        accessHref: typeof record.accessHref === 'string' && record.accessHref ? record.accessHref : null,
        description: typeof record.description === 'string' && record.description ? record.description : null,
        donorMessage: typeof record.donorMessage === 'string' && record.donorMessage ? record.donorMessage : null,
    };
}

export async function grantCourseAccess(
    supabase: SupabaseClient<Database>,
    userId: string,
    courseId: string,
    paymentId?: string | null
) {
    const now = new Date().toISOString();
    const { error } = await supabase
        .from('course_enrollments')
        .upsert({
            user_id: userId,
            course_id: courseId,
            payment_id: paymentId ?? null,
            status: 'active',
            enrolled_at: now,
            last_accessed_at: now,
            updated_at: now,
        }, {
            onConflict: 'user_id,course_id',
        });

    if (error) {
        throw error;
    }
}

export async function grantPremiumSubscription(
    supabase: SupabaseClient<Database>,
    userId: string,
    durationDays = 30
) {
    const now = new Date();
    const { data: existingProfile, error: profileError } = await supabase
        .from('student_profiles')
        .select('subscription_expires_at')
        .eq('id', userId)
        .maybeSingle();

    if (profileError) {
        throw profileError;
    }

    const currentExpiry = existingProfile?.subscription_expires_at
        ? new Date(existingProfile.subscription_expires_at)
        : null;
    const effectiveStart = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const nextExpiry = new Date(effectiveStart);
    nextExpiry.setDate(nextExpiry.getDate() + durationDays);

    const { error: updateError } = await supabase
        .from('student_profiles')
        .upsert({
            id: userId,
            subscription_status: 'premium',
            subscription_expires_at: nextExpiry.toISOString(),
            updated_at: new Date().toISOString(),
        });

    if (updateError) {
        throw updateError;
    }

    return nextExpiry.toISOString();
}
