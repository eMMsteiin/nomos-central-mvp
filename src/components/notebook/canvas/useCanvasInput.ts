import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Stroke } from '@/hooks/notebook/useNotebookPage';
import type { Point, ToolType, PenConfig, ViewportState } from './types';
import { StrokeStabilizer } from './StrokeStabilizer';
import { OneEuroPointFilter } from './OneEuroFilter';

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
  const jitterFilterRef = useRef<OneEuroPointFilter | null>(null);
  const predictedPointsRef = useRef<Point[]>([]);
  const currentPointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  // Palm rejection: assim que o Pencil/stylus é detectado, ignoramos toques de
  // dedo/palma por uma janela curta. Mouse passa sempre.
  const lastPencilUseRef = useRef<number>(0);
  const activePointerIdRef = useRef<number | null>(null);
  const activePointerTypeRef = useRef<'pen' | 'touch' | 'mouse' | null>(null);
  // 400ms = janela natural pós-pencil (antes: 10000ms bloqueava dedo demais)
  const PENCIL_PRIORITY_WINDOW_MS = 400;

  const commitPreviewFrame = useCallback(() => {
    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      setCurrentStroke([...currentPointsRef.current]);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const shouldProcessPointer = useCallback(
    (e: React.PointerEvent | PointerEvent): boolean => {
      const pointerType = e.pointerType;
      if (pointerType === 'pen') {
        lastPencilUseRef.current = performance.now();
        return true;
      }
      if (pointerType === 'mouse') return true;
      if (pointerType === 'touch') {
        const elapsed = performance.now() - lastPencilUseRef.current;
        return elapsed > PENCIL_PRIORITY_WINDOW_MS;
      }
      return false;
    },
    []
  );

  const isPinchGestureAllowed = useCallback(() => {
    const elapsedSincePencil = performance.now() - lastPencilUseRef.current;
    return !isDrawingRef.current && activePointerTypeRef.current !== 'pen' && elapsedSincePencil > 180;
  }, []);

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
    if (points.length === 0) return 0.75;
    const last = points[points.length - 1];
    const dx = x - last.x;
    const dy = y - last.y;
    const dt = Math.max(t - last.t, 1);
    const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
    const rawPressure = 1 - velocity * 0.003;
    const previousPressure = last.pressure ?? 0.75;
    const targetPressure = Math.max(0.65, Math.min(1.0, rawPressure));
    const smoothed = previousPressure * 0.7 + targetPressure * 0.3;
    return smoothed;
  }, []);

  const appendPoint = useCallback(
    (point: Point, fallbackToRaw = false) => {
      const points = currentPointsRef.current;
      const last = points[points.length - 1];

      if (last) {
        const distance = Math.hypot(point.x - last.x, point.y - last.y);
        if (distance < 0.01) return;
      }

      const stabilized = stabilizerRef.current?.process(point) ?? point;

      if (stabilized) {
        points.push(stabilized);
        return;
      }

      if (fallbackToRaw) {
        points.push(point);
      }
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (activeTool !== 'pen') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!shouldProcessPointer(e)) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      activePointerIdRef.current = e.pointerId;
      activePointerTypeRef.current =
        e.pointerType === 'pen' || e.pointerType === 'mouse' || e.pointerType === 'touch'
          ? e.pointerType
          : null;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const t = performance.now();

      const pressure = penConfig.pressureEnabled
        ? (e.pressure > 0 && e.pointerType === 'pen' ? e.pressure : 0.5)
        : 0.5;
      const startPoint: Point = { x, y, pressure, t };
      currentPointsRef.current = [startPoint];
      setCurrentStroke([startPoint]);

      // Stabilizer com força configurável (8-15 = sweet spot)
      const stabilizerStrength = penConfig.stabilizerStrength ?? 10;
      stabilizerRef.current = new StrokeStabilizer(stabilizerStrength);

      // 1€ filter — mapeia jitterStrength (0-100) para mincutoff (4.0 → 1.0 Hz)
      if (penConfig.jitterFilterEnabled) {
        const strength = penConfig.jitterStrength ?? 50;
        const minCutoff = Math.max(1.0, 4.0 - (strength / 100) * 3.0);
        const beta = 0.005 + (strength / 100) * 0.015;
        jitterFilterRef.current = new OneEuroPointFilter(minCutoff, beta);
      } else {
        jitterFilterRef.current = null;
      }

      stabilizerRef.current.process(startPoint);
    },
    [
      activeTool,
      screenToCanvas,
      penConfig.pressureEnabled,
      penConfig.jitterFilterEnabled,
      penConfig.jitterStrength,
      penConfig.stabilizerStrength,
      shouldProcessPointer,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current) return;
      if (activeTool !== 'pen') return;
      if (!shouldProcessPointer(e)) return;
      // Ignora ponteiros diferentes do que iniciou o stroke (ex: dedo da palma
      // tocando enquanto Pencil desenha).
      if (
        activePointerIdRef.current !== null &&
        e.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

      const native = e.nativeEvent as PointerEvent;
      const events =
        typeof native.getCoalescedEvents === 'function'
          ? native.getCoalescedEvents()
          : [native];

      for (const ev of events) {
        let { x, y } = screenToCanvas(ev.clientX, ev.clientY);
        const t = ev.timeStamp;

        // [1] 1€ FILTER — aplica primeiro nas coordenadas brutas
        if (jitterFilterRef.current) {
          const filtered = jitterFilterRef.current.filter(x, y, t);
          x = filtered.x;
          y = filtered.y;
        }

        const pressure = penConfig.pressureEnabled
          ? (ev.pressure > 0 && ev.pointerType === 'pen'
              ? ev.pressure
              : estimatePressure(x, y, t))
          : 0.5;

        const rawPoint: Point = { x, y, pressure, t };
        appendPoint(rawPoint);
      }

      // PREDICTED EVENTS — reduz latência percebida em ~16ms
      // Pontos preditos NÃO são adicionados a currentPointsRef (são descartáveis)
      const nativeWithPredicted = native as PointerEvent & {
        getPredictedEvents?: () => PointerEvent[];
      };
      if (typeof nativeWithPredicted.getPredictedEvents === 'function') {
        const predicted = nativeWithPredicted.getPredictedEvents().slice(0, 4);
        const predictedPoints: Point[] = [];
        for (const pred of predicted) {
          const { x: px, y: py } = screenToCanvas(pred.clientX, pred.clientY);
          predictedPoints.push({
            x: px,
            y: py,
            pressure: pred.pressure || 0.5,
            t: pred.timeStamp,
          });
        }
        predictedPointsRef.current = predictedPoints;
      } else {
        predictedPointsRef.current = [];
      }

      commitPreviewFrame();
    },
    [
      activeTool,
      screenToCanvas,
      estimatePressure,
      penConfig.pressureEnabled,
      shouldProcessPointer,
      appendPoint,
      commitPreviewFrame,
    ]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    if (!shouldProcessPointer(e)) return;
    if (
      activePointerIdRef.current !== null &&
      e.pointerId !== activePointerIdRef.current
    ) {
      return;
    }

    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const t = typeof e.timeStamp === 'number' ? e.timeStamp : performance.now();
    const pressure = penConfig.pressureEnabled
      ? (e.pressure > 0 && e.pointerType === 'pen' ? e.pressure : estimatePressure(x, y, t))
      : 0.5;
    appendPoint({ x, y, pressure, t }, true);

    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    activePointerTypeRef.current = null;

    let points = currentPointsRef.current;
    if (points.length === 0) {
      currentPointsRef.current = [];
      setCurrentStroke(null);
      stabilizerRef.current = null;
      return;
    }

    // Toque rápido (ponto): duplica o único ponto com leve offset
    // para que perfect-freehand gere um disco visível.
    if (points.length === 1) {
      const p = points[0];
      points = [
        p,
        { x: p.x + 0.01, y: p.y + 0.01, pressure: p.pressure, t: p.t + 1 },
      ];
      currentPointsRef.current = points;
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

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    currentPointsRef.current = [];
    setCurrentStroke(null);
    stabilizerRef.current = null;
    jitterFilterRef.current?.reset();
    jitterFilterRef.current = null;
    predictedPointsRef.current = [];
  }, [appendPoint, estimatePressure, onStrokeComplete, penConfig, screenToCanvas, shouldProcessPointer]);

  const handlePointerCancel = useCallback(() => {
    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    activePointerTypeRef.current = null;
    currentPointsRef.current = [];
    setCurrentStroke(null);
    stabilizerRef.current = null;
    jitterFilterRef.current?.reset();
    jitterFilterRef.current = null;
    predictedPointsRef.current = [];
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
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

  return {
    currentStroke,
    bindPointerHandlers,
    cancelStroke: handlePointerCancel,
    isPinchGestureAllowed,
    predictedPoints: predictedPointsRef.current,
  };
}
