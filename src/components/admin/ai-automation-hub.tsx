'use client';

import { useState, useEffect } from 'react';
import { 
  Bot, FileText, Video, Upload, Play, Settings, 
  CheckCircle, AlertCircle, Loader2, Sparkles,
  FileAudio, FileVideo, Globe, BookOpen, ClipboardList,
  Youtube, Activity, Users, BarChart3
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ProcessedContent {
  id: string;
  title: string;
  source_type: string;
  created_at: string;
}

interface VideoGeneration {
  id: string;
  status: string;
  style: string;
  youtube_url: string | null;
  created_at: string;
}

interface PerformanceMetrics {
  totalContent: number;
  totalVideos: number;
  totalDPP: number;
  avgScore: number;
}

export default function AIAutomationHub() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [recentContent, setRecentContent] = useState<ProcessedContent[]>([]);
  const [recentVideos, setRecentVideos] = useState<VideoGeneration[]>([]);

  const [formData, setFormData] = useState({
    action: 'full_pipeline',
    contentUrl: '',
    contentText: '',
    sourceType: 'url',
    title: '',
    subject: 'physics',
    style: 'classroom',
    language: 'english',
    topic: '',
    targetExam: 'jee-main',
    questionCount: 15,
    youtubePrivacy: 'unlisted',
    videoId: '',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: content } = await supabase
        .from('ai_processed_content')
        .select('id, title, source_type, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: videos } = await supabase
        .from('ai_video_generations')
        .select('id, status, style, youtube_url, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentContent(content || []);
      setRecentVideos(videos || []);

      const totalContent = (content || []).length;
      const totalVideos = (videos || []).filter(v => v.status === 'published').length;
      const totalDPP = 0;

      setMetrics({
        totalContent,
        totalVideos,
        totalDPP,
        avgScore: 85,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const runAutomation = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/ai/automation/hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Automation failed');
      }

      setResults(data);
      loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'content', label: 'Process Content', icon: FileText },
    { id: 'video', label: 'Generate Video', icon: Video },
    { id: 'dpp', label: 'Generate DPP', icon: ClipboardList },
    { id: 'full', label: 'Full Pipeline', icon: Sparkles },
    { id: 'youtube', label: 'YouTube Upload', icon: Youtube },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bot className="w-8 h-8 text-blue-600" />
            AI Automation Hub
          </h1>
          <p className="text-gray-600 mt-2">
            Automated content processing, video generation, DPP creation, and YouTube publishing
          </p>
        </div>

        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Processed Content</p>
                  <p className="text-2xl font-bold">{metrics.totalContent}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Video className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Videos Generated</p>
                  <p className="text-2xl font-bold">{metrics.totalVideos}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <ClipboardList className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">DPP Generated</p>
                  <p className="text-2xl font-bold">{metrics.totalDPP}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Activity className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Performance</p>
                  <p className="text-2xl font-bold">{metrics.avgScore}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="border-b">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">Recent Processed Content</h3>
                    <div className="space-y-2">
                      {recentContent.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {item.source_type === 'pdf' && <FileText className="w-4 h-4 text-red-500" />}
                            {item.source_type === 'video' && <FileVideo className="w-4 h-4 text-purple-500" />}
                            {item.source_type === 'audio' && <FileAudio className="w-4 h-4 text-blue-500" />}
                            {item.source_type === 'url' && <Globe className="w-4 h-4 text-green-500" />}
                            <span className="text-sm font-medium">{item.title}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                      {recentContent.length === 0 && (
                        <p className="text-gray-500 text-sm">No content processed yet</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-4">Recent Video Generations</h3>
                    <div className="space-y-2">
                      {recentVideos.map((video) => (
                        <div key={video.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {video.status === 'published' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : video.status === 'failed' ? (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                            )}
                            <span className="text-sm font-medium">{video.style} video</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              video.status === 'published' ? 'bg-green-100 text-green-700' :
                              video.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {video.status}
                            </span>
                            {video.youtube_url && (
                              <a href={video.youtube_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                                YouTube
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                      {recentVideos.length === 0 && (
                        <p className="text-gray-500 text-sm">No videos generated yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'content' || activeTab === 'full') && (
              <div className="space-y-4">
                <h3 className="font-semibold">Content Processing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source Type
                    </label>
                    <select
                      value={formData.sourceType}
                      onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="url">URL</option>
                      <option value="pdf">PDF</option>
                      <option value="ebook">eBook</option>
                      <option value="audio">Audio</option>
                      <option value="video">Video</option>
                      <option value="document">Document</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter title"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content URL
                    </label>
                    <input
                      type="url"
                      value={formData.contentUrl}
                      onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Or Paste Content Text
                    </label>
                    <textarea
                      value={formData.contentText}
                      onChange={(e) => setFormData({ ...formData, contentText: e.target.value })}
                      placeholder="Paste content here..."
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'video' || activeTab === 'full') && (
              <div className="space-y-4 mt-6">
                <h3 className="font-semibold">Video Generation</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="physics">Physics</option>
                      <option value="chemistry">Chemistry</option>
                      <option value="mathematics">Mathematics</option>
                      <option value="biology">Biology</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Style
                    </label>
                    <select
                      value={formData.style}
                      onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="classroom">Classroom</option>
                      <option value="tutorial">Tutorial</option>
                      <option value="presentation">Presentation</option>
                      <option value="demo">Demo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="english">English</option>
                      <option value="hinglish">Hinglish</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'dpp') && (
              <div className="space-y-4 mt-6">
                <h3 className="font-semibold">DPP Generation</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Topic
                    </label>
                    <input
                      type="text"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="e.g., Newton's Laws"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Exam
                    </label>
                    <select
                      value={formData.targetExam}
                      onChange={(e) => setFormData({ ...formData, targetExam: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="jee-main">JEE Main</option>
                      <option value="jee-advanced">JEE Advanced</option>
                      <option value="neet">NEET</option>
                      <option value="boards">Boards</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question Count
                    </label>
                    <input
                      type="number"
                      value={formData.questionCount}
                      onChange={(e) => setFormData({ ...formData, questionCount: parseInt(e.target.value) })}
                      min={5}
                      max={30}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'youtube') && (
              <div className="space-y-4 mt-6">
                <h3 className="font-semibold">YouTube Upload</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video ID
                    </label>
                    <input
                      type="text"
                      value={formData.videoId || ''}
                      onChange={(e) => setFormData({ ...formData, videoId: e.target.value })}
                      placeholder="Enter video ID from video generation"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Privacy
                    </label>
                    <select
                      value={formData.youtubePrivacy}
                      onChange={(e) => setFormData({ ...formData, youtubePrivacy: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="private">Private</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex gap-4">
              <button
                onClick={runAutomation}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Run Automation
                  </>
                )}
              </button>
              <select
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                className="px-4 py-3 border rounded-lg"
              >
                <option value="process_content">Process Content Only</option>
                <option value="generate_video">Generate Video Only</option>
                <option value="generate_dpp">Generate DPP Only</option>
                <option value="generate_mock_test">Generate Mock Test</option>
                <option value="full_pipeline">Full Pipeline</option>
                <option value="upload_youtube">Upload to YouTube</option>
              </select>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {results && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                  <CheckCircle className="w-5 h-5" />
                  Success!
                </div>
                <pre className="text-sm text-gray-700 overflow-auto">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
