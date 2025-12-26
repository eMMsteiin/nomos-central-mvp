import { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical, X, Expand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageContent } from '@/types/task';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface ImageBlockProps {
  content: ImageContent;
  onDelete: () => void;
  onUpdateWidth?: (width: number) => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

const DEFAULT_WIDTH = 60;
const MIN_WIDTH = 20;
const MAX_WIDTH = 100;

export function ImageBlock({
  content,
  onDelete,
  onUpdateWidth,
  isDragging,
  dragHandleProps,
}: ImageBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [width, setWidth] = useState(content.width ?? DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const resizeSideRef = useRef<'left' | 'right'>('right');

  // Sync width with content prop
  useEffect(() => {
    if (content.width !== undefined && content.width !== width) {
      setWidth(content.width);
    }
  }, [content.width]);

  const handleMouseDown = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current) return;
    
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    resizeSideRef.current = side;
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerWidth = containerRef.current.parentElement?.clientWidth ?? 1;
    const deltaX = e.clientX - startXRef.current;
    
    // Calculate delta as percentage of container
    const deltaPercent = (deltaX / containerWidth) * 100;
    
    // For left handle, invert the delta
    const adjustedDelta = resizeSideRef.current === 'left' ? -deltaPercent : deltaPercent;
    
    // Since we're dragging one side, double the effect
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + adjustedDelta * 2));
    
    setWidth(Math.round(newWidth));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      // Save the width to the database
      onUpdateWidth?.(width);
    }
  }, [isResizing, width, onUpdateWidth]);

  // Add global mouse listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'group relative py-2 px-2 rounded-md transition-colors',
          'hover:bg-muted/50',
          isDragging && 'opacity-50 bg-muted',
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => !isResizing && setIsHovered(false)}
      >
        <div className="flex items-start gap-2">
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className={cn(
              'cursor-grab active:cursor-grabbing text-muted-foreground transition-opacity mt-2',
              isHovered ? 'opacity-100' : 'opacity-0',
            )}
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Image container with resizable wrapper */}
          <div className="relative flex-1 flex justify-center">
            <div 
              className="relative group/image"
              style={{ width: `${width}%` }}
            >
              {/* Left resize handle */}
              <div
                onMouseDown={(e) => handleMouseDown(e, 'left')}
                className={cn(
                  'absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10',
                  'flex items-center justify-center',
                  'opacity-0 group-hover/image:opacity-100 transition-opacity',
                  isResizing && 'opacity-100',
                )}
              >
                <div className={cn(
                  'w-1 h-12 rounded-full bg-primary/60 transition-colors',
                  'hover:bg-primary',
                  isResizing && resizeSideRef.current === 'left' && 'bg-primary',
                )} />
              </div>

              {/* Image */}
              <img
                src={content.fileUrl}
                alt={content.fileName || 'Imagem anexada'}
                className="rounded-lg w-full h-auto cursor-pointer"
                onClick={() => !isResizing && setIsPreviewOpen(true)}
                draggable={false}
              />

              {/* Right resize handle */}
              <div
                onMouseDown={(e) => handleMouseDown(e, 'right')}
                className={cn(
                  'absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10',
                  'flex items-center justify-center',
                  'opacity-0 group-hover/image:opacity-100 transition-opacity',
                  isResizing && 'opacity-100',
                )}
              >
                <div className={cn(
                  'w-1 h-12 rounded-full bg-primary/60 transition-colors',
                  'hover:bg-primary',
                  isResizing && resizeSideRef.current === 'right' && 'bg-primary',
                )} />
              </div>

              {/* Overlay actions */}
              <div
                className={cn(
                  'absolute top-2 right-2 flex gap-1 transition-opacity',
                  isHovered && !isResizing ? 'opacity-100' : 'opacity-0',
                )}
              >
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="p-1.5 rounded-md bg-background/80 backdrop-blur hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Expand className="h-4 w-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1.5 rounded-md bg-background/80 backdrop-blur hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Width indicator during resize */}
              {isResizing && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-background/90 backdrop-blur text-xs font-medium text-foreground shadow-sm">
                  {width}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* File name */}
        {content.fileName && (
          <p className="text-xs text-muted-foreground mt-1 truncate text-center">
            {content.fileName}
          </p>
        )}
      </div>

      {/* Fullscreen preview */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-transparent border-none">
          <img
            src={content.fileUrl}
            alt={content.fileName || 'Imagem anexada'}
            className="w-full h-full object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
