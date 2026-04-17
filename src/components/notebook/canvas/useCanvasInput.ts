import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Stroke } from '@/hooks/notebook/useNotebookPage';
import type { Point, ToolType, PenConfig, ViewportState } from './types';
import { StrokeStabilizer } from './StrokeStabilizer';

interface UseCanvasInputArgs {
  canvasRef: RefObject<HTMLCanvasElement>;
  viewport: ViewportState;
  activeTool: ToolType;
  penConfig: PenConfig;
  onStrokeComplete: (stroke: Stroke) => void;
}

export function useCanvasInput({
  canvasRef,
  viewport,
  activeTool,
  penConfig,
  onStrokeComplete,
}: UseCanvasInputArgs) {
  const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
  const stabilizerRef = useRef<StrokeStabilizer | null>(null);
  const currentPointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);

  const screenToCanvas = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      return {
        x: (relX - viewport.tx) / viewport.scale,
        y: (relY - viewport.ty) / viewport.scale,
      };
    },
    [canvasRef, viewport]
  );

  const estimatePressure = useCallback((x: number, y: number, t: number): number => {
    const points = currentPointsRef.current;
    if (points.length === 0) return 0.5;
    const last = points[points.length - 1];
    const dx = x - last.x;
    const dy = y - last.y;
    const dt = Math.max(t - last.t, 1);
    const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
    return Math.max(0.25, Math.min(1, 1 - velocity * 0.012));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (activeTool !== 'pen') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const t = performance.now();

      const pressure = e.pressure > 0 && e.pointerType === 'pen' ? e.pressure : 0.5;
      const startPoint: Point = { x, y, pressure, t };
      currentPointsRef.current = [startPoint];
      setCurrentStroke([startPoint]);

      stabilizerRef.current = new StrokeStabilizer(30);
      stabilizerRef.current.process(startPoint);
    },
    [activeTool, screenToCanvas]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current) return;
      if (activeTool !== 'pen') return;

      const native = e.nativeEvent as PointerEvent;
      const events =
        typeof native.getCoalescedEvents === 'function'
          ? native.getCoalescedEvents()
          : [native];

      for (const ev of events) {
        const { x, y } = screenToCanvas(ev.clientX, ev.clientY);
        const t = ev.timeStamp;
        const pressure =
          ev.pressure > 0 && ev.pointerType === 'pen'
            ? ev.pressure
            : estimatePressure(x, y, t);

        const rawPoint: Point = { x, y, pressure, t };
        const stabilized = stabilizerRef.current?.process(rawPoint);
        if (stabilized) {
          currentPointsRef.current.push(stabilized);
        }
      }

      setCurrentStroke([...currentPointsRef.current]);
    },
    [activeTool, screenToCanvas, estimatePressure]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const points = currentPointsRef.current;
    if (points.length < 2) {
      currentPointsRef.current = [];
      setCurrentStroke(null);
      stabilizerRef.current = null;
      return;
    }

    const stroke: Stroke = {
      id: crypto.randomUUID(),
      tool: 'pen',
      penStyle: 'fountain',
      color: penConfig.color,
      width: penConfig.width,
      points: points.map((p) => ({ x: p.x, y: p.y, pressure: p.pressure, t: p.t })),
    };

    onStrokeComplete(stroke);

    currentPointsRef.current = [];
    setCurrentStroke(null);
    stabilizerRef.current = null;
  }, [penConfig, onStrokeComplete]);

  const handlePointerCancel = useCallback(() => {
    isDrawingRef.current = false;
    currentPointsRef.current = [];
    setCurrentStroke(null);
    stabilizerRef.current = null;
  }, []);

  const bindPointerHandlers = useCallback(
    () => ({
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    }),
    [handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel]
  );

  return { currentStroke, bindPointerHandlers };
}
