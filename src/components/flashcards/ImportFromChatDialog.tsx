import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Deck, DECK_COLORS, DECK_EMOJIS } from '@/types/flashcard';
import { Check, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingFlashcards {
  subject: string;
  flashcards: Array<{ front: string; back: string }>;
}

interface ImportFromChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingData: PendingFlashcards | null;
  decks: Deck[];
  onImport: (deckId: string) => Promise<void>;
  onCreateDeckAndImport: (title: string, color: string, emoji: string) => Promise<void>;
  onCancel: () => void;
}

export function ImportFromChatDialog({
  open,
  onOpenChange,
  pendingData,
  decks,
  onImport,
  onCreateDeckAndImport,
  onCancel,
}: ImportFromChatDialogProps) {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckColor, setNewDeckColor] = useState(DECK_COLORS[0]);
  const [newDeckEmoji, setNewDeckEmoji] = useState(DECK_EMOJIS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  if (!pendingData) return null;

  const handleImport = async () => {
    if (!selectedDeckId) return;
    setIsLoading(true);
    try {
      await onImport(selectedDeckId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAndImport = async () => {
    if (!newDeckTitle.trim()) return;
    setIsLoading(true);
    try {
      await onCreateDeckAndImport(newDeckTitle.trim(), newDeckColor, newDeckEmoji);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Flashcards do Chat NOMOS
          </DialogTitle>
          <DialogDescription>
            {pendingData.flashcards.length} flashcards sobre "{pendingData.subject}" foram gerados. 
            Escolha onde salvá-los.
          </DialogDescription>
        </DialogHeader>

        {/* Preview toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-xs"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? 'Ocultar preview' : 'Ver preview dos cards'}
        </Button>

        {/* Preview dos flashcards */}
        {showPreview && (
          <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-3">
            <div className="space-y-2">
              {pendingData.flashcards.slice(0, 5).map((card, idx) => (
                <div key={idx} className="p-2 rounded-md bg-background border text-sm">
                  <p className="font-medium text-foreground">{card.front}</p>
                  <p className="text-muted-foreground text-xs mt-1">{card.back}</p>
                </div>
              ))}
              {pendingData.flashcards.length > 5 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{pendingData.flashcards.length - 5} mais...
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Tabs para escolher modo */}
        <div className="flex gap-2 border-b">
          <button
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              mode === 'select'
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode('select')}
          >
            Escolher baralho
          </button>
          <button
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              mode === 'create'
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode('create')}
          >
            Criar novo
          </button>
        </div>

        {/* Modo: Selecionar baralho existente */}
        {mode === 'select' && (
          <div className="space-y-2">
            {decks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>Nenhum baralho encontrado.</p>
                <Button
                  variant="link"
                  onClick={() => setMode('create')}
                  className="mt-2"
                >
                  Criar um novo baralho
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-2 pr-2">
                  {decks.map((deck) => (
                    <button
                      key={deck.id}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3",
                        selectedDeckId === deck.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedDeckId(deck.id)}
                    >
                      <span
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${deck.color}20` }}
                      >
                        {deck.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{deck.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {deck.cardCount} cards
                        </p>
                      </div>
                      {selectedDeckId === deck.id && (
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Modo: Criar novo baralho */}
        {mode === 'create' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deck-title">Nome do baralho</Label>
              <Input
                id="deck-title"
                placeholder={pendingData.subject || "Ex: Cálculo I"}
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-2">
                {DECK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all",
                      newDeckEmoji === emoji
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "bg-muted hover:bg-muted/80"
                    )}
                    onClick={() => setNewDeckEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {DECK_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      newDeckColor === color
                        ? "ring-2 ring-offset-2 ring-primary"
                        : "hover:scale-110"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewDeckColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          {mode === 'select' ? (
            <Button
              onClick={handleImport}
              disabled={!selectedDeckId || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Check className="w-4 h-4" />
              )}
              Importar aqui
            </Button>
          ) : (
            <Button
              onClick={handleCreateAndImport}
              disabled={!newDeckTitle.trim() || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Criar e importar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
