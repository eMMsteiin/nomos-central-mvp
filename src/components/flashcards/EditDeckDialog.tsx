import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil } from 'lucide-react';
import { Deck, DEFAULT_DISCIPLINES, DECK_COLORS, DECK_EMOJIS } from '@/types/flashcard';
import { cn } from '@/lib/utils';

interface EditDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: Deck | null;
  onSave: (id: string, updates: Partial<Deck>) => void;
}

export function EditDeckDialog({
  open,
  onOpenChange,
  deck,
  onSave,
}: EditDeckDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [disciplineId, setDisciplineId] = useState<string>('');
  const [color, setColor] = useState(DECK_COLORS[0]);
  const [emoji, setEmoji] = useState(DECK_EMOJIS[0]);

  useEffect(() => {
    if (deck) {
      setTitle(deck.title);
      setDescription(deck.description || '');
      setDisciplineId(deck.disciplineId || '');
      setColor(deck.color);
      setEmoji(deck.emoji);
    }
  }, [deck]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deck || !title.trim()) return;

    onSave(deck.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      disciplineId: disciplineId || undefined,
      color,
      emoji,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Editar baralho
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Nome do baralho</Label>
            <Input
              id="edit-title"
              placeholder="Ex: Fórmulas de Física"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição (opcional)</Label>
            <Textarea
              id="edit-description"
              placeholder="Descrição breve do conteúdo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Disciplina</Label>
            <Select value={disciplineId} onValueChange={setDisciplineId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma disciplina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {DEFAULT_DISCIPLINES.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.emoji} {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Emoji</Label>
            <div className="flex flex-wrap gap-2">
              {DECK_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all',
                    emoji === e
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {DECK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    color === c && 'ring-2 ring-offset-2 ring-primary'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
