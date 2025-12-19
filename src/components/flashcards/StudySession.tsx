import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, X, Check, Zap, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FlashcardViewer } from './FlashcardViewer';
import { Flashcard, FlashcardRating, Deck } from '@/types/flashcard';
import { cn } from '@/lib/utils';

interface StudySessionProps {
  deck: Deck;
  cards: Flashcard[];
  onReview: (cardId: string, rating: FlashcardRating) => void;
  onClose: () => void;
  onSessionStart?: () => Promise<string | null>;
  onSessionEnd?: (sessionId: string, stats: {
    cardsReviewed: number;
    cardsCorrect: number;
    ratingDistribution: Record<FlashcardRating, number>;
  }) => Promise<void>;
}

const RATING_BUTTONS: { rating: FlashcardRating; label: string; icon: React.ReactNode; color: string }[] = [
  { rating: 'again', label: 'De novo', icon: <RotateCcw className="w-4 h-4" />, color: 'bg-red-500 hover:bg-red-600' },
  { rating: 'hard', label: 'Difícil', icon: <X className="w-4 h-4" />, color: 'bg-orange-500 hover:bg-orange-600' },
  { rating: 'good', label: 'Bom', icon: <Check className="w-4 h-4" />, color: 'bg-green-500 hover:bg-green-600' },
  { rating: 'easy', label: 'Fácil', icon: <Zap className="w-4 h-4" />, color: 'bg-blue-500 hover:bg-blue-600' },
];

export function StudySession({ 
  deck, 
  cards, 
  onReview, 
  onClose,
  onSessionStart,
  onSessionEnd,
}: StudySessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [stats, setStats] = useState<Record<FlashcardRating, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [sessionId, setSessionId] = useState<string | null>(null);

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;

  // Start session on mount
  useEffect(() => {
    if (onSessionStart && cards.length > 0) {
      onSessionStart().then(id => setSessionId(id));
    }
  }, []);

  const handleFlip = useCallback(() => {
    setIsFlipped(true);
  }, []);

  const handleRating = useCallback(async (rating: FlashcardRating) => {
    if (!currentCard) return;

    onReview(currentCard.id, rating);
    
    const newStats = { ...stats, [rating]: stats[rating] + 1 };
    setStats(newStats);
    setReviewedCount(prev => prev + 1);
    setIsFlipped(false);

    if (currentIndex < cards.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 200);
    } else {
      setIsComplete(true);
      
      // End session
      if (onSessionEnd && sessionId) {
        const cardsCorrect = newStats.good + newStats.easy;
        await onSessionEnd(sessionId, {
          cardsReviewed: reviewedCount + 1,
          cardsCorrect,
          ratingDistribution: newStats,
        });
      }
    }
  }, [currentCard, currentIndex, cards.length, onReview, stats, sessionId, onSessionEnd, reviewedCount]);

  const handleClose = useCallback(async () => {
    // End session early if leaving
    if (onSessionEnd && sessionId && reviewedCount > 0 && !isComplete) {
      const cardsCorrect = stats.good + stats.easy;
      await onSessionEnd(sessionId, {
        cardsReviewed: reviewedCount,
        cardsCorrect,
        ratingDistribution: stats,
      });
    }
    onClose();
  }, [onSessionEnd, sessionId, reviewedCount, isComplete, stats, onClose]);

  if (cards.length === 0 || !currentCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Brain className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Nenhum card para revisar!</h2>
        <p className="text-muted-foreground">Todos os cards deste baralho estão em dia.</p>
        <Button onClick={onClose}>Voltar</Button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
      >
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-semibold">Sessão completa! 🎉</h2>
        <p className="text-muted-foreground">
          Você revisou {reviewedCount} cards
        </p>
        
        <div className="grid grid-cols-4 gap-4 mt-4">
          {RATING_BUTTONS.map(({ rating, label, color }) => (
            <div key={rating} className="text-center">
              <div className={cn('w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white', color.split(' ')[0])}>
                {stats[rating]}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        <Button onClick={onClose} className="mt-4">
          Voltar ao baralho
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={handleClose}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Sair
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
      </div>

      {/* Progress */}
      <Progress value={progress} className="mb-6 h-2" />

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-md"
          >
            <FlashcardViewer
              front={currentCard.front}
              back={currentCard.back}
              color={deck.color}
              isFlipped={isFlipped}
              onFlip={handleFlip}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rating buttons */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-6 pb-6"
          >
            <p className="text-center text-sm text-muted-foreground mb-3">
              Como foi?
            </p>
            <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
              {RATING_BUTTONS.map(({ rating, label, icon, color }) => (
                <Button
                  key={rating}
                  onClick={() => handleRating(rating)}
                  className={cn('flex flex-col gap-1 h-auto py-3 text-white', color)}
                >
                  {icon}
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isFlipped && (
        <div className="mt-6 pb-6 text-center">
          <p className="text-sm text-muted-foreground">
            Toque no card para ver a resposta
          </p>
        </div>
      )}
    </div>
  );
}
