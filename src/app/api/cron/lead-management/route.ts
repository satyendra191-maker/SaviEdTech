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
    const requestId = `lead_automation_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient();
        
        const results = {
            followupsTriggered: 0,
            leadsConverted: 0,
            leadsNurtured: 0,
            coldLeadsArchived: 0,
            errors: [] as string[],
        };

        const { data: pendingLeads } = await supabase
            .from('leads')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(50);

        if (pendingLeads) {
            for (const lead of pendingLeads) {
                const daysSinceCreation = Math.floor(
                    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysSinceCreation >= 1 && daysSinceCreation <= 7) {
                    await supabase
                        .from('lead_followups')
                        .insert({
                            lead_id: lead.id,
                            followup_type: 'auto_nurture',
                            notes: `Auto-followup: Day ${daysSinceCreation} - Lead still in consideration phase`,
                            scheduled_at: new Date().toISOString(),
                        });
                    
                    results.followupsTriggered++;
                }

                if (daysSinceCreation >= 3 && !lead.last_contacted_at) {
                    results.leadsNurtured++;
                }
            }
        }

        const { data: warmLeads } = await supabase
            .from('leads')
            .select('*')
            .eq('status', 'warm')
            .order('last_contacted_at', { ascending: true })
            .limit(20);

        if (warmLeads) {
            for (const lead of warmLeads) {
                const daysSinceContact = lead.last_contacted_at 
                    ? Math.floor((Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))
                    : 999;

                if (daysSinceContact >= 7) {
                    await supabase
                        .from('lead_followups')
                        .insert({
                            lead_id: lead.id,
                            followup_type: 're-engagement',
                            notes: 'Auto-reengagement: Checking interest after no response',
                            scheduled_at: new Date().toISOString(),
                        });

                    results.followupsTriggered++;
                }
            }
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: coldLeads } = await supabase
            .from('leads')
            .select('*')
            .eq('status', 'cold')
            .lt('last_contacted_at', thirtyDaysAgo.toISOString());

        if (coldLeads && coldLeads.length > 0) {
            for (const lead of coldLeads) {
                await supabase
                    .from('leads')
                    .update({ status: 'archived', archived_at: new Date().toISOString() })
                    .eq('id', lead.id);
                
                results.coldLeadsArchived++;
            }
        }

        const { data: readyForConversion } = await supabase
            .from('leads')
            .select('*')
            .eq('status', 'hot')
            .eq('is_conversion_processed', false)
            .limit(10);

        if (readyForConversion) {
            for (const lead of readyForConversion) {
                await supabase
                    .from('leads')
                    .update({ 
                        is_conversion_processed: true,
                        converted_at: new Date().toISOString()
                    })
                    .eq('id', lead.id);
                
                results.leadsConverted++;
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Lead Automation] Completed in ${duration}ms - Followups: ${results.followupsTriggered}`);

        return NextResponse.json({
            success: true,
            message: 'Lead management automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Lead Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
