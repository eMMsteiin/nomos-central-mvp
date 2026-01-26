import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Deck, DECK_COLORS, DECK_EMOJIS } from '@/types/flashcard';
import { cn } from '@/lib/utils';

interface CreateSubdeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentDeck: Deck;
  onCreateSubdeck: (
    title: string,
    options: { description?: string; color?: string; emoji?: string }
  ) => void;
}

export function CreateSubdeckDialog({
  open,
  onOpenChange,
  parentDeck,
  onCreateSubdeck,
}: CreateSubdeckDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(parentDeck.color);
  const [emoji, setEmoji] = useState(parentDeck.emoji);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateSubdeck(title.trim(), {
        description: description.trim() || undefined,
        color,
        emoji,
      });
      // Reset form
      setTitle('');
      setDescription('');
      setColor(parentDeck.color);
      setEmoji(parentDeck.emoji);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullName = `${parentDeck.fullName}::${title || '...'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            Criar Subdeck
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Preview do nome completo */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Nome completo:</p>
            <p className="font-mono text-sm">{fullName}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Nome do subdeck</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Capítulo 1"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrição do subdeck..."
              rows={2}
            />
          </div>

          {/* Emoji */}
          <div className="space-y-2">
            <Label>Emoji</Label>
            <div className="flex flex-wrap gap-2">
              {DECK_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all',
                    emoji === e
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {DECK_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    color === c ? 'ring-2 ring-offset-2 ring-primary' : ''
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Subdeck'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
