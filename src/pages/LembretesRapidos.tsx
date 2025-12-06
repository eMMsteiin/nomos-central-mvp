import { useState } from 'react';
import { usePostIts } from '@/hooks/usePostIts';
import { useBlocks } from '@/hooks/useBlocks';
import { WeekBlock } from '@/components/blocks/WeekBlock';
import { CreateBlockDialog } from '@/components/blocks/CreateBlockDialog';
import { Button } from '@/components/ui/button';
import { StickyNote, CalendarDays } from 'lucide-react';

const LembretesRapidos = () => {
  const { addPostIt, updatePostIt, deletePostIt, getPostItsByBlock } = usePostIts();
  const { 
    blocks, 
    createWeekBlock, 
    deleteBlock, 
    expandWeekBlock, 
    collapseWeekBlock,
    updateBlockTitle 
  } = useBlocks();

  const [isCreateBlockDialogOpen, setIsCreateBlockDialogOpen] = useState(false);

  const handleCreateBlock = (title: string) => {
    createWeekBlock({ x: 0, y: 0 }, title);
  };

  const weekBlocks = blocks.filter(b => b.type === 'week');

  return (
    <div className="flex flex-col h-full p-4 sm:p-6">
      <div className="w-full flex flex-col h-full">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-1">
              <StickyNote className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              <h2 className="text-xl sm:text-2xl font-semibold">Lembretes Rápidos</h2>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Organize seus lembretes em blocos semanais
            </p>
          </div>
          
          <Button onClick={() => setIsCreateBlockDialogOpen(true)} size="default" className="gap-2 w-full sm:w-auto">
            <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="sm:inline">Criar Bloco Semanal</span>
          </Button>
        </div>

        {/* Blocks List */}
        <div className="flex-1">
          {weekBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="text-muted-foreground">
                <CalendarDays className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum bloco criado ainda</h3>
                <p className="text-sm">Crie seu primeiro bloco semanal para começar a organizar lembretes</p>
              </div>
              <Button onClick={() => setIsCreateBlockDialogOpen(true)} size="lg" className="gap-2">
                <CalendarDays className="w-5 h-5" />
                Criar Primeiro Bloco
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {weekBlocks.map((weekBlock, index) => {
                const dayBlocks = blocks.filter(b => b.weekId === weekBlock.id);
                const postIts = getPostItsByBlock(weekBlock.id);
                
                const dayPostIts: Record<string, any[]> = {};
                dayBlocks.forEach(dayBlock => {
                  dayPostIts[dayBlock.id] = getPostItsByBlock(dayBlock.id);
                });

                return (
                  <WeekBlock
                    key={weekBlock.id}
                    block={weekBlock}
                    postIts={postIts}
                    dayBlocks={dayBlocks}
                    dayPostIts={dayPostIts}
                    onAddPostIt={addPostIt}
                    onUpdatePostIt={updatePostIt}
                    onDeletePostIt={deletePostIt}
                    onExpand={expandWeekBlock}
                    onCollapse={collapseWeekBlock}
                    onDelete={deleteBlock}
                    onUpdateTitle={updateBlockTitle}
                    isFirstBlock={index === 0}
                  />
                );
              })}
            </div>
          )}
        </div>

        <CreateBlockDialog
          open={isCreateBlockDialogOpen}
          onOpenChange={setIsCreateBlockDialogOpen}
          onCreateBlock={handleCreateBlock}
        />
      </div>
    </div>
  );
};

export default LembretesRapidos;
