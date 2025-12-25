import { useState, useRef, useEffect } from 'react';
import { TextBox } from '@/types/notebook';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical } from 'lucide-react';

interface TextBoxOverlayProps {
  textBox: TextBox;
  zoom: number;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (updates: Partial<TextBox>) => void;
  onDelete: () => void;
}

export const TextBoxOverlay = ({
  textBox,
  zoom,
  isSelected,
  isEditing,
  onSelect,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
}: TextBoxOverlayProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    onSelect();
    
    // Start dragging
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: textBox.x, y: textBox.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;
      onUpdate({
        x: initialPos.x + deltaX,
        y: initialPos.y + deltaY,
      });
    } else if (isResizing) {
      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;
      onUpdate({
        width: Math.max(100, initialSize.width + deltaX),
        height: Math.max(40, initialSize.height + deltaY),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, initialPos, initialSize, zoom]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialSize({ width: textBox.width, height: textBox.height });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartEdit();
  };

  const handleBlur = () => {
    onStopEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onStopEdit();
    }
    // Allow normal typing, don't stop propagation for regular keys
    if (e.key !== 'Delete' && e.key !== 'Backspace') {
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`absolute ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''} ${isDragging || isResizing ? 'cursor-grabbing' : ''}`}
      style={{
        left: textBox.x * zoom,
        top: textBox.y * zoom,
        width: textBox.width * zoom,
        height: textBox.height * zoom,
        backgroundColor: textBox.backgroundColor || 'transparent',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={textBox.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full p-2 resize-none border-none outline-none bg-white/90"
          style={{
            fontSize: textBox.fontSize * zoom,
            fontFamily: textBox.fontFamily,
            color: textBox.color,
          }}
          placeholder="Digite seu texto..."
        />
      ) : (
        <div
          className={`w-full h-full p-2 overflow-hidden cursor-grab ${isSelected ? 'bg-white/50' : ''}`}
          style={{
            fontSize: textBox.fontSize * zoom,
            fontFamily: textBox.fontFamily,
            color: textBox.color,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {textBox.content || (
            <span className="text-muted-foreground italic">Duplo clique para editar</span>
          )}
        </div>
      )}

      {/* Controls when selected */}
      {isSelected && !isEditing && (
        <>
          {/* Drag handle */}
          <div
            className="absolute -top-6 left-0 flex items-center gap-1 bg-background border rounded-t px-1 py-0.5"
            style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'bottom left' }}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 bg-primary cursor-se-resize"
            style={{
              transform: `scale(${1 / zoom})`,
              transformOrigin: 'bottom right',
            }}
            onMouseDown={handleResizeStart}
          />
        </>
      )}
    </div>
  );
};
