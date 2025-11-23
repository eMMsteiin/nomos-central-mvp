import { Block } from '@/types/block';
import { PostIt } from '@/types/postit';
import { PostItBoard } from '../PostItBoard';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';

interface DayBlockProps {
  block: Block;
  postIts: PostIt[];
  onAddPostIt: (postIt: PostIt) => void;
  onUpdatePostIt: (id: string, updates: Partial<PostIt>) => void;
  onDeletePostIt: (id: string) => void;
  onExpand: () => void;
}

export const DayBlock = ({ block, postIts, onAddPostIt, onUpdatePostIt, onDeletePostIt, onExpand }: DayBlockProps) => {
  return (
    <div className="bg-muted/10 border-r border-muted-foreground/20 last:border-r-0 h-full flex flex-col">
      {/* Header */}
      <div className="bg-muted/20 border-b border-muted-foreground/20 p-2 flex items-center justify-between">
        <h4 className="font-medium text-sm flex-1 text-center">{block.title}</h4>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 hover:bg-primary/10"
          onClick={onExpand}
          title="Expandir dia"
        >
          <Maximize2 className="w-3 h-3" />
        </Button>
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
