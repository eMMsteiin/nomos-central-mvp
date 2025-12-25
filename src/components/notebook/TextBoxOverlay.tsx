import { useState, useRef, useEffect } from 'react';
import { TextBox } from '@/types/notebook';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical } from 'lucide-react';

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

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
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
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
    } else if (resizeDirection) {
      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;
      
      let newX = initialPos.x;
      let newY = initialPos.y;
      let newWidth = initialSize.width;
      let newHeight = initialSize.height;

      // Handle horizontal resizing
      if (resizeDirection.includes('e')) {
        newWidth = Math.max(100, initialSize.width + deltaX);
      }
      if (resizeDirection.includes('w')) {
        const proposedWidth = initialSize.width - deltaX;
        if (proposedWidth >= 100) {
          newWidth = proposedWidth;
          newX = initialPos.x + deltaX;
        }
      }

      // Handle vertical resizing
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(40, initialSize.height + deltaY);
      }
      if (resizeDirection.includes('n')) {
        const proposedHeight = initialSize.height - deltaY;
        if (proposedHeight >= 40) {
          newHeight = proposedHeight;
          newY = initialPos.y + deltaY;
        }
      }

      onUpdate({ x: newX, y: newY, width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setResizeDirection(null);
  };

  useEffect(() => {
    if (isDragging || resizeDirection) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, resizeDirection, dragStart, initialPos, initialSize, zoom]);

  const handleResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.stopPropagation();
    setResizeDirection(direction);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: textBox.x, y: textBox.y });
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

  const getCursor = (direction: ResizeDirection) => {
    const cursors: Record<ResizeDirection, string> = {
      n: 'ns-resize',
      s: 'ns-resize',
      e: 'ew-resize',
      w: 'ew-resize',
      ne: 'nesw-resize',
      sw: 'nesw-resize',
      nw: 'nwse-resize',
      se: 'nwse-resize',
    };
    return cursors[direction];
  };

  const handleSize = 8;
  const scaledHandleSize = handleSize / zoom;

  return (
    <div
      ref={containerRef}
      className={`absolute ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''} ${isDragging || resizeDirection ? 'cursor-grabbing' : ''}`}
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
          {/* Drag handle and delete button */}
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

          {/* Corner handles */}
          {/* Top-left */}
          <div
            className="absolute bg-primary border border-background"
            style={{
              top: -scaledHandleSize / 2 * zoom,
              left: -scaledHandleSize / 2 * zoom,
              width: scaledHandleSize * zoom,
              height: scaledHandleSize * zoom,
              cursor: getCursor('nw'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          {/* Top-right */}
          <div
            className="absolute bg-primary border border-background"
            style={{
              top: -scaledHandleSize / 2 * zoom,
              right: -scaledHandleSize / 2 * zoom,
              width: scaledHandleSize * zoom,
              height: scaledHandleSize * zoom,
              cursor: getCursor('ne'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          {/* Bottom-left */}
          <div
            className="absolute bg-primary border border-background"
            style={{
              bottom: -scaledHandleSize / 2 * zoom,
              left: -scaledHandleSize / 2 * zoom,
              width: scaledHandleSize * zoom,
              height: scaledHandleSize * zoom,
              cursor: getCursor('sw'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          {/* Bottom-right */}
          <div
            className="absolute bg-primary border border-background"
            style={{
              bottom: -scaledHandleSize / 2 * zoom,
              right: -scaledHandleSize / 2 * zoom,
              width: scaledHandleSize * zoom,
              height: scaledHandleSize * zoom,
              cursor: getCursor('se'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />

          {/* Edge handles */}
          {/* Top */}
          <div
            className="absolute bg-primary border border-background"
            style={{
              top: -scaledHandleSize / 2 * zoom,
              left: '50%',
              transform: 'translateX(-50%)',
              width: scaledHandleSize * zoom,
              height: scaledHandleSize * zoom,
              cursor: getCursor('n'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'n')}
          />
          {/* Bottom */}
          <div
            className="absolute bg-primary border border-background"
            style={{
              bottom: -scaledHandleSize / 2 * zoom,
              left: '50%',
              transform: 'translateX(-50%)',
              width: scaledHandleSize * zoom,
              height: scaledHandleSize * zoom,
              cursor: getCursor('s'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          {/* Left */}
          <div
            className="absolute bg-primary border border-background"
            style={{
              left: -scaledHandleSize / 2 * zoom,
              top: '50%',
              transform: 'translateY(-50%)',
              width: scaledHandleSize * zoom,
              height: scaledHandleSize * zoom,
              cursor: getCursor('w'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'w')}
          />
          {/* Right */}
          <div
            className="absolute bg-primary border border-background"
            style={{
              right: -scaledHandleSize / 2 * zoom,
              top: '50%',
              transform: 'translateY(-50%)',
              width: scaledHandleSize * zoom,
              height: scaledHandleSize * zoom,
              cursor: getCursor('e'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
        </>
      )}
    </div>
  );
};