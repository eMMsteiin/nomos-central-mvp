import { useNavigate } from 'react-router-dom';
import { Book, ExternalLink, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotebookContent } from '@/types/task';
import { cn } from '@/lib/utils';

interface NotebookBlockProps {
  content: NotebookContent;
  onDelete: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function NotebookBlock({
  content,
  onDelete,
  isDragging,
  dragHandleProps,
}: NotebookBlockProps) {
  const navigate = useNavigate();

  const handleOpenNotebook = () => {
    navigate(`/caderno?open=${content.notebookId}`);
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors',
        isDragging && 'opacity-50'
      )}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Notebook icon with color */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
        style={{ backgroundColor: content.notebookColor || 'hsl(var(--primary))' }}
      >
        <Book className="h-5 w-5 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{content.notebookTitle}</p>
        {content.notebookDiscipline && (
          <p className="text-xs text-muted-foreground truncate">
            {content.notebookDiscipline}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenNotebook}
          className="gap-1.5 text-primary hover:text-primary"
        >
          <span className="hidden sm:inline">Abrir</span>
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
