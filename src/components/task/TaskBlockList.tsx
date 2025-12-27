import { useState } from 'react';
import { useTaskBlocks } from '@/hooks/useTaskBlocks';
import { SubtaskBlock } from './blocks/SubtaskBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { NotebookBlock } from './blocks/NotebookBlock';
import { AddBlockMenu } from './AddBlockMenu';
import { SelectNotebookDialog } from './SelectNotebookDialog';
import { SubtaskContent, ImageContent, NotebookContent, TaskBlock } from '@/types/task';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, CheckSquare, Image, Book } from 'lucide-react';

interface DropIndicatorProps {
  isVisible: boolean;
}

function DropIndicator({ isVisible }: DropIndicatorProps) {
  if (!isVisible) return null;
  
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <div className="flex-1 h-0.5 bg-primary rounded-full animate-pulse" />
    </div>
  );
}

interface DragPreviewProps {
  block: TaskBlock;
}

function DragPreview({ block }: DragPreviewProps) {
  return (
    <div className="bg-background border border-primary/50 rounded-lg p-3 shadow-lg opacity-90 max-w-md">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        {block.type === 'subtask' ? (
          <>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">
              {(block.content as SubtaskContent).text || 'Subtarefa'}
            </span>
          </>
        ) : block.type === 'image' ? (
          <>
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">
              {(block.content as ImageContent).fileName || 'Imagem'}
            </span>
          </>
        ) : block.type === 'notebook' ? (
          <>
            <Book className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">
              {(block.content as NotebookContent).notebookTitle || 'Caderno'}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

interface TaskBlockListProps {
  taskId: string;
}

function SortableBlock({
  block,
  onToggle,
  onTextChange,
  onDelete,
  onUpdateImageWidth,
}: {
  block: TaskBlock;
  onToggle: () => void;
  onTextChange: (text: string) => void;
  onDelete: () => void;
  onUpdateImageWidth?: (width: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandleProps = {
    ...attributes,
    ...listeners,
  };

  if (block.type === 'subtask') {
    return (
      <div ref={setNodeRef} style={style}>
        <SubtaskBlock
          content={block.content as SubtaskContent}
          blockId={block.id}
          onToggle={onToggle}
          onTextChange={onTextChange}
          onDelete={onDelete}
          isDragging={isDragging}
          dragHandleProps={dragHandleProps}
        />
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div ref={setNodeRef} style={style}>
        <ImageBlock
          content={block.content as ImageContent}
          onDelete={onDelete}
          onUpdateWidth={onUpdateImageWidth}
          isDragging={isDragging}
          dragHandleProps={dragHandleProps}
        />
      </div>
    );
  }

  if (block.type === 'notebook') {
    return (
      <div ref={setNodeRef} style={style}>
        <NotebookBlock
          content={block.content as NotebookContent}
          onDelete={onDelete}
          isDragging={isDragging}
          dragHandleProps={dragHandleProps}
        />
      </div>
    );
  }

  return null;
}

export function TaskBlockList({ taskId }: TaskBlockListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isSelectNotebookOpen, setIsSelectNotebookOpen] = useState(false);

  const {
    blocks,
    isLoading,
    addSubtaskBlock,
    addImageBlock,
    addNotebookBlock,
    toggleSubtaskCompletion,
    updateSubtaskText,
    deleteBlock,
    reorderBlocks,
    updateBlockContent,
  } = useTaskBlocks(taskId);

  const updateImageWidth = (blockId: string, width: number) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'image') return;
    const content = block.content as ImageContent;
    updateBlockContent(blockId, { ...content, width });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      reorderBlocks(oldIndex, newIndex);
    }

    setActiveId(null);
    setOverId(null);
  };

  const shouldShowIndicator = (blockId: string, position: 'before' | 'after'): boolean => {
    if (!activeId || !overId) return false;
    if (activeId === blockId) return false;
    if (activeId === overId) return false;

    const activeIndex = blocks.findIndex(b => b.id === activeId);
    const overIndex = blocks.findIndex(b => b.id === overId);
    const currentIndex = blocks.findIndex(b => b.id === blockId);

    if (currentIndex !== overIndex) return false;

    // Show indicator based on drag direction
    if (activeIndex < overIndex) {
      return position === 'after';
    } else {
      return position === 'before';
    }
  };

  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
    );
  }

  return (
    <div className="py-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map(b => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {blocks.map((block, index) => (
              <div key={block.id}>
                <DropIndicator isVisible={shouldShowIndicator(block.id, 'before')} />
                <SortableBlock
                  block={block}
                  onToggle={() => toggleSubtaskCompletion(block.id)}
                  onTextChange={(text) => updateSubtaskText(block.id, text)}
                  onDelete={() => deleteBlock(block.id)}
                  onUpdateImageWidth={(width) => updateImageWidth(block.id, width)}
                />
                {index === blocks.length - 1 && (
                  <DropIndicator isVisible={shouldShowIndicator(block.id, 'after')} />
                )}
              </div>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeBlock ? <DragPreview block={activeBlock} /> : null}
        </DragOverlay>
      </DndContext>

      <AddBlockMenu
        onAddSubtask={() => addSubtaskBlock('')}
        onAddImage={addImageBlock}
        onAddNotebook={() => setIsSelectNotebookOpen(true)}
      />

      <SelectNotebookDialog
        open={isSelectNotebookOpen}
        onOpenChange={setIsSelectNotebookOpen}
        onSelect={addNotebookBlock}
      />
    </div>
  );
}
