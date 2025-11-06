import { PostItCreator } from '@/components/PostItCreator';
import { PostItBoard } from '@/components/PostItBoard';
import { usePostIts } from '@/hooks/usePostIts';
import { StickyNote } from 'lucide-react';

const LembretesRapidos = () => {
  const { postIts, addPostIt, updatePostIt, deletePostIt, movePostItToTab } = usePostIts('lembretes');

  return (
    <div className="flex flex-col h-screen px-6 py-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <StickyNote className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-semibold">Lembretes Rápidos</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Crie post-its coloridos e organize visualmente seus lembretes. Arraste-os livremente pelo quadro!
          </p>
        </div>

        {/* Creator */}
        <PostItCreator onCreatePostIt={addPostIt} />

        {/* Board */}
        <PostItBoard
          postIts={postIts}
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
