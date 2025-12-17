import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeneratedCard {
  id: string;
  front: string;
  back: string;
  selected: boolean;
}

interface GenerateFlashcardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveCards: (cards: Array<{ front: string; back: string }>) => void;
  deckTitle: string;
}

export function GenerateFlashcardsDialog({
  open,
  onOpenChange,
  onSaveCards,
  deckTitle
}: GenerateFlashcardsDialogProps) {
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (inputText.length < 50) {
      setError('Cole pelo menos 50 caracteres para gerar flashcards.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedCards([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-flashcards', {
        body: { text: inputText, maxCards: 10 }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      const cards: GeneratedCard[] = data.flashcards.map((card: { front: string; back: string }, index: number) => ({
        id: `gen-${index}`,
        front: card.front,
        back: card.back,
        selected: true
      }));

      setGeneratedCards(cards);
      toast.success(`${cards.length} flashcards gerados!`);
    } catch (err) {
      console.error('Error generating flashcards:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar flashcards');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCardSelection = (id: string) => {
    setGeneratedCards(prev =>
      prev.map(card =>
        card.id === id ? { ...card, selected: !card.selected } : card
      )
    );
  };

  const selectedCount = generatedCards.filter(c => c.selected).length;

  const handleSave = () => {
    const cardsToSave = generatedCards
      .filter(c => c.selected)
      .map(({ front, back }) => ({ front, back }));

    if (cardsToSave.length === 0) {
      toast.error('Selecione pelo menos um card para salvar');
      return;
    }

    onSaveCards(cardsToSave);
    handleClose();
    toast.success(`${cardsToSave.length} flashcards adicionados ao deck!`);
  };

  const handleClose = () => {
    setInputText('');
    setGeneratedCards([]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Flashcards com IA
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Deck: {deckTitle}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Cole seu texto aqui:</label>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Cole aqui o conteúdo que deseja transformar em flashcards. Pode ser um resumo, anotações de aula, trechos de livros, etc."
              className="min-h-[120px] resize-none"
              disabled={isGenerating}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {inputText.length} caracteres {inputText.length < 50 && '(mínimo 50)'}
              </span>
              <Button
                onClick={handleGenerate}
                disabled={inputText.length < 50 || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Flashcards
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Generated Cards Preview */}
          {generatedCards.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Cards Gerados ({generatedCards.length})
                </h3>
                <span className="text-xs text-muted-foreground">
                  {selectedCount} selecionados
                </span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {generatedCards.map((card) => (
                  <div
                    key={card.id}
                    className={`p-3 border rounded-lg transition-colors cursor-pointer ${
                      card.selected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border bg-muted/30 opacity-60'
                    }`}
                    onClick={() => toggleCardSelection(card.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={card.selected}
                        onCheckedChange={() => toggleCardSelection(card.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium">{card.front}</p>
                        <p className="text-xs text-muted-foreground">{card.back}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {generatedCards.length > 0 && (
            <Button onClick={handleSave} disabled={selectedCount === 0}>
              Salvar {selectedCount} {selectedCount === 1 ? 'card' : 'cards'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
