import { useState } from 'react';
import { PostItSimple } from './PostItSimple';
import { PostIt as PostItType } from '@/types/postit';
import { usePostIts } from '@/hooks/usePostIts';

interface PostItOverlayProps {
  tab: PostItType['tab'];
}

export const PostItOverlay = ({ tab }: PostItOverlayProps) => {
  const { postIts, updatePostIt, deletePostIt, movePostItToTab } = usePostIts(tab);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  if (postIts.length === 0) return null;

  const handleDragStart = (postItId: string) => (e: React.DragEvent) => {
    setDraggedId(postItId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrag = (postItId: string) => (e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return;
    
    const newPosition = {
      x: Math.max(0, e.clientX - 100),
      y: Math.max(0, e.clientY - 100),
    };
    
    updatePostIt(postItId, { position: newPosition });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {postIts.map((postIt) => (
        <div
          key={postIt.id}
          style={{
            position: 'absolute',
            left: `${postIt.position.x}px`,
            top: `${postIt.position.y}px`,
          }}
          className="pointer-events-auto"
        >
          <PostItSimple
            postIt={postIt}
            onDelete={deletePostIt}
            onMove={movePostItToTab}
            onUpdateText={(id, text) => updatePostIt(id, { text })}
            onDragStart={handleDragStart(postIt.id)}
            onDrag={handleDrag(postIt.id)}
            onDragEnd={handleDragEnd}
            isDragging={draggedId === postIt.id}
          />
        </div>
      ))}
    </div>
  );
};
