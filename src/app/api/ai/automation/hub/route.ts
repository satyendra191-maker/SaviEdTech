import { NextRequest, NextResponse } from 'next/server';
import { 
  processAndAnalyzeContent, 
  saveProcessedContent,
  extractTextFromPdf,
  extractTextFromAudio,
  extractTextFromVideo,
  extractContentFromUrl
} from '@/lib/ai/content-processor';
import { generateVideo, uploadToYouTube, getAvatars } from '@/lib/ai/video-generator';
import { generateDppPack, generateMockTestPack } from '@/lib/ai/automation-suite';
import { trackRolePerformance, incrementAIGeneratedContent } from '@/lib/ai/role-performance';
import { getTeacherBySubject } from '@/lib/ai/teachers';
import { requireAdminRequest } from '@/lib/api/admin-auth';

interface AutomationRequest {
  action: 'process_content' | 'generate_video' | 'generate_dpp' | 'generate_mock_test' | 'upload_youtube' | 'full_pipeline';
  
  // Content processing
  contentUrl?: string;
  contentText?: string;
  sourceType?: 'pdf' | 'ebook' | 'audio' | 'video' | 'document' | 'url';
  title?: string;
  
  // Video generation
  narrationScript?: string;
  teacherId?: string;
  subject?: string;
  style?: 'classroom' | 'tutorial' | 'presentation' | 'demo';
  language?: 'english' | 'hinglish';
  duration?: number;
  
  // DPP/Test generation
  topic?: string;
  targetExam?: 'jee-main' | 'jee-advanced' | 'neet' | 'boards';
  questionCount?: number;
  
  // YouTube upload
  videoId?: string;
  youtubeTitle?: string;
  youtubeDescription?: string;
  youtubePrivacy?: 'private' | 'public' | 'unlisted';
  
  // Role tracking
  roleType?: 'faculty' | 'student' | 'parent' | 'admin' | 'ai_tutor';
  entityId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AutomationRequest = await request.json();
    const { action } = body;

    const results: any = {
      action,
      timestamp: new Date().toISOString(),
      success: true,
      data: {},
    };

    switch (action) {
      case 'process_content': {
        const { contentUrl, contentText, sourceType, title } = body;
        
        let text = contentText;
        if (!text && contentUrl) {
          if (sourceType === 'url') {
            text = await extractContentFromUrl(contentUrl);
          } else if (sourceType === 'pdf') {
            text = await extractTextFromPdf(contentUrl);
          } else if (sourceType === 'audio') {
            text = await extractTextFromAudio(contentUrl);
          } else if (sourceType === 'video') {
            text = await extractTextFromVideo(contentUrl);
          }
        }

        if (!text) {
          throw new Error('No content provided');
        }

        const processed = await processAndAnalyzeContent(text, {
          title: title || 'Untitled Content',
          sourceType: sourceType || 'document',
          sourceUrl: contentUrl,
        });

        const savedId = await saveProcessedContent(processed, admin.userId);
        
        results.data = {
          processedContentId: savedId,
          summary: processed.summary,
          topics: processed.topics,
          keyConcepts: processed.keyConcepts,
        };

        if (body.roleType && body.entityId) {
          await incrementAIGeneratedContent(body.roleType, body.entityId, 'lecture', 1);
        }
        break;
      }

      case 'generate_video': {
        const { narrationScript, teacherId, subject, style, language } = body;
        
        if (!narrationScript) {
          throw new Error('Narration script is required');
        }

        const resolvedTeacherId = teacherId || getTeacherBySubject(body.subject as any)?.id || 'default';

        const videoResult = await generateVideo({
          narrationScript,
          teacherId: resolvedTeacherId,
          style: style || 'classroom',
          language: language || 'english',
        });

        results.data = {
          videoId: videoResult.id,
          status: videoResult.status,
          videoUrl: videoResult.videoUrl,
          thumbnailUrl: videoResult.thumbnailUrl,
        };

        if (body.roleType && body.entityId) {
          await incrementAIGeneratedContent(body.roleType, body.entityId, 'video', 1);
        }
        break;
      }

      case 'generate_dpp': {
        const { topic, teacherId, subject, targetExam, questionCount } = body;
        
        if (!topic) {
          throw new Error('Topic is required');
        }

        const resolvedTeacherId = teacherId || getTeacherBySubject(body.subject as any)?.id || 'default';

        const dppResult = await generateDppPack({
          teacherId: resolvedTeacherId,
          topic,
          subject: subject || 'physics',
          targetExam: targetExam || 'jee-main',
          questionCount: questionCount || 15,
        });

        results.data = {
          title: dppResult.title,
          blueprint: dppResult.blueprint,
          questionCount: dppResult.questions.length,
          questions: dppResult.questions.slice(0, 5),
        };

        if (body.roleType && body.entityId) {
          await incrementAIGeneratedContent(body.roleType, body.entityId, 'dpp', 1);
        }
        break;
      }

      case 'generate_mock_test': {
        const { topic, teacherId, subject, targetExam, questionCount, duration } = body;
        
        if (!topic) {
          throw new Error('Topic is required');
        }

        const resolvedTeacherId = teacherId || getTeacherBySubject(body.subject as any)?.id || 'default';

        const testResult = await generateMockTestPack({
          teacherId: resolvedTeacherId,
          topic,
          subject: subject || 'physics',
          targetExam: targetExam || 'jee-main',
          questionCount: questionCount || 30,
          duration,
        });

        results.data = {
          title: testResult.title,
          questionCount: testResult.questionCount,
          durationMinutes: testResult.durationMinutes,
          totalMarks: testResult.totalMarks,
        };

        if (body.roleType && body.entityId) {
          await incrementAIGeneratedContent(body.roleType, body.entityId, 'dpp', 1);
        }
        break;
      }

      case 'upload_youtube': {
        const { videoId, youtubeTitle, youtubeDescription, youtubePrivacy } = body;
        
        if (!videoId) {
          throw new Error('Video ID is required');
        }

        const uploadResult = await uploadToYouTube(videoId, {
          title: youtubeTitle || 'SaviEduTech AI Generated Lecture',
          description: youtubeDescription || 'AI-generated educational content by SaviEduTech',
          privacyStatus: youtubePrivacy || 'unlisted',
        });

        results.data = {
          youtubeVideoId: uploadResult.videoId,
          youtubeUrl: uploadResult.youtubeUrl,
          thumbnailUrl: uploadResult.thumbnailUrl,
        };
        break;
      }

      case 'full_pipeline': {
        const { contentUrl, contentText, sourceType, title, subject, style, language, targetExam, youtubePrivacy } = body;
        
        let processedContentId: string | undefined;
        let videoId: string | undefined;
        let youtubeUrl: string | undefined;

        // Step 1: Process content
        let text = contentText;
        if (!text && contentUrl) {
          if (sourceType === 'url') {
            text = await extractContentFromUrl(contentUrl);
          } else if (sourceType === 'pdf') {
            text = await extractTextFromPdf(contentUrl);
          } else if (sourceType === 'audio') {
            text = await extractTextFromAudio(contentUrl);
          } else if (sourceType === 'video') {
            text = await extractTextFromVideo(contentUrl);
          }
        }

        if (text) {
          const processed = await processAndAnalyzeContent(text, {
            title: title || 'Untitled Content',
            sourceType: sourceType || 'document',
            sourceUrl: contentUrl,
          });
          processedContentId = await saveProcessedContent(processed, admin.userId);
        }

        // Step 2: Generate narration script
        const narrationScript = body.narrationScript || `Welcome to today's lecture on ${title || 'the topic'}. ${text?.slice(0, 500) || 'Let us begin our learning journey.'}`;

        // Step 3: Generate video
        const teacherId = body.teacherId || getTeacherBySubject(body.subject as any)?.id || 'default';
        const videoResult = await generateVideo({
          contentId: processedContentId,
          narrationScript,
          teacherId,
          style: style || 'classroom',
          language: language || 'english',
        });
        videoId = videoResult.id;

        // Step 4: Upload to YouTube (if video is ready)
        if (videoResult.status === 'ready' && videoId) {
          try {
            const uploadResult = await uploadToYouTube(videoId, {
              title: body.youtubeTitle || `SaviEduTech - ${title || 'AI Lecture'}`,
              description: `AI-generated educational content. Subject: ${body.subject || 'General'}`,
              privacyStatus: body.youtubePrivacy || 'unlisted',
            });
            youtubeUrl = uploadResult.youtubeUrl;
          } catch (e) {
            console.error('YouTube upload failed:', e);
          }
        }

        results.data = {
          processedContentId,
          videoId,
          videoStatus: videoResult.status,
          youtubeUrl,
        };

        if (body.roleType && body.entityId) {
          await incrementAIGeneratedContent(body.roleType, body.entityId, 'video', 1);
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (error) {
    console.error('AI Automation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Automation failed',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'avatars': {
        const avatars = await getAvatars();
        return NextResponse.json({ success: true, avatars });
      }

      case 'teachers': {
        const { getAllTeachers } = await import('@/lib/ai/teachers');
        const teachers = getAllTeachers();
        return NextResponse.json({ success: true, teachers });
      }

      default:
        return NextResponse.json({
          actions: [
            'process_content',
            'generate_video',
            'generate_dpp',
            'generate_mock_test',
            'upload_youtube',
            'full_pipeline',
          ],
        });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    }, { status: 500 });
  }
}
