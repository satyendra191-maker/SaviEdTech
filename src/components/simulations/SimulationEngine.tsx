'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  RotateCcw, 
  Settings,
  Maximize2,
  Volume2,
  VolumeX,
  Info,
  Download,
  ChevronRight,
  Atom,
  FlaskConical,
  Calculator,
  Dna
} from 'lucide-react';

interface SimulationProps {
  simulationId: string;
}

const simulationConfigs: Record<string, {
  title: string;
  subject: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  parameters: Parameter[];
  defaultValues: Record<string, number>;
  calculate: (params: Record<string, number>) => SimulationResult;
}> = {
  'projectile-motion': {
    title: 'Projectile Motion',
    subject: 'Physics',
    icon: Atom,
    color: '#3b82f6',
    parameters: [
      { name: 'velocity', label: 'Initial Velocity (m/s)', min: 1, max: 100, default: 25 },
      { name: 'angle', label: 'Launch Angle (°)', min: 0, max: 90, default: 45 },
      { name: 'gravity', label: 'Gravity (m/s²)', min: 1, max: 20, default: 9.8 },
    ],
    defaultValues: { velocity: 25, angle: 45, gravity: 9.8 },
    calculate: (params) => {
      const rad = (params.angle * Math.PI) / 180;
      const v0 = params.velocity;
      const g = params.gravity;
      const timeOfFlight = (2 * v0 * Math.sin(rad)) / g;
      const maxHeight = (Math.pow(v0 * Math.sin(rad), 2)) / (2 * g);
      const range = (Math.pow(v0, 2) * Math.sin(2 * rad)) / g;
      return {
        timeOfFlight: timeOfFlight.toFixed(2),
        maxHeight: maxHeight.toFixed(2),
        range: range.toFixed(2),
      };
    },
  },
  'ohms-law': {
    title: "Ohm's Law",
    subject: 'Physics',
    icon: Atom,
    color: '#3b82f6',
    parameters: [
      { name: 'voltage', label: 'Voltage (V)', min: 1, max: 24, default: 12 },
      { name: 'resistance', label: 'Resistance (Ω)', min: 1, max: 100, default: 10 },
    ],
    defaultValues: { voltage: 12, resistance: 10 },
    calculate: (params) => {
      const current = params.voltage / params.resistance;
      const power = params.voltage * current;
      return {
        current: current.toFixed(2),
        power: power.toFixed(2),
      };
    },
  },
  'pendulum': {
    title: 'Simple Pendulum',
    subject: 'Physics',
    icon: Atom,
    color: '#3b82f6',
    parameters: [
      { name: 'length', label: 'Length (m)', min: 0.1, max: 5, default: 1 },
      { name: 'gravity', label: 'Gravity (m/s²)', min: 1, max: 20, default: 9.8 },
    ],
    defaultValues: { length: 1, gravity: 9.8 },
    calculate: (params) => {
      const period = 2 * Math.PI * Math.sqrt(params.length / params.gravity);
      const frequency = 1 / period;
      return {
        period: period.toFixed(2),
        frequency: frequency.toFixed(2),
      };
    },
  },
  'quadratic-roots': {
    title: 'Quadratic Equation',
    subject: 'Mathematics',
    icon: Calculator,
    color: '#8b5cf6',
    parameters: [
      { name: 'a', label: 'a', min: -10, max: 10, default: 1 },
      { name: 'b', label: 'b', min: -20, max: 20, default: -5 },
      { name: 'c', label: 'c', min: -20, max: 20, default: 6 },
    ],
    defaultValues: { a: 1, b: -5, c: 6 },
    calculate: (params) => {
      const { a, b, c } = params;
      const discriminant = b * b - 4 * a * c;
      if (discriminant < 0) {
        return { root1: 'Complex', root2: 'Complex', discriminant: discriminant.toFixed(2) };
      }
      const root1 = (-b + Math.sqrt(discriminant)) / (2 * a);
      const root2 = (-b - Math.sqrt(discriminant)) / (2 * a);
      return {
        root1: root1.toFixed(2),
        root2: root2.toFixed(2),
        discriminant: discriminant.toFixed(2),
      };
    },
  },
  'bond-formation': {
    title: 'Chemical Bond Formation',
    subject: 'Chemistry',
    icon: FlaskConical,
    color: '#10b981',
    parameters: [
      { name: 'atoms', label: 'Number of Atoms', min: 1, max: 10, default: 2 },
      { name: 'bondEnergy', label: 'Bond Energy (kJ/mol)', min: 100, max: 1000, default: 436 },
    ],
    defaultValues: { atoms: 2, bondEnergy: 436 },
    calculate: (params) => {
      const energy = params.atoms * params.bondEnergy;
      return {
        totalEnergy: energy.toFixed(0),
        bonds: (params.atoms - 1).toString(),
      };
    },
  },
  'cell-structure': {
    title: 'Cell Structure',
    subject: 'Biology',
    icon: Dna,
    color: '#f59e0b',
    parameters: [
      { name: 'magnification', label: 'Magnification (x)', min: 100, max: 1000, default: 400 },
    ],
    defaultValues: { magnification: 400 },
    calculate: (params) => {
      const resolution = 200 / params.magnification;
      return {
        resolution: resolution.toFixed(2),
        visible: resolution < 0.5 ? 'Organelles visible' : 'Cell wall only',
      };
    },
  },
};

interface Parameter {
  name: string;
  label: string;
  min: number;
  max: number;
  default: number;
}

interface SimulationResult {
  [key: string]: string;
}

export default function SimulationPage({ simulationId }: SimulationProps) {
  const config = simulationConfigs[simulationId];
  const [params, setParams] = useState<Record<string, number>>({});
  const [results, setResults] = useState<SimulationResult>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (config) {
      setParams(config.defaultValues);
      setResults(config.calculate(config.defaultValues));
    }
  }, [config]);

  useEffect(() => {
    if (config && Object.keys(params).length > 0) {
      setResults(config.calculate(params));
    }
  }, [params, config]);

  useEffect(() => {
    if (!config || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height - 50;
      const scale = 3;

      if (simulationId === 'projectile-motion') {
        const { velocity, angle, gravity } = params;
        const rad = (angle * Math.PI) / 180;
        
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        
        for (let t = 0; t < 5; t += 0.05) {
          const x = centerX + (velocity * Math.cos(rad) * t) * scale;
          const y = centerY - (velocity * Math.sin(rad) * t - 0.5 * gravity * t * t) * scale;
          if (y < 0 || x > canvas.width) break;
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fill();

        if (isPlaying) {
          animationRef.current = requestAnimationFrame(draw);
        }
      } else if (simulationId === 'ohms-law') {
        const { voltage, resistance } = params;
        const current = voltage / resistance;
        
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - 80, centerY - 40, 160, 80);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText(`V = ${voltage}V`, centerX - 30, centerY - 10);
        ctx.fillText(`R = ${resistance}Ω`, centerX - 30, centerY + 10);
        ctx.fillText(`I = ${current.toFixed(2)}A`, centerX - 30, centerY + 30);
        
        const barWidth = (current / 2.4) * 160;
        ctx.fillStyle = config.color;
        ctx.fillRect(centerX - 80, centerY + 45, barWidth, 10);
      } else if (simulationId === 'pendulum') {
        const { length, gravity } = params;
        const period = 2 * Math.PI * Math.sqrt(length / gravity);
        
        const pivotX = centerX;
        const pivotY = 50;
        const bobX = pivotX + Math.sin(Date.now() / 1000 * (2 * Math.PI / period)) * length * 50;
        const bobY = pivotY + Math.cos(Date.now() / 1000 * (2 * Math.PI / period)) * length * 50;
        
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();
        
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(bobX, bobY, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#64748b';
        ctx.fillRect(pivotX - 20, pivotY - 5, 40, 10);

        if (isPlaying) {
          animationRef.current = requestAnimationFrame(draw);
        }
      } else if (simulationId === 'quadratic-roots') {
        const { a, b, c } = params;
        
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let x = -10; x <= 10; x += 0.1) {
          const y = a * x * x + b * x + c;
          const canvasX = centerX + x * 15;
          const canvasY = centerY - y * 15;
          if (x === -10) ctx.moveTo(canvasX, canvasY);
          else ctx.lineTo(canvasX, canvasY);
        }
        ctx.stroke();
        
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, canvas.height);
        ctx.stroke();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [config, params, isPlaying, simulationId]);

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Simulation Not Found</h1>
          <Link href="/experiments" className="text-indigo-400 hover:underline">
            Back to Experiments
          </Link>
        </div>
      </div>
    );
  }

  const Icon = config.icon;

  const handleParamChange = (name: string, value: number) => {
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setParams(config.defaultValues);
    setResults(config.calculate(config.defaultValues));
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/experiments"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: config.color }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{config.title}</h1>
                <p className="text-sm text-slate-400">{config.subject}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-4">
            <canvas
              ref={canvasRef}
              width={800}
              height={400}
              className="w-full h-auto rounded-xl"
            />
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Parameters
              </h3>
              
              <div className="space-y-4">
                {config.parameters.map(param => (
                  <div key={param.name}>
                    <label className="block text-sm text-slate-400 mb-2">
                      {param.label}: <span className="text-white font-semibold">{params[param.name] || param.default}</span>
                    </label>
                    <input
                      type="range"
                      min={param.min}
                      max={param.max}
                      step={0.1}
                      value={params[param.name] || param.default}
                      onChange={(e) => handleParamChange(param.name, parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Results</h3>
              <div className="space-y-2">
                {Object.entries(results).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                    <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-white font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href={`/journal/${simulationId}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Experiment Journal
            </Link>
          </div>
        </div>

        {showInfo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full">
              <h3 className="text-lg font-semibold text-white mb-4">About This Simulation</h3>
              <div className="text-slate-400 space-y-2">
                <p>Interactive simulation for {config.subject} - {config.title}</p>
                <p>Adjust the parameters using the sliders to see real-time results.</p>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="mt-4 w-full py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
