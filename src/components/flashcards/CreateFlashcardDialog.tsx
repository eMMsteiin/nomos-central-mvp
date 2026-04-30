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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, ArrowLeftRight, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';

type CardType = 'basic' | 'basic-reversed' | 'basic-optional-reversed';

const CARD_TYPES: { value: CardType; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    value: 'basic',
    label: 'Basic',
    hint: '1 card: Frente → Verso',
    icon: <Plus className="w-3.5 h-3.5" />,
  },
  {
    value: 'basic-reversed',
    label: 'Basic Reversed',
    hint: '2 cards: Frente ↔ Verso',
    icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
  },
  {
    value: 'basic-optional-reversed',
    label: 'Optional Reversed',
    hint: '1 ou 2 cards (você decide)',
    icon: <Shuffle className="w-3.5 h-3.5" />,
  },
];

interface CreateFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckTitle: string;
  onCreateCards: (cards: Array<{ front: string; back: string }>) => void;
}

export function CreateFlashcardDialog({
  open,
  onOpenChange,
  deckTitle,
  onCreateCards,
}: CreateFlashcardDialogProps) {
  const [cardType, setCardType] = useState<CardType>('basic');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [includeReverse, setIncludeReverse] = useState(true);
  const [isCreatingAnother, setIsCreatingAnother] = useState(false);
  const [lastCreatedCount, setLastCreatedCount] = useState(1);

  const willCreateTwo =
    cardType === 'basic-reversed' ||
    (cardType === 'basic-optional-reversed' && includeReverse);

  const buildCards = (): Array<{ front: string; back: string }> => {
    const base = { front: front.trim(), back: back.trim() };
    const reversed = { front: back.trim(), back: front.trim() };
    if (cardType === 'basic-reversed') return [base, reversed];
    if (cardType === 'basic-optional-reversed' && includeReverse) return [base, reversed];
    return [base];
  };

  const handleSubmit = (e: React.FormEvent, createAnother: boolean = false) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;

    const cards = buildCards();
    onCreateCards(cards);
    setLastCreatedCount(cards.length);

    if (createAnother) {
      setFront('');
      setBack('');
      setIsCreatingAnother(true);
      setTimeout(() => setIsCreatingAnother(false), 1200);
    } else {
      setFront('');
      setBack('');
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFront('');
      setBack('');
      setIsCreatingAnother(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Adicionar card em "{deckTitle}"
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          {/* Card type selector */}
          <div className="space-y-1.5">
            <Label>Tipo de card</Label>
            <div className="flex gap-2">
              {CARD_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setCardType(type.value)}
                  className={cn(
                    'flex-1 flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors',
                    cardType === type.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {type.icon}
                    {type.label}
                  </span>
                  <span className="text-xs opacity-70">{type.hint}</span>
                </button>
              ))}
            </div>
          </div>

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

          {/* Optional reverse toggle — only shown for the Optional Reversed type */}
          {cardType === 'basic-optional-reversed' && (
            <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 bg-muted/30">
              <Checkbox
                id="include-reverse"
                checked={includeReverse}
                onCheckedChange={(v) => setIncludeReverse(!!v)}
              />
              <label
                htmlFor="include-reverse"
                className="text-sm cursor-pointer select-none"
              >
                Criar também o card reverso (Verso → Frente)
              </label>
            </div>
          )}

          {isCreatingAnother && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {lastCreatedCount === 2
                ? '✓ 2 cards criados! Adicione outro...'
                : '✓ Card criado! Adicione outro...'}
            </p>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
              {willCreateTwo ? 'Criar 2 cards' : 'Criar card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
