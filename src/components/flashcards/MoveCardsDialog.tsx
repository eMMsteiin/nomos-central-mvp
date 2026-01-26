// ============================================================================
// BLOCO 4: Move Cards Dialog
// Dialog for moving cards to another deck
// ============================================================================

import { useState } from 'react';
import { FolderInput } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Deck } from '@/types/flashcard';

interface MoveCardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decks: Deck[];
  selectedCount: number;
  onMove: (targetDeckId: string) => Promise<void>;
}

export function MoveCardsDialog({
  open,
  onOpenChange,
  decks,
  selectedCount,
  onMove,
}: MoveCardsDialogProps) {
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);

  const handleMove = async () => {
    if (!selectedDeckId) return;
    setIsMoving(true);
    try {
      await onMove(selectedDeckId);
      setSelectedDeckId('');
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5" />
            Mover cards
          </DialogTitle>
          <DialogDescription>
            Mover {selectedCount} card(s) para outro deck.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Deck de destino</Label>
            <Select
              value={selectedDeckId}
              onValueChange={setSelectedDeckId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o deck de destino" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {decks.map(deck => (
                  <SelectItem key={deck.id} value={deck.id}>
                    {deck.emoji} {deck.fullName || deck.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMoving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedDeckId || isMoving}
          >
            {isMoving ? 'Movendo...' : 'Mover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
