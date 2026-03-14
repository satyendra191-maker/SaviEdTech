'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  FlaskConical, 
  Atom, 
  Dna, 
  Calculator, 
  ChevronRight,
  Play,
  Download,
  BookOpen,
  Beaker,
  Microscope,
  Zap,
  Eye,
  CheckCircle,
  Clock,
  CreditCard,
  Info,
  Youtube
} from 'lucide-react';

const classes = [6, 7, 8, 9, 10, 11, 12];

const PRICING = {
  '6-10': { price: 500, label: 'Class 6-10' },
  '11-12': { price: 700, label: 'Class 11-12' }
};

const subjects = [
  { id: 'physics', name: 'Physics', icon: Atom, color: '#3b82f6' },
  { id: 'chemistry', name: 'Chemistry', icon: FlaskConical, color: '#10b981' },
  { id: 'biology', name: 'Biology', icon: Dna, color: '#f59e0b' },
  { id: 'mathematics', name: 'Mathematics', icon: Calculator, color: '#8b5cf6' },
];

const experimentsByClass: Record<number, Record<string, Experiment[]>> = {
  6: {
    physics: [
      { id: 'motion-toy', name: 'Motion of a Toy Car', type: 'physics', duration: '30 min', hasSimulation: true },
      { id: 'magnets', name: 'Magnets and Their Properties', type: 'physics', duration: '25 min', hasSimulation: true },
      { id: 'light-shadow', name: 'Light and Shadows', type: 'physics', duration: '20 min', hasSimulation: true },
    ],
    chemistry: [
      { id: 'separating-mixtures', name: 'Separation of Mixtures', type: 'chemistry', duration: '35 min', hasSimulation: true },
      { id: 'water-states', name: 'States of Water', type: 'chemistry', duration: '25 min', hasSimulation: true },
    ],
    biology: [
      { id: 'plant-observation', name: 'Types of Plants', type: 'biology', duration: '30 min', hasSimulation: true },
      { id: 'living-nonliving', name: 'Living and Non-Living Things', type: 'biology', duration: '20 min', hasSimulation: true },
    ],
  },
  7: {
    physics: [
      { id: 'heat-transfer', name: 'Heat Transfer', type: 'physics', duration: '40 min', hasSimulation: true },
      { id: 'light-reflection', name: 'Light Reflection', type: 'physics', duration: '35 min', hasSimulation: true },
      { id: 'electric-circuit', name: 'Electric Circuits', type: 'physics', duration: '45 min', hasSimulation: true },
    ],
    chemistry: [
      { id: 'acid-base', name: 'Acids and Bases', type: 'chemistry', duration: '40 min', hasSimulation: true },
      { id: 'physical-chemical', name: 'Physical vs Chemical Changes', type: 'chemistry', duration: '30 min', hasSimulation: true },
    ],
    biology: [
      { id: 'nutrition', name: 'Nutrition in Plants', type: 'biology', duration: '35 min', hasSimulation: true },
      { id: 'respiration', name: 'Respiration', type: 'biology', duration: '30 min', hasSimulation: true },
    ],
  },
  8: {
    physics: [
      { id: 'friction', name: 'Friction', type: 'physics', duration: '40 min', hasSimulation: true },
      { id: 'force-pressure', name: 'Force and Pressure', type: 'physics', duration: '45 min', hasSimulation: true },
      { id: 'sound', name: 'Sound', type: 'physics', duration: '35 min', hasSimulation: true },
    ],
    chemistry: [
      { id: 'combustion', name: 'Combustion', type: 'chemistry', duration: '40 min', hasSimulation: true },
      { id: 'metals-nonmetals', name: 'Metals and Non-Metals', type: 'chemistry', duration: '45 min', hasSimulation: true },
    ],
    biology: [
      { id: 'cell-structure', name: 'Cell Structure', type: 'biology', duration: '40 min', hasSimulation: true },
      { id: 'crop-production', name: 'Crop Production', type: 'biology', duration: '35 min', hasSimulation: true },
    ],
  },
  9: {
    physics: [
      { id: 'motion', name: 'Motion', type: 'physics', duration: '45 min', hasSimulation: true },
      { id: 'newtons-laws', name: "Newton's Laws of Motion", type: 'physics', duration: '50 min', hasSimulation: true },
      { id: 'gravitation', name: 'Gravitation', type: 'physics', duration: '45 min', hasSimulation: true },
      { id: 'work-energy', name: 'Work and Energy', type: 'physics', duration: '40 min', hasSimulation: true },
    ],
    chemistry: [
      { id: 'matter', name: 'Matter', type: 'chemistry', duration: '40 min', hasSimulation: true },
      { id: 'atoms-molecules', name: 'Atoms and Molecules', type: 'chemistry', duration: '45 min', hasSimulation: true },
    ],
    biology: [
      { id: 'cell-division', name: 'Cell Division', type: 'biology', duration: '40 min', hasSimulation: true },
      { id: 'tissues', name: 'Tissues', type: 'biology', duration: '35 min', hasSimulation: true },
    ],
  },
  10: {
    physics: [
      { id: 'ohms-law', name: "Ohm's Law", type: 'physics', duration: '45 min', hasSimulation: true },
      { id: 'lens', name: 'Focal Length of Lens', type: 'physics', duration: '50 min', hasSimulation: true },
      { id: 'magnetic-field', name: 'Magnetic Field', type: 'physics', duration: '45 min', hasSimulation: true },
      { id: 'refraction', name: 'Refraction', type: 'physics', duration: '40 min', hasSimulation: true },
    ],
    chemistry: [
      { id: 'chemical-reactions', name: 'Chemical Reactions', type: 'chemistry', duration: '45 min', hasSimulation: true },
      { id: 'acids-bases', name: 'Acids, Bases and Salts', type: 'chemistry', duration: '50 min', hasSimulation: true },
    ],
    biology: [
      { id: 'inheritance', name: 'Heredity', type: 'biology', duration: '40 min', hasSimulation: true },
      { id: 'evolution', name: 'Evolution', type: 'biology', duration: '35 min', hasSimulation: true },
    ],
  },
  11: {
    physics: [
      { id: 'simple-pendulum', name: 'Simple Pendulum', type: 'physics', duration: '50 min', hasSimulation: true },
      { id: 'vernier-calipers', name: 'Vernier Calipers', type: 'physics', duration: '45 min', hasSimulation: true },
      { id: 'young-modulus', name: "Young's Modulus", type: 'physics', duration: '55 min', hasSimulation: true },
    ],
    chemistry: [
      { id: 'titration', name: 'Titration', type: 'chemistry', duration: '50 min', hasSimulation: true },
      { id: 'equilibrium', name: 'Chemical Equilibrium', type: 'chemistry', duration: '45 min', hasSimulation: true },
    ],
    biology: [
      { id: ' microscope', name: 'Microscope', type: 'biology', duration: '40 min', hasSimulation: true },
      { id: 'cell-organelles', name: 'Cell Organelles', type: 'biology', duration: '45 min', hasSimulation: true },
    ],
  },
  12: {
    physics: [
      { id: 'meter-bridge', name: 'Meter Bridge', type: 'physics', duration: '55 min', hasSimulation: true },
      { id: 'semiconductor', name: 'Semiconductor Diode', type: 'physics', duration: '50 min', hasSimulation: true },
      { id: 'photoelectric', name: 'Photoelectric Effect', type: 'physics', duration: '45 min', hasSimulation: true },
    ],
    chemistry: [
      { id: 'electrolysis', name: 'Electrolysis', type: 'chemistry', duration: '50 min', hasSimulation: true },
      { id: 'organic-compounds', name: 'Organic Compounds', type: 'chemistry', duration: '55 min', hasSimulation: true },
    ],
    biology: [
      { id: 'dna-extraction', name: 'DNA Extraction', type: 'biology', duration: '45 min', hasSimulation: true },
      { id: 'blood-groups', name: 'Blood Groups', type: 'biology', duration: '40 min', hasSimulation: true },
    ],
  },
};

interface Experiment {
  id: string;
  name: string;
  type: string;
  duration: string;
  hasSimulation: boolean;
}

export default function ExperimentsPage() {
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const currentExperiments = selectedClass && selectedSubject 
    ? experimentsByClass[selectedClass]?.[selectedSubject] || []
    : [];

  const getSubjectColor = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.color || '#6b7280';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 flex items-center gap-3">
              <Beaker className="w-8 h-8 text-indigo-600" />
              Virtual Lab Experiments
            </h1>
            <p className="text-slate-600 mt-2">Interactive experiments for Classes 6-12</p>
          </div>
          
          <Link 
            href="/knowledge-universe"
            className="hidden md:inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl transition-colors"
          >
            <Zap className="w-5 h-5" />
            Knowledge Universe
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-8">
          {classes.map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`p-3 rounded-xl text-center font-semibold transition-all ${
                selectedClass === cls 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'bg-white text-slate-600 hover:bg-indigo-50'
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                Virtual Lab Subscription
              </h3>
              <p className="text-indigo-100 mt-1">Optional add-on to your existing course</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 text-center">
                <p className="text-indigo-100 text-sm">Class 6-10</p>
                <p className="text-white font-bold text-2xl">₹500</p>
                <p className="text-indigo-200 text-xs">Excluding GST</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 text-center">
                <p className="text-indigo-100 text-sm">Class 11-12</p>
                <p className="text-white font-bold text-2xl">₹700</p>
                <p className="text-indigo-200 text-xs">Excluding GST</p>
              </div>
            </div>
            <button className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors">
              Subscribe Now
            </button>
          </div>
          <div className="flex items-center gap-4 mt-4 text-indigo-100 text-sm">
            <div className="flex items-center gap-1">
              <Youtube className="w-4 h-4" />
              <span>YouTube Video Access</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              <span>Interactive Simulations</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              <span>Download Journals</span>
            </div>
          </div>
        </div>

        {selectedClass ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {subjects.map(subject => {
              const Icon = subject.icon;
              const experimentCount = experimentsByClass[selectedClass]?.[subject.id]?.length || 0;
              
              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`relative p-6 rounded-2xl text-left transition-all ${
                    selectedSubject === subject.id
                      ? 'bg-white ring-2 ring-indigo-500 shadow-lg'
                      : 'bg-white hover:shadow-md'
                  }`}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${subject.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: subject.color }} />
                  </div>
                  <h3 className="font-bold text-slate-900">{subject.name}</h3>
                  <p className="text-sm text-slate-500">{experimentCount} experiments</p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center mb-8">
            <Microscope className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Class</h3>
            <p className="text-slate-600">Choose your class to see available experiments</p>
          </div>
        )}

        {selectedSubject && selectedClass && (
          <div className="bg-white rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                {(() => {
                  const subject = subjects.find(s => s.id === selectedSubject);
                  const Icon = subject?.icon || Beaker;
                  return <Icon className="w-6 h-6" style={{ color: subject?.color }} />;
                })()}
                {subjects.find(s => s.id === selectedSubject)?.name} Experiments
              </h2>
              <span className="text-slate-500">{currentExperiments.length} experiments available</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentExperiments.map((experiment) => (
                <div
                  key={experiment.id}
                  className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">{experiment.name}</h3>
                    {experiment.hasSimulation && (
                      <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Sim
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {experiment.duration}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/simulations/${experiment.id}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-2 rounded-lg transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Start
                    </Link>
                    <Link
                      href={`/journal/${experiment.id}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm py-2 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Journal
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link 
            href="/knowledge-universe"
            className="md:hidden inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl transition-colors"
          >
            <Zap className="w-5 h-5" />
            Knowledge Universe
          </Link>
        </div>
      </div>
    </div>
  );
}
