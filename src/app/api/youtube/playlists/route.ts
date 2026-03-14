import { NextRequest, NextResponse } from 'next/server';
import {
    getChannelPlaylists,
    isYouTubeConfigured,
} from '@/lib/youtube';

export async function GET() {
    if (!isYouTubeConfigured()) {
        return NextResponse.json(
            { error: 'YouTube API not configured' },
            { status: 500 }
        );
    }

    try {
        const playlists = await getChannelPlaylists();
        return NextResponse.json({ playlists });
    } catch (error) {
        console.error('YouTube playlists error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch playlists' },
            { status: 500 }
        );
    }
}
