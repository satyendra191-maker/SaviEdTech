import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/api/admin-auth';
import { monitoredRoute } from '@/lib/api/route-utils';
import { createApiError, ErrorType } from '@/lib/error-handler';
import { writeFile, mkdir, readdir } from 'fs/promises';
import path from 'path';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.flv', '.wmv'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx', '.xls', '.xlsx'];

function getFileType(fileName: string): 'video' | 'document' | 'unknown' {
    const ext = path.extname(fileName).toLowerCase();
    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    if (DOCUMENT_EXTENSIONS.includes(ext)) return 'document';
    return 'unknown';
}

export async function POST(request: NextRequest): Promise<Response> {
    return monitoredRoute(
        request,
        async () => {
            const admin = await requireAdminRequest(request);
            if (!admin) {
                throw createApiError(ErrorType.AUTHORIZATION, 'Admin access required');
            }

            const formData = await request.formData();
            const files = formData.getAll('files') as File[];

            if (!files || files.length === 0) {
                throw createApiError(ErrorType.VALIDATION, 'No files uploaded');
            }

            const uploaded: { name: string; type: string; path: string; size: number }[] = [];
            const errors: string[] = [];

            const videoDir = path.join(process.cwd(), 'public', 'uploads', 'knowledge', 'videos');
            const docDir = path.join(process.cwd(), 'public', 'uploads', 'knowledge', 'documents');
            
            await mkdir(videoDir, { recursive: true });
            await mkdir(docDir, { recursive: true });

            for (const file of files) {
                try {
                    const buffer = Buffer.from(await file.arrayBuffer());
                    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const fileName = `${Date.now()}-${originalName}`;
                    const fileType = getFileType(file.name);
                    
                    let savePath: string;
                    if (fileType === 'video') {
                        savePath = path.join(videoDir, fileName);
                    } else {
                        savePath = path.join(docDir, fileName);
                    }
                    
                    await writeFile(savePath, buffer);

                    uploaded.push({
                        name: file.name,
                        type: fileType,
                        path: fileType === 'video' 
                            ? `/uploads/knowledge/videos/${fileName}` 
                            : `/uploads/knowledge/documents/${fileName}`,
                        size: buffer.length
                    });
                } catch (error) {
                    errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`);
                }
            }

            const videos = uploaded.filter(f => f.type === 'video');
            const documents = uploaded.filter(f => f.type === 'document');

            let message = `Successfully processed ${uploaded.length} file(s)`;
            if (videos.length > 0) {
                message += ` (${videos.length} video${videos.length > 1 ? 's' : ''})`;
            }
            if (documents.length > 0) {
                message += ` (${documents.length} document${documents.length > 1 ? 's' : ''})`;
            }

            return NextResponse.json({
                success: true,
                message,
                uploaded,
                videos,
                documents,
                errors: errors.length > 0 ? errors : undefined,
                note: videos.length > 0 
                    ? 'Video processing: Transcripts and content extraction will be available in the next update.' 
                    : undefined
            });
        },
        {
            routeLabel: '/api/ai/knowledge-upload',
            defaultCacheControl: 'no-store',
        }
    );
}

export async function GET(): Promise<Response> {
    return monitoredRoute(
        new NextRequest('http://localhost'),
        async () => {
            const videoDir = path.join(process.cwd(), 'public', 'uploads', 'knowledge', 'videos');
            const docDir = path.join(process.cwd(), 'public', 'uploads', 'knowledge', 'documents');
            
            let videoFiles: string[] = [];
            let docFiles: string[] = [];
            
            try {
                videoFiles = await readdir(videoDir);
            } catch {
                videoFiles = [];
            }
            
            try {
                docFiles = await readdir(docDir);
            } catch {
                docFiles = [];
            }

            return NextResponse.json({
                success: true,
                videos: videoFiles.map(f => ({ name: f, path: `/uploads/knowledge/videos/${f}` })),
                documents: docFiles.map(f => ({ name: f, path: `/uploads/knowledge/documents/${f}` }))
            });
        },
        {
            routeLabel: '/api/ai/knowledge-upload',
            defaultCacheControl: 'no-store',
        }
    );
}
