import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient() as any;
    const results = {
        whatsapp: { sent: 0, failed: 0 },
        sms: { sent: 0, failed: 0 },
        errors: [] as string[]
    };

    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const { data: pendingMessages } = await supabase
            .from('scheduled_messages')
            .select('*')
            .eq('scheduled_date', today)
            .eq('status', 'pending')
            .limit(100);

        if (pendingMessages && pendingMessages.length > 0) {
            for (const message of pendingMessages) {
                try {
                    if (message.channel === 'whatsapp') {
                        const whatsappResponse = await fetch(process.env.WHATSAPP_API_URL || '', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                messaging_product: 'whatsapp',
                                to: message.recipient_phone,
                                type: 'template',
                                template: {
                                    name: message.template_name,
                                    language: { code: 'en_US' },
                                    components: message.template_components || []
                                }
                            })
                        });

                        if (whatsappResponse.ok) {
                            results.whatsapp.sent++;
                        } else {
                            results.whatsapp.failed++;
                            results.errors.push(`WhatsApp failed for ${message.recipient_phone}`);
                        }
                    } else if (message.channel === 'sms') {
                        const smsResponse = await fetch(process.env.SMS_API_URL || '', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${process.env.SMS_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                to: message.recipient_phone,
                                message: message.message_content
                            })
                        });

                        if (smsResponse.ok) {
                            results.sms.sent++;
                        } else {
                            results.sms.failed++;
                            results.errors.push(`SMS failed for ${message.recipient_phone}`);
                        }
                    }

                    await supabase
                        .from('scheduled_messages')
                        .update({ 
                            status: results.whatsapp.failed > 0 || results.sms.failed > 0 ? 'failed' : 'sent',
                            sent_at: new Date().toISOString()
                        })
                        .eq('id', message.id);
                } catch (error) {
                    results.errors.push(`Error processing message: ${error}`);
                }
            }
        }

        const { data: followUpMessages } = await supabase
            .from('message_templates')
            .select('*')
            .eq('is_active', true)
            .eq('trigger_type', 'follow_up');

        if (followUpMessages) {
            for (const template of followUpMessages) {
                const { data: inactiveStudents } = await supabase
                    .from('user_activity_log')
                    .select('user_id, last_activity')
                    .gte('last_activity', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                    .limit(50);

                if (inactiveStudents && inactiveStudents.length > 0) {
                    for (const student of inactiveStudents) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('phone, name')
                            .eq('id', student.user_id)
                            .single();

                        if (profile?.phone) {
                            await supabase.from('scheduled_messages').insert({
                                recipient_phone: profile.phone,
                                channel: template.default_channel || 'whatsapp',
                                message_content: template.content.replace('{{name}}', profile.name || 'Student'),
                                template_name: template.whatsapp_template,
                                scheduled_date: today,
                                status: 'pending',
                                trigger_type: 'follow_up'
                            });
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'WhatsApp/SMS notifications processed',
            results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('WhatsApp/SMS automation error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            results
        }, { status: 500 });
    }
}
