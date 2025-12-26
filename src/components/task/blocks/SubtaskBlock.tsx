import { useState, useRef, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubtaskContent } from '@/types/task';

interface SubtaskBlockProps {
  content: SubtaskContent;
  onToggle: () => void;
  onTextChange: (text: string) => void;
  onDelete: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function SubtaskBlock({
  content,
  onToggle,
  onTextChange,
  onDelete,
  isDragging,
  dragHandleProps,
}: SubtaskBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(content.text);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(content.text);
  }, [content.text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== content.text) {
      onTextChange(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setText(content.text);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 py-2 px-2 rounded-md transition-colors',
        'hover:bg-muted/50',
        isDragging && 'opacity-50 bg-muted',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className={cn(
          'cursor-grab active:cursor-grabbing text-muted-foreground transition-opacity',
          isHovered ? 'opacity-100' : 'opacity-0',
        )}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Checkbox */}
      <Checkbox
        checked={content.completed}
        onCheckedChange={onToggle}
        className="h-5 w-5"
      />

      {/* Text */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-sm"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={cn(
            'flex-1 text-sm cursor-text',
            content.completed && 'line-through text-muted-foreground',
          )}
        >
          {content.text || <span className="text-muted-foreground italic">Subtarefa sem título</span>}
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={onDelete}
        className={cn(
          'p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all',
          isHovered ? 'opacity-100' : 'opacity-0',
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
