import { useDroppable } from '@dnd-kit/core';
import { ArrowUp } from 'lucide-react';

interface RootDropZoneProps {
  active: boolean;
}

export function RootDropZone({ active }: RootDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'root-drop-zone' });

  if (!active) return null;

  return (
    <div
      ref={setNodeRef}
      className={`mb-4 flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed transition ${
        isOver
          ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
          : 'border-neutral-300 dark:border-neutral-700 text-neutral-500'
      }`}
    >
      <ArrowUp className="w-4 h-4" />
      <span className="text-sm">Soltar aqui para mover para a raiz</span>
    </div>
  );
}
