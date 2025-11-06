import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PostIt } from '@/types/postit';
import { Inbox, Calendar, Clock, Filter, CheckCircle, StickyNote } from 'lucide-react';

interface MovePostItDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTab: PostIt['tab'];
  onMove: (tab: PostIt['tab']) => void;
}

const TAB_OPTIONS = [
  { value: 'entrada' as const, label: 'Entrada', icon: Inbox },
  { value: 'hoje' as const, label: 'Hoje', icon: Calendar },
  { value: 'em-breve' as const, label: 'Em Breve', icon: Clock },
  { value: 'filtros' as const, label: 'Filtros', icon: Filter },
  { value: 'concluido' as const, label: 'Concluído', icon: CheckCircle },
  { value: 'lembretes' as const, label: 'Lembretes Rápidos', icon: StickyNote },
];

export const MovePostItDialog = ({ open, onOpenChange, currentTab, onMove }: MovePostItDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover Post-it para outra aba</DialogTitle>
          <DialogDescription>
            Escolha para qual aba você deseja mover este post-it. Ele aparecerá na mesma posição.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const isCurrentTab = tab.value === currentTab;
            
            return (
              <Button
                key={tab.value}
                variant={isCurrentTab ? 'secondary' : 'outline'}
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => onMove(tab.value)}
                disabled={isCurrentTab}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{tab.label}</span>
                {isCurrentTab && (
                  <span className="text-xs text-muted-foreground">(atual)</span>
                )}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
