import { useState, useCallback, useRef } from 'react';
import type { Stroke } from '@/hooks/notebook/useNotebookPage';

const MAX_HISTORY = 50;

export function useCanvasHistory(initialStrokes: Stroke[]) {
  const [past, setPast] = useState<Stroke[][]>([]);
  const [future, setFuture] = useState<Stroke[][]>([]);
  const currentRef = useRef<Stroke[]>(initialStrokes);

  const reset = useCallback((strokes: Stroke[]) => {
    currentRef.current = strokes;
    setPast([]);
    setFuture([]);
  }, []);

  const pushSnapshot = useCallback((newStrokes: Stroke[]) => {
    setPast((prev) => {
      const next = [...prev, currentRef.current];
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
    });
    setFuture([]);
    currentRef.current = newStrokes;
  }, []);

  const undo = useCallback((onApply?: (strokes: Stroke[]) => void) => {
    setPast((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setFuture((f) => [currentRef.current, ...f]);
      currentRef.current = previous;
      onApply?.(previous);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback((onApply?: (strokes: Stroke[]) => void) => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[0];
      setPast((p) => [...p, currentRef.current]);
      currentRef.current = next;
      onApply?.(next);
      return prev.slice(1);
    });
  }, []);

  return {
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    pushSnapshot,
    reset,
  };
}
