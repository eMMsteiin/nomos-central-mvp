import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Pencil, Plus, ArrowLeftRight, Brackets, Scissors } from 'lucide-react';
import { Flashcard } from '@/types/flashcard';
import { cn } from '@/lib/utils';
import { parseClozeText, getClozeFront, getClozeBack, stripClozeFormatting } from '@/utils/clozeParser';

type EditCardType = 'basic' | 'basic-reversed' | 'cloze';

const TYPE_OPTIONS: { value: EditCardType; label: string; icon: React.ReactNode }[] = [
  { value: 'basic', label: 'Basic', icon: <Plus className="w-3.5 h-3.5" /> },
  { value: 'basic-reversed', label: 'Reversed', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  { value: 'cloze', label: 'Cloze', icon: <Brackets className="w-3.5 h-3.5" /> },
];

function detectCardType(flashcard: Flashcard): EditCardType {
  if (flashcard.sourceType === 'cloze' || flashcard.front.includes('<span class="cloze')) {
    return 'cloze';
  }
  return 'basic';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

interface EditFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: Flashcard | null;
  onSave: (id: string, front: string, back: string) => void;
  onConvert?: (id: string, newCards: Array<{ front: string; back: string }>) => void;
}

export function EditFlashcardDialog({
  open,
  onOpenChange,
  flashcard,
  onSave,
  onConvert,
}: EditFlashcardDialogProps) {
  const [cardType, setCardType] = useState<EditCardType>('basic');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [clozeText, setClozeText] = useState('');
  const [hasSelection, setHasSelection] = useState(false);
  const clozeRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!flashcard || !open) return;
    const detected = detectCardType(flashcard);
    setCardType(detected);

    if (detected === 'cloze') {
      // Pre-populate cloze editor with the answer-revealed text from back
      const plainText = stripHtml(flashcard.back);
      setClozeText(plainText);
      setFront('');
      setBack('');
    } else {
      setFront(flashcard.front);
      setBack(flashcard.back);
      setClozeText('');
    }
    setHasSelection(false);
  }, [flashcard, open]);

  // When type selector changes, migrate content
  const handleTypeChange = (newType: EditCardType) => {
    if (newType === cardType) return;

    if (newType === 'cloze') {
      // Pre-populate cloze editor from current front text
      setClozeText(front || (flashcard ? stripHtml(flashcard.back) : ''));
    } else if (cardType === 'cloze') {
      // Coming back from cloze: strip markers
      const stripped = stripClozeFormatting(clozeText) || (flashcard?.front ?? '');
      setFront(stripped);
      setBack(flashcard?.back ? stripHtml(flashcard.back) : '');
    }
    setCardType(newType);
    setHasSelection(false);
  };

  // ── Cloze selection tracking ──────────────────────────────────────────────

  const trackSelection = useCallback(() => {
    const el = clozeRef.current;
    if (!el) return;
    setHasSelection((el.selectionEnd ?? 0) > (el.selectionStart ?? 0));
  }, []);

  const parsedCloze = parseClozeText(clozeText);
  const nextClozeNum = parsedCloze.uniqueNumbers.length > 0
    ? Math.max(...parsedCloze.uniqueNumbers) + 1
    : 1;

  const handleOcultarSelecao = useCallback(() => {
    const el = clozeRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start >= end) return;

    const selected = clozeText.substring(start, end);
    const marker = `{{c${nextClozeNum}::${selected}}}`;
    const next = clozeText.substring(0, start) + marker + clozeText.substring(end);
    setClozeText(next);
    setHasSelection(false);

    requestAnimationFrame(() => {
      el.focus();
      const pos = start + marker.length;
      el.setSelectionRange(pos, pos);
    });
  }, [clozeText, nextClozeNum]);

  const handleLimparLacunas = () => {
    setClozeText(stripClozeFormatting(clozeText));
    setHasSelection(false);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const isImageOcclusion = flashcard?.sourceType === 'image-occlusion' ||
    (flashcard?.front.startsWith('{') && flashcard?.front.includes('__nomos_type'));

  const isValid = () => {
    if (isImageOcclusion) return false;
    if (cardType === 'cloze') return clozeText.trim().length > 0 && parsedCloze.hasValidCloze;
    return front.trim().length > 0 && back.trim().length > 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flashcard || !isValid()) return;

    const originalType = detectCardType(flashcard);
    const typeChanged = cardType !== originalType;

    if (cardType === 'cloze') {
      const newCards = parsedCloze.uniqueNumbers.map(num => ({
        front: getClozeFront(clozeText, num),
        back: getClozeBack(clozeText, num),
      }));

      if (typeChanged && onConvert) {
        onConvert(flashcard.id, newCards);
      } else if (newCards.length === 1) {
        onSave(flashcard.id, newCards[0].front, newCards[0].back);
      } else if (onConvert) {
        onConvert(flashcard.id, newCards);
      } else {
        onSave(flashcard.id, newCards[0].front, newCards[0].back);
      }
    } else if (cardType === 'basic-reversed') {
      const base = { front: front.trim(), back: back.trim() };
      const reversed = { front: back.trim(), back: front.trim() };
      const originalIsReversed = false; // basic cards are never reversed
      if ((typeChanged || originalIsReversed) && onConvert) {
        onConvert(flashcard.id, [base, reversed]);
      } else {
        onSave(flashcard.id, base.front, base.back);
      }
    } else {
      onSave(flashcard.id, front.trim(), back.trim());
    }

    onOpenChange(false);
  };

  const handleClose = () => {
    setHasSelection(false);
    onOpenChange(false);
  };

  if (!flashcard) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Editar flashcard
          </DialogTitle>
        </DialogHeader>

        {isImageOcclusion ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Cards de oclusão de imagem não podem ser editados aqui.
            </p>
            <p className="text-xs text-muted-foreground">
              Delete este card e crie um novo do tipo Oclusão.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type selector */}
            <div className="space-y-1.5">
              <Label>Tipo de card</Label>
              <div className="grid grid-cols-3 gap-1">
                {TYPE_OPTIONS.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeChange(type.value)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-left transition-colors text-xs font-semibold',
                      cardType === type.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {type.icon}
                    {type.label}
                  </button>
                ))}
              </div>
              {cardType !== detectCardType(flashcard) && onConvert && (
                <p className="text-xs text-muted-foreground">
                  O card atual será substituído pelo{cardType === 'basic-reversed' ? 's 2 novos' : 's novos'} card{cardType === 'basic-reversed' ? 's' : 's'}.
                </p>
              )}
            </div>

            {/* Cloze editor */}
            {cardType === 'cloze' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-cloze">Texto com lacunas</Label>
                    <div className="flex items-center gap-1.5">
                      {parsedCloze.hasValidCloze && (
                        <button
                          type="button"
                          onClick={handleLimparLacunas}
                          className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          Limpar lacunas
                        </button>
                      )}
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
                  </div>
                  <Textarea
                    id="edit-cloze"
                    ref={clozeRef}
                    value={clozeText}
                    onChange={(e) => { setClozeText(e.target.value); setHasSelection(false); }}
                    onSelect={trackSelection}
                    onMouseUp={trackSelection}
                    onKeyUp={trackSelection}
                    rows={4}
                    autoFocus
                    className="resize-none font-mono text-sm"
                    placeholder="Digite o texto e selecione palavras para ocultar..."
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
                    <div className="space-y-1 max-h-28 overflow-y-auto">
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

            {/* Basic / Reversed fields */}
            {(cardType === 'basic' || cardType === 'basic-reversed') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-front">Frente (Pergunta)</Label>
                  <Textarea
                    id="edit-front"
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
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                {cardType === 'basic-reversed' && (
                  <p className="text-xs text-muted-foreground">
                    Serão gerados 2 cards: Frente→Verso e Verso→Frente.
                  </p>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!isValid()}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
