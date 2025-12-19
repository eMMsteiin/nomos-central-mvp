import { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, Play, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFlashcards } from '@/hooks/useFlashcards';
import { DeckList } from '@/components/flashcards/DeckList';
import { DeckDetail } from '@/components/flashcards/DeckDetail';
import { StudySession } from '@/components/flashcards/StudySession';
import { CreateDeckDialog } from '@/components/flashcards/CreateDeckDialog';
import { CreateFlashcardDialog } from '@/components/flashcards/CreateFlashcardDialog';
import { GenerateFlashcardsDialog } from '@/components/flashcards/GenerateFlashcardsDialog';
import { EditFlashcardDialog } from '@/components/flashcards/EditFlashcardDialog';
import { EditDeckDialog } from '@/components/flashcards/EditDeckDialog';
import { Deck, Flashcard } from '@/types/flashcard';
import { toast } from 'sonner';

type ViewMode = 'list' | 'detail' | 'study';

export default function Flashcards() {
  const {
    decks,
    isLoading,
    createDeck,
    updateDeck,
    deleteDeck,
    createFlashcard,
    createMultipleFlashcards,
    updateFlashcard,
    deleteFlashcard,
    reviewFlashcard,
    getDueCards,
    getCardsByDeck,
    getDeckDueCount,
    getTotalDueCount,
    startSession,
    endSession,
  } = useFlashcards();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [isCreateCardOpen, setIsCreateCardOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isEditCardOpen, setIsEditCardOpen] = useState(false);
  const [isEditDeckOpen, setIsEditDeckOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<Flashcard | null>(null);

  const totalDue = getTotalDueCount();

  const handleSelectDeck = (deck: Deck) => {
    setSelectedDeck(deck);
    setViewMode('detail');
  };

  const handleStudyDeck = (deck: Deck) => {
    setSelectedDeck(deck);
    setViewMode('study');
  };

  const handleStudyAll = () => {
    setSelectedDeck({
      id: 'all',
      title: 'Todos os cards',
      emoji: '🧠',
      color: 'hsl(260, 60%, 55%)',
      cardCount: totalDue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setViewMode('study');
  };

  const handleBackToList = () => {
    setSelectedDeck(null);
    setViewMode('list');
  };

  const handleCreateDeck = async (
    title: string,
    options?: { description?: string; disciplineId?: string; color?: string; emoji?: string }
  ) => {
    try {
      await createDeck(title, options);
      toast.success('Baralho criado com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar baralho');
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    try {
      await deleteDeck(deckId);
      toast.success('Baralho excluído');
    } catch (error) {
      toast.error('Erro ao excluir baralho');
    }
  };

  const handleCreateFlashcard = async (front: string, back: string) => {
    if (!selectedDeck) return;
    try {
      await createFlashcard(selectedDeck.id, front, back);
      toast.success('Card criado!');
    } catch (error) {
      toast.error('Erro ao criar card');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await deleteFlashcard(cardId);
      toast.success('Card excluído');
    } catch (error) {
      toast.error('Erro ao excluir card');
    }
  };

  const handleGenerateFlashcards = async (cardsData: Array<{ front: string; back: string }>) => {
    if (!selectedDeck) return;
    try {
      await createMultipleFlashcards(selectedDeck.id, cardsData);
    } catch (error) {
      toast.error('Erro ao criar cards');
    }
  };

  const handleEditCard = (card: Flashcard) => {
    setCardToEdit(card);
    setIsEditCardOpen(true);
  };

  const handleSaveCard = async (id: string, front: string, back: string) => {
    try {
      await updateFlashcard(id, { front, back });
      toast.success('Card atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar card');
    }
  };

  const handleSaveDeck = async (id: string, updates: Partial<Deck>) => {
    try {
      await updateDeck(id, updates);
      // Update local selected deck
      if (selectedDeck && selectedDeck.id === id) {
        setSelectedDeck({ ...selectedDeck, ...updates });
      }
      toast.success('Baralho atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar baralho');
    }
  };

  const handleSessionStart = async () => {
    return startSession(selectedDeck?.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Study mode
  if (viewMode === 'study' && selectedDeck) {
    const studyCards = selectedDeck.id === 'all'
      ? getDueCards()
      : getDueCards(selectedDeck.id);

    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto min-h-[calc(100vh-4rem)]">
        <StudySession
          deck={selectedDeck}
          cards={studyCards}
          onReview={reviewFlashcard}
          onClose={handleBackToList}
          onSessionStart={handleSessionStart}
          onSessionEnd={endSession}
        />
      </div>
    );
  }

  // Deck detail mode
  if (viewMode === 'detail' && selectedDeck) {
    const deckCards = getCardsByDeck(selectedDeck.id);
    const dueCount = getDeckDueCount(selectedDeck.id);

    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <DeckDetail
          deck={selectedDeck}
          cards={deckCards}
          dueCount={dueCount}
          onBack={handleBackToList}
          onStudy={() => setViewMode('study')}
          onAddCard={() => setIsCreateCardOpen(true)}
          onGenerateWithAI={() => setIsGenerateDialogOpen(true)}
          onDeleteCard={handleDeleteCard}
          onEditCard={handleEditCard}
          onEditDeck={() => setIsEditDeckOpen(true)}
        />
        <CreateFlashcardDialog
          open={isCreateCardOpen}
          onOpenChange={setIsCreateCardOpen}
          deckTitle={selectedDeck.title}
          onCreateFlashcard={handleCreateFlashcard}
        />
        <GenerateFlashcardsDialog
          open={isGenerateDialogOpen}
          onOpenChange={setIsGenerateDialogOpen}
          deckTitle={selectedDeck.title}
          onSaveCards={handleGenerateFlashcards}
        />
        <EditFlashcardDialog
          open={isEditCardOpen}
          onOpenChange={setIsEditCardOpen}
          flashcard={cardToEdit}
          onSave={handleSaveCard}
        />
        <EditDeckDialog
          open={isEditDeckOpen}
          onOpenChange={setIsEditDeckOpen}
          deck={selectedDeck}
          onSave={handleSaveDeck}
        />
      </div>
    );
  }

  // List mode (default)
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Flashcards</h1>
              <p className="text-muted-foreground">
                {decks.length} {decks.length === 1 ? 'baralho' : 'baralhos'} • {totalDue} para revisar
              </p>
            </div>
          </div>

          {totalDue > 0 && (
            <Button onClick={handleStudyAll} size="lg" className="gap-2">
              <Play className="w-4 h-4" />
              Estudar tudo ({totalDue})
            </Button>
          )}
        </div>
      </motion.div>

      {/* Quick stats */}
      {decks.length > 0 && totalDue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            <div>
              <p className="font-medium">
                Você tem {totalDue} {totalDue === 1 ? 'card' : 'cards'} para revisar hoje!
              </p>
              <p className="text-sm text-muted-foreground">
                A repetição espaçada ajuda a memorizar melhor. Não deixe acumular!
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Deck list */}
      <DeckList
        decks={decks}
        getDueCount={getDeckDueCount}
        onSelectDeck={handleSelectDeck}
        onStudyDeck={handleStudyDeck}
        onDeleteDeck={handleDeleteDeck}
        onCreateDeck={() => setIsCreateDeckOpen(true)}
      />

      {/* Create deck dialog */}
      <CreateDeckDialog
        open={isCreateDeckOpen}
        onOpenChange={setIsCreateDeckOpen}
        onCreateDeck={handleCreateDeck}
      />
    </div>
  );
}
