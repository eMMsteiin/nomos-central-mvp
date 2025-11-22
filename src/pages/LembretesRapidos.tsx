import { PostItBoard } from '@/components/PostItBoard';
import { usePostIts } from '@/hooks/usePostIts';
import { useBlocks } from '@/hooks/useBlocks';
import { StickyNote } from 'lucide-react';

const LembretesRapidos = () => {
  const { postIts, addPostIt, updatePostIt, deletePostIt, movePostItToTab } = usePostIts('lembretes');
  const { 
    blocks, 
    createWeekBlock, 
    deleteBlock, 
    expandWeekBlock, 
    collapseWeekBlock,
    updateBlockTitle 
  } = useBlocks();

  const handleCreateBlock = (title: string) => {
    // Criar bloco no centro aproximado
    const centerX = 300;
    const centerY = 200;
    createWeekBlock({ x: centerX, y: centerY }, title);
  };

  return (
    <div className="flex flex-col h-screen px-6 py-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <StickyNote className="w-7 h-7 text-primary" />
            <h2 className="text-2xl font-semibold">Lembretes Rápidos</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Adicione lembretes coloridos e organize-os livremente pelo quadro
          </p>
        </div>

        {/* Board */}
        <PostItBoard
          postIts={postIts}
          blocks={blocks}
          onAddPostIt={addPostIt}
          onUpdatePosition={(id, position) => updatePostIt(id, { position })}
          onDelete={deletePostIt}
          onMove={movePostItToTab}
          onUpdateText={(id, text) => updatePostIt(id, { text })}
          onCreateBlock={handleCreateBlock}
          onDeleteBlock={deleteBlock}
          onExpandBlock={expandWeekBlock}
          onCollapseBlock={collapseWeekBlock}
          onUpdateBlockTitle={updateBlockTitle}
        />
      </div>
    </div>
  );
};

export default LembretesRapidos;
