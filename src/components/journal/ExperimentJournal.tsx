'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Share2, 
  Beaker,
  Calendar,
  Clock,
  CheckCircle,
  Edit3,
  Save
} from 'lucide-react';

interface JournalProps {
  experimentId: string;
}

const experimentData: Record<string, {
  title: string;
  class: number;
  subject: string;
  objective: string;
  theory: string;
  materials: string[];
  procedure: string[];
  observations: { label: string; unit: string }[];
  precautions: string[];
}> = {
  'projectile-motion': {
    title: 'Projectile Motion',
    class: 11,
    subject: 'Physics',
    objective: 'To study the motion of a projectile launched at an angle and verify the equations of motion.',
    theory: 'A projectile is any object that is launched into the air and moves under the influence of gravity alone. The motion can be analyzed by resolving it into horizontal and vertical components. The horizontal motion has constant velocity, while vertical motion has constant acceleration due to gravity.',
    materials: ['Projectile launcher', 'Measuring tape', 'Stopwatch', 'Carbon paper', 'Measuring cylinder'],
    procedure: [
      'Set up the projectile launcher at a fixed angle (45° recommended)',
      'Launch the projectile from a known height',
      'Measure the horizontal range using measuring tape',
      'Record the time of flight using stopwatch',
      'Repeat for different angles and velocities',
      'Calculate theoretical and experimental values'
    ],
    observations: [
      { label: 'Initial Velocity', unit: 'm/s' },
      { label: 'Launch Angle', unit: 'degrees' },
      { label: 'Time of Flight', unit: 's' },
      { label: 'Maximum Height', unit: 'm' },
      { label: 'Horizontal Range', unit: 'm' }
    ],
    precautions: [
      'Ensure clear path for projectile',
      'Do not look directly at launcher',
      'Keep safe distance during launch',
      'Use protective gear'
    ]
  },
  'ohms-law': {
    title: "Verification of Ohm's Law",
    class: 10,
    subject: 'Physics',
    objective: 'To verify Ohm\'s Law and determine the resistance of a given resistor.',
    theory: "Ohm's Law states that the current through a conductor is directly proportional to the voltage across it, provided temperature remains constant. V = IR, where V is voltage, I is current, and R is resistance.",
    materials: ['Ammeter', 'Voltmeter', 'Resistor', 'Battery', 'Connecting wires', 'Rheostat'],
    procedure: [
      'Connect the circuit as per the diagram',
      'Adjust rheostat to get different readings',
      'Note voltage from voltmeter',
      'Note current from ammeter',
      'Plot V-I graph',
      'Calculate resistance from slope'
    ],
    observations: [
      { label: 'Voltage (V)', unit: 'V' },
      { label: 'Current (I)', unit: 'A' },
      { label: 'Resistance (R)', unit: 'Ω' }
    ],
    precautions: [
      'Ensure proper connections',
      'Do not exceed maximum voltage',
      'Connect ammeter in series',
      'Connect voltmeter in parallel'
    ]
  },
  'pendulum': {
    title: 'Simple Pendulum',
    class: 11,
    subject: 'Physics',
    objective: 'To study the factors affecting the time period of a simple pendulum.',
    theory: 'A simple pendulum executes simple harmonic motion. The time period T = 2π√(L/g), where L is length and g is acceleration due to gravity. The period is independent of mass and amplitude (for small angles).',
    materials: ['Pendulum bob', 'String', 'Stopwatch', 'Meter scale', 'Clamp stand'],
    procedure: [
      'Set up pendulum of known length',
      'Displace bob by small angle',
      'Measure time for 10 oscillations',
      'Calculate time period',
      'Repeat for different lengths',
      'Plot T² vs L graph'
    ],
    observations: [
      { label: 'Length (L)', unit: 'm' },
      { label: 'Time for 10 oscillations', unit: 's' },
      { label: 'Time Period (T)', unit: 's' },
      { label: 'T²', unit: 's²' }
    ],
    precautions: [
      'Use small amplitude',
      'Avoid air resistance effects',
      'Measure from center of bob',
      'Count oscillations accurately'
    ]
  },
  'quadratic-roots': {
    title: 'Quadratic Equation',
    class: 10,
    subject: 'Mathematics',
    objective: 'To find roots of quadratic equation and understand discriminant.',
    theory: 'A quadratic equation ax² + bx + c = 0 has roots given by x = (-b ± √(b²-4ac))/2a. The discriminant D = b² - 4ac determines the nature of roots: D > 0 (real and distinct), D = 0 (real and equal), D < 0 (complex).',
    materials: ['Graph paper', 'Calculator', 'Computer (optional)'],
    procedure: [
      'Identify coefficients a, b, c',
      'Calculate discriminant',
      'Apply quadratic formula',
      'Verify by substitution',
      'Plot parabola'
    ],
    observations: [
      { label: 'Coefficient a', unit: '' },
      { label: 'Coefficient b', unit: '' },
      { label: 'Coefficient c', unit: '' },
      { label: 'Discriminant', unit: '' },
      { label: 'Root 1', unit: '' },
      { label: 'Root 2', unit: '' }
    ],
    precautions: [
      'Check a ≠ 0',
      'Round off correctly',
      'Verify roots in original equation'
    ]
  },
};

export default function JournalPage({ experimentId }: JournalProps) {
  const data = experimentData[experimentId] || experimentData['projectile-motion'];
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [studentName, setStudentName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleObservationChange = (label: string, value: string) => {
    setObservations(prev => ({ ...prev, [label]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div className="flex items-center gap-4">
            <Link 
              href={`/simulations/${experimentId}`}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Simulation
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {isEditing ? 'Save' : 'Edit'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

        <div className="border-2 border-slate-200 rounded-2xl p-8 bg-white">
          <div className="text-center border-b-2 border-slate-200 pb-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Beaker className="w-8 h-8 text-indigo-600" />
              <span className="text-indigo-600 font-semibold">SaviEduTech Virtual Lab</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{data.title}</h1>
            <p className="text-slate-500 mt-1">Class {data.class} • {data.subject}</p>
            <div className="mt-2 text-xs text-slate-400">
              www.saviedutech.com
            </div>
          </div>

          {isEditing ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Student Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Enter your name"
              />
            </div>
          ) : studentName ? (
            <p className="mb-6 text-slate-700"><strong>Student Name:</strong> {studentName}</p>
          ) : null}

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-500">Date: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Objective</h2>
            <p className="text-slate-700">{data.objective}</p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Theory</h2>
            <p className="text-slate-700">{data.theory}</p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Materials Required</h2>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              {data.materials.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Procedure</h2>
            <ol className="list-decimal list-inside text-slate-700 space-y-1">
              {data.procedure.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. Observation Table</h2>
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-4 py-2 text-left">S.No.</th>
                  <th className="border border-slate-300 px-4 py-2 text-left">Parameter</th>
                  <th className="border border-slate-300 px-4 py-2 text-left">Unit</th>
                  <th className="border border-slate-300 px-4 py-2 text-left">Observation</th>
                </tr>
              </thead>
              <tbody>
                {data.observations.map((obs, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-300 px-4 py-2">{idx + 1}</td>
                    <td className="border border-slate-300 px-4 py-2">{obs.label}</td>
                    <td className="border border-slate-300 px-4 py-2">{obs.unit}</td>
                    <td className="border border-slate-300 px-4 py-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={observations[obs.label] || ''}
                          onChange={(e) => handleObservationChange(obs.label, e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded"
                          placeholder="Enter value"
                        />
                      ) : (
                        observations[obs.label] || '___'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">6. Precautions</h2>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              {data.precautions.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2">7. Result</h2>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-slate-700">
                {isEditing ? (
                  <textarea
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    rows={3}
                    placeholder="Enter your conclusion..."
                  />
                ) : (
                  'Write your conclusion based on observations...'
                )}
              </p>
            </div>
          </section>

          <div className="border-t-2 border-slate-200 pt-4 mt-8">
            <div className="flex justify-between text-xs text-slate-400">
              <span>SaviEduTech Virtual Lab</span>
              <span>www.saviedutech.com</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center print:hidden">
          <Link 
            href={`/simulations/${experimentId}`}
            className="inline-flex items-center gap-2 text-indigo-600 hover:underline"
          >
            <Play className="w-4 h-4" />
            Run Simulation Again
          </Link>
        </div>
      </div>
    </div>
  );
}

function Play(props: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  );
}
