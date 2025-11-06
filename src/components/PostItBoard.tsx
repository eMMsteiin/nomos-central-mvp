import { useState } from 'react';
import { PostItSimple } from './PostItSimple';
import { PostIt as PostItType } from '@/types/postit';

interface PostItBoardProps {
  postIts: PostItType[];
  onUpdatePosition: (id: string, position: { x: number; y: number }) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, tab: PostItType['tab']) => void;
  onUpdateText: (id: string, text: string) => void;
}

export const PostItBoard = ({ postIts, onUpdatePosition, onDelete, onMove, onUpdateText }: PostItBoardProps) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleDragStart = (postItId: string, startX: number, startY: number) => (e: React.DragEvent) => {
    setDraggedId(postItId);
    const postIt = postIts.find(p => p.id === postItId);
    if (postIt) {
      setDragOffset({
        x: e.clientX - postIt.position.x,
        y: e.clientY - postIt.position.y,
      });
    }
  };

  const handleDrag = (postItId: string) => (e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return;
    
    const newPosition = {
      x: Math.max(0, e.clientX - dragOffset.x),
      y: Math.max(0, e.clientY - dragOffset.y),
    };
    
    onUpdatePosition(postItId, newPosition);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <div className="flex-1 relative bg-gradient-to-br from-background to-muted/20 rounded-lg overflow-auto">
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
              left: `${postIt.position.x}px`,
              top: `${postIt.position.y}px`,
            }}
          >
            <PostItSimple
              postIt={postIt}
              onDelete={onDelete}
              onMove={onMove}
              onUpdateText={onUpdateText}
              onDragStart={handleDragStart(postIt.id, postIt.position.x, postIt.position.y)}
              onDrag={handleDrag(postIt.id)}
              onDragEnd={handleDragEnd}
              isDragging={draggedId === postIt.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
