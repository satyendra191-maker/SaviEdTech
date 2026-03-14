'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
    Youtube, 
    RefreshCw, 
    CheckCircle, 
    XCircle, 
    Play, 
    Settings,
    ExternalLink,
    Search,
    Filter,
    Upload,
    Link2
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';

interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    publishedAt: string;
    duration: string;
    viewCount: number;
}

interface YouTubePlaylist {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    videoCount: number;
}

interface SyncedVideo {
    id: string;
    youtube_id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    video_url: string;
    duration: number;
    lecture_id?: string;
    synced_at: string;
}

export default function YouTubeManagerPage() {
    const supabase = getSupabaseBrowserClient();
    const [activeTab, setActiveTab] = useState<'videos' | 'playlists' | 'synced'>('videos');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [channelVideos, setChannelVideos] = useState<YouTubeVideo[]>([]);
    const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
    const [syncedVideos, setSyncedVideos] = useState<SyncedVideo[]>([]);
    const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
    const [syncing, setSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

    const fetchChannelVideos = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/youtube/channel-videos');
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch videos');
            }
            const data = await response.json();
            setChannelVideos(data.videos || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPlaylists = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/youtube/playlists');
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch playlists');
            }
            const data = await response.json();
            setPlaylists(data.playlists || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSyncedVideos = useCallback(async () => {
        if (!supabase) return;
        
        const { data } = await supabase
            .from('youtube_videos')
            .select('*')
            .order('synced_at', { ascending: false })
            .limit(100);
        
        if (data) {
            setSyncedVideos(data);
        }
    }, [supabase]);

    const checkConfiguration = useCallback(async () => {
        try {
            const response = await fetch('/api/youtube/status');
            const data = await response.json();
            setIsConfigured(data.configured);
        } catch {
            setIsConfigured(false);
        }
    }, []);

    useEffect(() => {
        checkConfiguration();
    }, [checkConfiguration]);

    useEffect(() => {
        if (activeTab === 'videos') {
            fetchChannelVideos();
        } else if (activeTab === 'playlists') {
            fetchPlaylists();
        } else if (activeTab === 'synced') {
            fetchSyncedVideos();
        }
    }, [activeTab, fetchChannelVideos, fetchPlaylists, fetchSyncedVideos]);

    const syncSelectedVideos = async () => {
        if (selectedVideos.size === 0) return;
        
        setSyncing(true);
        try {
            const response = await fetch('/api/youtube/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoIds: Array.from(selectedVideos) }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to sync videos');
            }
            
            alert(`✅ Successfully synced ${selectedVideos.size} videos!`);
            setSelectedVideos(new Set());
            fetchSyncedVideos();
        } catch (err) {
            alert(`❌ Error: ${err}`);
        } finally {
            setSyncing(false);
        }
    };

    const toggleVideoSelection = (videoId: string) => {
        setSelectedVideos(prev => {
            const next = new Set(prev);
            if (next.has(videoId)) {
                next.delete(videoId);
            } else {
                next.add(videoId);
            }
            return next;
        });
    };

    const filteredVideos = channelVideos.filter(video =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const parseDuration = (duration: string): string => {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return '0:00';
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (isConfigured === false) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <Youtube className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">YouTube Not Configured</h2>
                <p className="text-slate-500 max-w-md mb-6">
                    To use YouTube as your video database, add the following environment variables in Vercel:
                </p>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-left text-sm font-mono max-w-lg">
                    <p>YOUTUBE_API_KEY=your_api_key</p>
                    <p>YOUTUBE_CHANNEL_ID=your_channel_id</p>
                </div>
                <p className="text-xs text-slate-400 mt-4">
                    Get API key from Google Cloud Console → YouTube Data API v3
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Youtube className="w-8 h-8 text-red-500" />
                        YouTube Video Manager
                    </h1>
                    <p className="text-sm text-slate-500">Use your YouTube channel as video database</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedVideos.size > 0 && (
                        <button
                            onClick={syncSelectedVideos}
                            disabled={syncing}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {syncing ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            Sync {selectedVideos.size} Videos
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (activeTab === 'videos') fetchChannelVideos();
                            else if (activeTab === 'playlists') fetchPlaylists();
                            else fetchSyncedVideos();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {[
                    { id: 'videos', label: 'Channel Videos', count: channelVideos.length },
                    { id: 'playlists', label: 'Playlists', count: playlists.length },
                    { id: 'synced', label: 'Synced Videos', count: syncedVideos.length },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                            activeTab === tab.id 
                                ? 'bg-white text-slate-900 shadow-sm' 
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        {tab.label}
                        <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full">{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {/* Search */}
            {activeTab !== 'synced' && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search videos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                    />
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : activeTab === 'videos' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredVideos.map(video => (
                        <div 
                            key={video.id}
                            className={`bg-white rounded-xl border overflow-hidden transition-all ${
                                selectedVideos.has(video.id) 
                                    ? 'border-indigo-500 ring-2 ring-indigo-100' 
                                    : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div className="relative aspect-video bg-slate-900">
                                <img 
                                    src={video.thumbnail} 
                                    alt={video.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
                                    {parseDuration(video.duration)}
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 transition-opacity">
                                    <a 
                                        href={`https://youtube.com/watch?v=${video.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-3 bg-white/90 rounded-full"
                                    >
                                        <Play className="w-6 h-6 text-slate-900" />
                                    </a>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-start gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedVideos.has(video.id)}
                                        onChange={() => toggleVideoSelection(video.id)}
                                        className="mt-1 w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-slate-900 text-sm line-clamp-2">
                                            {video.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {new Date(video.publishedAt).toLocaleDateString()} • 
                                            {video.viewCount.toLocaleString()} views
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : activeTab === 'playlists' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {playlists.map(playlist => (
                        <div 
                            key={playlist.id}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                        >
                            <div className="relative aspect-video bg-slate-900">
                                <img 
                                    src={playlist.thumbnail} 
                                    alt={playlist.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
                                    {playlist.videoCount} videos
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-medium text-slate-900 text-sm line-clamp-2">
                                    {playlist.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                    {playlist.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {syncedVideos.map(video => (
                        <div 
                            key={video.id}
                            className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200"
                        >
                            <img 
                                src={video.thumbnail_url} 
                                alt={video.title}
                                className="w-32 h-18 object-cover rounded-lg"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-slate-900 text-sm line-clamp-1">
                                    {video.title}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Synced: {new Date(video.synced_at).toLocaleString()}
                                </p>
                                <a 
                                    href={video.video_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    View on YouTube
                                </a>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-slate-500">
                                    {Math.floor((video.duration || 0) / 60)}:{(video.duration || 0) % 60}
                                </span>
                            </div>
                        </div>
                    ))}
                    {syncedVideos.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            No videos synced yet. Select videos from your channel and sync them.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
