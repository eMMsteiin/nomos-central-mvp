import { useState, useRef, useCallback, useEffect } from 'react';
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
import { Plus, ArrowLeftRight, Brackets, Image, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseClozeText, getClozeFront, getClozeBack } from '@/utils/clozeParser';
import { ImageOcclusionEditor } from './ImageOcclusionEditor';

type CardType = 'basic' | 'basic-reversed' | 'cloze' | 'image-occlusion';

const CARD_TYPES: { value: CardType; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    value: 'basic',
    label: 'Basic',
    hint: '1 card',
    icon: <Plus className="w-3.5 h-3.5" />,
  },
  {
    value: 'basic-reversed',
    label: 'Reversed',
    hint: '2 cards F↔V',
    icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
  },
  {
    value: 'cloze',
    label: 'Cloze',
    hint: 'N por lacuna',
    icon: <Brackets className="w-3.5 h-3.5" />,
  },
  {
    value: 'image-occlusion',
    label: 'Oclusão',
    hint: 'N por área',
    icon: <Image className="w-3.5 h-3.5" />,
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

  // Basic / Reversed state
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  // Cloze state
  const [clozeText, setClozeText] = useState('');
  const [hasSelection, setHasSelection] = useState(false);
  const clozeRef = useRef<HTMLTextAreaElement>(null);

  const [isCreatingAnother, setIsCreatingAnother] = useState(false);
  const [lastCreatedCount, setLastCreatedCount] = useState(1);

  // ── Cloze helpers ──────────────────────────────────────────────────────────

  const parsedCloze = parseClozeText(clozeText);

  const nextClozeNumber = parsedCloze.uniqueNumbers.length > 0
    ? Math.max(...parsedCloze.uniqueNumbers) + 1
    : 1;

  const trackSelection = useCallback(() => {
    const el = clozeRef.current;
    if (!el) return;
    setHasSelection((el.selectionEnd ?? 0) > (el.selectionStart ?? 0));
  }, []);

  const handleOcultarSelecao = useCallback(() => {
    const el = clozeRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start >= end) return;

    const selected = clozeText.substring(start, end);
    const marker = `{{c${nextClozeNumber}::${selected}}}`;
    const next = clozeText.substring(0, start) + marker + clozeText.substring(end);
    setClozeText(next);
    setHasSelection(false);

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, start + marker.length);
    });
  }, [clozeText, nextClozeNumber]);

  // Reset selection when switching card type
  useEffect(() => {
    setHasSelection(false);
  }, [cardType]);

  // ── Card builder ───────────────────────────────────────────────────────────

  const buildCards = (): Array<{ front: string; back: string }> => {
    if (cardType === 'cloze') {
      return parsedCloze.uniqueNumbers.map(num => ({
        front: getClozeFront(clozeText, num),
        back: getClozeBack(clozeText, num),
      }));
    }
    const base = { front: front.trim(), back: back.trim() };
    const reversed = { front: back.trim(), back: front.trim() };
    if (cardType === 'basic-reversed') return [base, reversed];
    return [base];
  };

  const isValid = () => {
    if (cardType === 'cloze') return clozeText.trim().length > 0 && parsedCloze.hasValidCloze;
    if (cardType === 'image-occlusion') return false;
    return front.trim().length > 0 && back.trim().length > 0;
  };

  const willCreateCount = (): number => {
    if (cardType === 'cloze') return parsedCloze.uniqueNumbers.length;
    if (cardType === 'basic-reversed') return 2;
    return 1;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent, createAnother: boolean = false) => {
    e.preventDefault();
    if (!isValid()) return;

    const cards = buildCards();
    onCreateCards(cards);
    setLastCreatedCount(cards.length);

    if (createAnother) {
      setFront('');
      setBack('');
      setClozeText('');
      setIsCreatingAnother(true);
      setTimeout(() => setIsCreatingAnother(false), 1200);
    } else {
      reset();
      onOpenChange(false);
    }
  };

  // Called by ImageOcclusionEditor when user clicks "Gerar cards"
  const handleOcclusionComplete = (cards: Array<{ front: string; back: string }>) => {
    onCreateCards(cards);
    setLastCreatedCount(cards.length);
    reset();
    onOpenChange(false);
  };

  const reset = () => {
    setFront('');
    setBack('');
    setClozeText('');
    setHasSelection(false);
    setIsCreatingAnother(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const count = willCreateCount();
  const submitLabel = count > 1 ? `Criar ${count} cards` : 'Criar card';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Adicionar card em "{deckTitle}"
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">

          {/* ── Type selector ── */}
          <div className="space-y-1.5">
            <Label>Tipo de card</Label>
            <div className="grid grid-cols-4 gap-1">
              {CARD_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setCardType(type.value)}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-lg border px-2 py-2 text-left transition-colors',
                    cardType === type.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    {type.icon}
                    {type.label}
                  </span>
                  <span className="text-[10px] opacity-60 leading-tight">{type.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Basic / Reversed fields ── */}
          {(cardType === 'basic' || cardType === 'basic-reversed') && (
            <>
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
            </>
          )}

          {/* ── Cloze fields ── */}
          {cardType === 'cloze' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cloze-text">Texto com lacunas</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant={hasSelection ? 'default' : 'outline'}
                    disabled={!hasSelection}
                    onClick={handleOcultarSelecao}
                    className="h-7 text-xs gap-1"
                  >
                    <Scissors className="w-3 h-3" />
                    Ocultar seleção
                  </Button>
                </div>

                <Textarea
                  id="cloze-text"
                  ref={clozeRef}
                  placeholder="Digite o texto e selecione palavras para ocultar. Ex: A capital do Brasil é Brasília."
                  value={clozeText}
                  onChange={(e) => { setClozeText(e.target.value); setHasSelection(false); }}
                  onSelect={trackSelection}
                  onMouseUp={trackSelection}
                  onKeyUp={trackSelection}
                  rows={4}
                  autoFocus
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Selecione uma palavra ou frase e clique em "Ocultar seleção" para criar uma lacuna.
                </p>
              </div>

              {parsedCloze.uniqueNumbers.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {parsedCloze.uniqueNumbers.length}{' '}
                    {parsedCloze.uniqueNumbers.length === 1 ? 'card será criado' : 'cards serão criados'}
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {parsedCloze.uniqueNumbers.map((num) => (
                      <div
                        key={num}
                        className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                        dangerouslySetInnerHTML={{ __html: getClozeFront(clozeText, num) }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {clozeText.trim().length > 0 && !parsedCloze.hasValidCloze && (
                <p className="text-xs text-destructive">
                  Nenhuma lacuna encontrada. Selecione texto e clique em "Ocultar seleção".
                </p>
              )}
            </div>
          )}

          {/* ── Image Occlusion ── */}
          {cardType === 'image-occlusion' && (
            <ImageOcclusionEditor onComplete={handleOcclusionComplete} />
          )}

          {/* ── Feedback ── */}
          {isCreatingAnother && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {lastCreatedCount > 1
                ? `✓ ${lastCreatedCount} cards criados! Adicione outro...`
                : '✓ Card criado! Adicione outro...'}
            </p>
          )}

          {/* ── Footer — hidden for image occlusion (it has its own button) ── */}
          {cardType !== 'image-occlusion' && (
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={(e) => handleSubmit(e as any, true)}
                disabled={!isValid()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Criar e adicionar outro
              </Button>
              <Button type="submit" disabled={!isValid()}>
                {submitLabel}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
