import { useState, useRef, useEffect } from 'react';
import { useTaskBlocks } from '@/hooks/useTaskBlocks';
import { SubtaskBlock } from './blocks/SubtaskBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { NotebookBlock } from './blocks/NotebookBlock';
import { TextBlock } from './blocks/TextBlock';
import { SelectNotebookDialog } from './SelectNotebookDialog';
import { SubtaskContent, ImageContent, TextContent, NotebookContent, TaskBlock } from '@/types/task';
import { Notebook } from '@/types/notebook';
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
import { GripVertical, CheckSquare, Image, Book, Plus, Type } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskBlockListProps {
  taskId: string;
}

// ── Inline Add Menu (the "+" that follows each block) ──────────────────────

interface InlineAddMenuProps {
  onAddText: () => void;
  onAddSubtask: () => void;
  onAddImage: (file: File) => void;
  onAddNotebook: () => void;
}

function InlineAddMenu({ onAddText, onAddSubtask, onAddImage, onAddNotebook }: InlineAddMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onAddImage(file);
            e.target.value = '';
          }
        }}
        className="hidden"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
            <Plus className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={onAddText} className="gap-2">
            <Type className="h-4 w-4" />
            <span>Texto</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddSubtask} className="gap-2">
            <CheckSquare className="h-4 w-4" />
            <span>Subtarefa</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Image className="h-4 w-4" />
            <span>Imagem</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddNotebook} className="gap-2">
            <Book className="h-4 w-4" />
            <span>Caderno</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

// ── Drop Indicator ─────────────────────────────────────────────────────────

function DropIndicator({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <div className="flex-1 h-0.5 bg-primary rounded-full animate-pulse" />
    </div>
  );
}

// ── Drag Preview ───────────────────────────────────────────────────────────

function DragPreview({ block }: { block: TaskBlock }) {
  return (
    <div className="bg-background border border-primary/50 rounded-lg p-3 shadow-lg opacity-90 max-w-md">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        {block.type === 'subtask' ? (
          <>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{(block.content as SubtaskContent).text || 'Subtarefa'}</span>
          </>
        ) : block.type === 'image' ? (
          <>
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{(block.content as ImageContent).fileName || 'Imagem'}</span>
          </>
        ) : block.type === 'notebook' ? (
          <>
            <Book className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{(block.content as NotebookContent).notebookTitle || 'Caderno'}</span>
          </>
        ) : block.type === 'text' ? (
          <span className="text-sm truncate">{(block.content as TextContent).text?.slice(0, 40) || 'Texto'}</span>
        ) : null}
      </div>
    </div>
  );
}

// ── Sortable Block ─────────────────────────────────────────────────────────

function SortableBlock({
  block,
  onToggle,
  onTextChange,
  onDelete,
  onUpdateImageWidth,
  autoFocusText,
  inlineMenu,
}: {
  block: TaskBlock;
  onToggle: () => void;
  onTextChange: (text: string) => void;
  onDelete: () => void;
  onUpdateImageWidth?: (width: number) => void;
  autoFocusText?: boolean;
  inlineMenu?: React.ReactNode;
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

  const dragHandleProps = { ...attributes, ...listeners };

  return (
    <div ref={setNodeRef} style={style}>
      {block.type === 'subtask' && (
        <SubtaskBlock
          content={block.content as SubtaskContent}
          blockId={block.id}
          onToggle={onToggle}
          onTextChange={onTextChange}
          onDelete={onDelete}
          isDragging={isDragging}
          dragHandleProps={dragHandleProps}
        />
      )}
      {block.type === 'image' && (
        <ImageBlock
          content={block.content as ImageContent}
          onDelete={onDelete}
          onUpdateWidth={onUpdateImageWidth}
          isDragging={isDragging}
          dragHandleProps={dragHandleProps}
        />
      )}
      {block.type === 'notebook' && (
        <NotebookBlock
          content={block.content as NotebookContent}
          onDelete={onDelete}
          isDragging={isDragging}
          dragHandleProps={dragHandleProps}
        />
      )}
      {block.type === 'text' && (
        <TextBlock
          content={block.content as TextContent}
          blockId={block.id}
          onTextChange={onTextChange}
          onDelete={onDelete}
          isDragging={isDragging}
          dragHandleProps={dragHandleProps}
          autoFocus={autoFocusText}
          inlineMenu={inlineMenu}
        />
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function TaskBlockList({ taskId }: TaskBlockListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isSelectNotebookOpen, setIsSelectNotebookOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [newlyCreatedTextId, setNewlyCreatedTextId] = useState<string | null>(null);
  const autoCreateInFlight = useRef(false);

  const {
    blocks,
    isLoading,
    isProcessingPages,
    addSubtaskBlock,
    addTextBlock,
    addImageBlock,
    addNotebookBlock,
    addNotebookPagesAsImages,
    toggleSubtaskCompletion,
    updateSubtaskText,
    updateTextBlock,
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

  // Auto-create a text block if the task has no blocks
  useEffect(() => {
    if (!isLoading && blocks.length === 0 && !autoCreateInFlight.current) {
      autoCreateInFlight.current = true;
      addTextBlock('').then((block) => {
        if (block) setNewlyCreatedTextId(block.id);
        autoCreateInFlight.current = false;
      }).catch(() => {
        autoCreateInFlight.current = false;
      });
    }
  }, [isLoading, blocks.length, addTextBlock]);

  // ── Inline insert helpers ───────────────────────────────────────────────

  const handleInlineAddSubtask = async (afterIndex: number) => {
    const position = afterIndex + 1;
    // Shift existing blocks
    const result = await addSubtaskBlock('');
    if (result) {
      // Reorder so it appears after the given index
      const currentIdx = blocks.length; // it was appended at end
      if (currentIdx !== position && position < blocks.length) {
        reorderBlocks(currentIdx, position);
      }
    }
  };

  const handleInlineAddText = async (afterIndex: number) => {
    const position = afterIndex + 1;
    const result = await addTextBlock('');
    if (result) {
      const currentIdx = blocks.length;
      if (currentIdx !== position && position < blocks.length) {
        reorderBlocks(currentIdx, position);
      }
      setNewlyCreatedTextId(result.id);
    }
  };

  const handleInlineAddImage = async (file: File, _afterIndex: number) => {
    await addImageBlock(file);
  };

  const handleInlineAddNotebook = (afterIndex: number) => {
    setInsertAtIndex(afterIndex);
    setIsSelectNotebookOpen(true);
  };

  const handleSelectNotebook = (notebook: Notebook) => {
    addNotebookBlock(notebook);
    setIsSelectNotebookOpen(false);
    setInsertAtIndex(null);
  };

  const handleSelectPagesAsImages = async (notebook: Notebook, pageIndexes: number[]) => {
    await addNotebookPagesAsImages(notebook, pageIndexes);
    setIsSelectNotebookOpen(false);
    setInsertAtIndex(null);
  };

  // ── DnD ─────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  const handleDragOver = (event: DragOverEvent) => setOverId(event.over?.id as string || null);
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
    if (!activeId || !overId || activeId === blockId || activeId === overId) return false;
    const activeIndex = blocks.findIndex(b => b.id === activeId);
    const overIndex = blocks.findIndex(b => b.id === overId);
    const currentIndex = blocks.findIndex(b => b.id === blockId);
    if (currentIndex !== overIndex) return false;
    return activeIndex < overIndex ? position === 'after' : position === 'before';
  };

  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

  // ── Loading ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

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
          <div className="space-y-0.5">
            {blocks.map((block, index) => (
              <div key={block.id} className="group/block relative">
                <DropIndicator isVisible={shouldShowIndicator(block.id, 'before')} />

                <div className="flex items-start gap-1">
                  {/* Inline "+" button on the left */}
                  <div className="mt-1.5 shrink-0">
                    <InlineAddMenu
                      onAddText={() => handleInlineAddText(index)}
                      onAddSubtask={() => handleInlineAddSubtask(index)}
                      onAddImage={(file) => handleInlineAddImage(file, index)}
                      onAddNotebook={() => handleInlineAddNotebook(index)}
                    />
                  </div>

                  {/* Block content */}
                  <div className="flex-1 min-w-0">
                    <SortableBlock
                      block={block}
                      onToggle={() => toggleSubtaskCompletion(block.id)}
                      onTextChange={(text) => {
                        if (block.type === 'text') {
                          updateTextBlock(block.id, text);
                        } else {
                          updateSubtaskText(block.id, text);
                        }
                      }}
                      onDelete={() => deleteBlock(block.id)}
                      onUpdateImageWidth={(width) => updateImageWidth(block.id, width)}
                      autoFocusText={block.id === newlyCreatedTextId}
                    />
                  </div>
                </div>

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

      <SelectNotebookDialog
        open={isSelectNotebookOpen}
        onOpenChange={setIsSelectNotebookOpen}
        onSelectNotebook={handleSelectNotebook}
        onSelectPagesAsImages={handleSelectPagesAsImages}
        isProcessingPages={isProcessingPages}
      />
    </div>
  );
}
