import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { PostIt as PostItComponent } from './PostIt';
import { PostIt as PostItType } from '@/types/postit';

interface PostItBoardProps {
  postIts: PostItType[];
  onUpdatePosition: (id: string, position: { x: number; y: number }) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, tab: PostItType['tab']) => void;
  onUpdateText: (id: string, text: string) => void;
}

export const PostItBoard = ({ postIts, onUpdatePosition, onDelete, onMove, onUpdateText }: PostItBoardProps) => {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const postItId = active.id as string;
    
    if (delta.x !== 0 || delta.y !== 0) {
      const currentPos = positions[postItId] || { x: 0, y: 0 };
      const newPosition = {
        x: Math.max(0, currentPos.x + delta.x),
        y: Math.max(0, currentPos.y + delta.y),
      };
      
      setPositions((prev) => ({
        ...prev,
        [postItId]: newPosition,
      }));
      
      onUpdatePosition(postItId, newPosition);
    }
  };

  return (
    <div className="flex-1 relative bg-gradient-to-br from-background to-muted/20 rounded-lg overflow-auto">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={postIts.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="relative min-h-[600px] w-full">
            {/* Grid Pattern */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `
                  linear-gradient(hsl(var(--border)) 1px, transparent 1px),
                  linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
              }}
            />

            {/* Post-its */}
            {postIts.map((postIt) => (
              <div
                key={postIt.id}
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
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
