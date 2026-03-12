// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyCronSecret(request: NextRequest): Promise<boolean> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');
    return token === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
    const requestId = `course_expiry_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient() as any;
        
        const results = {
            expiryNotifications: 0,
            renewalsProcessed: 0,
            expiredCourses: 0,
            gracePeriods: 0,
            errors: [] as string[],
        };

        const { data: expiringEnrollments } = await supabase
            .from('enrollments')
            .select('id, student_id, course_id, expires_at, status')
            .eq('status', 'active')
            .order('expires_at', { ascending: true })
            .limit(50);

        if (expiringEnrollments) {
            const now = new Date();
            
            for (const enrollment of expiringEnrollments) {
                const expiryDate = new Date(enrollment.expires_at);
                const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: enrollment.student_id,
                            title: 'Course Expiring Soon!',
                            message: `Your course access expires in ${daysUntilExpiry} days. Renew now to continue learning!`,
                            type: 'expiry_reminder',
                        });
                    
                    results.expiryNotifications++;
                }

                if (daysUntilExpiry <= 0) {
                    await supabase
                        .from('enrollments')
                        .update({ 
                            status: 'expired',
                            expired_at: new Date().toISOString()
                        })
                        .eq('id', enrollment.id);
                    
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: enrollment.student_id,
                            title: 'Course Expired',
                            message: 'Your course access has expired. Please renew to continue learning.',
                            type: 'course_expired',
                        });

                    results.expiredCourses++;
                }

                if (daysUntilExpiry === 3) {
                    await supabase
                        .from('enrollments')
                        .update({ 
                            grace_period_active: true,
                            grace_period_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                        })
                        .eq('id', enrollment.id);
                    
                    results.gracePeriods++;
                }
            }
        }

        const { data: graceExpiring } = await supabase
            .from('enrollments')
            .select('id, student_id')
            .eq('grace_period_active', true)
            .lt('grace_period_expires', new Date().toISOString());

        if (graceExpiring) {
            for (const enrollment of graceExpiring) {
                await supabase
                    .from('enrollments')
                    .update({ 
                        status: 'expired',
                        grace_period_active: false
                    })
                    .eq('id', enrollment.id);
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Course Expiry Automation] Completed in ${duration}ms - Expired: ${results.expiredCourses}`);

        return NextResponse.json({
            success: true,
            message: 'Course expiry automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Course Expiry Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
