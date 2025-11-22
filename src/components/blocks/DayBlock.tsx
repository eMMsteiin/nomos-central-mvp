import { Block } from '@/types/block';
import { PostIt } from '@/types/postit';
import { PostItBoard } from '../PostItBoard';

interface DayBlockProps {
  block: Block;
  postIts: PostIt[];
  onAddPostIt: (postIt: PostIt) => void;
  onUpdatePostIt: (id: string, updates: Partial<PostIt>) => void;
  onDeletePostIt: (id: string) => void;
}

export const DayBlock = ({ block, postIts, onAddPostIt, onUpdatePostIt, onDeletePostIt }: DayBlockProps) => {
  return (
    <div className="bg-muted/10 border-r border-muted-foreground/20 last:border-r-0 h-full flex flex-col">
      {/* Header */}
      <div className="bg-muted/20 border-b border-muted-foreground/20 p-2 text-center">
        <h4 className="font-medium text-sm">{block.title}</h4>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <PostItBoard
          blockId={block.id}
          postIts={postIts}
          onAddPostIt={onAddPostIt}
          onUpdatePosition={(id, position) => onUpdatePostIt(id, { position })}
          onDelete={onDeletePostIt}
          onUpdateText={(id, text) => onUpdatePostIt(id, { text })}
        />
      </div>
    </div>
  );
};
