import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceId } from './useDeviceId';
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
const MIGRATION_KEY = 'nomos.flashcards.migrated';

export function useFlashcards() {
  const deviceId = useDeviceId();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());

  // Load from database
  useEffect(() => {
    if (!deviceId) return;
    loadFromDatabase();
  }, [deviceId]);

  const loadFromDatabase = async () => {
    try {
      setIsLoading(true);

      // Check if migration is needed
      const migrated = localStorage.getItem(MIGRATION_KEY);
      if (!migrated) {
        await migrateFromLocalStorage();
      }

      // Load decks
      const { data: dbDecks, error: decksError } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('user_id', deviceId)
        .order('created_at', { ascending: false });

      if (decksError) throw decksError;

      // Load cards
      const { data: dbCards, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', deviceId);

      if (cardsError) throw cardsError;

      // Transform db format to app format
      const transformedDecks: Deck[] = (dbDecks || []).map(d => ({
        id: d.id,
        title: d.title,
        description: d.description || undefined,
        disciplineId: d.discipline_id || undefined,
        color: d.color || 'hsl(200, 70%, 50%)',
        emoji: d.emoji || '📚',
        cardCount: 0, // Will be calculated
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));

      const transformedCards: Flashcard[] = (dbCards || []).map(c => ({
        id: c.id,
        deckId: c.deck_id,
        front: c.front,
        back: c.back,
        sourceType: (c.source_type || 'manual') as Flashcard['sourceType'],
        sourceNotebookId: c.source_notebook_id || undefined,
        nextReview: c.next_review,
        interval: c.interval_days,
        easeFactor: Number(c.ease_factor),
        repetitions: c.repetitions,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      // Calculate card counts
      transformedDecks.forEach(deck => {
        deck.cardCount = transformedCards.filter(c => c.deckId === deck.id).length;
      });

      setDecks(transformedDecks);
      setCards(transformedCards);

      // Update localStorage cache
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(transformedDecks));
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(transformedCards));
    } catch (error) {
      console.error('Error loading flashcards from database:', error);
      // Fallback to localStorage
      const savedDecks = localStorage.getItem(DECKS_STORAGE_KEY);
      const savedCards = localStorage.getItem(CARDS_STORAGE_KEY);
      if (savedDecks) setDecks(JSON.parse(savedDecks));
      if (savedCards) setCards(JSON.parse(savedCards));
    } finally {
      setIsLoading(false);
    }
  };

  const migrateFromLocalStorage = async () => {
    try {
      const savedDecks = localStorage.getItem(DECKS_STORAGE_KEY);
      const savedCards = localStorage.getItem(CARDS_STORAGE_KEY);

      if (!savedDecks && !savedCards) {
        localStorage.setItem(MIGRATION_KEY, 'true');
        return;
      }

      const localDecks: Deck[] = savedDecks ? JSON.parse(savedDecks) : [];
      const localCards: Flashcard[] = savedCards ? JSON.parse(savedCards) : [];

      if (localDecks.length === 0 && localCards.length === 0) {
        localStorage.setItem(MIGRATION_KEY, 'true');
        return;
      }

      console.log('Migrating flashcards from localStorage...', { decks: localDecks.length, cards: localCards.length });

      // Migrate decks
      for (const deck of localDecks) {
        const { error } = await supabase.from('flashcard_decks').insert({
          id: deck.id,
          user_id: deviceId,
          title: deck.title,
          description: deck.description || null,
          discipline_id: deck.disciplineId || null,
          color: deck.color,
          emoji: deck.emoji,
          created_at: deck.createdAt,
          updated_at: deck.updatedAt,
        });
        
        if (error && error.code !== '23505') { // Ignore duplicate key errors
          console.error('Error migrating deck:', error);
        }
      }

      // Migrate cards
      for (const card of localCards) {
        const { error } = await supabase.from('flashcards').insert({
          id: card.id,
          deck_id: card.deckId,
          user_id: deviceId,
          front: card.front,
          back: card.back,
          source_type: card.sourceType,
          source_notebook_id: card.sourceNotebookId || null,
          next_review: card.nextReview,
          interval_days: card.interval,
          ease_factor: card.easeFactor,
          repetitions: card.repetitions,
          created_at: card.createdAt,
          updated_at: card.updatedAt,
        });
        
        if (error && error.code !== '23505') {
          console.error('Error migrating card:', error);
        }
      }

      localStorage.setItem(MIGRATION_KEY, 'true');
      console.log('Migration complete!');
    } catch (error) {
      console.error('Error during migration:', error);
    }
  };

  // Create deck
  const createDeck = useCallback(async (
    title: string,
    options?: { description?: string; disciplineId?: string; color?: string; emoji?: string }
  ): Promise<Deck> => {
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

    // Save to database
    const { error } = await supabase.from('flashcard_decks').insert({
      id: newDeck.id,
      user_id: deviceId,
      title: newDeck.title,
      description: newDeck.description || null,
      discipline_id: newDeck.disciplineId || null,
      color: newDeck.color,
      emoji: newDeck.emoji,
    });

    if (error) {
      console.error('Error creating deck:', error);
      throw error;
    }

    setDecks(prev => {
      const updated = [...prev, newDeck];
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    return newDeck;
  }, [deviceId]);

  // Update deck
  const updateDeck = useCallback(async (id: string, updates: Partial<Deck>) => {
    const { error } = await supabase
      .from('flashcard_decks')
      .update({
        title: updates.title,
        description: updates.description || null,
        discipline_id: updates.disciplineId || null,
        color: updates.color,
        emoji: updates.emoji,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', deviceId);

    if (error) {
      console.error('Error updating deck:', error);
      throw error;
    }

    setDecks(prev => {
      const updated = prev.map(deck =>
        deck.id === id
          ? { ...deck, ...updates, updatedAt: new Date().toISOString() }
          : deck
      );
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [deviceId]);

  // Delete deck
  const deleteDeck = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('flashcard_decks')
      .delete()
      .eq('id', id)
      .eq('user_id', deviceId);

    if (error) {
      console.error('Error deleting deck:', error);
      throw error;
    }

    setDecks(prev => {
      const updated = prev.filter(deck => deck.id !== id);
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setCards(prev => {
      const updated = prev.filter(card => card.deckId !== id);
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [deviceId]);

  // Create flashcard
  const createFlashcard = useCallback(async (
    deckId: string,
    front: string,
    back: string,
    sourceType: Flashcard['sourceType'] = 'manual',
    sourceNotebookId?: string
  ): Promise<Flashcard> => {
    const now = new Date().toISOString();
    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      deckId,
      front,
      back,
      sourceType,
      sourceNotebookId,
      nextReview: now,
      interval: 0,
      easeFactor: SM2_INITIAL_EASE_FACTOR,
      repetitions: 0,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('flashcards').insert({
      id: newCard.id,
      deck_id: deckId,
      user_id: deviceId,
      front: newCard.front,
      back: newCard.back,
      source_type: sourceType,
      source_notebook_id: sourceNotebookId || null,
      next_review: now,
      interval_days: 0,
      ease_factor: SM2_INITIAL_EASE_FACTOR,
      repetitions: 0,
    });

    if (error) {
      console.error('Error creating flashcard:', error);
      throw error;
    }

    setCards(prev => {
      const updated = [...prev, newCard];
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Update deck card count
    setDecks(prev => {
      const updated = prev.map(deck =>
        deck.id === deckId ? { ...deck, cardCount: deck.cardCount + 1 } : deck
      );
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    return newCard;
  }, [deviceId]);

  // Update flashcard
  const updateFlashcard = useCallback(async (id: string, updates: Partial<Flashcard>) => {
    const { error } = await supabase
      .from('flashcards')
      .update({
        front: updates.front,
        back: updates.back,
        next_review: updates.nextReview,
        interval_days: updates.interval,
        ease_factor: updates.easeFactor,
        repetitions: updates.repetitions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', deviceId);

    if (error) {
      console.error('Error updating flashcard:', error);
      throw error;
    }

    setCards(prev => {
      const updated = prev.map(card =>
        card.id === id
          ? { ...card, ...updates, updatedAt: new Date().toISOString() }
          : card
      );
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [deviceId]);

  // Delete flashcard
  const deleteFlashcard = useCallback(async (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', id)
      .eq('user_id', deviceId);

    if (error) {
      console.error('Error deleting flashcard:', error);
      throw error;
    }

    setCards(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Update deck card count
    setDecks(prev => {
      const updated = prev.map(deck =>
        deck.id === card.deckId
          ? { ...deck, cardCount: Math.max(0, deck.cardCount - 1) }
          : deck
      );
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [cards, deviceId]);

  // SM-2 Algorithm: Calculate next review (unchanged logic)
  const calculateNextReview = useCallback((
    card: Flashcard,
    rating: FlashcardRating
  ): Pick<Flashcard, 'nextReview' | 'interval' | 'easeFactor' | 'repetitions'> => {
    let { easeFactor, interval, repetitions } = card;

    const quality = rating === 'again' ? 0 : rating === 'hard' ? 1 : rating === 'good' ? 2 : 3;

    if (quality < 2) {
      repetitions = 0;
      interval = 1;
      if (rating === 'again') {
        easeFactor = Math.max(SM2_MIN_EASE_FACTOR, easeFactor - SM2_EASE_PENALTY);
      }
    } else {
      repetitions += 1;
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      if (rating === 'easy') {
        easeFactor += SM2_EASE_BONUS;
      }
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      nextReview: nextReview.toISOString(),
      interval,
      easeFactor,
      repetitions,
    };
  }, []);

  // Save individual review to database
  const saveFlashcardReview = useCallback(async (
    flashcardId: string,
    rating: FlashcardRating,
    responseTimeMs: number
  ) => {
    const { error } = await supabase.from('flashcard_reviews').insert({
      flashcard_id: flashcardId,
      user_id: deviceId,
      rating,
      response_time_ms: responseTimeMs,
    });

    if (error) {
      console.error('Error saving review:', error);
    }
  }, [deviceId]);

  // Start study session
  const startSession = useCallback(async (deckId?: string) => {
    const { data, error } = await supabase
      .from('flashcard_sessions')
      .insert({
        deck_id: deckId === 'all' ? null : deckId,
        user_id: deviceId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting session:', error);
      return null;
    }

    setCurrentSessionId(data.id);
    setSessionStartTime(Date.now());
    setCardStartTime(Date.now());
    return data.id;
  }, [deviceId]);

  // End study session
  const endSession = useCallback(async (
    sessionId: string,
    stats: { cardsReviewed: number; cardsCorrect: number; ratingDistribution: Record<FlashcardRating, number> }
  ) => {
    const { error } = await supabase
      .from('flashcard_sessions')
      .update({
        completed_at: new Date().toISOString(),
        cards_reviewed: stats.cardsReviewed,
        cards_correct: stats.cardsCorrect,
        rating_distribution: stats.ratingDistribution,
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending session:', error);
    }

    setCurrentSessionId(null);
    setSessionStartTime(null);
  }, []);

  // Review flashcard with review logging
  const reviewFlashcard = useCallback(async (id: string, rating: FlashcardRating) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    // Calculate response time
    const responseTimeMs = Date.now() - cardStartTime;
    setCardStartTime(Date.now());

    // Save review to database
    await saveFlashcardReview(id, rating, responseTimeMs);

    // Calculate and apply next review
    const updates = calculateNextReview(card, rating);
    await updateFlashcard(id, updates);
  }, [cards, cardStartTime, saveFlashcardReview, calculateNextReview, updateFlashcard]);

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
  const createMultipleFlashcards = useCallback(async (
    deckId: string,
    cardsData: Array<{ front: string; back: string }>
  ): Promise<Flashcard[]> => {
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

    // Insert all cards to database
    const { error } = await supabase.from('flashcards').insert(
      newCards.map(card => ({
        id: card.id,
        deck_id: deckId,
        user_id: deviceId,
        front: card.front,
        back: card.back,
        source_type: 'ai',
        next_review: now,
        interval_days: 0,
        ease_factor: SM2_INITIAL_EASE_FACTOR,
        repetitions: 0,
      }))
    );

    if (error) {
      console.error('Error creating multiple flashcards:', error);
      throw error;
    }

    setCards(prev => {
      const updated = [...prev, ...newCards];
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Update deck card count
    setDecks(prev => {
      const updated = prev.map(deck =>
        deck.id === deckId
          ? { ...deck, cardCount: deck.cardCount + newCards.length }
          : deck
      );
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    return newCards;
  }, [deviceId]);

  // Get estimated study time
  const getEstimatedStudyTime = useCallback((): number => {
    const dueCount = getTotalDueCount();
    return Math.ceil(dueCount / 5); // ~1 min per 5 cards
  }, [getTotalDueCount]);

  return {
    decks,
    cards,
    isLoading,
    currentSessionId,
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
    startSession,
    endSession,
    getEstimatedStudyTime,
  };
}
