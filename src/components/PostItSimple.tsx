import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Move, GripVertical } from 'lucide-react';
import { PostIt as PostItType, POST_IT_COLORS } from '@/types/postit';
import { MovePostItDialog } from './MovePostItDialog';

interface PostItSimpleProps {
  postIt: PostItType;
  onDelete: (id: string) => void;
  onMove: (id: string, tab: PostItType['tab']) => void;
  onUpdateText: (id: string, text: string) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDrag?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export const PostItSimple = ({ 
  postIt, 
  onDelete, 
  onMove, 
  onUpdateText,
  onDragStart,
  onDrag,
  onDragEnd,
  isDragging 
}: PostItSimpleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [text, setText] = useState(postIt.text);

  const handleTextBlur = () => {
    setIsEditing(false);
    if (text !== postIt.text) {
      onUpdateText(postIt.id, text);
    }
  };

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        style={{
          backgroundColor: POST_IT_COLORS[postIt.color],
          transform: `rotate(${postIt.rotation}deg)`,
          width: `${postIt.width}px`,
          minHeight: `${postIt.height}px`,
          opacity: isDragging ? 0.5 : 1,
        }}
        className="cursor-move shadow-lg rounded-sm p-4 group hover:shadow-xl transition-shadow"
      >
        {/* Drag Handle */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-50 transition-opacity">
          <GripVertical className="w-4 h-4 text-foreground/30" />
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 bg-background/80 hover:bg-background"
            onClick={(e) => {
              e.stopPropagation();
              setMoveDialogOpen(true);
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
              onDelete(postIt.id);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        {/* Content */}
        <div className="mt-6">
          {postIt.imageUrl && (
            <img
              src={postIt.imageUrl}
              alt="Post-it"
              className="w-full h-32 object-cover rounded mb-2"
              draggable={false}
            />
          )}
          
          {isEditing ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleTextBlur}
              autoFocus
              className="w-full bg-transparent border-none outline-none resize-none text-sm font-handwriting"
              style={{ minHeight: '60px' }}
            />
          ) : (
            <p
              onClick={() => setIsEditing(true)}
              className="text-sm whitespace-pre-wrap break-words font-handwriting cursor-text min-h-[60px]"
            >
              {postIt.text}
            </p>
          )}
        </div>
      </div>

      <MovePostItDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        currentTab={postIt.tab}
        onMove={(tab) => {
          onMove(postIt.id, tab);
          setMoveDialogOpen(false);
        }}
      />
    </>
  );
};
