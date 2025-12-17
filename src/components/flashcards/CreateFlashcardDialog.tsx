import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface CreateFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckTitle: string;
  onCreateFlashcard: (front: string, back: string) => void;
}

export function CreateFlashcardDialog({
  open,
  onOpenChange,
  deckTitle,
  onCreateFlashcard,
}: CreateFlashcardDialogProps) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [isCreatingAnother, setIsCreatingAnother] = useState(false);

  const handleSubmit = (e: React.FormEvent, createAnother: boolean = false) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;

    onCreateFlashcard(front.trim(), back.trim());

    if (createAnother) {
      setFront('');
      setBack('');
      setIsCreatingAnother(true);
      setTimeout(() => setIsCreatingAnother(false), 1000);
    } else {
      setFront('');
      setBack('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Adicionar card em "{deckTitle}"
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="front">Frente (Pergunta)</Label>
            <Textarea
              id="front"
              placeholder="Ex: Qual é a fórmula da velocidade média?"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={3}
              autoFocus
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="back">Verso (Resposta)</Label>
            <Textarea
              id="back"
              placeholder="Ex: v = Δs / Δt"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {isCreatingAnother && (
            <p className="text-sm text-green-600 dark:text-green-400 animate-fade-in">
              ✓ Card criado! Adicione outro...
            </p>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={(e) => handleSubmit(e as any, true)}
              disabled={!front.trim() || !back.trim()}
            >
              <Plus className="w-4 h-4 mr-1" />
              Criar e adicionar outro
            </Button>
            <Button type="submit" disabled={!front.trim() || !back.trim()}>
              Criar card
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
