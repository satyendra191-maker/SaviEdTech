import { NextResponse } from 'next/server';
import { isYouTubeConfigured } from '@/lib/youtube';

export async function GET() {
    return NextResponse.json({
        configured: isYouTubeConfigured(),
        message: isYouTubeConfigured() 
            ? 'YouTube integration is configured and ready'
            : 'Add YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID to environment variables',
    });
}
