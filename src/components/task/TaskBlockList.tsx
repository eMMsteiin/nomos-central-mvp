import { useTaskBlocks } from '@/hooks/useTaskBlocks';
import { SubtaskBlock } from './blocks/SubtaskBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { AddBlockMenu } from './AddBlockMenu';
import { SubtaskContent, ImageContent } from '@/types/task';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskBlock } from '@/types/task';

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

  return null;
}

export function TaskBlockList({ taskId }: TaskBlockListProps) {
  const {
    blocks,
    isLoading,
    addSubtaskBlock,
    addImageBlock,
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      reorderBlocks(oldIndex, newIndex);
    }
  };

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
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map(b => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                onToggle={() => toggleSubtaskCompletion(block.id)}
                onTextChange={(text) => updateSubtaskText(block.id, text)}
                onDelete={() => deleteBlock(block.id)}
                onUpdateImageWidth={(width) => updateImageWidth(block.id, width)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AddBlockMenu
        onAddSubtask={() => addSubtaskBlock('')}
        onAddImage={addImageBlock}
      />
    </div>
  );
}
