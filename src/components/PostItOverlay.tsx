import { useEffect, useState } from 'react';
import { PostIt as PostItComponent } from './PostIt';
import { PostIt as PostItType } from '@/types/postit';
import { usePostIts } from '@/hooks/usePostIts';

interface PostItOverlayProps {
  tab: PostItType['tab'];
}

export const PostItOverlay = ({ tab }: PostItOverlayProps) => {
  const { postIts, updatePostIt, deletePostIt, movePostItToTab } = usePostIts(tab);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const initialPositions: Record<string, { x: number; y: number }> = {};
    postIts.forEach((postIt) => {
      initialPositions[postIt.id] = postIt.position;
    });
    setPositions(initialPositions);
  }, [postIts]);

  const handleDragStart = (e: React.DragEvent, postItId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('postit-id', postItId);
  };

  const handleDragEnd = (e: React.DragEvent, postItId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newPosition = {
      x: e.clientX - rect.width / 2,
      y: e.clientY - rect.height / 2,
    };
    
    setPositions((prev) => ({
      ...prev,
      [postItId]: newPosition,
    }));
    
    updatePostIt(postItId, { position: newPosition });
  };

  if (postIts.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {postIts.map((postIt) => (
        <div
          key={postIt.id}
          className="pointer-events-auto"
          style={{
            position: 'absolute',
            left: `${positions[postIt.id]?.x || postIt.position.x}px`,
            top: `${positions[postIt.id]?.y || postIt.position.y}px`,
          }}
          draggable
          onDragStart={(e) => handleDragStart(e, postIt.id)}
          onDragEnd={(e) => handleDragEnd(e, postIt.id)}
        >
          <PostItComponent
            postIt={postIt}
            onDelete={deletePostIt}
            onMove={movePostItToTab}
            onUpdateText={(id, text) => updatePostIt(id, { text })}
            isDraggable={false}
          />
        </div>
      ))}
    </div>
  );
};
