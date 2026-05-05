import { useState, useRef } from 'react';
import { FileUp, Trash2, RefreshCw, Loader2, CheckCircle2, AlertCircle, Sparkles, FileText, Image, Presentation, Plus, ArrowLeftRight, Brackets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { DeckSource } from '@/hooks/useDeckSources';
import { parseClozeText, getClozeFront, getClozeBack, stripClozeFormatting } from '@/utils/clozeParser';

type AICardType = 'basic' | 'basic-reversed' | 'cloze';

interface DeckSourcesSectionProps {
  sources: DeckSource[];
  isUploading: boolean;
  isGenerating: boolean;
  canUpload: boolean;
  canGenerate: boolean;
  readyCount: number;
  processingCount: number;
  onUpload: (file: File) => void;
  onDelete: (sourceId: string) => void;
  onRetry: (sourceId: string) => void;
  onGenerate: (focus?: string, selectedSourceIds?: string[], cardType?: string) => Promise<Array<{ front: string; back: string }> | null>;
  onCardsGenerated: (cards: Array<{ front: string; back: string }>) => void;
}

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  image: Image,
  pptx: Presentation,
};

const AI_CARD_TYPES: { value: AICardType; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: 'basic', label: 'Basic', hint: '1 card', icon: <Plus className="w-3.5 h-3.5" /> },
  { value: 'basic-reversed', label: 'Reversed', hint: '2 cards F↔V', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  { value: 'cloze', label: 'Cloze', hint: 'N por lacuna', icon: <Brackets className="w-3.5 h-3.5" /> },
];

function getWordCount(text: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function expandCards(
  cards: Array<{ front: string; back: string }>,
  cardType: AICardType,
): Array<{ front: string; back: string }> {
  if (cardType === 'basic-reversed') {
    return cards.flatMap(({ front, back }) => [
      { front, back },
      { front: back, back: front },
    ]);
  }
  if (cardType === 'cloze') {
    return cards.flatMap(({ front }) => {
      const parsed = parseClozeText(front);
      if (!parsed.hasValidCloze) return [{ front, back: stripClozeFormatting(front) }];
      return parsed.uniqueNumbers.map(num => ({
        front: getClozeFront(front, num),
        back: getClozeBack(front, num),
      }));
    });
  }
  return cards;
}

export function DeckSourcesSection({
  sources,
  isUploading,
  isGenerating,
  canUpload,
  canGenerate,
  readyCount,
  processingCount,
  onUpload,
  onDelete,
  onRetry,
  onGenerate,
  onCardsGenerated,
}: DeckSourcesSectionProps) {
  const [focus, setFocus] = useState('');
  const [showSelectDialog, setShowSelectDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cardType, setCardType] = useState<AICardType>('basic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readySources = sources.filter(s => s.status === 'ready');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = '';
    }
  };

  const handleGenerateClick = () => {
    setSelectedIds(new Set(readySources.map(s => s.id)));
    setShowSelectDialog(true);
  };

  const handleConfirmGenerate = async () => {
    setShowSelectDialog(false);
    const ids = Array.from(selectedIds);
    const rawCards = await onGenerate(focus || undefined, ids, cardType);
    if (rawCards && rawCards.length > 0) {
      const expanded = expandCards(rawCards, cardType);
      onCardsGenerated(expanded);
    }
  };

  const toggleSource = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === readySources.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(readySources.map(s => s.id)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileUp className="w-5 h-5" />
          Fontes do Baralho
        </h2>
        {canUpload && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileUp className="w-4 h-4 mr-2" />
            )}
            Adicionar fonte
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.heic,.webp,.pptx,.docx"
          onChange={handleFileSelect}
        />
      </div>

      {sources.length === 0 ? (
        <Card
          className="border-dashed cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <FileUp className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Anexe PDFs, slides ou fotos de anotações para gerar flashcards baseados no conteúdo
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, PNG, JPG, HEIC, PPTX, DOCX · Máx 10MB · Até 5 arquivos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sources.map(source => {
            const Icon = FILE_TYPE_ICONS[source.fileType] || FileText;
            const wordCount = getWordCount(source.extractedText);

            return (
              <Card key={source.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{source.fileName}</p>
                    <div className="flex items-center gap-2">
                      {source.status === 'processing' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Extraindo conteúdo...
                        </span>
                      )}
                      {source.status === 'ready' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          ~{wordCount.toLocaleString()} palavras
                        </span>
                      )}
                      {source.status === 'error' && (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {wordCount < 100 && wordCount > 0
                            ? 'Pouco conteúdo encontrado'
                            : source.extractedText
                              ? source.extractedText.slice(0, 80)
                              : 'Falha na extração'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {source.status === 'error' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRetry(source.id)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(source.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {sources.length > 0 && (
        <div className="space-y-3 pt-2">
          <Input
            placeholder="Foco específico (opcional) — Ex: foque nos conceitos do capítulo 3"
            value={focus}
            onChange={e => setFocus(e.target.value)}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full">
                  <Button
                    className="w-full"
                    disabled={!canGenerate}
                    onClick={handleGenerateClick}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {isGenerating
                      ? 'Gerando flashcards...'
                      : `Gerar flashcards das fontes (${readyCount})`}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canGenerate && processingCount > 0 && (
                <TooltipContent>
                  Aguarde o processamento das fontes
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <Dialog open={showSelectDialog} onOpenChange={setShowSelectDialog}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Configurar geração</DialogTitle>
          </DialogHeader>

          {/* Card type selector */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Tipo de card</p>
            <div className="grid grid-cols-3 gap-1">
              {AI_CARD_TYPES.map((type) => (
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

          <p className="text-sm text-muted-foreground">
            Escolha quais arquivos serão usados para gerar os flashcards.
          </p>
          <div className="space-y-2 py-2 max-h-[40vh] overflow-y-auto">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
              onClick={toggleAll}
            >
              {selectedIds.size === readySources.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
            {readySources.map(source => {
              const Icon = FILE_TYPE_ICONS[source.fileType] || FileText;
              const wordCount = getWordCount(source.extractedText);
              return (
                <label
                  key={source.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/30 transition-colors overflow-hidden"
                >
                  <Checkbox
                    checked={selectedIds.has(source.id)}
                    onCheckedChange={() => toggleSource(source.id)}
                    className="shrink-0"
                  />
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium truncate">{source.fileName}</p>
                    <p className="text-xs text-muted-foreground">~{wordCount.toLocaleString()} palavras</p>
                  </div>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSelectDialog(false)}>
              Cancelar
            </Button>
            <Button
              disabled={selectedIds.size === 0}
              onClick={handleConfirmGenerate}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar de {selectedIds.size} fonte{selectedIds.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
