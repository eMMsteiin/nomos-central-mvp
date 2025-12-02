import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Pen, Eraser, Highlighter, Undo, Redo, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Slider } from './ui/slider';
import { Stroke, Point, PenStyle, ToolType, PEN_STYLES, HIGHLIGHTER_COLORS } from '@/types/notebook';
import { ColorPicker } from './notebook/ColorPicker';
import { PenStyleSelector } from './notebook/PenStyleSelector';
import { StrokeWidthSlider } from './notebook/StrokeWidthSlider';
import { catmullRomSpline, smoothPoints, calculateVelocityPressure } from '@/utils/strokeSmoothing';

interface NotebookCanvasProps {
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  template?: 'blank' | 'lined' | 'grid' | 'dotted';
  backgroundImage?: string;
}

// Canvas dimensions (logical)
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 2400;

export const NotebookCanvas = ({ strokes, onStrokesChange, template = 'blank', backgroundImage }: NotebookCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const lastTimeRef = useRef<number>(0);
  const strokesRef = useRef<Stroke[]>(strokes); // Track strokes for eraser
  
  // Keep strokesRef in sync
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);
  
  // Tool state
  const [tool, setTool] = useState<ToolType>('pen');
  const [penStyle, setPenStyle] = useState<PenStyle>('fountain');
  const [color, setColor] = useState('#000000');
  const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [highlighterWidth, setHighlighterWidth] = useState(20);
  const [eraserWidth, setEraserWidth] = useState(30);
  
  // Eraser cursor position
  const [eraserPos, setEraserPos] = useState<{ x: number; y: number } | null>(null);
  
  // History
  const [history, setHistory] = useState<Stroke[][]>([strokes]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Zoom and pan
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Device pixel ratio for HiDPI
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // Setup canvas with HiDPI support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set display size
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    // Set actual size in memory (scaled for HiDPI)
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;

    // Scale context for HiDPI
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    drawCanvas();
  }, [dpr]);

  useEffect(() => {
    drawCanvas();
  }, [strokes, template, backgroundImage]);

  const drawTemplate = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    if (template === 'lined') {
      const lineSpacing = 40;
      for (let y = lineSpacing; y < CANVAS_HEIGHT; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
    } else if (template === 'grid') {
      const gridSize = 40;
      ctx.strokeStyle = '#e5e7eb';
      for (let x = gridSize; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = gridSize; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
    } else if (template === 'dotted') {
      const dotSpacing = 30;
      ctx.fillStyle = '#d1d5db';
      for (let x = dotSpacing; x < CANVAS_WIDTH; x += dotSpacing) {
        for (let y = dotSpacing; y < CANVAS_HEIGHT; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }
  }, [template]);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;

    const styleConfig = stroke.penStyle ? PEN_STYLES[stroke.penStyle] : PEN_STYLES.ballpoint;
    
    // Apply smoothing for pen strokes
    const smoothedPoints = stroke.tool === 'pen' 
      ? catmullRomSpline(smoothPoints(stroke.points, 3), styleConfig.smoothing)
      : smoothPoints(stroke.points, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      
      ctx.beginPath();
      ctx.moveTo(smoothedPoints[0].x, smoothedPoints[0].y);
      for (let i = 1; i < smoothedPoints.length; i++) {
        ctx.lineTo(smoothedPoints[i].x, smoothedPoints[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

    // Draw pen strokes with variable width based on pressure
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = styleConfig.opacity;

    // Draw each segment with variable width for pressure sensitivity
    for (let i = 1; i < smoothedPoints.length; i++) {
      const p0 = smoothedPoints[i - 1];
      const p1 = smoothedPoints[i];
      
      // Calculate width based on pressure
      const pressure0 = p0.pressure ?? 0.5;
      const pressure1 = p1.pressure ?? 0.5;
      const avgPressure = (pressure0 + pressure1) / 2;
      
      const widthMultiplier = styleConfig.minWidth + 
        (styleConfig.maxWidth - styleConfig.minWidth) * 
        Math.pow(avgPressure, styleConfig.pressureSensitivity);
      
      const segmentWidth = stroke.width * widthMultiplier;
      
      ctx.lineWidth = segmentWidth;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      
      // Use quadratic curve for smoother lines
      if (i < smoothedPoints.length - 1) {
        const p2 = smoothedPoints[i + 1];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      } else {
        ctx.lineTo(p1.x, p1.y);
      }
      
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }, []);

  const drawCanvas = useCallback((additionalStroke?: Stroke | null, eraserCursor?: { x: number; y: number; radius: number } | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform and clear
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background image if present
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawTemplate(ctx);
        strokes.forEach(stroke => drawStroke(ctx, stroke));
        if (additionalStroke) drawStroke(ctx, additionalStroke);
        if (eraserCursor) drawEraserCursor(ctx, eraserCursor);
      };
      img.src = backgroundImage;
    } else {
      drawTemplate(ctx);
      strokes.forEach(stroke => drawStroke(ctx, stroke));
      if (additionalStroke) drawStroke(ctx, additionalStroke);
      if (eraserCursor) drawEraserCursor(ctx, eraserCursor);
    }
  }, [strokes, backgroundImage, dpr, drawTemplate, drawStroke]);

  const drawEraserCursor = (ctx: CanvasRenderingContext2D, cursor: { x: number; y: number; radius: number }) => {
    ctx.save();
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, cursor.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  };

  // Check distance from point to line segment (for precise erasing)
  const pointToSegmentDistance = useCallback((point: Point, segStart: Point, segEnd: Point): number => {
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const lengthSq = dx * dx + dy * dy;
    
    if (lengthSq === 0) {
      // Segment is a point
      return Math.sqrt((point.x - segStart.x) ** 2 + (point.y - segStart.y) ** 2);
    }
    
    // Project point onto line segment
    let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    
    const projX = segStart.x + t * dx;
    const projY = segStart.y + t * dy;
    
    return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
  }, []);

  // Check if a segment intersects with eraser circle
  const isSegmentInEraser = useCallback((p1: Point, p2: Point, eraserPoint: Point, radius: number, strokeWidth: number): boolean => {
    const effectiveRadius = radius + strokeWidth / 2;
    return pointToSegmentDistance(eraserPoint, p1, p2) < effectiveRadius;
  }, [pointToSegmentDistance]);

  // Erase strokes at point (splits strokes, keeping parts outside eraser)
  const eraseStrokesAtPoint = useCallback((currentStrokes: Stroke[], point: Point, radius: number): Stroke[] => {
    const newStrokes: Stroke[] = [];
    let hasChanges = false;
    
    currentStrokes.forEach(stroke => {
      if (stroke.points.length < 2) {
        newStrokes.push(stroke);
        return;
      }
      
      let currentSegment: Point[] = [];
      let strokeModified = false;
      
      for (let i = 0; i < stroke.points.length; i++) {
        const currentPoint = stroke.points[i];
        const nextPoint = stroke.points[i + 1];
        
        // Check if current point or segment to next point is in eraser
        let shouldErase = false;
        
        // Check point distance
        const pointDist = Math.sqrt((currentPoint.x - point.x) ** 2 + (currentPoint.y - point.y) ** 2);
        if (pointDist < radius + stroke.width / 2) {
          shouldErase = true;
        }
        
        // Check segment to next point
        if (!shouldErase && nextPoint) {
          shouldErase = isSegmentInEraser(currentPoint, nextPoint, point, radius, stroke.width);
        }
        
        if (!shouldErase) {
          currentSegment.push(currentPoint);
        } else {
          strokeModified = true;
          // Save accumulated segment as new stroke
          if (currentSegment.length >= 2) {
            newStrokes.push({
              ...stroke,
              id: `${stroke.id}-${Date.now()}-${i}`,
              points: [...currentSegment],
            });
          }
          currentSegment = [];
        }
      }
      
      // Save the last segment
      if (currentSegment.length >= 2) {
        if (strokeModified) {
          newStrokes.push({
            ...stroke,
            id: `${stroke.id}-${Date.now()}-end`,
            points: [...currentSegment],
          });
        } else {
          // Stroke wasn't modified, keep original
          newStrokes.push(stroke);
        }
      } else if (!strokeModified && stroke.points.length >= 2) {
        // Stroke wasn't modified at all
        newStrokes.push(stroke);
      }
      
      if (strokeModified) hasChanges = true;
    });
    
    return hasChanges ? newStrokes : currentStrokes;
  }, [isSegmentInEraser]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Get pressure from pointer event (0-1 range)
    let pressure = e.pressure;
    
    // If no pressure (mouse), simulate based on velocity
    if (pressure === 0 || pressure === 0.5) {
      const now = performance.now();
      const currentPoint = { x, y };
      pressure = calculateVelocityPressure(currentPoint, lastPointRef.current, now - lastTimeRef.current);
      lastTimeRef.current = now;
    }

    return { x, y, pressure, timestamp: performance.now() };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Middle mouse button for panning
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;
    e.preventDefault();
    
    const point = getCanvasPoint(e);
    lastPointRef.current = point;
    lastTimeRef.current = performance.now();

    // Handle eraser - immediately try to erase
    if (tool === 'eraser') {
      setIsDrawing(true);
      const newStrokes = eraseStrokesAtPoint(strokesRef.current, point, eraserWidth / 2);
      if (newStrokes !== strokesRef.current) {
        strokesRef.current = newStrokes; // Update ref immediately
        onStrokesChange(newStrokes);
        // Update history
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newStrokes);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
      setEraserPos({ x: point.x, y: point.y });
      drawCanvas(null, { x: point.x, y: point.y, radius: eraserWidth / 2 });
      return;
    }

    const currentWidth = tool === 'highlighter' ? highlighterWidth : strokeWidth;
    const currentColor = tool === 'highlighter' ? highlighterColor : color;

    const newStroke: Stroke = {
      id: crypto.randomUUID(),
      tool,
      penStyle: tool === 'pen' ? penStyle : undefined,
      color: currentColor,
      width: currentWidth,
      points: [point],
    };

    setCurrentStroke(newStroke);
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      e.preventDefault();
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    const point = getCanvasPoint(e);

    // Show eraser cursor even when not drawing
    if (tool === 'eraser') {
      setEraserPos({ x: point.x, y: point.y });
      
      if (isDrawing) {
        e.preventDefault();
        // Erase strokes at current point using ref for latest state
        const newStrokes = eraseStrokesAtPoint(strokesRef.current, point, eraserWidth / 2);
        if (newStrokes !== strokesRef.current) {
          strokesRef.current = newStrokes; // Update ref immediately
          onStrokesChange(newStrokes);
        }
      }
      // Redraw with eraser cursor
      drawCanvas(null, { x: point.x, y: point.y, radius: eraserWidth / 2 });
      return;
    }

    if (!isDrawing || !currentStroke) return;
    e.preventDefault();

    lastPointRef.current = point;

    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, point],
    };

    setCurrentStroke(updatedStroke);

    // Redraw canvas with current stroke (consistent rendering)
    drawCanvas(updatedStroke);
  };

  const stopDrawing = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (tool === 'eraser') {
      // Save to history at end of erasing session
      const currentStrokes = strokesRef.current;
      if (currentStrokes !== strokes) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(currentStrokes);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
      setIsDrawing(false);
      setEraserPos(null);
      drawCanvas();
      return;
    }

    if (!isDrawing || !currentStroke) return;

    // Only save if we have enough points
    if (currentStroke.points.length > 1) {
      const newStrokes = [...strokes, currentStroke];
      onStrokesChange(newStrokes);

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newStrokes);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }

    setIsDrawing(false);
    setCurrentStroke(null);
    lastPointRef.current = null;
    // Note: Don't call drawCanvas here - the useEffect will handle it when strokes prop updates
  };

  const handlePointerLeave = () => {
    setEraserPos(null);
    if (isDrawing) {
      stopDrawing();
    }
    drawCanvas();
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

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));
  
  const handleFitToScreen = () => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 40;
    const containerHeight = containerRef.current.clientHeight - 40;
    const scaleX = containerWidth / CANVAS_WIDTH;
    const scaleY = containerHeight / CANVAS_HEIGHT;
    setZoom(Math.min(scaleX, scaleY, 1));
    setPan({ x: 0, y: 0 });
  };

  const handleZoomChange = (value: number[]) => setZoom(value[0]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-background border-b flex-wrap">
        {/* Tools */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={tool === 'pen' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTool('pen')}
            className="h-8"
          >
            <Pen className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === 'highlighter' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTool('highlighter')}
            className="h-8"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === 'eraser' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTool('eraser')}
            className="h-8"
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Pen Style (only for pen tool) */}
        {tool === 'pen' && (
          <>
            <PenStyleSelector penStyle={penStyle} onChange={setPenStyle} />
            <div className="w-px h-6 bg-border" />
          </>
        )}

        {/* Color Picker */}
        {tool !== 'eraser' && (
          <ColorPicker
            color={tool === 'highlighter' ? highlighterColor : color}
            onChange={tool === 'highlighter' ? setHighlighterColor : setColor}
            isHighlighter={tool === 'highlighter'}
          />
        )}

        {/* Stroke Width */}
        <StrokeWidthSlider
          width={tool === 'highlighter' ? highlighterWidth : tool === 'eraser' ? eraserWidth : strokeWidth}
          onChange={tool === 'highlighter' ? setHighlighterWidth : tool === 'eraser' ? setEraserWidth : setStrokeWidth}
          min={tool === 'highlighter' ? 10 : tool === 'eraser' ? 10 : 1}
          max={tool === 'highlighter' ? 50 : tool === 'eraser' ? 80 : 30}
          color={tool === 'highlighter' ? highlighterColor : tool === 'eraser' ? '#9CA3AF' : color}
        />

        <div className="w-px h-6 bg-border" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={historyIndex === 0}
            className="h-8"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={historyIndex === history.length - 1}
            className="h-8"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.3}
            className="h-8"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-[100px]">
            <Slider
              value={[zoom]}
              onValueChange={handleZoomChange}
              min={0.3}
              max={2}
              step={0.1}
              className="w-16"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 2}
            className="h-8"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFitToScreen}
            className="h-8 gap-1"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/50 p-4">
        <div 
          className="inline-block"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          <canvas
            ref={canvasRef}
            className={`border shadow-lg touch-none bg-white rounded-sm ${tool === 'eraser' ? 'cursor-none' : 'cursor-crosshair'}`}
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
            }}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
};
