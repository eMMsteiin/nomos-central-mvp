import { motion } from 'framer-motion';
import { Plus, Play, MoreVertical, Trash2, Edit, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Deck, DEFAULT_DISCIPLINES } from '@/types/flashcard';
import { cn } from '@/lib/utils';

interface DeckListProps {
  decks: Deck[];
  getDueCount: (deckId: string) => number;
  onSelectDeck: (deck: Deck) => void;
  onStudyDeck: (deck: Deck) => void;
  onDeleteDeck: (deckId: string) => void;
  onCreateDeck: () => void;
}

export function DeckList({
  decks,
  getDueCount,
  onSelectDeck,
  onStudyDeck,
  onDeleteDeck,
  onCreateDeck,
}: DeckListProps) {
  const getDisciplineName = (disciplineId?: string) => {
    if (!disciplineId) return null;
    return DEFAULT_DISCIPLINES.find(d => d.id === disciplineId)?.name;
  };

  if (decks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Layers className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Nenhum baralho ainda</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">
          Crie seu primeiro baralho de flashcards para começar a estudar com repetição espaçada.
        </p>
        <Button onClick={onCreateDeck}>
          <Plus className="w-4 h-4 mr-2" />
          Criar baralho
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {decks.map((deck, index) => {
        const dueCount = getDueCount(deck.id);
        const disciplineName = getDisciplineName(deck.disciplineId);

        return (
          <motion.div
            key={deck.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className="group cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden"
              onClick={() => onSelectDeck(deck)}
            >
              {/* Color bar */}
              <div className="h-2" style={{ backgroundColor: deck.color }} />
              
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{deck.emoji}</span>
                    <div>
                      <h3 className="font-semibold line-clamp-1">{deck.title}</h3>
                      {disciplineName && (
                        <p className="text-xs text-muted-foreground">{disciplineName}</p>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onSelectDeck(deck);
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Ver cards
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDeck(deck.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {deck.cardCount} {deck.cardCount === 1 ? 'card' : 'cards'}
                  </div>
                  
                  {dueCount > 0 ? (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStudyDeck(deck);
                      }}
                      className="gap-1"
                    >
                      <Play className="w-3 h-3" />
                      {dueCount} para revisar
                    </Button>
                  ) : (
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      deck.cardCount > 0
                        ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {deck.cardCount > 0 ? 'Em dia ✓' : 'Vazio'}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* Add deck card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: decks.length * 0.05 }}
      >
        <Card
          className="cursor-pointer hover:shadow-md transition-all duration-200 border-dashed h-full min-h-[140px] flex items-center justify-center"
          onClick={onCreateDeck}
        >
          <CardContent className="flex flex-col items-center gap-2 p-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Novo baralho</span>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
