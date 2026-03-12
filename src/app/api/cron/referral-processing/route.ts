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
    const requestId = `referral_automation_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient() as any;
        
        const results = {
            referralsProcessed: 0,
            rewardsCredited: 0,
            bonusApplied: 0,
            errors: [] as string[],
        };

        const { data: pendingReferrals } = await supabase
            .from('referrals')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(50);

        if (pendingReferrals) {
            for (const referral of pendingReferrals) {
                const referredUser = await supabase
                    .from('profiles')
                    .select('id, created_at')
                    .eq('id', referral.referred_user_id)
                    .single();

                if (referredUser.data) {
                    const daysSinceSignup = Math.floor(
                        (Date.now() - new Date(referredUser.data.created_at).getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (daysSinceSignup >= 7) {
                        const enrollmentCheck = await supabase
                            .from('enrollments')
                            .select('id')
                            .eq('student_id', referral.referred_user_id)
                            .single();

                        if (enrollmentCheck.data) {
                            await supabase
                                .from('referrals')
                                .update({ 
                                    status: 'completed',
                                    completed_at: new Date().toISOString()
                                })
                                .eq('id', referral.id);

                            await supabase
                                .from('wallet_transactions')
                                .insert({
                                    user_id: referral.referrer_id,
                                    amount: 500,
                                    type: 'referral_bonus',
                                    description: 'Referral bonus credited',
                                    status: 'completed',
                                });

                            await supabase
                                .from('wallet_transactions')
                                .insert({
                                    user_id: referral.referred_user_id,
                                    amount: 250,
                                    type: 'signup_bonus',
                                    description: 'Signup bonus from referral',
                                    status: 'completed',
                                });

                            results.referralsProcessed++;
                            results.rewardsCredited += 2;
                        }
                    }
                }
            }
        }

        const { data: completedReferrals } = await supabase
            .from('referrals')
            .select('referrer_id')
            .eq('status', 'completed');

        if (completedReferrals) {
            const referrerCounts: Record<string, number> = {};
            for (const ref of completedReferrals) {
                referrerCounts[ref.referrer_id] = (referrerCounts[ref.referrer_id] || 0) + 1;
            }

            for (const [referrerId, count] of Object.entries(referrerCounts)) {
                if (count >= 5 && count % 5 === 0) {
                    await supabase
                        .from('wallet_transactions')
                        .insert({
                            user_id: referrerId,
                            amount: 1000,
                            type: 'referral_milestone',
                            description: `Milestone bonus for ${count} successful referrals`,
                            status: 'completed',
                        });

                    results.bonusApplied++;
                }
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Referral Automation] Completed in ${duration}ms - Processed: ${results.referralsProcessed}`);

        return NextResponse.json({
            success: true,
            message: 'Referral automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Referral Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
