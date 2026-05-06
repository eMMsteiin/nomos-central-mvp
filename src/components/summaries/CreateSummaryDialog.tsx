import { useState } from 'react';
import { Loader2, Sparkles, FileText, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { SummaryType } from '@/types/summary';

interface CreateSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (summary: { title: string; content: string; subject: string; type: SummaryType; sourceType: string }) => void;
}

const TYPES = [
  { value: 'essential' as SummaryType, label: 'Essencial', hint: 'Pontos-chave do tema', icon: <BookOpen className="w-4 h-4" /> },
  { value: 'exam' as SummaryType, label: 'Para Prova', hint: 'Foco em questões prováveis', icon: <FileText className="w-4 h-4" /> },
];

export function CreateSummaryDialog({ open, onOpenChange, onCreated }: CreateSummaryDialogProps) {
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<SummaryType>('essential');
  const [sourceContent, setSourceContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!subject.trim()) {
      setError('Informe o assunto do resumo.');
      return;
    }
    setError('');
    setIsGenerating(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-summary', {
        body: {
          subject: subject.trim(),
          type,
          sourceContent: sourceContent.trim() || undefined,
          sourceType: 'manual',
        },
      });

      if (fnError) {
        let msg = fnError.message || 'Erro ao gerar resumo.';
        try {
          const body = await (fnError as { context?: Response })?.context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        setError(msg);
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      onCreated(data);
      onOpenChange(false);
      setSubject('');
      setSourceContent('');
      setType('essential');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Criar resumo com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Assunto / Matéria</Label>
            <Input
              placeholder="Ex: Fotossíntese, Revolução Francesa, Direito Civil..."
              value={subject}
              onChange={e => setSubject(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de resumo</Label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  disabled={isGenerating}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    type === t.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {t.icon}
                    {t.label}
                  </span>
                  <span className="text-[11px] opacity-60">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Conteúdo base <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              placeholder="Cole aqui suas anotações, trechos do livro ou qualquer texto para embasar o resumo. Se deixar em branco, a IA usa o conhecimento geral sobre o assunto."
              value={sourceContent}
              onChange={e => setSourceContent(e.target.value)}
              disabled={isGenerating}
              rows={5}
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">{sourceContent.length}/50.000 caracteres</p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !subject.trim()}>
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Gerar resumo</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
