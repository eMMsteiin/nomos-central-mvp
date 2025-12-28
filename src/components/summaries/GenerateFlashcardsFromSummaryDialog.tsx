import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Summary } from '@/types/summary';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';

interface GenerateFlashcardsFromSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: Summary | null;
  onSuccess: (deckId: string, cardCount: number) => void;
}

type Step = 'config' | 'generating' | 'success' | 'error';

export function GenerateFlashcardsFromSummaryDialog({
  open,
  onOpenChange,
  summary,
  onSuccess,
}: GenerateFlashcardsFromSummaryDialogProps) {
  const { userId } = useAuthContext();
  const [step, setStep] = useState<Step>('config');
  const [deckName, setDeckName] = useState('');
  const [maxCards, setMaxCards] = useState(8);
  const [generatedCards, setGeneratedCards] = useState<Array<{ front: string; back: string }>>([]);
  const [error, setError] = useState('');

  // Reset when dialog opens with new summary
  useEffect(() => {
    if (open && summary) {
      setDeckName(`${summary.subject} - ${summary.type === 'exam' ? 'Prova' : 'Estudo'}`);
      setMaxCards(8);
      setStep('config');
      setError('');
      setGeneratedCards([]);
    }
  }, [open, summary]);

  const handleGenerate = async () => {
    if (!summary) return;
    
    setStep('generating');
    setError('');

    try {
      // Call edge function to generate flashcards from summary content
      const { data, error: fnError } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          text: summary.content,
          mode: 'text',
          maxCards,
        }
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const flashcards = data.flashcards || [];
      
      if (flashcards.length === 0) {
        throw new Error('Nenhum flashcard foi gerado. Tente com um resumo mais detalhado.');
      }

      setGeneratedCards(flashcards);

      // Use authenticated user ID
      if (!userId) throw new Error('Usuário não autenticado');

      // Create a new deck
      const deckId = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error: deckError } = await supabase.from('flashcard_decks').insert({
        id: deckId,
        user_id: userId,
        title: deckName,
        description: `Gerado a partir do resumo: ${summary.title}`,
        color: summary.color || 'hsl(260, 60%, 55%)',
        emoji: summary.type === 'exam' ? '📝' : '📚',
      });

      if (deckError) throw deckError;

      // Insert all flashcards
      const cardsToInsert = flashcards.map((card: { front: string; back: string }) => ({
        id: crypto.randomUUID(),
        deck_id: deckId,
        user_id: userId,
        front: card.front,
        back: card.back,
        source_type: 'ai',
        next_review: now,
        interval_days: 0,
        ease_factor: 2.5,
        repetitions: 0,
      }));

      const { error: cardsError } = await supabase.from('flashcards').insert(cardsToInsert);

      if (cardsError) throw cardsError;

      setStep('success');
      
      // Notify success after a brief delay
      setTimeout(() => {
        onSuccess(deckId, flashcards.length);
      }, 1500);

    } catch (err) {
      console.error('Error generating flashcards:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar flashcards');
      setStep('error');
    }
  };

  const handleClose = () => {
    if (step !== 'generating') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerar Flashcards
          </DialogTitle>
          <DialogDescription>
            {summary && `A partir de: "${summary.title}"`}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="deckName">Nome do baralho</Label>
                <Input
                  id="deckName"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="Ex: Direito Civil - Contratos"
                />
              </div>

              <div className="space-y-3">
                <Label>Quantidade de cards: {maxCards}</Label>
                <Slider
                  value={[maxCards]}
                  onValueChange={([value]) => setMaxCards(value)}
                  min={3}
                  max={15}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  A IA irá gerar até {maxCards} flashcards baseados no conteúdo do resumo.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleGenerate} className="flex-1 gap-2">
                  <Sparkles className="w-4 h-4" />
                  Gerar
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-12 flex flex-col items-center gap-4"
            >
              <div className="relative">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-medium">Gerando flashcards...</p>
                <p className="text-sm text-muted-foreground">
                  A IA está analisando o resumo
                </p>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-12 flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-center">
                <p className="font-medium text-lg">
                  {generatedCards.length} flashcards criados!
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecionando para o baralho...
                </p>
              </div>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-8 flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div className="text-center">
                <p className="font-medium">Erro ao gerar</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <div className="flex gap-3 w-full pt-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Fechar
                </Button>
                <Button onClick={() => setStep('config')} className="flex-1">
                  Tentar novamente
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
