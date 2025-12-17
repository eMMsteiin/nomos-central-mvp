import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Play, Trash2, MoreVertical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Deck, Flashcard } from '@/types/flashcard';
import { cn } from '@/lib/utils';

interface DeckDetailProps {
  deck: Deck;
  cards: Flashcard[];
  dueCount: number;
  onBack: () => void;
  onStudy: () => void;
  onAddCard: () => void;
  onGenerateWithAI: () => void;
  onDeleteCard: (cardId: string) => void;
}

export function DeckDetail({
  deck,
  cards,
  dueCount,
  onBack,
  onStudy,
  onAddCard,
  onGenerateWithAI,
  onDeleteCard,
}: DeckDetailProps) {
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  const handleDeleteConfirm = () => {
    if (cardToDelete) {
      onDeleteCard(cardToDelete);
      setCardToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{deck.emoji}</span>
            <div>
              <h1 className="text-2xl font-bold">{deck.title}</h1>
              {deck.description && (
                <p className="text-sm text-muted-foreground">{deck.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={onAddCard}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar card
          </Button>
          <Button variant="outline" onClick={onGenerateWithAI}>
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar com IA
          </Button>
          {dueCount > 0 && (
            <Button onClick={onStudy}>
              <Play className="w-4 h-4 mr-2" />
              Estudar ({dueCount})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{cards.length}</p>
            <p className="text-sm text-muted-foreground">Total de cards</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={cn('text-3xl font-bold', dueCount > 0 ? 'text-orange-500' : 'text-green-500')}>
              {dueCount}
            </p>
            <p className="text-sm text-muted-foreground">Para revisar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{cards.length - dueCount}</p>
            <p className="text-sm text-muted-foreground">Em dia</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards list */}
      {cards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16"
        >
          <p className="text-muted-foreground mb-4">
            Este baralho ainda não tem cards.
          </p>
          <Button onClick={onAddCard}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar primeiro card
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Cards ({cards.length})</h2>
          <div className="grid gap-3">
            {cards.map((card, index) => {
              const isDue = new Date(card.nextReview) <= new Date();
              
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            'w-2 h-full min-h-[60px] rounded-full shrink-0',
                            isDue ? 'bg-orange-500' : 'bg-green-500'
                          )}
                        />
                        <div className="flex-1 min-w-0 grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Frente</p>
                            <p className="font-medium line-clamp-2">{card.front}</p>
                          </div>
                          <div className="group/answer">
                            <p className="text-xs text-muted-foreground mb-1">Verso <span className="text-[10px] opacity-50">(passe o mouse)</span></p>
                            <p className="text-muted-foreground line-clamp-2 blur-sm group-hover/answer:blur-none transition-all cursor-pointer select-none">{card.back}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setCardToDelete(card.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir card
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir card?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O card será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
