import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Block } from '@/types/block';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Trash2, GripVertical, Pencil } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface WeekBlockProps {
  block: Block;
  onDelete: (id: string) => void;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
}

export const WeekBlock = ({ block, onDelete, onExpand, onCollapse, onUpdateTitle }: WeekBlockProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(block.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    position: 'absolute' as const,
    left: `${block.position.x}px`,
    top: `${block.position.y}px`,
    width: `${block.size.width}px`,
    height: `${block.size.height}px`,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      onUpdateTitle(block.id, editedTitle);
    }
    setIsEditing(false);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-muted/20 border-2 border-primary/40 rounded-lg shadow-lg overflow-hidden ${
          isDragging ? 'opacity-50' : ''
        }`}
      >
        {/* Header */}
        <div className="bg-primary/10 border-b border-primary/30 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div
              {...attributes}
              {...listeners}
              className="cursor-move hover:bg-primary/20 rounded p-1 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="h-7 text-sm font-medium"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">{block.title}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => block.isExpanded ? onCollapse(block.id) : onExpand(block.id)}
              className="h-7 px-2"
            >
              {block.isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Colapsar
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Expandir
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative w-full h-[calc(100%-48px)] overflow-hidden">
          {/* Post-its will be rendered here by parent component */}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Bloco Semanal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os lembretes dentro do bloco serão movidos de volta para a área livre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(block.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
