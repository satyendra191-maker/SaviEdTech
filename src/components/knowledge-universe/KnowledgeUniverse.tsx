'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Atom, 
  FlaskConical, 
  Calculator, 
  Dna, 
  ArrowLeft,
  BookOpen,
  Play,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface SubjectGalaxy {
  id: string;
  name: string;
  color: string;
  topics: TopicStar[];
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

interface TopicStar {
  id: string;
  name: string;
  mastery: number;
  simulationId?: string;
  estimatedTime?: string;
}

const subjectGalaxies: SubjectGalaxy[] = [
  {
    id: 'physics',
    name: 'Physics Galaxy',
    color: '#3b82f6',
    icon: Atom,
    topics: [
      { id: 'mechanics', name: 'Mechanics', mastery: 75, simulationId: 'projectile-motion', estimatedTime: '45 min' },
      { id: 'thermodynamics', name: 'Thermodynamics', mastery: 60, simulationId: 'heat-transfer', estimatedTime: '40 min' },
      { id: 'optics', name: 'Optics', mastery: 45, simulationId: 'light-refraction', estimatedTime: '35 min' },
      { id: 'electromagnetism', name: 'Electromagnetism', mastery: 30, simulationId: 'electric-field', estimatedTime: '50 min' },
      { id: 'waves', name: 'Waves & Sound', mastery: 55, simulationId: 'wave-interference', estimatedTime: '30 min' },
    ]
  },
  {
    id: 'chemistry',
    name: 'Chemistry Galaxy',
    color: '#10b981',
    icon: FlaskConical,
    topics: [
      { id: 'organic', name: 'Organic Chemistry', mastery: 70, simulationId: 'bond-formation', estimatedTime: '55 min' },
      { id: 'inorganic', name: 'Inorganic Chemistry', mastery: 50, simulationId: 'periodic-table', estimatedTime: '40 min' },
      { id: 'physical', name: 'Physical Chemistry', mastery: 40, simulationId: 'reaction-kinetics', estimatedTime: '45 min' },
      { id: 'electrochemistry', name: 'Electrochemistry', mastery: 35, simulationId: 'electrolysis', estimatedTime: '35 min' },
    ]
  },
  {
    id: 'mathematics',
    name: 'Mathematics Galaxy',
    color: '#8b5cf6',
    icon: Calculator,
    topics: [
      { id: 'algebra', name: 'Algebra', mastery: 80, simulationId: 'quadratic-roots', estimatedTime: '30 min' },
      { id: 'calculus', name: 'Calculus', mastery: 55, simulationId: 'derivative-visualization', estimatedTime: '50 min' },
      { id: 'geometry', name: 'Coordinate Geometry', mastery: 65, simulationId: 'conic-sections', estimatedTime: '40 min' },
      { id: 'trigonometry', name: 'Trigonometry', mastery: 45, simulationId: 'trig-transformations', estimatedTime: '35 min' },
    ]
  },
  {
    id: 'biology',
    name: 'Biology Galaxy',
    color: '#f59e0b',
    icon: Dna,
    topics: [
      { id: 'cell-biology', name: 'Cell Biology', mastery: 72, simulationId: 'cell-structure', estimatedTime: '45 min' },
      { id: 'genetics', name: 'Genetics', mastery: 58, simulationId: 'dna-replication', estimatedTime: '50 min' },
      { id: 'human-anatomy', name: 'Human Anatomy', mastery: 40, simulationId: 'organ-systems', estimatedTime: '55 min' },
      { id: 'ecology', name: 'Ecosystems', mastery: 50, simulationId: 'food-web', estimatedTime: '30 min' },
    ]
  },
];

function getMasteryColor(mastery: number): string {
  if (mastery >= 70) return 'bg-green-500';
  if (mastery >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getMasteryLabel(mastery: number): string {
  if (mastery >= 70) return 'Mastered';
  if (mastery >= 50) return 'Learning';
  return 'Needs Work';
}

export default function KnowledgeUniverse() {
  const [selectedGalaxy, setSelectedGalaxy] = useState<SubjectGalaxy | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-yellow-400" />
              AI Knowledge Universe
            </h1>
            <p className="text-white/60 mt-2">Explore your syllabus as an interactive galaxy</p>
          </div>
          
          <Link 
            href="/experiments"
            className="hidden md:inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl transition-colors"
          >
            <FlaskConical className="w-5 h-5" />
            Virtual Labs
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {subjectGalaxies.map((galaxy) => {
            const Icon = galaxy.icon;
            const avgMastery = Math.round(galaxy.topics.reduce((acc, t) => acc + t.mastery, 0) / galaxy.topics.length);
            
            return (
              <button
                key={galaxy.id}
                onClick={() => setSelectedGalaxy(galaxy)}
                className="relative group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-left hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ 
                    background: `radial-gradient(circle at 50% 50%, ${galaxy.color}20 0%, transparent 70%)` 
                  }} 
                />
                <div className="relative">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${galaxy.color}20` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: galaxy.color }} />
                  </div>
                  <h3 className="text-white font-bold text-lg">{galaxy.name}</h3>
                  <p className="text-white/60 text-sm">{galaxy.topics.length} Topics</p>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/60">Progress</span>
                      <span className="text-white">{avgMastery}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ width: `${avgMastery}%`, backgroundColor: galaxy.color }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedGalaxy ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedGalaxy(null)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <selectedGalaxy.icon className="w-6 h-6" style={{ color: selectedGalaxy.color }} />
                    {selectedGalaxy.name}
                  </h2>
                  <p className="text-white/60">{selectedGalaxy.topics.length} topics to explore</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedGalaxy.topics.map((topic) => (
                <div
                  key={topic.id}
                  className="relative bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-white font-semibold">{topic.name}</h3>
                    <div className={`w-3 h-3 rounded-full ${getMasteryColor(topic.mastery)}`} />
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-white/60">
                      <Clock className="w-4 h-4" />
                      {topic.estimatedTime}
                    </div>
                    <span className="text-white/40">|</span>
                    <span className="text-white/60">{getMasteryLabel(topic.mastery)}</span>
                  </div>

                  <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{ width: `${topic.mastery}%`, backgroundColor: selectedGalaxy.color }}
                    />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/simulations/${topic.simulationId}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-2 rounded-lg transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Simulate
                    </Link>
                    <Link
                      href={`/learn/${selectedGalaxy.id}/${topic.id}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm py-2 rounded-lg transition-colors"
                    >
                      <BookOpen className="w-4 h-4" />
                      Learn
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Select a Galaxy to Begin</h3>
            <p className="text-white/60 max-w-md mx-auto">
              Click on any subject galaxy above to explore its topics, launch simulations, and continue your learning journey.
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link 
            href="/experiments"
            className="md:hidden inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl transition-colors"
          >
            <FlaskConical className="w-5 h-5" />
            Virtual Labs
          </Link>
        </div>
      </div>
    </div>
  );
}
