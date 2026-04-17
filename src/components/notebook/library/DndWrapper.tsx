import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { useMoveNotebookToFolder } from '@/hooks/notebook/mutations/useNotebookMutations';
import { NotebookCard } from './NotebookCard';
import type { NotebookRow } from '@/hooks/notebook/useNotebooks';
import type { NotebookFolder } from '@/hooks/notebook/useNotebookFolders';

interface DndWrapperProps {
  children: React.ReactNode;
  notebooks: NotebookRow[];
  folders: NotebookFolder[];
}

export function DndWrapper({ children, notebooks, folders }: DndWrapperProps) {
  const [activeNotebook, setActiveNotebook] = useState<NotebookRow | null>(null);
  const moveToFolder = useMoveNotebookToFolder();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const nb = notebooks.find((n) => n.id === event.active.id);
    if (nb) setActiveNotebook(nb);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const dragged = activeNotebook;
    setActiveNotebook(null);

    const { active, over } = event;
    if (!over || !dragged) return;

    const overId = String(over.id);
    const notebookId = String(active.id);

    if (overId.startsWith('folder-')) {
      const folderId = overId.replace('folder-', '');
      if (dragged.folder_id === folderId) return;
      const targetFolder = folders.find((f) => f.id === folderId);
      moveToFolder.mutate(
        { notebookId, folderId },
        {
          onSuccess: () => {
            toast.success(`Movido para ${targetFolder?.name ?? 'pasta'}`);
          },
          onError: () => toast.error('Falha ao mover'),
        }
      );
    } else if (overId === 'root-drop-zone') {
      if (dragged.folder_id === null) return;
      moveToFolder.mutate(
        { notebookId, folderId: null },
        {
          onSuccess: () => toast.success('Movido para a raiz'),
          onError: () => toast.error('Falha ao mover'),
        }
      );
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay dropAnimation={null}>
        {activeNotebook && (
          <div className="rotate-2 scale-95 opacity-90 pointer-events-none w-44">
            <NotebookCard
              notebook={activeNotebook}
              viewMode="grid"
              isDragOverlay
              isSelectionMode={false}
              isSelected={false}
              onToggleSelect={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
