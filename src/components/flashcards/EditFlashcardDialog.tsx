import { useState, useEffect } from 'react';
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
import { Pencil } from 'lucide-react';
import { Flashcard } from '@/types/flashcard';

interface EditFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: Flashcard | null;
  onSave: (id: string, front: string, back: string) => void;
}

export function EditFlashcardDialog({
  open,
  onOpenChange,
  flashcard,
  onSave,
}: EditFlashcardDialogProps) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  useEffect(() => {
    if (flashcard) {
      setFront(flashcard.front);
      setBack(flashcard.back);
    }
  }, [flashcard]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flashcard || !front.trim() || !back.trim()) return;

    onSave(flashcard.id, front.trim(), back.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Editar flashcard
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-front">Frente (Pergunta)</Label>
            <Textarea
              id="edit-front"
              placeholder="Ex: Qual é a fórmula da velocidade média?"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={3}
              autoFocus
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-back">Verso (Resposta)</Label>
            <Textarea
              id="edit-back"
              placeholder="Ex: v = Δs / Δt"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!front.trim() || !back.trim()}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
