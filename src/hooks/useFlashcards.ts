import { useState, useEffect, useCallback } from 'react';
import {
  Flashcard,
  Deck,
  FlashcardRating,
  SM2_INITIAL_EASE_FACTOR,
  SM2_MIN_EASE_FACTOR,
  SM2_EASE_BONUS,
  SM2_EASE_PENALTY,
} from '@/types/flashcard';

const DECKS_STORAGE_KEY = 'nomos.flashcards.decks';
const CARDS_STORAGE_KEY = 'nomos.flashcards.cards';

export function useFlashcards() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage
  useEffect(() => {
    const savedDecks = localStorage.getItem(DECKS_STORAGE_KEY);
    const savedCards = localStorage.getItem(CARDS_STORAGE_KEY);
    
    if (savedDecks) setDecks(JSON.parse(savedDecks));
    if (savedCards) setCards(JSON.parse(savedCards));
    setIsLoading(false);
  }, []);

  // Save decks to localStorage
  const saveDecks = useCallback((updatedDecks: Deck[]) => {
    localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(updatedDecks));
    setDecks(updatedDecks);
  }, []);

  // Save cards to localStorage
  const saveCards = useCallback((updatedCards: Flashcard[]) => {
    localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updatedCards));
    setCards(updatedCards);
  }, []);

  // Create deck
  const createDeck = useCallback((
    title: string,
    options?: { description?: string; disciplineId?: string; color?: string; emoji?: string }
  ): Deck => {
    const newDeck: Deck = {
      id: crypto.randomUUID(),
      title,
      description: options?.description,
      disciplineId: options?.disciplineId,
      color: options?.color || 'hsl(200, 70%, 50%)',
      emoji: options?.emoji || '📚',
      cardCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedDecks = [...decks, newDeck];
    saveDecks(updatedDecks);
    return newDeck;
  }, [decks, saveDecks]);

  // Update deck
  const updateDeck = useCallback((id: string, updates: Partial<Deck>) => {
    const updatedDecks = decks.map(deck =>
      deck.id === id
        ? { ...deck, ...updates, updatedAt: new Date().toISOString() }
        : deck
    );
    saveDecks(updatedDecks);
  }, [decks, saveDecks]);

  // Delete deck
  const deleteDeck = useCallback((id: string) => {
    const updatedDecks = decks.filter(deck => deck.id !== id);
    const updatedCards = cards.filter(card => card.deckId !== id);
    saveDecks(updatedDecks);
    saveCards(updatedCards);
  }, [decks, cards, saveDecks, saveCards]);

  // Create flashcard
  const createFlashcard = useCallback((
    deckId: string,
    front: string,
    back: string,
    sourceType: Flashcard['sourceType'] = 'manual',
    sourceNotebookId?: string
  ): Flashcard => {
    const now = new Date().toISOString();
    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      deckId,
      front,
      back,
      sourceType,
      sourceNotebookId,
      nextReview: now, // Due immediately
      interval: 0,
      easeFactor: SM2_INITIAL_EASE_FACTOR,
      repetitions: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    const updatedCards = [...cards, newCard];
    saveCards(updatedCards);
    
    // Update deck card count
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      updateDeck(deckId, { cardCount: deck.cardCount + 1 });
    }
    
    return newCard;
  }, [cards, decks, saveCards, updateDeck]);

  // Update flashcard
  const updateFlashcard = useCallback((id: string, updates: Partial<Flashcard>) => {
    const updatedCards = cards.map(card =>
      card.id === id
        ? { ...card, ...updates, updatedAt: new Date().toISOString() }
        : card
    );
    saveCards(updatedCards);
  }, [cards, saveCards]);

  // Delete flashcard
  const deleteFlashcard = useCallback((id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    
    const updatedCards = cards.filter(c => c.id !== id);
    saveCards(updatedCards);
    
    // Update deck card count
    const deck = decks.find(d => d.id === card.deckId);
    if (deck) {
      updateDeck(card.deckId, { cardCount: Math.max(0, deck.cardCount - 1) });
    }
  }, [cards, decks, saveCards, updateDeck]);

  // SM-2 Algorithm: Calculate next review
  const calculateNextReview = useCallback((
    card: Flashcard,
    rating: FlashcardRating
  ): Pick<Flashcard, 'nextReview' | 'interval' | 'easeFactor' | 'repetitions'> => {
    let { easeFactor, interval, repetitions } = card;
    
    // Rating quality: again=0, hard=1, good=2, easy=3
    const quality = rating === 'again' ? 0 : rating === 'hard' ? 1 : rating === 'good' ? 2 : 3;
    
    if (quality < 2) {
      // Failed review - reset
      repetitions = 0;
      interval = 1;
      
      if (rating === 'again') {
        easeFactor = Math.max(SM2_MIN_EASE_FACTOR, easeFactor - SM2_EASE_PENALTY);
      }
    } else {
      // Successful review
      repetitions += 1;
      
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      
      // Adjust ease factor
      if (rating === 'easy') {
        easeFactor += SM2_EASE_BONUS;
      }
    }
    
    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    
    return {
      nextReview: nextReview.toISOString(),
      interval,
      easeFactor,
      repetitions,
    };
  }, []);

  // Review flashcard
  const reviewFlashcard = useCallback((id: string, rating: FlashcardRating) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    
    const updates = calculateNextReview(card, rating);
    updateFlashcard(id, updates);
  }, [cards, calculateNextReview, updateFlashcard]);

  // Get cards due for review
  const getDueCards = useCallback((deckId?: string): Flashcard[] => {
    const now = new Date();
    return cards
      .filter(card => {
        if (deckId && card.deckId !== deckId) return false;
        return new Date(card.nextReview) <= now;
      })
      .sort((a, b) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime());
  }, [cards]);

  // Get cards by deck
  const getCardsByDeck = useCallback((deckId: string): Flashcard[] => {
    return cards.filter(card => card.deckId === deckId);
  }, [cards]);

  // Get deck due count
  const getDeckDueCount = useCallback((deckId: string): number => {
    return getDueCards(deckId).length;
  }, [getDueCards]);

  // Get total due count
  const getTotalDueCount = useCallback((): number => {
    return getDueCards().length;
  }, [getDueCards]);

  // Get deck by ID
  const getDeckById = useCallback((id: string): Deck | undefined => {
    return decks.find(d => d.id === id);
  }, [decks]);

  // Get decks by discipline
  const getDecksByDiscipline = useCallback((disciplineId?: string): Deck[] => {
    if (!disciplineId) return decks.filter(d => !d.disciplineId);
    return decks.filter(d => d.disciplineId === disciplineId);
  }, [decks]);

  // Create multiple flashcards at once (for AI generation)
  const createMultipleFlashcards = useCallback((
    deckId: string,
    cardsData: Array<{ front: string; back: string }>
  ): Flashcard[] => {
    const now = new Date().toISOString();
    const newCards: Flashcard[] = cardsData.map(data => ({
      id: crypto.randomUUID(),
      deckId,
      front: data.front,
      back: data.back,
      sourceType: 'ai' as const,
      nextReview: now,
      interval: 0,
      easeFactor: SM2_INITIAL_EASE_FACTOR,
      repetitions: 0,
      createdAt: now,
      updatedAt: now,
    }));

    const updatedCards = [...cards, ...newCards];
    saveCards(updatedCards);

    // Update deck card count
    const deck = decks.find(d => d.id === deckId);
    if (deck) {
      updateDeck(deckId, { cardCount: deck.cardCount + newCards.length });
    }

    return newCards;
  }, [cards, decks, saveCards, updateDeck]);

  return {
    decks,
    cards,
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
    getDeckById,
    getDecksByDiscipline,
  };
}
