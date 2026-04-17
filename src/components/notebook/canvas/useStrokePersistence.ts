import { useCallback, useRef, useState } from 'react';
import { useUpdateNotebookPage } from '@/hooks/notebook/mutations/usePageMutations';
import type { Stroke } from '@/hooks/notebook/useNotebookPage';

const DEBOUNCE_MS = 800;

export function useStrokePersistence(notebookId: string, pageId: string) {
  const updatePage = useUpdateNotebookPage();
  const timerRef = useRef<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveStrokes = useCallback(
    (strokes: Stroke[]) => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      setIsSaving(true);

      timerRef.current = window.setTimeout(() => {
        updatePage.mutate(
          { notebook_id: notebookId, page_id: pageId, patch: { strokes } },
          { onSettled: () => setIsSaving(false) }
        );
        timerRef.current = null;
      }, DEBOUNCE_MS);
    },
    [notebookId, pageId, updatePage]
  );

  return { saveStrokes, isSaving };
}
