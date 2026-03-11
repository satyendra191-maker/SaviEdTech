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
    const requestId = `video_automation_${Date.now()}`;
    const startTime = Date.now();

    try {
        const isValid = await verifyCronSecret(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createServerSupabaseClient();
        
        const results = {
            videosQueued: 0,
            videosProcessed: 0,
            lecturesProcessed: 0,
            thumbnailsGenerated: 0,
            errors: [] as string[],
        };

        const { data: unpublishedLectures, error: lectureError } = await supabase
            .from('lectures')
            .select('id, course_id, title, video_url, status, created_at')
            .eq('status', 'uploaded')
            .order('created_at', { ascending: true })
            .limit(20);

        if (!lectureError && unpublishedLectures) {
            results.lecturesProcessed = unpublishedLectures.length;
            
            for (const lecture of unpublishedLectures) {
                const { error: updateError } = await supabase
                    .from('lectures')
                    .update({ 
                        status: 'processing',
                        processing_started_at: new Date().toISOString()
                    })
                    .eq('id', lecture.id);

                if (!updateError) {
                    results.videosQueued++;
                }
            }
        }

        const { data: processingLectures } = await supabase
            .from('lectures')
            .select('id, course_id, title, video_url')
            .eq('status', 'processing')
            .limit(10);

        if (processingLectures) {
            for (const lecture of processingLectures) {
                try {
                    const { error: completeError } = await supabase
                        .from('lectures')
                        .update({ 
                            status: 'ready',
                            processing_completed_at: new Date().toISOString()
                        })
                        .eq('id', lecture.id);

                    if (!completeError) {
                        results.videosProcessed++;
                    }
                } catch (err) {
                    results.errors.push(`Failed to process lecture ${lecture.id}`);
                }
            }
        }

        const { data: lecturesWithoutThumbnails } = await supabase
            .from('lectures')
            .select('id, title')
            .is('thumbnail_url', null)
            .in('status', ['ready', 'published'])
            .limit(10);

        if (lecturesWithoutThumbnails) {
            for (const lecture of lecturesWithoutThumbnails) {
                const autoThumbnail = `https://picsum.photos/seed/${lecture.id}/640/360`;
                
                const { error: thumbError } = await supabase
                    .from('lectures')
                    .update({ thumbnail_url: autoThumbnail })
                    .eq('id', lecture.id);

                if (!thumbError) {
                    results.thumbnailsGenerated++;
                }
            }
        }

        const duration = Date.now() - startTime;

        console.log(`[Video Automation] Completed in ${duration}ms - Queued: ${results.videosQueued}, Processed: ${results.videosProcessed}`);

        return NextResponse.json({
            success: true,
            message: 'Video generation automation completed',
            results,
            duration,
            requestId,
        });

    } catch (error) {
        console.error(`[Video Automation] Error: ${error}`);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestId,
        }, { status: 500 });
    }
}
