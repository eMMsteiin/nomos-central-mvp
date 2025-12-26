import { useState } from 'react';
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
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function ImageBlock({
  content,
  onDelete,
  isDragging,
  dragHandleProps,
}: ImageBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          'group relative py-2 px-2 rounded-md transition-colors',
          'hover:bg-muted/50',
          isDragging && 'opacity-50 bg-muted',
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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

          {/* Image container */}
          <div className="relative flex-1 max-w-md">
            <img
              src={content.fileUrl}
              alt={content.fileName || 'Imagem anexada'}
              className="rounded-lg object-cover w-full max-h-64 cursor-pointer"
              onClick={() => setIsPreviewOpen(true)}
            />
            
            {/* Overlay actions */}
            <div
              className={cn(
                'absolute top-2 right-2 flex gap-1 transition-opacity',
                isHovered ? 'opacity-100' : 'opacity-0',
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

            {/* File name */}
            {content.fileName && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {content.fileName}
              </p>
            )}
          </div>
        </div>
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
