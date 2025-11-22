import { useEffect, useState, useRef } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { PostIt as PostItComponent } from './PostIt';
import { PostIt as PostItType } from '@/types/postit';
import { PostItCreatorDialog } from './PostItCreatorDialog';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';

interface PostItBoardProps {
  blockId: string;
  postIts: PostItType[];
  onAddPostIt: (postIt: PostItType) => void;
  onUpdatePosition: (id: string, position: { x: number; y: number }) => void;
  onDelete: (id: string) => void;
  onMoveToBlock?: (id: string, blockId: string) => void;
  onUpdateText: (id: string, text: string) => void;
}

const SNAP_GRID = 20;
const EDGE_MARGIN = 20;

const snapToGrid = (value: number): number => {
  return Math.round(value / SNAP_GRID) * SNAP_GRID;
};

const applyEdgeMagnetism = (x: number, y: number, containerWidth: number, containerHeight: number, postItWidth: number, postItHeight: number) => {
  let newX = x;
  let newY = y;
  
  if (newX < EDGE_MARGIN) newX = EDGE_MARGIN;
  if (newX + postItWidth > containerWidth - EDGE_MARGIN) {
    newX = containerWidth - postItWidth - EDGE_MARGIN;
  }
  if (newY < EDGE_MARGIN) newY = EDGE_MARGIN;
  if (newY + postItHeight > containerHeight - EDGE_MARGIN) {
    newY = containerHeight - postItHeight - EDGE_MARGIN;
  }
  
  return { x: newX, y: newY };
};

export const PostItBoard = ({ 
  blockId,
  postIts, 
  onAddPostIt, 
  onUpdatePosition, 
  onDelete, 
  onMoveToBlock,
  onUpdateText
}: PostItBoardProps) => {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 15,
      },
    })
  );

  useEffect(() => {
    const initialPositions: Record<string, { x: number; y: number }> = {};
    postIts.forEach((postIt) => {
      initialPositions[postIt.id] = postIt.position;
    });
    setPositions(initialPositions);
  }, [postIts]);

  const handleDragStart = (event: DragStartEvent) => {
    const postItId = event.active.id as string;
    setDraggingId(postItId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const postItId = active.id as string;
    
    setDraggingId(null);
    
    if (delta.x !== 0 || delta.y !== 0) {
      const currentPos = positions[postItId] || { x: 0, y: 0 };
      
      let newX = currentPos.x + delta.x;
      let newY = currentPos.y + delta.y;
      
      newX = snapToGrid(newX);
      newY = snapToGrid(newY);
      
      const boardWidth = boardRef.current?.clientWidth || 1200;
      const boardHeight = boardRef.current?.clientHeight || 800;
      const postItWidth = 256;
      const postItHeight = 256;
      
      const finalPosition = applyEdgeMagnetism(newX, newY, boardWidth, boardHeight, postItWidth, postItHeight);
      
      setPositions((prev) => ({
        ...prev,
        [postItId]: finalPosition,
      }));
      
      setTimeout(() => {
        onUpdatePosition(postItId, finalPosition);
      }, 100);
    }
  };

  const handleCreatePostIt = (postIt: Omit<PostItType, 'blockId'>) => {
    onAddPostIt({ ...postIt, blockId } as PostItType);
  };

  return (
    <div className="flex-1 relative rounded-lg overflow-hidden cork-board">
      {/* Add Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          onClick={() => setIsDialogOpen(true)}
          size="sm"
          className="shadow-lg hover:shadow-xl transition-all gap-2"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </Button>
      </div>

      {/* Cork Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={postIts.map(p => p.id)} strategy={rectSortingStrategy}>
          <div ref={boardRef} className="relative min-h-full w-full p-4">
            {postIts.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Clique em "Adicionar" para criar seu primeiro lembrete
              </div>
            )}

            {postIts.map((postIt) => (
              <div
                key={postIt.id}
                className={`postit-landing ${draggingId === postIt.id ? 'dragging' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${positions[postIt.id]?.x || postIt.position.x}px`,
                  top: `${positions[postIt.id]?.y || postIt.position.y}px`,
                }}
              >
                <PostItComponent
                  postIt={postIt}
                  onDelete={onDelete}
                  onMove={onMoveToBlock ? (id, _tab) => {} : undefined}
                  onUpdateText={onUpdateText}
                  isBeingDragged={draggingId === postIt.id}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <PostItCreatorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreatePostIt={handleCreatePostIt}
      />
    </div>
  );
};
