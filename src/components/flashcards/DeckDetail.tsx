import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Play, Trash2, MoreVertical, Sparkles, Pencil, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  onEditCard: (card: Flashcard) => void;
  onEditDeck: () => void;
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
  onEditCard,
  onEditDeck,
}: DeckDetailProps) {
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const handleDeleteConfirm = () => {
    if (cardToDelete) {
      onDeleteCard(cardToDelete);
      setCardToDelete(null);
    }
  };

  const toggleReveal = (cardId: string) => {
    setRevealedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const toggleExpand = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
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
          <Button variant="outline" size="icon" onClick={onEditDeck}>
            <Pencil className="w-4 h-4" />
          </Button>
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
              const isRevealed = revealedCards.has(card.id);
              const isExpanded = expandedCards.has(card.id);
              const needsExpand = card.front.length > 100 || card.back.length > 100;

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
                        <Collapsible 
                          open={isExpanded} 
                          onOpenChange={() => needsExpand && toggleExpand(card.id)}
                          className="flex-1 min-w-0"
                        >
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Frente</p>
                              <CollapsibleContent forceMount>
                                <p className={cn(
                                  "font-medium",
                                  !isExpanded && needsExpand && "line-clamp-2"
                                )}>
                                  {card.front}
                                </p>
                              </CollapsibleContent>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs text-muted-foreground">Verso</p>
                                <button
                                  onClick={() => toggleReveal(card.id)}
                                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                >
                                  {isRevealed ? (
                                    <>
                                      <EyeOff className="w-3 h-3" />
                                      Ocultar
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3 h-3" />
                                      Revelar
                                    </>
                                  )}
                                </button>
                              </div>
                              <CollapsibleContent forceMount>
                                <p className={cn(
                                  "text-muted-foreground transition-all cursor-pointer select-none",
                                  !isRevealed && "blur-sm",
                                  !isExpanded && needsExpand && "line-clamp-2"
                                )}
                                onClick={() => toggleReveal(card.id)}
                                >
                                  {card.back}
                                </p>
                              </CollapsibleContent>
                            </div>
                          </div>
                          {needsExpand && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="mt-2 h-6 text-xs">
                                {isExpanded ? 'Ver menos' : 'Ver mais'}
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </Collapsible>
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
                            <DropdownMenuItem onClick={() => onEditCard(card)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar card
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
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
