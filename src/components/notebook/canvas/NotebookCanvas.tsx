import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNotebookPage } from '@/hooks/notebook/useNotebookPage';
import { CanvasArea, type CanvasAreaHandle } from './CanvasArea';
import { CanvasToolbar } from './CanvasToolbar';
import { useCanvasHistory } from './useCanvasHistory';
import { useStrokePersistence } from './useStrokePersistence';
import type { Stroke } from '@/hooks/notebook/useNotebookPage';
import type { NotebookRow } from '@/hooks/notebook/useNotebooks';
import type { ToolType, PenConfig } from './types';

interface NotebookCanvasProps {
  notebook: NotebookRow;
  pageId: string;
}

export function NotebookCanvas({ notebook, pageId }: NotebookCanvasProps) {
  const navigate = useNavigate();
  const { data: page, isLoading } = useNotebookPage(notebook.id, pageId);

  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [penConfig, setPenConfig] = useState<PenConfig>({
    color: '#000000',
    width: 2,
    pressureSensitivity: 50,
    tipSharpness: 50,
  });

  const canvasRef = useRef<CanvasAreaHandle>(null);
  const { undo, redo, canUndo, canRedo, pushSnapshot, reset } = useCanvasHistory(page?.strokes ?? []);
  const { saveStrokes, isSaving } = useStrokePersistence(notebook.id, pageId);

  // Reset history when page changes
  useEffect(() => {
    if (page) reset(page.strokes ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id]);

  const handleStrokesChange = useCallback(
    (newStrokes: Stroke[]) => {
      pushSnapshot(newStrokes);
      saveStrokes(newStrokes);
    },
    [pushSnapshot, saveStrokes]
  );

  const handleUndo = useCallback(() => {
    undo((strokes) => {
      canvasRef.current?.applyStrokes(strokes);
      saveStrokes(strokes);
    });
  }, [undo, saveStrokes]);

  const handleRedo = useCallback(() => {
    redo((strokes) => {
      canvasRef.current?.applyStrokes(strokes);
      saveStrokes(strokes);
    });
  }, [redo, saveStrokes]);

  // Keyboard: Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  if (isLoading || !page) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-neutral-950">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => navigate('/caderno')}
          className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          title="Voltar à biblioteca"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-col min-w-0 flex-1">
          <h1 className="text-sm font-semibold truncate">{notebook.title}</h1>
          {notebook.discipline && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {notebook.discipline}
            </p>
          )}
        </div>
        {isSaving && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">Salvando…</span>
        )}
      </div>

      <CanvasToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        penConfig={penConfig}
        onPenConfigChange={setPenConfig}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div className="flex-1 overflow-hidden">
        <CanvasArea
          ref={canvasRef}
          page={page}
          activeTool={activeTool}
          penConfig={penConfig}
          onStrokesChange={handleStrokesChange}
        />
      </div>
    </div>
  );
}
