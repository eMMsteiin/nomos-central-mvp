import { useState, useRef, useCallback } from 'react';
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
import { Plus, ArrowLeftRight, Shuffle, Brackets, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseClozeText, getClozeFront, getClozeBack } from '@/utils/clozeParser';
import { ImageOcclusionEditor } from './ImageOcclusionEditor';

type CardType = 'basic' | 'basic-reversed' | 'basic-optional-reversed' | 'cloze' | 'image-occlusion';

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
    value: 'basic-optional-reversed',
    label: 'Opt. Rev.',
    hint: '1 ou 2 cards',
    icon: <Shuffle className="w-3.5 h-3.5" />,
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
  const [includeReverse, setIncludeReverse] = useState(true);

  // Cloze state
  const [clozeText, setClozeText] = useState('');
  const clozeRef = useRef<HTMLTextAreaElement>(null);

  const [isCreatingAnother, setIsCreatingAnother] = useState(false);
  const [lastCreatedCount, setLastCreatedCount] = useState(1);

  // ── Cloze helpers ──────────────────────────────────────────────────────────

  const parsedCloze = parseClozeText(clozeText);

  const insertClozeMarker = useCallback((num: number) => {
    const el = clozeRef.current;
    if (!el) return;

    const start = el.selectionStart ?? clozeText.length;
    const end = el.selectionEnd ?? clozeText.length;
    const selected = clozeText.substring(start, end);
    const marker = selected ? `{{c${num}::${selected}}}` : `{{c${num}::}}`;
    const next = clozeText.substring(0, start) + marker + clozeText.substring(end);
    setClozeText(next);

    requestAnimationFrame(() => {
      el.focus();
      const pos = selected ? start + marker.length : start + `{{c${num}::`.length;
      el.setSelectionRange(pos, pos);
    });
  }, [clozeText]);

  const nextClozeNumber = parsedCloze.uniqueNumbers.length > 0
    ? Math.max(...parsedCloze.uniqueNumbers) + 1
    : 1;

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
    if (cardType === 'basic-optional-reversed' && includeReverse) return [base, reversed];
    return [base];
  };

  const isValid = () => {
    if (cardType === 'cloze') return clozeText.trim().length > 0 && parsedCloze.hasValidCloze;
    if (cardType === 'image-occlusion') return false; // handled by ImageOcclusionEditor's own button
    return front.trim().length > 0 && back.trim().length > 0;
  };

  const willCreateCount = (): number => {
    if (cardType === 'cloze') return parsedCloze.uniqueNumbers.length;
    if (cardType === 'basic-reversed') return 2;
    if (cardType === 'basic-optional-reversed') return includeReverse ? 2 : 1;
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
            <div className="grid grid-cols-5 gap-1">
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
          {(cardType === 'basic' || cardType === 'basic-reversed' || cardType === 'basic-optional-reversed') && (
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

              {cardType === 'basic-optional-reversed' && (
                <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 bg-muted/30">
                  <Checkbox
                    id="include-reverse"
                    checked={includeReverse}
                    onCheckedChange={(v) => setIncludeReverse(!!v)}
                  />
                  <label htmlFor="include-reverse" className="text-sm cursor-pointer select-none">
                    Criar também o card reverso (Verso → Frente)
                  </label>
                </div>
              )}
            </>
          )}

          {/* ── Cloze fields ── */}
          {cardType === 'cloze' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cloze-text">Texto com lacunas</Label>

                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => insertClozeMarker(n)}
                      className={cn(
                        'rounded border px-2 py-0.5 text-xs font-mono transition-colors',
                        parsedCloze.uniqueNumbers.includes(n)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      )}
                    >
                      c{n}
                    </button>
                  ))}
                  {nextClozeNumber > 5 && (
                    <button
                      type="button"
                      onClick={() => insertClozeMarker(nextClozeNumber)}
                      className="rounded border border-border px-2 py-0.5 text-xs font-mono text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                    >
                      c{nextClozeNumber}
                    </button>
                  )}
                </div>

                <Textarea
                  id="cloze-text"
                  ref={clozeRef}
                  placeholder={`Ex: A capital do Brasil é {{c1::Brasília}} e foi inaugurada em {{c2::1960}}.`}
                  value={clozeText}
                  onChange={(e) => setClozeText(e.target.value)}
                  rows={4}
                  autoFocus
                  className="resize-none font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Selecione texto e clique em{' '}
                  <span className="font-mono">c1</span>,{' '}
                  <span className="font-mono">c2</span>… para criar lacunas. Ou escreva{' '}
                  <span className="font-mono">{'{{c1::resposta}}'}</span> manualmente.
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
                      >
                        <span className="text-xs font-mono text-muted-foreground mr-2">c{num}</span>
                        <span dangerouslySetInnerHTML={{ __html: getClozeFront(clozeText, num) }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {clozeText.trim().length > 0 && !parsedCloze.hasValidCloze && (
                <p className="text-xs text-destructive">
                  Nenhuma lacuna encontrada. Use a sintaxe{' '}
                  <span className="font-mono">{'{{c1::texto}}'}</span>.
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
