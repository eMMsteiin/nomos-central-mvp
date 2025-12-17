import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, ClipboardPaste, Target, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  SummaryTemplate, 
  SummaryDifficulty, 
  SUMMARY_TEMPLATES, 
  SUMMARY_DIFFICULTIES,
  DEFAULT_DISCIPLINES 
} from '@/types/summary';

interface GenerateSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    title: string;
    content: string;
    template: SummaryTemplate;
    difficulty: SummaryDifficulty;
    sourceType: 'ai';
    sourceText?: string;
    topic?: string;
    disciplineId?: string;
    tags: string[];
  }) => void;
}

export const GenerateSummaryDialog = ({ open, onOpenChange, onSave }: GenerateSummaryDialogProps) => {
  const [mode, setMode] = useState<'text' | 'topic'>('topic');
  const [sourceText, setSourceText] = useState('');
  const [topic, setTopic] = useState('');
  const [template, setTemplate] = useState<SummaryTemplate>('topics');
  const [difficulty, setDifficulty] = useState<SummaryDifficulty>('intermediate');
  const [disciplineId, setDisciplineId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    title: string;
    content: string;
    tags: string[];
  } | null>(null);

  const handleGenerate = async () => {
    if (mode === 'text' && !sourceText.trim()) {
      toast.error('Cole o texto para gerar o resumo');
      return;
    }
    if (mode === 'topic' && !topic.trim()) {
      toast.error('Digite o tópico para gerar o resumo');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);

    try {
      const discipline = DEFAULT_DISCIPLINES.find(d => d.id === disciplineId);
      
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: {
          mode,
          content: mode === 'text' ? sourceText : undefined,
          topic: mode === 'topic' ? topic : undefined,
          template,
          difficulty,
          discipline: discipline?.name,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setGeneratedContent(null);
        return;
      }

      // Validate response has required fields
      if (!data.title || !data.content) {
        toast.error('Resposta incompleta da IA. Tente novamente.');
        setGeneratedContent(null);
        return;
      }

      setGeneratedContent({
        title: data.title,
        content: data.content,
        tags: data.tags || [],
      });
      toast.success('Resumo gerado com sucesso!');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Erro ao gerar resumo. Tente novamente.');
      setGeneratedContent(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!generatedContent) return;

    onSave({
      title: generatedContent.title,
      content: generatedContent.content,
      template,
      difficulty,
      sourceType: 'ai',
      sourceText: mode === 'text' ? sourceText : undefined,
      topic: mode === 'topic' ? topic : undefined,
      disciplineId: disciplineId || undefined,
      tags: generatedContent.tags,
    });

    // Reset state
    setSourceText('');
    setTopic('');
    setGeneratedContent(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSourceText('');
    setTopic('');
    setGeneratedContent(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Resumo com IA
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'text' | 'topic')} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <ClipboardPaste className="h-4 w-4" />
              Colar Texto
            </TabsTrigger>
            <TabsTrigger value="topic" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Gerar por Tópico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            <div>
              <Label>Cole o texto para resumir</Label>
              <Textarea
                placeholder="Cole aqui o texto das suas anotações, livro ou artigo..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="min-h-[120px] mt-1.5"
              />
            </div>
          </TabsContent>

          <TabsContent value="topic" className="space-y-4 mt-4">
            <div>
              <Label>Qual tópico você quer resumir?</Label>
              <Input
                placeholder="Ex: Revolução Francesa, Leis de Newton, DNA e RNA..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </TabsContent>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div>
              <Label>Template</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as SummaryTemplate)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUMMARY_TEMPLATES).map(([key, t]) => (
                    <SelectItem key={key} value={key}>
                      {t.emoji} {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nível</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as SummaryDifficulty)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUMMARY_DIFFICULTIES).map(([key, d]) => (
                    <SelectItem key={key} value={key}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Disciplina</Label>
              <Select value={disciplineId} onValueChange={setDisciplineId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_DISCIPLINES.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.emoji} {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 p-3 bg-muted/50 rounded-lg">
            <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Dica:</strong> Seja específico! "Causas da Revolução Francesa" gera um resumo mais focado que apenas "História".
            </p>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full mt-4"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando resumo...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Resumo
              </>
            )}
          </Button>

          {generatedContent && (
            <div className="mt-4 border rounded-lg">
              <div className="p-3 border-b bg-muted/30">
                <h3 className="font-semibold">{generatedContent.title}</h3>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {generatedContent.tags.map(tag => (
                    <span key={tag} className="text-xs text-muted-foreground">#{tag}</span>
                  ))}
                </div>
              </div>
              <ScrollArea className="h-[200px] p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {generatedContent.content}
                </div>
              </ScrollArea>
              <div className="p-3 border-t">
                <Button onClick={handleSave} className="w-full">
                  💾 Salvar Resumo
                </Button>
              </div>
            </div>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
