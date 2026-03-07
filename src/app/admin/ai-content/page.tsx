'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import {
  Sparkles,
  BookOpen,
  FileQuestion,
  Play,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  Brain,
  Wand2,
  Calendar,
  Target,
  Users
} from 'lucide-react';

const FACULTY_MEMBERS = [
  { id: 'dharmendra', name: 'Dharmendra Sir', subject: 'Physics', color: 'blue' },
  { id: 'harendra', name: 'Harendra Sir', subject: 'Chemistry', color: 'emerald' },
  { id: 'ravindra', name: 'Ravindra Sir', subject: 'Mathematics', color: 'amber' },
  { id: 'arvind', name: 'Arvind Sir', subject: 'Biology', color: 'red' },
];

const SAMPLE_TOPICS: Record<string, string[]> = {
  physics: [
    'Laws of Motion',
    'Work, Energy and Power',
    'Kinematics',
    'Gravitation',
    'Thermodynamics',
    'Wave Motion',
    'Electrostatics',
    'Current Electricity',
    'Magnetic Effects',
    'Optics',
    'Modern Physics',
  ],
  chemistry: [
    'Atomic Structure',
    'Chemical Bonding',
    'Thermodynamics',
    'Equilibrium',
    'Kinetics',
    'Electrochemistry',
    'Surface Chemistry',
    'Coordination Compounds',
    'Organic Chemistry Basics',
    'Hydrocarbons',
  ],
  mathematics: [
    'Sets and Relations',
    'Complex Numbers',
    'Quadratic Equations',
    'Matrices and Determinants',
    'Permutations and Combinations',
    'Binomial Theorem',
    'Limits and Derivatives',
    'Statistics',
    'Coordinate Geometry',
    'Trigonometry',
  ],
  biology: [
    'Cell Structure',
    'Biomolecules',
    'Cell Cycle',
    'Photosynthesis',
    'Respiration',
    'Digestion',
    'Circulation',
    'Excretion',
    'Neural Control',
    'Genetics',
  ],
};

export default function AIContentGeneratorPage() {
  const supabase = createBrowserSupabaseClient();
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  
  const [config, setConfig] = useState({
    facultyId: 'dharmendra',
    subject: 'physics',
    topic: '',
    subtopic: '',
    duration: 45,
    difficulty: 'intermediate',
    targetExam: 'jee-main',
    language: 'english',
    includeExamples: true,
    includePractice: true,
    questionCount: 15,
    questionDifficulty: 'mixed',
    questionType: 'mixed',
  });

  const topics = SAMPLE_TOPICS[config.subject] || [];

  const generateLecture = async () => {
    if (!config.topic) {
      setError('Please select a topic');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedContent(null);
    setSavedSuccessfully(false);

    try {
      const response = await fetch('/api/ai/generate-lecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: config.facultyId,
          topic: config.topic,
          subtopic: config.subtopic,
          duration: config.duration,
          difficulty: config.difficulty,
          targetExam: config.targetExam,
          language: config.language,
          includeExamples: config.includeExamples,
          includePractice: config.includePractice,
          saveToDatabase: true,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate lecture');
      }

      setGeneratedContent(data.lecture);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const generateQuestions = async () => {
    if (!config.topic) {
      setError('Please select a topic');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedContent(null);
    setSavedSuccessfully(false);

    try {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: config.facultyId,
          topic: config.topic,
          count: config.questionCount,
          difficulty: config.questionDifficulty,
          questionType: config.questionType,
          targetExam: config.targetExam,
          includeSolution: true,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      setGeneratedContent(data.questions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">AI Content Generator</h1>
            <p className="text-slate-600">Generate lectures and questions with AI faculty</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Content Configuration
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Faculty</label>
                <select
                  value={config.facultyId}
                  onChange={e => setConfig({ ...config, facultyId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {FACULTY_MEMBERS.map(f => (
                    <option key={f.id} value={f.id}>{f.name} - {f.subject}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <select
                  value={config.subject}
                  onChange={e => setConfig({ ...config, subject: e.target.value, topic: '' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="physics">Physics</option>
                  <option value="chemistry">Chemistry</option>
                  <option value="mathematics">Mathematics</option>
                  <option value="biology">Biology</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                <select
                  value={config.topic}
                  onChange={e => setConfig({ ...config, topic: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Topic</option>
                  {topics.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subtopic (Optional)</label>
                <input
                  type="text"
                  value={config.subtopic}
                  onChange={e => setConfig({ ...config, subtopic: e.target.value })}
                  placeholder="Specific subtopic"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={config.duration}
                  onChange={e => setConfig({ ...config, duration: parseInt(e.target.value) })}
                  min={15}
                  max={120}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                <select
                  value={config.difficulty}
                  onChange={e => setConfig({ ...config, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="basic">Basic</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Exam</label>
                <select
                  value={config.targetExam}
                  onChange={e => setConfig({ ...config, targetExam: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="jee-main">JEE Main</option>
                  <option value="jee-advanced">JEE Advanced</option>
                  <option value="neet">NEET</option>
                  <option value="boards">Board Exams</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                <select
                  value={config.language}
                  onChange={e => setConfig({ ...config, language: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="english">English</option>
                  <option value="hinglish">Hinglish</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-6 mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.includeExamples}
                  onChange={e => setConfig({ ...config, includeExamples: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm">Include Examples</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.includePractice}
                  onChange={e => setConfig({ ...config, includePractice: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm">Include Practice Problems</span>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Generate Content</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={generateLecture}
                disabled={generating}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                Generate Lecture
              </button>
              
              <button
                onClick={generateQuestions}
                disabled={generating}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 px-6 rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileQuestion className="w-5 h-5" />
                )}
                Generate Questions
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Generation Failed</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {savedSuccessfully && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Content Saved Successfully</p>
                  <p className="text-sm text-green-600">The content has been added to the database</p>
                </div>
              </div>
            )}
          </div>

          {generatedContent && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Generated Content Preview
              </h2>
              
              <div className="prose prose-slate max-w-none">
                {Array.isArray(generatedContent) ? (
                  <div className="space-y-4">
                    <p className="text-slate-600">Generated {generatedContent.length} questions</p>
                    {generatedContent.slice(0, 3).map((q: any, i: number) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-lg">
                        <p className="font-medium">{i + 1}. {q.question}</p>
                        {q.options && (
                          <ul className="mt-2 space-y-1 text-sm">
                            {q.options.map((opt: string, j: number) => (
                              <li key={j} className={q.correctAnswer === opt ? 'text-green-600 font-medium' : 'text-slate-600'}>
                                {String.fromCharCode(65 + j)}. {opt} {q.correctAnswer === opt && '✓'}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">{generatedContent.title}</h3>
                    <p className="text-slate-600">{generatedContent.description}</p>
                    {generatedContent.sections && (
                      <div className="space-y-3">
                        {generatedContent.sections.map((section: any, i: number) => (
                          <div key={i} className="p-4 bg-slate-50 rounded-lg">
                            <h4 className="font-medium">{section.title}</h4>
                            <p className="text-sm text-slate-600 mt-1">{section.content?.substring(0, 200)}...</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setConfig({ ...config, difficulty: 'basic', targetExam: 'jee-main' });
                }}
                className="w-full text-left px-4 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition"
              >
                <div className="font-medium">JEE Main Basic</div>
                <div className="text-sm text-white/70">Easy questions for fundamentals</div>
              </button>
              <button
                onClick={() => {
                  setConfig({ ...config, difficulty: 'advanced', targetExam: 'jee-advanced' });
                }}
                className="w-full text-left px-4 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition"
              >
                <div className="font-medium">JEE Advanced</div>
                <div className="text-sm text-white/70">High difficulty for toppers</div>
              </button>
              <button
                onClick={() => {
                  setConfig({ ...config, difficulty: 'intermediate', targetExam: 'neet' });
                }}
                className="w-full text-left px-4 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition"
              >
                <div className="font-medium">NEET Prep</div>
                <div className="text-sm text-white/70">Medical exam preparation</div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Question Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Number of Questions</label>
                <input
                  type="number"
                  value={config.questionCount}
                  onChange={e => setConfig({ ...config, questionCount: parseInt(e.target.value) })}
                  min={5}
                  max={50}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty Mix</label>
                <select
                  value={config.questionDifficulty}
                  onChange={e => setConfig({ ...config, questionDifficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="easy">Easy (70%)</option>
                  <option value="medium">Medium (50%)</option>
                  <option value="hard">Hard (70%)</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question Type</label>
                <select
                  value={config.questionType}
                  onChange={e => setConfig({ ...config, questionType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="mcq">MCQ Only</option>
                  <option value="numerical">Numerical</option>
                  <option value="assertion_reason">Assertion-Reason</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold mb-4">Daily Automation Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-sm">02:00 AM - Lectures</span>
                </div>
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-sm">02:30 AM - DPP</span>
                </div>
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-sm">03:00 AM - Revision</span>
                </div>
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-sm">03:30 AM - Analytics</span>
                </div>
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
