import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase';
import { getVideoDetails, parseDuration, isYouTubeConfigured } from '@/lib/youtube';

export async function POST(request: NextRequest) {
    if (!isYouTubeConfigured()) {
        return NextResponse.json(
            { error: 'YouTube API not configured' },
            { status: 500 }
        );
    }

    try {
        const { videoIds } = await request.json();
        
        if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
            return NextResponse.json(
                { error: 'No video IDs provided' },
                { status: 400 }
            );
        }

        const supabase = createAdminSupabaseClient();
        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[],
        };

        for (const videoId of videoIds) {
            try {
                const video = await getVideoDetails(videoId);
                
                if (!video) {
                    results.failed++;
                    results.errors.push(`Video ${videoId} not found`);
                    continue;
                }

                // Parse duration to seconds
                const durationMatch = video.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                const durationSeconds = durationMatch 
                    ? (parseInt(durationMatch[1] || '0') * 3600) + 
                      (parseInt(durationMatch[2] || '0') * 60) + 
                      parseInt(durationMatch[3] || '0')
                    : 0;

                // Check if already synced
                const { data: existing } = await supabase
                    .from('youtube_videos')
                    .select('id')
                    .eq('youtube_id', videoId)
                    .maybeSingle();

                const videoData = {
                    youtube_id: videoId,
                    title: video.title,
                    description: video.description,
                    thumbnail_url: video.thumbnail,
                    video_url: `https://www.youtube.com/watch?v=${videoId}`,
                    duration: durationSeconds,
                    synced_at: new Date().toISOString(),
                };

                if (existing) {
                    // Update existing
                    await (supabase as any)
                        .from('youtube_videos')
                        .update(videoData)
                        .eq('youtube_id', videoId);
                } else {
                    // Insert new
                    await (supabase as any)
                        .from('youtube_videos')
                        .insert(videoData);
                }

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(`Error processing ${videoId}: ${err}`);
            }
        }

        return NextResponse.json({
            success: true,
            ...results,
        });
    } catch (error) {
        console.error('YouTube sync error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Sync failed' },
            { status: 500 }
        );
    }
}
