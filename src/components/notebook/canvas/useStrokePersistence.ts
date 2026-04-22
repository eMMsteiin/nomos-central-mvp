import { useCallback, useRef, useState } from 'react';
import { useUpdateNotebookPage } from '@/hooks/notebook/mutations/usePageMutations';
import type { Stroke } from '@/hooks/notebook/useNotebookPage';

const DEBOUNCE_MS = 1200;

export function useStrokePersistence(notebookId: string, pageId: string) {
  const updatePage = useUpdateNotebookPage();
  const timerRef = useRef<number | null>(null);
  const pendingStrokesRef = useRef<Stroke[] | null>(null);
  const isFlushingRef = useRef(false);
  const lastSavedSignatureRef = useRef<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const getSignature = useCallback((strokes: Stroke[]) => {
    const lastStroke = strokes[strokes.length - 1];
    const lastPoint = lastStroke?.points[lastStroke.points.length - 1];
    return `${strokes.length}:${lastStroke?.id ?? 'none'}:${lastPoint?.x ?? 0}:${lastPoint?.y ?? 0}:${lastPoint?.t ?? 0}`;
  }, []);

  const flush = useCallback(() => {
    if (isFlushingRef.current) return;

    const strokes = pendingStrokesRef.current;
    if (!strokes) {
      setIsSaving(false);
      return;
    }

    const signature = getSignature(strokes);
    if (signature === lastSavedSignatureRef.current) {
      pendingStrokesRef.current = null;
      setIsSaving(false);
      return;
    }

    pendingStrokesRef.current = null;
    isFlushingRef.current = true;

    updatePage.mutate(
      { notebook_id: notebookId, page_id: pageId, patch: { strokes } },
      {
        onSuccess: () => {
          lastSavedSignatureRef.current = signature;
        },
        onSettled: () => {
          isFlushingRef.current = false;

          if (pendingStrokesRef.current) {
            timerRef.current = window.setTimeout(() => {
              timerRef.current = null;
              flush();
            }, 250);
            return;
          }

          setIsSaving(false);
        },
      }
    );
  }, [getSignature, notebookId, pageId, updatePage]);

  const saveStrokes = useCallback(
    (strokes: Stroke[]) => {
      pendingStrokesRef.current = strokes;

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      setIsSaving(true);

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        flush();
      }, DEBOUNCE_MS);
    },
    [flush]
  );

  return { saveStrokes, isSaving };
}
