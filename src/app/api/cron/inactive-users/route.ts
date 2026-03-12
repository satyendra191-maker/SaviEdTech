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
    const requestId = `inactive_users_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient() as any;
        
        const results = {
            usersReengaged: 0,
            notificationsSent: 0,
            offersTriggered: 0,
            errors: [] as string[],
        };

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: inactiveUsers } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('role', 'student')
            .lt('last_active_at', sevenDaysAgo.toISOString())
            .limit(50);

        if (inactiveUsers) {
            for (const user of inactiveUsers) {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: user.id,
                        title: 'We Miss You!',
                        message: `Hi ${user.full_name}, we noticed you haven't been active. Come back and continue your learning journey!`,
                        type: 'reengagement',
                    });

                await supabase
                    .from('push_notifications')
                    .insert({
                        user_id: user.id,
                        title: 'We Miss You!',
                        body: 'Your courses are waiting for you. Resume learning now!',
                        type: 'reengagement',
                    });

                results.usersReengaged++;
                results.notificationsSent += 2;
            }
        }

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const { data: veryInactiveUsers } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'student')
            .lt('last_active_at', fourteenDaysAgo.toISOString())
            .limit(20);

        if (veryInactiveUsers) {
            for (const user of veryInactiveUsers) {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: user.id,
                        title: 'Special Offer Just for You!',
                        message: 'Get 20% off on any course. Valid for limited time!',
                        type: 'special_offer',
                    });

                await supabase
                    .from('wallet_transactions')
                    .insert({
                        user_id: user.id,
                        amount: 100,
                        type: 'reengagement_bonus',
                        description: 'Re-engagement bonus - Come back and learn!',
                        status: 'completed',
                    });

                results.offersTriggered++;
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Inactive Users Automation] Completed in ${duration}ms - Reengaged: ${results.usersReengaged}`);

        return NextResponse.json({
            success: true,
            message: 'Inactive users automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Inactive Users Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
