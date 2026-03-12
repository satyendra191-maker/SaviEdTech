// @ts-nocheck
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
        translated: 0,
        languages: ['en', 'hi', 'gu', 'mr', 'ta', 'te', 'kn', 'ml', 'bn', 'pa'] as string[],
        errors: [] as string[]
    };

    try {
        const { data: contentToTranslate } = await supabase
            .from('content_translation_queue')
            .select('*')
            .eq('status', 'pending')
            .limit(50);

        if (contentToTranslate && contentToTranslate.length > 0) {
            for (const item of contentToTranslate) {
                try {
                    const targetLanguages = item.target_languages || results.languages;
                    
                    for (const lang of targetLanguages) {
                        if (lang === item.source_language) continue;

                        const translateResponse = await fetch('https://api.openweathermap.org/translate/v2', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${process.env.TRANSLATION_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                q: item.source_content,
                                source: item.source_language,
                                target: lang,
                                format: 'text'
                            })
                        });

                        if (translateResponse.ok) {
                            const translateData = await translateResponse.json();
                            
                            await supabase.from('content_translations').insert({
                                content_id: item.content_id,
                                content_type: item.content_type,
                                language: lang,
                                translated_content: translateData.translatedText,
                                translated_by: 'ai_translation_service',
                                status: 'completed'
                            });

                            results.translated++;
                        }
                    }

                    await supabase
                        .from('content_translation_queue')
                        .update({ status: 'completed', updated_at: new Date().toISOString() })
                        .eq('id', item.id);
                } catch (error) {
                    results.errors.push(`Translation error for content ${item.content_id}: ${error}`);
                }
            }
        }

        const { data: popularContent } = await supabase
            .from('content')
            .select('id, title, description, content_type, language')
            .eq('is_published', true)
            .order('views', { ascending: false })
            .limit(10);

        if (popularContent) {
            for (const content of popularContent) {
                const existingQueue = await supabase
                    .from('content_translation_queue')
                    .select('id')
                    .eq('content_id', content.id)
                    .eq('status', 'pending')
                    .single();

                if (!existingQueue.data) {
                    const targetLangs = content.language === 'en' 
                        ? ['hi', 'gu', 'mr'] 
                        : ['en'];

                    await supabase.from('content_translation_queue').insert({
                        content_id: content.id,
                        content_type: content.content_type,
                        source_language: content.language || 'en',
                        source_content: content.title + ' ' + (content.description || ''),
                        target_languages: targetLangs,
                        status: 'pending',
                        priority: 'medium'
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Content translation processed',
            results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Content translation automation error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            results
        }, { status: 500 });
    }
}
