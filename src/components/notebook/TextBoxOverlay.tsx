import { useState, useRef, useEffect, useCallback } from 'react';
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
  const measureRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialFontSize, setInitialFontSize] = useState(0);

  // Auto-resize textarea height based on content
  const autoResizeTextarea = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto';
      const newHeight = textarea.scrollHeight;
      textarea.style.height = `${newHeight}px`;
      
      // Update the textBox height in canvas coordinates
      const minHeight = 40;
      const actualHeight = Math.max(minHeight, newHeight / zoom);
      if (actualHeight !== textBox.height) {
        onUpdate({ height: actualHeight });
      }
    }
  }, [zoom, textBox.height, onUpdate]);

  // Focus textarea when editing starts and auto-resize
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at the end
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
      // Initial auto-resize
      setTimeout(autoResizeTextarea, 0);
    }
  }, [isEditing, autoResizeTextarea]);

  // Calculate height based on content for display mode
  const calculateDisplayHeight = useCallback(() => {
    if (measureRef.current && !isEditing) {
      const measuredHeight = measureRef.current.scrollHeight;
      const minHeight = 40;
      const actualHeight = Math.max(minHeight, measuredHeight / zoom);
      if (Math.abs(actualHeight - textBox.height) > 2) {
        onUpdate({ height: actualHeight });
      }
    }
  }, [isEditing, zoom, textBox.height, onUpdate]);

  // Recalculate height when content or width changes
  useEffect(() => {
    if (!isEditing) {
      // Use a timeout to ensure the DOM has updated
      const timer = setTimeout(calculateDisplayHeight, 10);
      return () => clearTimeout(timer);
    }
  }, [textBox.content, textBox.width, isEditing, calculateDisplayHeight]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();

    // If not selected, just select (don't start dragging)
    if (!isSelected) {
      onSelect();
      return;
    }

    // If already selected, allow dragging
    onSelect();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: textBox.x, y: textBox.y });
  };

  // Prevent the canvas container click handler from immediately deselecting
  // and ensure a single click selects the box (for touch devices too).
  const handleClick = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();

    if (!isSelected) {
      onSelect();
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
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

      // Check if resizing from a corner (diagonal)
      const isCorner = ['nw', 'ne', 'sw', 'se'].includes(resizeDirection);

      if (isCorner) {
        // Corner resize: scale proportionally including font
        let scaleX = 1;
        let scaleY = 1;

        // Calculate scale based on direction
        if (resizeDirection.includes('e')) {
          scaleX = (initialSize.width + deltaX) / initialSize.width;
        }
        if (resizeDirection.includes('w')) {
          scaleX = (initialSize.width - deltaX) / initialSize.width;
        }
        if (resizeDirection.includes('s')) {
          scaleY = (initialSize.height + deltaY) / initialSize.height;
        }
        if (resizeDirection.includes('n')) {
          scaleY = (initialSize.height - deltaY) / initialSize.height;
        }

        // Use the average scale for uniform scaling
        const scale = Math.max(0.1, (scaleX + scaleY) / 2);
        
        // Apply scale to dimensions with minimums
        newWidth = Math.max(100, initialSize.width * scale);
        newHeight = Math.max(40, initialSize.height * scale);

        // Scale font proportionally with limits (8px min, 200px max)
        const newFontSize = Math.max(8, Math.min(200, initialFontSize * scale));

        // Adjust position for corners that move the origin
        if (resizeDirection.includes('w')) {
          newX = initialPos.x + initialSize.width - newWidth;
        }
        if (resizeDirection.includes('n')) {
          newY = initialPos.y + initialSize.height - newHeight;
        }

        onUpdate({ 
          x: newX, 
          y: newY, 
          width: newWidth, 
          height: newHeight,
          fontSize: Math.round(newFontSize)
        });
      } else {
        // Edge resize: only resize box, don't scale font
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
    }
  }, [isDragging, resizeDirection, dragStart, initialPos, initialSize, initialFontSize, zoom, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setResizeDirection(null);
  }, []);

  useEffect(() => {
    if (isDragging || resizeDirection) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, resizeDirection, handleMouseMove, handleMouseUp]);

  const handleResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.stopPropagation();
    setResizeDirection(direction);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: textBox.x, y: textBox.y });
    setInitialSize({ width: textBox.width, height: textBox.height });
    setInitialFontSize(textBox.fontSize);
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ content: e.target.value });
    // Auto-resize after content change
    setTimeout(autoResizeTextarea, 0);
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

  // Handle size in screen pixels (not scaled by zoom) - larger for better touch/click
  const handleSize = 20;

  // Calculate display height - use minHeight so content can expand
  const displayHeight = textBox.height * zoom;

  return (
    <div
      ref={containerRef}
      className={`absolute ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''} ${isDragging || resizeDirection ? 'cursor-grabbing' : ''}`}
      style={{
        left: textBox.x * zoom,
        top: textBox.y * zoom,
        width: textBox.width * zoom,
        minHeight: displayHeight,
        backgroundColor: textBox.backgroundColor || 'transparent',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={textBox.content}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full p-2 resize-none border-none outline-none bg-white/90"
          style={{
            fontSize: textBox.fontSize * zoom,
            fontFamily: textBox.fontFamily,
            color: textBox.color,
            minHeight: displayHeight,
            overflow: 'hidden',
          }}
          placeholder="Digite seu texto..."
        />
      ) : (
        <div
          ref={measureRef}
          className={`w-full p-2 cursor-grab ${isSelected ? 'bg-white/50' : ''}`}
          style={{
            fontSize: textBox.fontSize * zoom,
            fontFamily: textBox.fontFamily,
            color: textBox.color,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            minHeight: displayHeight,
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

          {/* Corner handles - fixed screen size */}
          {/* Top-left */}
          <div
            className="absolute bg-primary border-2 border-background rounded-full shadow-md hover:scale-110 hover:bg-primary/90 transition-transform"
            style={{
              top: -handleSize / 2,
              left: -handleSize / 2,
              width: handleSize,
              height: handleSize,
              cursor: getCursor('nw'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />
          {/* Top-right */}
          <div
            className="absolute bg-primary border-2 border-background rounded-full shadow-md hover:scale-110 hover:bg-primary/90 transition-transform"
            style={{
              top: -handleSize / 2,
              right: -handleSize / 2,
              width: handleSize,
              height: handleSize,
              cursor: getCursor('ne'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          {/* Bottom-left */}
          <div
            className="absolute bg-primary border-2 border-background rounded-full shadow-md hover:scale-110 hover:bg-primary/90 transition-transform"
            style={{
              bottom: -handleSize / 2,
              left: -handleSize / 2,
              width: handleSize,
              height: handleSize,
              cursor: getCursor('sw'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          {/* Bottom-right */}
          <div
            className="absolute bg-primary border-2 border-background rounded-full shadow-md hover:scale-110 hover:bg-primary/90 transition-transform"
            style={{
              bottom: -handleSize / 2,
              right: -handleSize / 2,
              width: handleSize,
              height: handleSize,
              cursor: getCursor('se'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />

          {/* Edge handles - fixed screen size */}
          {/* Top */}
          <div
            className="absolute bg-primary border-2 border-background rounded-full shadow-md hover:scale-110 hover:bg-primary/90 transition-transform"
            style={{
              top: -handleSize / 2,
              left: '50%',
              transform: 'translateX(-50%)',
              width: handleSize,
              height: handleSize,
              cursor: getCursor('n'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'n')}
          />
          {/* Bottom */}
          <div
            className="absolute bg-primary border-2 border-background rounded-full shadow-md hover:scale-110 hover:bg-primary/90 transition-transform"
            style={{
              bottom: -handleSize / 2,
              left: '50%',
              transform: 'translateX(-50%)',
              width: handleSize,
              height: handleSize,
              cursor: getCursor('s'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 's')}
          />
          {/* Left */}
          <div
            className="absolute bg-primary border-2 border-background rounded-full shadow-md hover:scale-110 hover:bg-primary/90 transition-transform"
            style={{
              left: -handleSize / 2,
              top: '50%',
              transform: 'translateY(-50%)',
              width: handleSize,
              height: handleSize,
              cursor: getCursor('w'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'w')}
          />
          {/* Right */}
          <div
            className="absolute bg-primary border-2 border-background rounded-full shadow-md hover:scale-110 hover:bg-primary/90 transition-transform"
            style={{
              right: -handleSize / 2,
              top: '50%',
              transform: 'translateY(-50%)',
              width: handleSize,
              height: handleSize,
              cursor: getCursor('e'),
            }}
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
        </>
      )}
    </div>
  );
};
