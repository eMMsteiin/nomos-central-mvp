import { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Pen, Eraser, Highlighter, Undo, Redo, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Slider } from './ui/slider';
import { Stroke, Point } from '@/types/notebook';

interface NotebookCanvasProps {
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  template?: 'blank' | 'lined' | 'grid' | 'dotted';
  backgroundImage?: string;
}

export const NotebookCanvas = ({ strokes, onStrokesChange, template = 'blank', backgroundImage }: NotebookCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'highlighter'>('pen');
  const [color, setColor] = useState('#000000');
  const [history, setHistory] = useState<Stroke[][]>([strokes]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const colors = ['#000000', '#FF0000', '#0000FF', '#00FF00'];

  useEffect(() => {
    drawCanvas();
  }, [strokes, template, backgroundImage]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image (PDF page) if present
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Draw template and strokes after background
        drawTemplate(ctx, canvas.width, canvas.height);
        strokes.forEach(stroke => {
          drawStroke(ctx, stroke);
        });
      };
      img.src = backgroundImage;
    } else {
      // Draw template
      drawTemplate(ctx, canvas.width, canvas.height);

      // Draw strokes
      strokes.forEach(stroke => {
        drawStroke(ctx, stroke);
      });
    }
  };

  const drawTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    if (template === 'lined') {
      const lineSpacing = 30;
      for (let y = lineSpacing; y < height; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (template === 'grid') {
      const gridSize = 30;
      for (let x = gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = gridSize; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (template === 'dotted') {
      const dotSpacing = 20;
      ctx.fillStyle = '#e5e7eb';
      for (let x = dotSpacing; x < width; x += dotSpacing) {
        for (let y = dotSpacing; y < height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }

    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  };

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Check if middle mouse button or space key for panning
    if ('button' in e && e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
      return;
    }

    e.preventDefault();
    setIsDrawing(true);

    const point = getCanvasPoint(e);
    const newStroke: Stroke = {
      id: crypto.randomUUID(),
      tool,
      color: tool === 'eraser' ? '#ffffff' : color,
      width: tool === 'highlighter' ? 20 : tool === 'eraser' ? 30 : 2,
      points: [point],
    };

    setCurrentStroke(newStroke);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isPanning && 'clientX' in e) {
      e.preventDefault();
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!isDrawing || !currentStroke) return;
    e.preventDefault();

    const point = getCanvasPoint(e);
    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, point],
    };

    setCurrentStroke(updatedStroke);

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      drawStroke(ctx, updatedStroke);
    }
  };

  const stopDrawing = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || !currentStroke) return;

    const newStrokes = [...strokes, currentStroke];
    onStrokesChange(newStrokes);

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newStrokes);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setIsDrawing(false);
    setCurrentStroke(null);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onStrokesChange(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onStrokesChange(history[newIndex]);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleFitToScreen = () => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const canvasWidth = 800;
    const canvasHeight = 1200;
    
    const scaleX = (containerWidth - 40) / canvasWidth;
    const scaleY = (containerHeight - 40) / canvasHeight;
    const newZoom = Math.min(scaleX, scaleY, 1);
    
    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 bg-background border-b flex-wrap">
        <Button
          variant={tool === 'pen' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setTool('pen')}
        >
          <Pen className="h-4 w-4" />
        </Button>
        <Button
          variant={tool === 'highlighter' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setTool('highlighter')}
        >
          <Highlighter className="h-4 w-4" />
        </Button>
        <Button
          variant={tool === 'eraser' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setTool('eraser')}
        >
          <Eraser className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-2" />

        {colors.map(c => (
          <button
            key={c}
            className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-primary scale-110' : 'border-border'}`}
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
          />
        ))}

        <div className="w-px h-6 bg-border mx-2" />

        <Button
          variant="outline"
          size="icon"
          onClick={undo}
          disabled={historyIndex === 0}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={redo}
          disabled={historyIndex === history.length - 1}
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-2" />

        {/* Zoom Controls */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-[120px]">
          <Slider
            value={[zoom]}
            onValueChange={handleZoomChange}
            min={0.5}
            max={2}
            step={0.1}
            className="w-20"
          />
          <span className="text-xs text-muted-foreground w-10 text-right">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleZoomIn}
          disabled={zoom >= 2}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleFitToScreen}
          className="gap-2"
        >
          <Maximize2 className="h-4 w-4" />
          Ajustar
        </Button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-muted p-4">
        <div className="inline-block min-w-full min-h-full">
          <canvas
            ref={canvasRef}
            width={800}
            height={1200}
            className="border shadow-sm cursor-crosshair touch-none transition-transform"
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: 'top left',
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
};
