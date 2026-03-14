/**
 * YouTube Integration Module
 * 
 * Use your YouTube channel as a video database for lectures
 * 
 * Setup:
 * 1. Get YouTube Data API key from Google Cloud Console
 * 2. Add YOUTUBE_API_KEY to environment variables
 * 3. Add your channel ID to YOUTUBE_CHANNEL_ID
 */

export interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    publishedAt: string;
    duration: string;
    viewCount: number;
    playlistId?: string;
}

export interface YouTubePlaylist {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    videoCount: number;
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * Fetch all videos from your YouTube channel
 */
export async function getChannelVideos(maxResults: number = 50): Promise<YouTubeVideo[]> {
    if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
        throw new Error('YouTube API key or Channel ID not configured');
    }

    const videos: YouTubeVideo[] = [];
    let nextPageToken: string | undefined;

    while (videos.length < maxResults) {
        const params = new URLSearchParams({
            part: 'snippet,contentDetails,statistics',
            channelId: YOUTUBE_CHANNEL_ID,
            maxResults: '50',
            order: 'date',
            type: 'video',
            key: YOUTUBE_API_KEY,
        });

        if (nextPageToken) {
            params.set('pageToken', nextPageToken);
        }

        const response = await fetch(`${BASE_URL}/search?${params}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`YouTube API error: ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();

        for (const item of data.items || []) {
            if (item.id?.videoId) {
                videos.push({
                    id: item.id.videoId,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
                    publishedAt: item.snippet.publishedAt,
                    duration: item.contentDetails?.duration || 'PT0M0S',
                    viewCount: parseInt(item.statistics?.viewCount || '0'),
                });
            }
        }

        nextPageToken = data.nextPageToken;
        if (!nextPageToken) break;
    }

    return videos.slice(0, maxResults);
}

/**
 * Get videos from a specific playlist
 */
export async function getPlaylistVideos(playlistId: string, maxResults: number = 50): Promise<YouTubeVideo[]> {
    if (!YOUTUBE_API_KEY) {
        throw new Error('YouTube API key not configured');
    }

    const videos: YouTubeVideo[] = [];
    let nextPageToken: string | undefined;

    while (videos.length < maxResults) {
        const params = new URLSearchParams({
            part: 'snippet,contentDetails,statistics',
            playlistId,
            maxResults: '50',
            key: YOUTUBE_API_KEY,
        });

        if (nextPageToken) {
            params.set('pageToken', nextPageToken);
        }

        const response = await fetch(`${BASE_URL}/playlistItems?${params}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`YouTube API error: ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();

        for (const item of data.items || []) {
            if (item.contentDetails?.videoId) {
                videos.push({
                    id: item.contentDetails.videoId,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails?.high?.url || '',
                    publishedAt: item.snippet.publishedAt,
                    duration: item.contentDetails?.duration || 'PT0M0S',
                    viewCount: 0,
                    playlistId,
                });
            }
        }

        nextPageToken = data.nextPageToken;
        if (!nextPageToken) break;
    }

    return videos.slice(0, maxResults);
}

/**
 * Get all playlists from your channel
 */
export async function getChannelPlaylists(): Promise<YouTubePlaylist[]> {
    if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
        throw new Error('YouTube API key or Channel ID not configured');
    }

    const playlists: YouTubePlaylist[] = [];
    let nextPageToken: string | undefined;

    do {
        const params = new URLSearchParams({
            part: 'snippet,contentDetails',
            channelId: YOUTUBE_CHANNEL_ID,
            maxResults: '50',
            key: YOUTUBE_API_KEY,
        });

        if (nextPageToken) {
            params.set('pageToken', nextPageToken);
        }

        const response = await fetch(`${BASE_URL}/playlists?${params}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`YouTube API error: ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();

        for (const item of data.items || []) {
            playlists.push({
                id: item.id,
                title: item.snippet.title,
                description: item.snippet.description,
                thumbnail: item.snippet.thumbnails?.high?.url || '',
                videoCount: item.contentDetails?.itemCount || 0,
            });
        }

        nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return playlists;
}

/**
 * Get single video details
 */
export async function getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
    if (!YOUTUBE_API_KEY) {
        throw new Error('YouTube API key not configured');
    }

    const params = new URLSearchParams({
        part: 'snippet,contentDetails,statistics',
        id: videoId,
        key: YOUTUBE_API_KEY,
    });

    const response = await fetch(`${BASE_URL}/videos?${params}`);
    
    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    
    if (!data.items?.length) {
        return null;
    }

    const item = data.items[0];
    return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.high?.url || '',
        publishedAt: item.snippet.publishedAt,
        duration: item.contentDetails?.duration || 'PT0M0S',
        viewCount: parseInt(item.statistics?.viewCount || '0'),
    };
}

/**
 * Parse ISO 8601 duration to human readable format
 */
export function parseDuration(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    
    if (!match) return '0:00';
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get embed URL for a video
 */
export function getEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Get thumbnail URL in different sizes
 */
export function getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'max' = 'high'): string {
    return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
}

/**
 * Check if YouTube is configured
 */
export function isYouTubeConfigured(): boolean {
    return !!(YOUTUBE_API_KEY && YOUTUBE_CHANNEL_ID);
}
