'use client';

import { useState } from 'react';
import {
  FileQuestion,
  Play,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  Brain,
  Wand2,
  Calendar,
  Target
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
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [generatedKind, setGeneratedKind] = useState<'lecture' | 'question-set' | 'dpp' | 'mock-test' | 'calendar' | 'growth'>('lecture');
  const [error, setError] = useState<string | null>(null);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

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
    syllabusContext: '',
    generationDays: 365,
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

      setGeneratedKind('lecture');
      setGeneratedContent(data.data?.lecture || null);
      setSavedSuccessfully(Boolean(data.data?.savedId));
      setValidationResult(null);
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

      setGeneratedKind('question-set');
      setGeneratedContent(data.data?.questionSet || null);
      setSavedSuccessfully(Boolean(data.data?.savedId));
      setValidationResult(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const runAdminSuite = async (action: 'generate_dpp' | 'generate_mock_test' | 'academic_calendar' | 'growth_assets') => {
    if (!config.topic) {
      setError('Please select a topic');
      return;
    }

    setGenerating(true);
    setError(null);
    setSavedSuccessfully(false);

    try {
      const response = await fetch('/api/ai/admin-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          teacherId: config.facultyId,
          topic: config.topic,
          subject: config.subject,
          targetExam: config.targetExam,
          duration: config.duration,
          questionCount: config.questionCount,
          syllabusContext: config.syllabusContext,
          generationDays: config.generationDays,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete AI automation task');
      }

      if (action === 'generate_dpp') {
        setGeneratedKind('dpp');
      } else if (action === 'generate_mock_test') {
        setGeneratedKind('mock-test');
      } else if (action === 'academic_calendar') {
        setGeneratedKind('calendar');
      } else {
        setGeneratedKind('growth');
      }

      setGeneratedContent(data.data);
      setValidationResult(data.data?.validation || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const validateCurrentContent = async () => {
    if (!generatedContent) {
      setError('Generate content first, then validate it.');
      return;
    }

    if (generatedKind === 'calendar' || generatedKind === 'growth') {
      setError('Quality validation is available for lectures, question sets, DPP, and mock tests only.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/admin-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          content: generatedContent,
          contentKind: generatedKind === 'lecture' ? 'lecture' : generatedKind === 'question-set' ? 'question-set' : generatedKind === 'dpp' ? 'dpp' : 'mock-test',
          topic: config.topic,
          subject: config.subject,
          targetExam: config.targetExam,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Validation failed');
      }

      setValidationResult(data.data);
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
              <div className="md:col-span-2">
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

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Syllabus Context / Admin Material</label>
                <textarea
                  value={config.syllabusContext}
                  onChange={e => setConfig({ ...config, syllabusContext: e.target.value })}
                  rows={3}
                  placeholder="Paste syllabus notes, chapter scope, or admin instructions for controlled generation..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
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

              <button
                onClick={() => runAdminSuite('generate_dpp')}
                disabled={generating}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white py-4 px-6 rounded-xl font-medium hover:from-amber-600 hover:to-orange-700 transition disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Target className="w-5 h-5" />
                )}
                Generate DPP
              </button>

              <button
                onClick={() => runAdminSuite('generate_mock_test')}
                disabled={generating}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white py-4 px-6 rounded-xl font-medium hover:from-fuchsia-700 hover:to-violet-700 transition disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                Generate Mock Test
              </button>

              <button
                onClick={() => runAdminSuite('academic_calendar')}
                disabled={generating}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-cyan-600 text-white py-4 px-6 rounded-xl font-medium hover:from-sky-700 hover:to-cyan-700 transition disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Calendar className="w-5 h-5" />
                )}
                365-Day Calendar
              </button>

              <button
                onClick={() => runAdminSuite('growth_assets')}
                disabled={generating}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-slate-800 to-slate-600 text-white py-4 px-6 rounded-xl font-medium hover:from-slate-900 hover:to-slate-700 transition disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Wand2 className="w-5 h-5" />
                )}
                Growth Assets
              </button>
            </div>

            <button
              onClick={validateCurrentContent}
              disabled={generating || !generatedContent || generatedKind === 'calendar' || generatedKind === 'growth'}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Validate Current Content
            </button>

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
                {generatedKind === 'question-set' && generatedContent?.questions ? (
                  <div className="space-y-4">
                    <p className="text-slate-600">Generated {generatedContent.questions.length} questions</p>
                    {generatedContent.questions.slice(0, 3).map((q: any, i: number) => (
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
                ) : generatedKind === 'lecture' ? (
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
                ) : generatedKind === 'dpp' ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">{generatedContent.title}</h3>
                    <p className="text-slate-600">
                      Blueprint: {generatedContent.blueprint?.easy} easy, {generatedContent.blueprint?.medium} medium, {generatedContent.blueprint?.hard} hard
                    </p>
                    <div className="space-y-3">
                      {(generatedContent.questions || []).slice(0, 5).map((q: any, i: number) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-lg">
                          <p className="font-medium">{i + 1}. {q.question}</p>
                          <p className="text-sm text-slate-500 uppercase">{q.difficulty}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : generatedKind === 'mock-test' ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">{generatedContent.title}</h3>
                    <p className="text-slate-600">
                      {generatedContent.questionCount} questions | {generatedContent.durationMinutes} minutes | {generatedContent.totalMarks} marks
                    </p>
                    {generatedContent.sections?.map((section: any, i: number) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-medium">{section.name}</h4>
                        <p className="text-sm text-slate-600">{section.questions?.length || 0} questions generated</p>
                      </div>
                    ))}
                  </div>
                ) : generatedKind === 'calendar' ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">{generatedContent.title}</h3>
                    <p className="text-slate-600">{generatedContent.summary}</p>
                    <div className="space-y-3">
                      {(generatedContent.schedule || []).slice(0, 5).map((day: any) => (
                        <div key={day.date} className="p-4 bg-slate-50 rounded-lg">
                          <p className="font-medium">{day.date}</p>
                          <p className="text-sm text-slate-600">{day.lecture}</p>
                          <p className="text-sm text-slate-600">{day.dpp}</p>
                          {day.mockTest ? <p className="text-sm text-indigo-600">{day.mockTest}</p> : null}
                          {day.revisionTest ? <p className="text-sm text-amber-600">{day.revisionTest}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Growth Engine Output</h3>
                    <div className="space-y-3">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="font-medium">SEO Page</p>
                        <p className="text-sm text-slate-600">{generatedContent.seoPage?.title}</p>
                        <p className="text-sm text-slate-500">{generatedContent.seoPage?.metaDescription}</p>
                      </div>
                      {['youtube', 'telegram', 'instagram', 'facebook', 'linkedin'].map((key) => (
                        <div key={key} className="p-4 bg-slate-50 rounded-lg">
                          <p className="font-medium uppercase">{key}</p>
                          <p className="text-sm text-slate-600 whitespace-pre-line">
                            {typeof generatedContent[key] === 'string'
                              ? generatedContent[key]
                              : JSON.stringify(generatedContent[key], null, 2)}
                          </p>
                        </div>
                      ))}
                    </div>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Calendar Horizon (days)</label>
                <input
                  type="number"
                  value={config.generationDays}
                  onChange={e => setConfig({ ...config, generationDays: parseInt(e.target.value || '365', 10) })}
                  min={30}
                  max={365}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {validationResult && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Content Quality Validator
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-slate-500">Overall Score</p>
                  <p className="text-xl font-bold text-slate-900">{validationResult.overallScore}/100</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-slate-500">Answer Accuracy</p>
                  <p className="text-xl font-bold text-slate-900">{validationResult.answerAccuracy}/100</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-slate-500">Formula Correctness</p>
                  <p className="text-xl font-bold text-slate-900">{validationResult.formulaCorrectness}/100</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-slate-500">Syllabus Alignment</p>
                  <p className="text-xl font-bold text-slate-900">{validationResult.syllabusAlignment}/100</p>
                </div>
              </div>
              {validationResult.issues?.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {validationResult.issues.map((issue: any, index: number) => (
                    <div key={`${issue.message}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <span className="font-semibold uppercase">{issue.severity}</span> - {issue.message}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Validation passed without material issues.
                </div>
              )}
            </div>
          )}

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
