import { useState, useCallback } from 'react';
import type { ViewportState } from './types';

const DEFAULT_VIEWPORT: ViewportState = { scale: 1, tx: 0, ty: 0 };
const MIN_SCALE = 0.25;
const MAX_SCALE = 4.0;

export function useCanvasViewport() {
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.01;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setViewport((prev) => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * (1 + delta)));
        const scaleDelta = newScale / prev.scale;
        return {
          scale: newScale,
          tx: cx - (cx - prev.tx) * scaleDelta,
          ty: cy - (cy - prev.ty) * scaleDelta,
        };
      });
    } else {
      setViewport((prev) => ({
        ...prev,
        ty: prev.ty - e.deltaY,
        tx: prev.tx - e.deltaX,
      }));
    }
  }, []);

  const handlePan = useCallback(
    (args: { dx?: number; dy?: number; dScale?: number }) => {
      setViewport((prev) => {
        const newScale = args.dScale
          ? Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + args.dScale))
          : prev.scale;
        return {
          scale: newScale,
          tx: prev.tx + (args.dx ?? 0),
          ty: prev.ty + (args.dy ?? 0),
        };
      });
    },
    []
  );

  const resetViewport = useCallback(() => setViewport(DEFAULT_VIEWPORT), []);

  return { viewport, handleWheel, handlePan, resetViewport };
}
