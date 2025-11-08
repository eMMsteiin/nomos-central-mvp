import { useEffect, useState, useRef } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { PostIt as PostItComponent } from './PostIt';
import { PostIt as PostItType } from '@/types/postit';
import { PostItCreatorDialog } from './PostItCreatorDialog';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';

interface PostItBoardProps {
  postIts: PostItType[];
  onAddPostIt: (postIt: PostItType) => void;
  onUpdatePosition: (id: string, position: { x: number; y: number }) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, tab: PostItType['tab']) => void;
  onUpdateText: (id: string, text: string) => void;
}

const SNAP_GRID = 20; // Snap points a cada 20px
const EDGE_MARGIN = 20; // Margem das bordas para magnetismo

// Função para snap no grid
const snapToGrid = (value: number): number => {
  return Math.round(value / SNAP_GRID) * SNAP_GRID;
};

// Função para aplicar magnetismo nas bordas
const applyEdgeMagnetism = (x: number, y: number, containerWidth: number, containerHeight: number, postItWidth: number, postItHeight: number) => {
  let newX = x;
  let newY = y;
  
  // Magnetismo na borda esquerda
  if (newX < EDGE_MARGIN) newX = EDGE_MARGIN;
  
  // Magnetismo na borda direita
  if (newX + postItWidth > containerWidth - EDGE_MARGIN) {
    newX = containerWidth - postItWidth - EDGE_MARGIN;
  }
  
  // Magnetismo na borda superior
  if (newY < EDGE_MARGIN) newY = EDGE_MARGIN;
  
  // Magnetismo na borda inferior
  if (newY + postItHeight > containerHeight - EDGE_MARGIN) {
    newY = containerHeight - postItHeight - EDGE_MARGIN;
  }
  
  return { x: newX, y: newY };
};

export const PostItBoard = ({ postIts, onAddPostIt, onUpdatePosition, onDelete, onMove, onUpdateText }: PostItBoardProps) => {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 15, // Aumentado para reduzir sensibilidade
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
      
      // Calcula nova posição com o delta
      let newX = currentPos.x + delta.x;
      let newY = currentPos.y + delta.y;
      
      // Aplica snap no grid
      newX = snapToGrid(newX);
      newY = snapToGrid(newY);
      
      // Aplica magnetismo nas bordas
      const boardWidth = boardRef.current?.clientWidth || 1200;
      const boardHeight = boardRef.current?.clientHeight || 800;
      const postItWidth = 256; // Largura aproximada do post-it
      const postItHeight = 256; // Altura aproximada do post-it
      
      const finalPosition = applyEdgeMagnetism(newX, newY, boardWidth, boardHeight, postItWidth, postItHeight);
      
      setPositions((prev) => ({
        ...prev,
        [postItId]: finalPosition,
      }));
      
      // Debounce no salvamento para melhor performance
      setTimeout(() => {
        onUpdatePosition(postItId, finalPosition);
      }, 100);
    }
  };

  return (
    <div className="flex-1 relative rounded-lg overflow-hidden cork-board">
      {/* Add Post-it Button - Fixed at top */}
      <div className="sticky top-0 z-10 p-4 flex justify-center">
        <Button
          onClick={() => setIsDialogOpen(true)}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-all gap-2 bg-primary hover:bg-primary/90"
        >
          <Plus className="w-5 h-5" />
          Adicionar Lembrete
        </Button>
      </div>

      {/* Cork Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={postIts.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div ref={boardRef} className="relative min-h-[600px] w-full pb-8">
            {/* Post-its */}
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
                  onMove={onMove}
                  onUpdateText={onUpdateText}
                  isBeingDragged={draggingId === postIt.id}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Creator Dialog */}
      <PostItCreatorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreatePostIt={onAddPostIt}
      />
    </div>
  );
};
