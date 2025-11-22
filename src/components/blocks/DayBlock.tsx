import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Block } from '@/types/block';
import { GripVertical } from 'lucide-react';

interface DayBlockProps {
  block: Block;
}

export const DayBlock = ({ block }: DayBlockProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    position: 'absolute' as const,
    left: `${block.position.x}px`,
    top: `${block.position.y}px`,
    width: `${block.size.width}px`,
    height: `${block.size.height}px`,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-muted/10 border border-muted-foreground/30 rounded-lg shadow overflow-hidden ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Header */}
      <div className="bg-muted/20 border-b border-muted-foreground/20 p-2 flex items-center justify-center gap-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-move hover:bg-muted/30 rounded p-1 transition-colors"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
        <h4 className="font-medium text-xs text-center">{block.title}</h4>
      </div>

      {/* Content Area */}
      <div className="relative w-full h-[calc(100%-36px)] overflow-hidden">
        {/* Post-its will be rendered here by parent component */}
      </div>
    </div>
  );
};
