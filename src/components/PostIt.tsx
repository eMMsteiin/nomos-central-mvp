import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Move, GripVertical } from 'lucide-react';
import { PostIt as PostItType, POST_IT_COLORS } from '@/types/postit';
import { MovePostItDialog } from './MovePostItDialog';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PostItProps {
  postIt: PostItType;
  onDelete: (id: string) => void;
  onMove: (id: string, tab: PostItType['tab']) => void;
  onUpdateText: (id: string, text: string) => void;
  isDraggable?: boolean;
}

export const PostIt = ({ postIt, onDelete, onMove, onUpdateText, isDraggable = true }: PostItProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [text, setText] = useState(postIt.text);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: postIt.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    if (text !== postIt.text) {
      onUpdateText(postIt.id, text);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          backgroundColor: POST_IT_COLORS[postIt.color],
          transform: `${style.transform} rotate(${postIt.rotation}deg)`,
          width: `${postIt.width}px`,
          minHeight: `${postIt.height}px`,
        }}
        className="absolute cursor-move shadow-[0_4px_6px_rgba(0,0,0,0.15),0_8px_15px_rgba(0,0,0,0.1)] rounded-sm p-4 group hover:shadow-[0_8px_12px_rgba(0,0,0,0.2),0_16px_30px_rgba(0,0,0,0.15)] transition-shadow"
        {...attributes}
        {...listeners}
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
