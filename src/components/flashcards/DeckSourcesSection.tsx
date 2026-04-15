import { useState, useRef } from 'react';
import { FileUp, Trash2, RefreshCw, Loader2, CheckCircle2, AlertCircle, Sparkles, FileText, Image, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DeckSource } from '@/hooks/useDeckSources';

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
  onGenerate: (focus?: string) => Promise<Array<{ front: string; back: string }> | null>;
  onCardsGenerated: (cards: Array<{ front: string; back: string }>) => void;
}

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  image: Image,
  pptx: Presentation,
};

function getWordCount(text: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    const cards = await onGenerate(focus || undefined);
    if (cards && cards.length > 0) {
      onCardsGenerated(cards);
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
          accept=".pdf,.png,.jpg,.jpeg,.heic,.webp,.pptx"
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
              PDF, PNG, JPG, HEIC, PPTX · Máx 10MB · Até 5 arquivos
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

      {/* Generation controls */}
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
                    onClick={handleGenerate}
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
    </div>
  );
}
