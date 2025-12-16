import { QUICK_ACTIONS, QuickAction } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface QuickActionChipsProps {
  onSelect: (message: string) => void;
  disabled?: boolean;
}

export function QuickActionChips({ onSelect, disabled }: QuickActionChipsProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => onSelect(action.message)}
            disabled={disabled}
            className="flex-shrink-0 rounded-full text-xs h-8 px-3 hover:bg-primary/10 hover:border-primary/50 transition-all"
          >
            <span className="mr-1.5">{action.emoji}</span>
            {action.label}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
