import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Move, GripVertical } from 'lucide-react';
import { PostIt as PostItType, POST_IT_COLORS } from '@/types/postit';
import { usePostIts } from '@/hooks/usePostIts';
import { MovePostItDialog } from './MovePostItDialog';

interface PostItOverlayProps {
  tab: PostItType['tab'];
}

export const PostItOverlay = ({ tab }: PostItOverlayProps) => {
  const { postIts, updatePostIt, deletePostIt, movePostItToTab } = usePostIts(tab);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [moveDialogPostIt, setMoveDialogPostIt] = useState<PostItType | null>(null);

  if (postIts.length === 0) return null;

  const handleDragStart = (e: React.DragEvent, postIt: PostItType) => {
    setDraggedId(postIt.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrag = (e: React.DragEvent, postIt: PostItType) => {
    if (e.clientX === 0 && e.clientY === 0) return; // Ignore final drag event
    
    const newPosition = {
      x: Math.max(0, e.clientX - 100),
      y: Math.max(0, e.clientY - 100),
    };
    
    updatePostIt(postIt.id, { position: newPosition });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <>
      <div className="absolute inset-0 pointer-events-none z-10">
        {postIts.map((postIt) => (
          <div
            key={postIt.id}
            draggable
            onDragStart={(e) => handleDragStart(e, postIt)}
            onDrag={(e) => handleDrag(e, postIt)}
            onDragEnd={handleDragEnd}
            style={{
              position: 'absolute',
              left: `${postIt.position.x}px`,
              top: `${postIt.position.y}px`,
              backgroundColor: POST_IT_COLORS[postIt.color],
              transform: `rotate(${postIt.rotation}deg)`,
              width: `${postIt.width}px`,
              minHeight: `${postIt.height}px`,
              opacity: draggedId === postIt.id ? 0.5 : 1,
            }}
            className="pointer-events-auto cursor-move shadow-lg rounded-sm p-4 group hover:shadow-xl transition-shadow"
          >
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-50 transition-opacity">
              <GripVertical className="w-4 h-4 text-foreground/30" />
            </div>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 bg-background/80 hover:bg-background"
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveDialogPostIt(postIt);
                }}
              >
                <Move className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePostIt(postIt.id);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>

            <div className="mt-6">
              {postIt.imageUrl && (
                <img
                  src={postIt.imageUrl}
                  alt="Post-it"
                  className="w-full h-32 object-cover rounded mb-2"
                  draggable={false}
                />
              )}
              
              <p className="text-sm whitespace-pre-wrap break-words font-handwriting min-h-[60px]">
                {postIt.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {moveDialogPostIt && (
        <MovePostItDialog
          open={!!moveDialogPostIt}
          onOpenChange={(open) => !open && setMoveDialogPostIt(null)}
          currentTab={moveDialogPostIt.tab}
          onMove={(tab) => {
            movePostItToTab(moveDialogPostIt.id, tab);
            setMoveDialogPostIt(null);
          }}
        />
      )}
    </>
  );
};
