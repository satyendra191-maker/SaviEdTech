'use client';

import { useState, useRef, useEffect, useCallback, use } from 'react';
import { 
  Pencil, 
  Eraser, 
  Type, 
  Square, 
  Circle as CircleIcon,
  Minus,
  Undo,
  Redo,
  Trash2,
  Download,
  Save,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Layers,
  Eye,
  EyeOff,
  Move,
  ZoomIn,
  ZoomOut,
  Palette,
  ChevronLeft,
  ChevronRight,
  X,
  Sigma,
  Pi,
  Infinity,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface DrawObject {
  id: string;
  type: 'pencil' | 'line' | 'rectangle' | 'circle' | 'text' | 'equation';
  points?: Point[];
  start?: Point;
  end?: Point;
  text?: string;
  color: string;
  strokeWidth: number;
}

interface WhiteboardSlide {
  id: string;
  objects: DrawObject[];
}

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
];

const STROKE_WIDTHS = [2, 4, 6, 8, 12];

export default function WhiteboardPage({ params }: { params: Promise<{ topicId?: string }> }) {
  const { topicId } = use(params);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pencil' | 'line' | 'rectangle' | 'circle' | 'text' | 'equation' | 'eraser'>('pencil');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [objects, setObjects] = useState<DrawObject[]>([]);
  const [currentObject, setCurrentObject] = useState<DrawObject | null>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [history, setHistory] = useState<DrawObject[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [slides, setSlides] = useState<WhiteboardSlide[]>([{ id: '1', objects: [] }]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showTools, setShowTools] = useState(true);
  const [showEquationPanel, setShowEquationPanel] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

  useEffect(() => {
    drawCanvas();
  }, [objects, zoom, showGrid]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (showGrid) {
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      const gridSize = 20 * (zoom / 100);
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    objects.forEach(obj => {
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = obj.strokeWidth * (zoom / 100);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (obj.type === 'pencil' && obj.points) {
        ctx.beginPath();
        obj.points.forEach((point, i) => {
          const x = point.x * (zoom / 100);
          const y = point.y * (zoom / 100);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      } else if (obj.type === 'line' && obj.start && obj.end) {
        ctx.beginPath();
        ctx.moveTo(obj.start.x * (zoom / 100), obj.start.y * (zoom / 100));
        ctx.lineTo(obj.end.x * (zoom / 100), obj.end.y * (zoom / 100));
        ctx.stroke();
      } else if (obj.type === 'rectangle' && obj.start && obj.end) {
        const width = (obj.end.x - obj.start.x) * (zoom / 100);
        const height = (obj.end.y - obj.start.y) * (zoom / 100);
        ctx.strokeRect(obj.start.x * (zoom / 100), obj.start.y * (zoom / 100), width, height);
      } else if (obj.type === 'circle' && obj.start && obj.end) {
        const radius = Math.sqrt(
          Math.pow((obj.end.x - obj.start.x), 2) + 
          Math.pow((obj.end.y - obj.start.y), 2)
        ) * (zoom / 100);
        ctx.beginPath();
        ctx.arc(
          obj.start.x * (zoom / 100), 
          obj.start.y * (zoom / 100), 
          radius, 
          0, 
          2 * Math.PI
        );
        ctx.stroke();
      } else if (obj.type === 'text' && obj.text && obj.start) {
        ctx.font = `${obj.strokeWidth * 4 * (zoom / 100)}px Arial`;
        ctx.fillStyle = obj.color;
        ctx.fillText(obj.text, obj.start.x * (zoom / 100), obj.start.y * (zoom / 100));
      } else if (obj.type === 'equation' && obj.text && obj.start) {
        ctx.font = `${obj.strokeWidth * 5 * (zoom / 100)}px "Times New Roman"`;
        ctx.fillStyle = obj.color;
        ctx.fillText(obj.text, obj.start.x * (zoom / 100), obj.start.y * (zoom / 100));
      }
    });

    if (currentObject) {
      ctx.strokeStyle = currentObject.color;
      ctx.lineWidth = currentObject.strokeWidth * (zoom / 100);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentObject.type === 'pencil' && currentObject.points) {
        ctx.beginPath();
        currentObject.points.forEach((point, i) => {
          const x = point.x * (zoom / 100);
          const y = point.y * (zoom / 100);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    }
  }, [objects, currentObject, zoom, showGrid]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / (zoom / 100),
      y: (e.clientY - rect.top) / (zoom / 100)
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'eraser') return;
    const pos = getMousePos(e);
    setStartPoint(pos);
    setIsDrawing(true);

    if (tool === 'pencil') {
      setCurrentObject({
        id: Date.now().toString(),
        type: 'pencil',
        points: [pos],
        color,
        strokeWidth
      });
    } else if (tool === 'text' || tool === 'equation') {
      const text = prompt('Enter text:');
      if (text) {
        const newObj: DrawObject = {
          id: Date.now().toString(),
          type: tool,
          start: pos,
          text,
          color,
          strokeWidth
        };
        addObject(newObj);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const pos = getMousePos(e);

    if (tool === 'pencil' && currentObject) {
      setCurrentObject({
        ...currentObject,
        points: [...(currentObject.points || []), pos]
      });
    } else if (tool === 'line') {
      setCurrentObject({
        id: 'temp',
        type: 'line',
        start: startPoint,
        end: pos,
        color,
        strokeWidth
      });
    } else if (tool === 'rectangle') {
      setCurrentObject({
        id: 'temp',
        type: 'rectangle',
        start: startPoint,
        end: pos,
        color,
        strokeWidth
      });
    } else if (tool === 'circle') {
      setCurrentObject({
        id: 'temp',
        type: 'circle',
        start: startPoint,
        end: pos,
        color,
        strokeWidth
      });
    }
  };

  const handleMouseUp = () => {
    if (currentObject && tool === 'pencil') {
      addObject(currentObject);
    } else if (currentObject && currentObject.start && currentObject.end) {
      addObject(currentObject);
    }
    setIsDrawing(false);
    setCurrentObject(null);
    setStartPoint(null);
  };

  const addObject = (obj: DrawObject) => {
    const newObjects = [...objects, obj];
    setObjects(newObjects);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newObjects);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setObjects(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setObjects(history[historyIndex + 1]);
    }
  };

  const clearCanvas = () => {
    setObjects([]);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const insertEquation = (eq: string) => {
    if (!startPoint) {
      alert('Click on the canvas first to place the equation');
      return;
    }
    const newObj: DrawObject = {
      id: Date.now().toString(),
      type: 'equation',
      start: startPoint,
      text: eq,
      color,
      strokeWidth
    };
    addObject(newObj);
    setShowEquationPanel(false);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const tools = [
    { id: 'pencil', icon: Pencil, label: 'Pencil' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: CircleIcon, label: 'Circle' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'equation', icon: Sigma, label: 'Equation' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
  ];

  const equations = [
    { symbol: '∫', name: 'Integral' },
    { symbol: '∑', name: 'Sum' },
    { symbol: 'π', name: 'Pi' },
    { symbol: '∞', name: 'Infinity' },
    { symbol: 'Δ', name: 'Delta' },
    { symbol: 'α', name: 'Alpha' },
    { symbol: 'β', name: 'Beta' },
    { symbol: 'θ', name: 'Theta' },
    { symbol: 'λ', name: 'Lambda' },
    { symbol: '√', name: 'Square Root' },
    { symbol: 'x²', name: 'Squared' },
    { symbol: 'xⁿ', name: 'Power' },
    { symbol: '∂', name: 'Partial' },
    { symbol: '±', name: 'Plus Minus' },
    { symbol: '≠', name: 'Not Equal' },
    { symbol: '≤', name: 'Less Equal' },
    { symbol: '≥', name: 'Greater Equal' },
  ];

  if (presentationMode) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="max-w-full max-h-full"
        />
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
          <button 
            onClick={() => setPresentationMode(false)}
            className="p-3 bg-white/20 rounded-full text-white hover:bg-white/30"
          >
            <X className="w-6 h-6" />
          </button>
          <button 
            onClick={undo}
            className="p-3 bg-white/20 rounded-full text-white hover:bg-white/30"
          >
            <SkipBack className="w-6 h-6" />
          </button>
          <button 
            onClick={redo}
            className="p-3 bg-white/20 rounded-full text-white hover:bg-white/30"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-5 h-5" />
          </a>
          <h1 className="text-lg font-semibold">AI Whiteboard Teaching</h1>
          <span className="text-sm text-gray-500">
            {topicId ? `Topic: ${topicId}` : 'Free Drawing'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded ${showGrid ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            <Layers className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            className="p-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm w-12 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            className="p-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={undo}
            disabled={historyIndex === 0}
            className="p-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex === history.length - 1}
            className="p-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          >
            <Redo className="w-5 h-5" />
          </button>
          <button
            onClick={clearCanvas}
            className="p-2 rounded bg-red-100 text-red-600 hover:bg-red-200"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={downloadCanvas}
            className="p-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => setPresentationMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Play className="w-4 h-4" />
            Present
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {showTools && (
          <div className="w-16 bg-white border-r flex flex-col items-center py-4 gap-2">
            {tools.map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id as typeof tool)}
                className={`p-3 rounded-lg ${tool === t.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
                title={t.label}
              >
                <t.icon className="w-5 h-5" />
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => setShowTools(false)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}

        {!showTools && (
          <button
            onClick={() => setShowTools(true)}
            className="fixed left-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg shadow-lg text-gray-600 hover:text-gray-800 z-10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div className="flex-1 flex">
          <div 
            className="flex-1 bg-white m-4 rounded-lg shadow overflow-hidden"
            style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          >
            <canvas
              ref={canvasRef}
              width={1200}
              height={800}
              className="w-full h-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          <div className="w-64 bg-white border-l p-4 space-y-4 overflow-y-auto">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Color</h3>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-blue-500' : 'border-gray-200'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Stroke Width</h3>
              <div className="flex gap-2">
                {STROKE_WIDTHS.map(w => (
                  <button
                    key={w}
                    onClick={() => setStrokeWidth(w)}
                    className={`w-8 h-8 rounded flex items-center justify-center ${strokeWidth === w ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  >
                    <div 
                      className="rounded-full bg-gray-600"
                      style={{ width: w, height: w }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button
                onClick={() => setShowEquationPanel(!showEquationPanel)}
                className="w-full flex items-center justify-between p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <span className="font-medium text-gray-700">Math Symbols</span>
                {showEquationPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showEquationPanel && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {equations.map(eq => (
                    <button
                      key={eq.symbol}
                      onClick={() => insertEquation(eq.symbol)}
                      className="p-2 text-xl bg-gray-50 rounded hover:bg-gray-100"
                      title={eq.name}
                    >
                      {eq.symbol}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-medium text-gray-700 mb-2">Objects ({objects.length})</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {objects.map((obj, i) => (
                  <div key={obj.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: obj.color }}
                    />
                    <span className="flex-1 capitalize">{obj.type}</span>
                    <button
                      onClick={() => {
                        const newObjects = objects.filter((_, idx) => idx !== i);
                        setObjects(newObjects);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
