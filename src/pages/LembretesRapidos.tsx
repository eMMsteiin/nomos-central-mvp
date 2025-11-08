import { PostItBoard } from '@/components/PostItBoard';
import { usePostIts } from '@/hooks/usePostIts';
import { StickyNote } from 'lucide-react';

const LembretesRapidos = () => {
  const { postIts, addPostIt, updatePostIt, deletePostIt, movePostItToTab } = usePostIts('lembretes');

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
          onAddPostIt={addPostIt}
          onUpdatePosition={(id, position) => updatePostIt(id, { position })}
          onDelete={deletePostIt}
          onMove={movePostItToTab}
          onUpdateText={(id, text) => updatePostIt(id, { text })}
        />
      </div>
    </div>
  );
};

export default LembretesRapidos;
