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
      <div className="flex gap-1.5 pb-2">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="sm"
            onClick={() => onSelect(action.message)}
            disabled={disabled}
            className="flex-shrink-0 text-xs h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {action.label}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
