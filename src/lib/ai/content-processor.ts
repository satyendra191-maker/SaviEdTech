import { createServerSupabaseClient } from '@/lib/supabase';

function getOpenAI() {
  const { default: OpenAI } = require('openai');
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export { getOpenAI };

export interface ProcessedContent {
  id?: string;
  title: string;
  content: string;
  summary: string;
  topics: string[];
  keyConcepts: string[];
  sourceType: 'pdf' | 'ebook' | 'audio' | 'video' | 'document' | 'url';
  sourceUrl?: string;
  metadata: {
    originalFileName?: string;
    processedAt: string;
    tokensUsed: number;
    language?: string;
  };
}

export interface ExtractedTopic {
  name: string;
  description: string;
  subtopics: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export async function extractTextFromPdf(filePath: string): Promise<string> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/process-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath }),
  });
  
  if (!response.ok) {
    throw new Error('PDF extraction failed');
  }
  
  const data = await response.json();
  return data.text;
}

export async function extractTextFromEbook(filePath: string): Promise<string> {
  const ext = filePath.toLowerCase();
  
  if (ext.endsWith('.epub')) {
    return extractFromEpub(filePath);
  } else if (ext.endsWith('.mobi') || ext.endsWith('.azw')) {
    return extractFromMobi(filePath);
  }
  
  return extractTextFromPdf(filePath);
}

async function extractFromEpub(filePath: string): Promise<string> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/process-epub`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath }),
  });
  
  if (!response.ok) {
    throw new Error('EPUB extraction failed');
  }
  
  const data = await response.json();
  return data.text;
}

async function extractFromMobi(filePath: string): Promise<string> {
  return `Content from ${filePath} - MOBI extraction requires Calibre`;
}

export async function extractTextFromAudio(filePath: string): Promise<string> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/transcribe-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath }),
  });
  
  if (!response.ok) {
    throw new Error('Audio transcription failed');
  }
  
  const data = await response.json();
  return data.transcript;
}

export async function extractTextFromVideo(filePath: string): Promise<string> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/transcribe-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath }),
  });
  
  if (!response.ok) {
    throw new Error('Video transcription failed');
  }
  
  const data = await response.json();
  return data.transcript;
}

export async function extractContentFromUrl(url: string): Promise<string> {
  const response = await fetch('/api/ai/knowledge-from-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  
  if (!response.ok) {
    throw new Error('URL content extraction failed');
  }
  
  const data = await response.json();
  return data.content;
}

export async function processAndAnalyzeContent(
  text: string,
  options: {
    title: string;
    sourceType: ProcessedContent['sourceType'];
    sourceUrl?: string;
    originalFileName?: string;
  }
): Promise<ProcessedContent> {
  const analysisPrompt = `Analyze the following educational content and extract:
1. A concise summary (2-3 sentences)
2. List of main topics (as JSON array)
3. Key concepts with brief explanations (as JSON object)
4. Determine the difficulty level (basic, intermediate, advanced)

Content:
${text.slice(0, 10000)}

Respond in JSON format:
{
  "summary": "...",
  "topics": ["topic1", "topic2"],
  "keyConcepts": {"concept": "brief explanation"},
  "difficulty": "basic|intermediate|advanced"
}`;

  const openai = getOpenAI();
  const [analysisResponse] = await Promise.all([
    openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert educational content analyzer.' },
        { role: 'user', content: analysisPrompt },
      ],
      temperature: 0.3,
    }),
  ]);

  const analysis = JSON.parse(analysisResponse.choices[0]?.message?.content || '{}');

  const processedContent: ProcessedContent = {
    title: options.title,
    content: text,
    summary: analysis.summary || 'Content processed successfully.',
    topics: analysis.topics || [],
    keyConcepts: Object.entries(analysis.keyConcepts || {}).map(([concept, desc]) => ({
      concept,
      description: desc as string,
    })) as any,
    sourceType: options.sourceType,
    sourceUrl: options.sourceUrl,
    metadata: {
      originalFileName: options.originalFileName,
      processedAt: new Date().toISOString(),
      tokensUsed: analysisResponse.usage?.total_tokens || 0,
    },
  };

  return processedContent;
}

export async function generateTopicsFromContent(
  content: ProcessedContent,
  count: number = 10
): Promise<ExtractedTopic[]> {
  const topicPrompt = `Based on the following content, generate ${count} learning topics with subtopics.

Content Summary: ${content.summary}
Topics: ${content.topics.join(', ')}

Respond as JSON array:
[{
  "name": "topic name",
  "description": "brief description",
  "subtopics": ["sub1", "sub2"],
  "difficulty": "basic|intermediate|advanced"
}]`;

  const openai = getOpenAI();
  const [response] = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert curriculum designer.' },
      { role: 'user', content: topicPrompt },
    ],
    temperature: 0.7,
  });

  try {
    return JSON.parse(response.choices[0]?.message?.content || '[]');
  } catch {
    return [];
  }
}

export async function saveProcessedContent(
  content: ProcessedContent,
  userId: string
): Promise<string> {
  const supabase = createServerSupabaseClient() as any;
  
  const { data, error } = await supabase
    .from('ai_processed_content')
    .insert({
      title: content.title,
      content: content.content,
      summary: content.summary,
      topics: content.topics,
      key_concepts: content.keyConcepts,
      source_type: content.sourceType,
      source_url: content.sourceUrl,
      metadata: content.metadata,
      processed_by: userId,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data?.id;
}

export async function getProcessedContent(
  contentId: string
): Promise<ProcessedContent | null> {
  const supabase = createServerSupabaseClient() as any;
  
  const { data, error } = await supabase
    .from('ai_processed_content')
    .select('*')
    .eq('id', contentId)
    .single();

  if (error || !data) return null;
  
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    summary: data.summary,
    topics: data.topics,
    keyConcepts: data.key_concepts,
    sourceType: data.source_type,
    sourceUrl: data.source_url,
    metadata: data.metadata,
  };
}

export async function listProcessedContent(
  options: {
    limit?: number;
    offset?: number;
    sourceType?: ProcessedContent['sourceType'];
  } = {}
): Promise<ProcessedContent[]> {
  const supabase = createServerSupabaseClient() as any;
  
  let query = supabase
    .from('ai_processed_content')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.sourceType) {
    query = query.eq('source_type', options.sourceType);
  }

  const { data, error } = await query
    .range(options.offset || 0, (options.limit || 20) - 1);

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    content: item.content,
    summary: item.summary,
    topics: item.topics,
    keyConcepts: item.key_concepts,
    sourceType: item.source_type,
    sourceUrl: item.source_url,
    metadata: item.metadata,
  }));
}
