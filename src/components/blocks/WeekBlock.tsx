import { useState } from 'react';
import { Block } from '@/types/block';
import { PostIt } from '@/types/postit';
import { PostItBoard } from '../PostItBoard';
import { DayBlock } from './DayBlock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, ChevronDown, ChevronRight, ChevronLeft, Edit2, Maximize2 } from 'lucide-react';
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
import { useIsMobile } from '@/hooks/use-mobile';

interface WeekBlockProps {
  block: Block;
  postIts: PostIt[];
  dayBlocks: Block[];
  dayPostIts: Record<string, PostIt[]>;
  onDelete: (id: string) => void;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onAddPostIt: (postIt: PostIt) => void;
  onUpdatePostIt: (id: string, updates: Partial<PostIt>) => void;
  onDeletePostIt: (id: string) => void;
  isFirstBlock?: boolean;
}

export const WeekBlock = ({
  block,
  postIts,
  dayBlocks,
  dayPostIts,
  onDelete,
  onExpand,
  onCollapse,
  onUpdateTitle,
  onAddPostIt,
  onUpdatePostIt,
  onDeletePostIt,
  isFirstBlock = false,
}: WeekBlockProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(block.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleTitleSave = () => {
    setIsEditing(false);
    if (title !== block.title) {
      onUpdateTitle(block.id, title);
    }
  };

  return (
    <>
      <div className={`bg-card border-2 border-primary/30 rounded-lg shadow-lg overflow-hidden h-full flex flex-col ${!isFirstBlock ? 'mt-4' : ''}`}>
        {/* Header */}
        <div className="bg-muted/20 border-b border-primary/20 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                className="h-7 text-sm font-medium"
                autoFocus
              />
            ) : (
              <h3 className="font-semibold text-base flex items-center gap-2">
                {block.title}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </h3>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => block.isExpanded ? onCollapse(block.id) : onExpand(block.id)}
              className="gap-1 text-xs sm:text-sm"
            >
              {block.isExpanded ? (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span className="hidden sm:inline">Colapsar</span>
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="hidden sm:inline">Expandir em dias</span>
                </>
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative" style={{ minHeight: '600px' }}>
          {block.isExpanded ? (
            expandedDayId ? (
              // Dia individual expandido
              <>
                <div className="flex items-center gap-2 p-3 border-b border-primary/20 bg-muted/10">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedDayId(null)}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar para visão semanal
                  </Button>
                  <h4 className="font-medium">{dayBlocks.find(d => d.id === expandedDayId)?.title}</h4>
                </div>
                <div className="relative" style={{ minHeight: '550px' }}>
                  <PostItBoard
                    blockId={expandedDayId}
                    postIts={dayPostIts[expandedDayId] || []}
                    onAddPostIt={onAddPostIt}
                    onUpdatePosition={(id, position) => onUpdatePostIt(id, { position })}
                    onDelete={onDeletePostIt}
                    onUpdateText={(id, text) => onUpdatePostIt(id, { text })}
                  />
                </div>
              </>
            ) : (
              // Visão dos 7 dias em grade - responsiva
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 h-full">
                {dayBlocks.map((dayBlock) => (
                  <DayBlock
                    key={dayBlock.id}
                    block={dayBlock}
                    postIts={dayPostIts[dayBlock.id] || []}
                    onAddPostIt={onAddPostIt}
                    onUpdatePostIt={onUpdatePostIt}
                    onDeletePostIt={onDeletePostIt}
                    onExpand={() => setExpandedDayId(dayBlock.id)}
                  />
                ))}
              </div>
            )
          ) : (
            <PostItBoard
              blockId={block.id}
              postIts={postIts}
              onAddPostIt={onAddPostIt}
              onUpdatePosition={(id, position) => onUpdatePostIt(id, { position })}
              onDelete={onDeletePostIt}
              onUpdateText={(id, text) => onUpdatePostIt(id, { text })}
            />
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar bloco semanal?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Todos os lembretes dentro deste bloco serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(block.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
