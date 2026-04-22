import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { useCanvasInput } from './useCanvasInput';
import { useCanvasViewport } from './useCanvasViewport';
import { CanvasBackground } from './CanvasBackground';
import { renderStroke, renderLiveStroke } from './StrokeRenderer';
import type { NotebookPageFull, Stroke } from '@/hooks/notebook/useNotebookPage';
import type { ToolType, PenConfig } from './types';

export interface CanvasAreaHandle {
  applyStrokes: (strokes: Stroke[]) => void;
}

interface CanvasAreaProps {
  page: NotebookPageFull;
  activeTool: ToolType;
  penConfig: PenConfig;
  onStrokesChange: (strokes: Stroke[]) => void;
}

export const CanvasArea = forwardRef<CanvasAreaHandle, CanvasAreaProps>(function CanvasArea(
  { page, activeTool, penConfig, onStrokesChange },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [strokes, setStrokes] = useState<Stroke[]>(page.strokes ?? []);

  // Sync quando muda de página
  useEffect(() => {
    setStrokes(page.strokes ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  useImperativeHandle(ref, () => ({
    applyStrokes: (newStrokes: Stroke[]) => {
      setStrokes(newStrokes);
    },
  }));

  const { viewport, handleWheel, handlePan, resetViewport } = useCanvasViewport();

  const { currentStroke, bindPointerHandlers, cancelStroke } = useCanvasInput({
    canvasRef,
    viewport,
    activeTool,
    penConfig,
    onStrokeComplete: (newStroke) => {
      const updated = [...strokes, newStroke];
      setStrokes(updated);
      onStrokesChange(updated);
    },
  });

  // Pinch-zoom & pan com 2 dedos (não desenha)
  const pinchStateRef = useRef<{
    active: boolean;
    lastDist: number;
    lastCenter: { x: number; y: number };
  }>({ active: false, lastDist: 0, lastCenter: { x: 0, y: 0 } });

  const getTouchData = (touches: React.TouchList | TouchList) => {
    const t1 = touches[0];
    const t2 = touches[1];
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    const dist = Math.hypot(dx, dy);
    const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
    return { dist, center };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      cancelStroke();
      const { dist, center } = getTouchData(e.touches);
      pinchStateRef.current = { active: true, lastDist: dist, lastCenter: center };
    }
  }, [cancelStroke]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStateRef.current.active) {
      e.preventDefault();
      const { dist, center } = getTouchData(e.touches);
      const prev = pinchStateRef.current;
      const scaleDelta = (dist / prev.lastDist) - 1;
      const dx = center.x - prev.lastCenter.x;
      const dy = center.y - prev.lastCenter.y;
      handlePan({ dx, dy, dScale: scaleDelta });
      pinchStateRef.current = { active: true, lastDist: dist, lastCenter: center };
    }
  }, [handlePan]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStateRef.current.active = false;
    }
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(viewport.tx, viewport.ty);
    ctx.scale(viewport.scale, viewport.scale);

    for (const stroke of strokes) {
      renderStroke(ctx, stroke);
    }

    if (currentStroke) {
      renderLiveStroke(ctx, currentStroke, penConfig);
    }

    ctx.restore();
  }, [strokes, currentStroke, viewport, page.id, penConfig]);

  // Resize observer to repaint on container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      // Force a re-render by toggling a dummy state via setStrokes (cheap)
      setStrokes((s) => [...s]);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Bloqueia o gesto de zoom-pinch nativo do trackpad fora dessa área
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-neutral-100 dark:bg-neutral-950"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <CanvasBackground
        paperTemplate={page.paper_template ?? 'blank'}
        viewport={viewport}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
        {...bindPointerHandlers()}
      />

      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-sm overflow-hidden">
        <button
          onClick={() => handlePan({ dScale: -0.1 })}
          className="px-2.5 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          title="Diminuir zoom"
        >
          −
        </button>
        <span className="px-2 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums min-w-[3.5rem] text-center">
          {Math.round(viewport.scale * 100)}%
        </span>
        <button
          onClick={() => handlePan({ dScale: 0.1 })}
          className="px-2.5 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          title="Aumentar zoom"
        >
          +
        </button>
        <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-800" />
        <button
          onClick={resetViewport}
          className="px-2.5 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          title="Resetar zoom"
        >
          100%
        </button>
      </div>
    </div>
  );
});
