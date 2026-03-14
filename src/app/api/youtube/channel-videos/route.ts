import { NextRequest, NextResponse } from 'next/server';
import {
    getChannelVideos,
    getChannelPlaylists,
    getVideoDetails,
    isYouTubeConfigured,
} from '@/lib/youtube';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'videos';

    if (!isYouTubeConfigured()) {
        return NextResponse.json(
            { error: 'YouTube API not configured. Add YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID to environment variables.' },
            { status: 500 }
        );
    }

    try {
        if (type === 'videos') {
            const videos = await getChannelVideos(50);
            return NextResponse.json({ videos });
        } else if (type === 'playlists') {
            const playlists = await getChannelPlaylists();
            return NextResponse.json({ playlists });
        } else {
            return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
        }
    } catch (error) {
        console.error('YouTube API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch from YouTube' },
            { status: 500 }
        );
    }
}
