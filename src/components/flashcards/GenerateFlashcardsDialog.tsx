import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, AlertCircle, FileText, Lightbulb, Plus, ArrowLeftRight, Brackets, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { parseClozeText, getClozeFront, getClozeBack, stripClozeFormatting } from '@/utils/clozeParser';

type AICardType = 'basic' | 'basic-reversed' | 'cloze';

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

const AI_CARD_TYPES: { value: AICardType; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: 'basic', label: 'Basic', hint: '1 card', icon: <Plus className="w-3.5 h-3.5" /> },
  { value: 'basic-reversed', label: 'Reversed', hint: '2 cards F↔V', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  { value: 'cloze', label: 'Cloze', hint: 'N por lacuna', icon: <Brackets className="w-3.5 h-3.5" /> },
];

function expandCards(
  cards: GeneratedCard[],
  cardType: AICardType,
): Array<{ front: string; back: string }> {
  const selected = cards.filter(c => c.selected).map(({ front, back }) => ({ front, back }));

  if (cardType === 'basic-reversed') {
    return selected.flatMap(({ front, back }) => [
      { front, back },
      { front: back, back: front },
    ]);
  }

  if (cardType === 'cloze') {
    return selected.flatMap(({ front }) => {
      const parsed = parseClozeText(front);
      if (!parsed.hasValidCloze) return [{ front, back: stripClozeFormatting(front) }];
      return parsed.uniqueNumbers.map(num => ({
        front: getClozeFront(front, num),
        back: getClozeBack(front, num),
      }));
    });
  }

  return selected;
}

function countExpandedCards(cards: GeneratedCard[], cardType: AICardType): number {
  const selected = cards.filter(c => c.selected);
  if (cardType === 'basic-reversed') return selected.length * 2;
  if (cardType === 'cloze') {
    return selected.reduce((acc, c) => {
      const parsed = parseClozeText(c.front);
      return acc + (parsed.hasValidCloze ? parsed.uniqueNumbers.length : 1);
    }, 0);
  }
  return selected.length;
}

function ClozePreview({ text }: { text: string }) {
  const parsed = parseClozeText(text);
  if (!parsed.hasValidCloze) return <p className="text-sm">{text}</p>;
  return (
    <div className="space-y-1">
      <p
        className="text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: getClozeFront(text, parsed.uniqueNumbers[0]) }}
      />
      {parsed.uniqueNumbers.length > 1 && (
        <p className="text-xs text-muted-foreground">
          +{parsed.uniqueNumbers.length - 1} lacuna{parsed.uniqueNumbers.length - 1 > 1 ? 's' : ''} adicional{parsed.uniqueNumbers.length - 1 > 1 ? 'is' : ''}
        </p>
      )}
    </div>
  );
}

export function GenerateFlashcardsDialog({
  open,
  onOpenChange,
  onSaveCards,
  deckTitle
}: GenerateFlashcardsDialogProps) {
  const [mode, setMode] = useState<'text' | 'topic'>('text');
  const [cardType, setCardType] = useState<AICardType>('basic');
  const [inputText, setInputText] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [cardCount, setCardCount] = useState('10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isTextModeValid = inputText.length >= 50;
  const isTopicModeValid = topic.length >= 3 && topic.length <= 100;
  const canGenerate = mode === 'text' ? isTextModeValid : isTopicModeValid;

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError(mode === 'text'
        ? 'Cole pelo menos 50 caracteres para gerar flashcards.'
        : 'Digite um tópico com pelo menos 3 caracteres.'
      );
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedCards([]);

    try {
      const body = mode === 'text'
        ? { mode: 'text', text: inputText, maxCards: parseInt(cardCount), card_type: cardType }
        : { mode: 'topic', topic, difficulty, maxCards: parseInt(cardCount), card_type: cardType };

      const { data, error: fnError } = await supabase.functions.invoke('generate-flashcards', { body });

      if (fnError) throw new Error(fnError.message);
      if (data.error) { setError(data.error); return; }

      const cards: GeneratedCard[] = data.flashcards.map((card: { front: string; back: string }, index: number) => ({
        id: `gen-${index}`,
        front: card.front,
        back: card.back,
        selected: true
      }));

      setGeneratedCards(cards);
      toast.success(`${cards.length} ${cardType === 'cloze' ? 'notas cloze' : 'flashcards'} gerados!`);
    } catch (err) {
      console.error('Error generating flashcards:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar flashcards');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCardSelection = (id: string) => {
    setGeneratedCards(prev =>
      prev.map(card => card.id === id ? { ...card, selected: !card.selected } : card)
    );
  };

  const selectedCount = generatedCards.filter(c => c.selected).length;
  const totalCardCount = countExpandedCards(generatedCards, cardType);

  const handleSave = () => {
    if (selectedCount === 0) {
      toast.error('Selecione pelo menos um card para salvar');
      return;
    }

    const expanded = expandCards(generatedCards, cardType);
    onSaveCards(expanded);
    handleClose();
    toast.success(`${expanded.length} card${expanded.length !== 1 ? 's' : ''} adicionados ao deck!`);
  };

  const handleClose = () => {
    setInputText('');
    setTopic('');
    setDifficulty('intermediate');
    setCardCount('10');
    setGeneratedCards([]);
    setError(null);
    setMode('text');
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
          <p className="text-sm text-muted-foreground">Deck: {deckTitle}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Card type selector */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Tipo de card</p>
            <div className="grid grid-cols-4 gap-1">
              {AI_CARD_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => { setCardType(type.value); setGeneratedCards([]); }}
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
              {/* Image Occlusion — disabled */}
              <button
                type="button"
                disabled
                className="flex flex-col items-start gap-0.5 rounded-lg border px-2 py-2 text-left opacity-40 cursor-not-allowed border-border bg-background text-muted-foreground"
              >
                <span className="flex items-center gap-1 text-xs font-semibold">
                  <Image className="w-3.5 h-3.5" />
                  Oclusão
                </span>
                <span className="text-[10px] opacity-60 leading-tight">Só manual</span>
              </button>
            </div>
          </div>

          {/* Mode Tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'text' | 'topic')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Colar Texto
              </TabsTrigger>
              <TabsTrigger value="topic" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Gerar por Tópico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-3 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cole seu texto aqui:</label>
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Cole aqui o conteúdo que deseja transformar em flashcards."
                  className="min-h-[140px] resize-none"
                  disabled={isGenerating}
                />
                <span className="text-xs text-muted-foreground">
                  {inputText.length} caracteres {inputText.length < 50 && '(mínimo 50)'}
                </span>
              </div>
            </TabsContent>

            <TabsContent value="topic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Qual tópico você quer estudar?</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: Revolução Francesa, Teorema de Pitágoras, Fotossíntese..."
                  disabled={isGenerating}
                  maxLength={100}
                />
                <span className="text-xs text-muted-foreground">
                  {topic.length}/100 caracteres {topic.length < 3 && topic.length > 0 && '(mínimo 3)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nível de dificuldade</label>
                  <Select value={difficulty} onValueChange={setDifficulty} disabled={isGenerating || cardType === 'cloze'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">🟢 Básico</SelectItem>
                      <SelectItem value="intermediate">🟡 Intermediário</SelectItem>
                      <SelectItem value="advanced">🔴 Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantidade de cards</label>
                  <Select value={cardCount} onValueChange={setCardCount} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 cards</SelectItem>
                      <SelectItem value="10">10 cards</SelectItem>
                      <SelectItem value="15">15 cards</SelectItem>
                      <SelectItem value="20">20 cards</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
                  <span>
                    <strong>Dica:</strong> Seja específico! "Guerra dos Cem Anos" gera cards melhores que apenas "História".
                  </span>
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating} size="lg">
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Gerar Flashcards</>
              )}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {generatedCards.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  {cardType === 'cloze' ? 'Notas Cloze Geradas' : 'Cards Gerados'} ({generatedCards.length})
                </h3>
                <span className="text-xs text-muted-foreground">
                  {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
                  {cardType !== 'basic' && ` → ${totalCardCount} card${totalCardCount !== 1 ? 's' : ''}`}
                </span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {generatedCards.map((card) => (
                  <div
                    key={card.id}
                    className={cn(
                      'p-3 border rounded-lg transition-colors cursor-pointer',
                      card.selected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border bg-muted/30 opacity-60'
                    )}
                    onClick={() => toggleCardSelection(card.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={card.selected}
                        onCheckedChange={() => toggleCardSelection(card.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        {cardType === 'cloze' ? (
                          <ClozePreview text={card.front} />
                        ) : (
                          <p className="text-sm font-medium">{card.front}</p>
                        )}
                        {cardType !== 'cloze' && (
                          <p className="text-xs text-muted-foreground italic">📝 Resposta oculta</p>
                        )}
                        {cardType === 'basic-reversed' && (
                          <p className="text-xs text-muted-foreground">↔ Gera 2 cards</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {generatedCards.length > 0 && (
            <Button onClick={handleSave} disabled={selectedCount === 0}>
              Salvar {totalCardCount} card{totalCardCount !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
