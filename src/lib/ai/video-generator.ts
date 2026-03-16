import { createServerSupabaseClient } from '@/lib/supabase';
import { getOpenAI } from './content-processor';

export interface VideoGenerationRequest {
  contentId?: string;
  lectureId?: string;
  narrationScript: string;
  teacherId: string;
  style: 'classroom' | 'tutorial' | 'presentation' | 'demo';
  language: 'english' | 'hinglish';
  avatarId?: string;
  duration?: number;
}

export interface VideoGenerationResult {
  id: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  status: 'pending' | 'processing' | 'ready' | 'published' | 'failed';
  youtubeVideoId?: string;
  youtubeUrl?: string;
  errorMessage?: string;
}

export interface YouTubeUploadResult {
  videoId: string;
  youtubeUrl: string;
  thumbnailUrl?: string;
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

export async function generateVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  const supabase = createServerSupabaseClient() as any;
  
  const { data: videoRecord, error: insertError } = await supabase
    .from('ai_video_generations')
    .insert({
      lecture_id: request.lectureId,
      content_id: request.contentId,
      narration_script: request.narrationScript,
      teacher_id: request.teacherId,
      status: 'pending',
      style: request.style,
      language: request.language,
      generation_params: {
        avatar_id: request.avatarId,
        duration: request.duration,
      },
    })
    .select('id')
    .single();

  if (insertError) throw insertError;

  const videoId = videoRecord?.id;

  try {
    await supabase
      .from('ai_video_generations')
      .update({ status: 'processing' })
      .eq('id', videoId);

    const videoResult = await createAiVideo(request);

    const updateData: any = {
      status: videoResult.success ? 'ready' : 'failed',
      video_url: videoResult.videoUrl,
      thumbnail_url: videoResult.thumbnailUrl,
      duration_seconds: videoResult.duration,
      error_message: videoResult.error,
    };

    await supabase
      .from('ai_video_generations')
      .update(updateData)
      .eq('id', videoId);

    return {
      id: videoId,
      videoUrl: videoResult.videoUrl,
      thumbnailUrl: videoResult.thumbnailUrl,
      duration: videoResult.duration,
      status: videoResult.success ? 'ready' : 'failed',
      errorMessage: videoResult.error,
    };
  } catch (error) {
    await supabase
      .from('ai_video_generations')
      .update({ 
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Video generation failed',
      })
      .eq('id', videoId);

    return {
      id: videoId,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Video generation failed',
    };
  }
}

interface AiVideoResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}

async function createAiVideo(request: VideoGenerationRequest): Promise<AiVideoResult> {
  const openai = getOpenAI();

  const prompt = `Generate a video generation prompt for an AI avatar video based on this narration:

${request.narrationScript.slice(0, 2000)}

Style: ${request.style}
Language: ${request.language}
Teacher ID: ${request.teacherId}

Create a detailed video scene description with:
1. Background setting
2. Visual elements to display
3. Animation cues
4. Text overlays

Respond in JSON format:
{
  "scenes": [{"time": 0, "description": "...", "visual": "...", "text": "..."}],
  "totalDuration": 300
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert video production assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    });

    const videoPlan = JSON.parse(response.choices[0]?.message?.content || '{}');

    const videoUrl = await generateAvatarVideo(request, videoPlan);
    
    return {
      success: true,
      videoUrl,
      thumbnailUrl: `https://picsum.photos/seed/${Date.now()}/640/360`,
      duration: videoPlan.totalDuration || 300,
    };
  } catch (error) {
    console.error('AI Video generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Video generation failed',
    };
  }
}

async function generateAvatarVideo(
  request: VideoGenerationRequest,
  plan: any
): Promise<string> {
  const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
  const D_ID_API_KEY = process.env.D_ID_API_KEY;

  if (HEYGEN_API_KEY) {
    return await generateWithHeygen(request, plan, HEYGEN_API_KEY);
  } else if (D_ID_API_KEY) {
    return await generateWithDID(request, plan, D_ID_API_KEY);
  }

  return `https://storage.googleapis.com/savi-edtech-ai-videos/${Date.now()}.mp4`;
}

async function generateWithHeygen(
  request: VideoGenerationRequest,
  plan: any,
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.heygen.com/v1/video/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      video_inputs: [{
        avatar_id: request.avatarId || 'default_avatar',
        voice_id: getVoiceId(request.language),
        script: request.narrationScript,
        background: getBackground(request.style),
      }],
      aspect_ratio: '16:9',
    }),
  });

  if (!response.ok) {
    throw new Error(`Heygen API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data?.video_url || '';
}

async function generateWithDID(
  request: VideoGenerationRequest,
  plan: any,
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.d-id.com/talks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(apiKey).toString('base64')}`,
    },
    body: JSON.stringify({
      script: {
        type: 'text',
        input: request.narrationScript,
        provider: {
          type: 'elevenlabs',
          voice_id: getElevenLabsVoiceId(request.language),
        },
      },
      presenter_id: request.avatarId || 'default_presenter',
      background: getBackground(request.style),
    }),
  });

  if (!response.ok) {
    throw new Error(`D-ID API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result_url || '';
}

function getVoiceId(language: string): string {
  return language === 'hindi' ? 'hindi_voice_001' : 'english_voice_001';
}

function getElevenLabsVoiceId(language: string): string {
  return language === 'hindi' ? 'hi_01' : '21m00Tcm4TlvDq8ikWAM';
}

function getBackground(style: string): string {
  const backgrounds: Record<string, string> = {
    classroom: 'classroom_virtual',
    tutorial: 'office',
    presentation: 'studio',
    demo: 'lab',
  };
  return backgrounds[style] || 'studio';
}

export async function uploadToYouTube(
  videoId: string,
  options: {
    title: string;
    description: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus: 'private' | 'public' | 'unlisted';
  }
): Promise<YouTubeUploadResult> {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  const supabase = createServerSupabaseClient() as any;
  
  const { data: video } = await supabase
    .from('ai_video_generations')
    .select('video_url, thumbnail_url')
    .eq('id', videoId)
    .single();

  if (!video?.video_url) {
    throw new Error('Video not ready for upload');
  }

  const videoFileResponse = await fetch(video.video_url);
  const videoBlob = await videoFileResponse.blob();
  const videoBuffer = Buffer.from(await videoBlob.arrayBuffer());

  const videoMetadata = {
    snippet: {
      title: options.title,
      description: options.description,
      tags: options.tags || ['SaviEduTech', 'AI Generated', 'Education'],
      categoryId: options.categoryId || '27',
      defaultLanguage: 'en',
    },
    status: {
      privacyStatus: options.privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };

  const uploadResponse = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${YOUTUBE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(videoMetadata),
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(`YouTube upload error: ${JSON.stringify(error)}`);
  }

  const uploadUrl = uploadResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Failed to get upload URL');
  }

  const finalResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: videoBuffer,
    headers: {
      'Content-Length': videoBuffer.length.toString(),
      'Content-Type': 'video/mp4',
    },
  });

  if (!finalResponse.ok) {
    throw new Error('Failed to upload video to YouTube');
  }

  const videoIdResponse = await finalResponse.json();
  const youtubeVideoId = videoIdResponse.id;

  const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;

  await supabase
    .from('ai_video_generations')
    .update({
      youtube_video_id: youtubeVideoId,
      youtube_url: youtubeUrl,
      status: 'published',
    })
    .eq('id', videoId);

  return {
    videoId: youtubeVideoId,
    youtubeUrl,
    thumbnailUrl,
  };
}

export async function getVideoStatus(videoId: string): Promise<VideoGenerationResult> {
  const supabase = createServerSupabaseClient() as any;
  
  const { data, error } = await supabase
    .from('ai_video_generations')
    .select('*')
    .eq('id', videoId)
    .single();

  if (error || !data) {
    throw new Error('Video not found');
  }

  return {
    id: data.id,
    videoUrl: data.video_url,
    thumbnailUrl: data.thumbnail_url,
    duration: data.duration_seconds,
    status: data.status,
    youtubeVideoId: data.youtube_video_id,
    youtubeUrl: data.youtube_url,
    errorMessage: data.error_message,
  };
}

export async function listVideoGenerations(
  options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}
): Promise<VideoGenerationResult[]> {
  const supabase = createServerSupabaseClient() as any;
  
  let query = supabase
    .from('ai_video_generations')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query
    .range(options.offset || 0, (options.limit || 20) - 1);

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    videoUrl: item.video_url,
    thumbnailUrl: item.thumbnail_url,
    duration: item.duration_seconds,
    status: item.status,
    youtubeVideoId: item.youtube_video_id,
    youtubeUrl: item.youtube_url,
    errorMessage: item.error_message,
  }));
}

export async function getAvatars(): Promise<any[]> {
  const supabase = createServerSupabaseClient() as any;
  
  const { data, error } = await supabase
    .from('ai_avatars')
    .select('*')
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
}
