import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Flashcard,
  Deck,
  DeckConfig,
  DeckDailyStats,
  DeckOptionPreset,
  FlashcardRating,
  CardState,
  SM2_INITIAL_EASE_FACTOR,
  DEFAULT_DECK_CONFIG,
} from '@/types/flashcard';
import {
  scheduleCard,
  buildStudyQueue,
  suspendCard,
  unsuspendCard,
  buryCard,
  unburyCard,
  checkAndUnburyCards,
  getTodayDate,
} from '@/utils/ankiAlgorithm';

const DECKS_STORAGE_KEY = 'nomos.flashcards.decks';
const CARDS_STORAGE_KEY = 'nomos.flashcards.cards';
const MIGRATION_KEY = 'nomos.flashcards.migrated';
const ANKI_MIGRATION_KEY = 'nomos.flashcards.anki_migrated';

export function useFlashcards() {
  const { userId } = useAuthContext();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [dailyStats, setDailyStats] = useState<Map<string, DeckDailyStats>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());

  // Load from database
  useEffect(() => {
    if (!userId) return;
    loadFromDatabase();
  }, [userId]);

  const loadFromDatabase = async () => {
    try {
      setIsLoading(true);

      // Check if migration is needed
      const migrated = localStorage.getItem(MIGRATION_KEY);
      if (!migrated) {
        await migrateFromLocalStorage();
      }

      // Load decks with new config fields
      const { data: dbDecks, error: decksError } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (decksError) throw decksError;

      // Load cards with new Anki fields
      const { data: dbCards, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId);

      if (cardsError) throw cardsError;

      // Load today's daily stats
      const today = getTodayDate();
      const { data: dbStats, error: statsError } = await supabase
        .from('deck_daily_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('stat_date', today);

      if (statsError) {
        console.warn('Error loading daily stats:', statsError);
      }

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
        config: {
          learningSteps: d.learning_steps || DEFAULT_DECK_CONFIG.learningSteps,
          relearnSteps: d.relearning_steps || DEFAULT_DECK_CONFIG.relearnSteps,
          graduatingInterval: d.graduating_interval ?? DEFAULT_DECK_CONFIG.graduatingInterval,
          easyInterval: d.easy_interval ?? DEFAULT_DECK_CONFIG.easyInterval,
          maxInterval: d.max_interval ?? DEFAULT_DECK_CONFIG.maxInterval,
          startingEase: Number(d.starting_ease) || DEFAULT_DECK_CONFIG.startingEase,
          easyBonus: Number(d.easy_bonus) || DEFAULT_DECK_CONFIG.easyBonus,
          hardMultiplier: Number(d.hard_multiplier) || DEFAULT_DECK_CONFIG.hardMultiplier,
          intervalModifier: Number(d.interval_modifier) || DEFAULT_DECK_CONFIG.intervalModifier,
          newCardsPerDay: d.new_cards_per_day ?? DEFAULT_DECK_CONFIG.newCardsPerDay,
          reviewsPerDay: d.reviews_per_day ?? DEFAULT_DECK_CONFIG.reviewsPerDay,
          lapseNewInterval: Number(d.lapse_new_interval) ?? DEFAULT_DECK_CONFIG.lapseNewInterval,
          lapseMinInterval: d.lapse_min_interval ?? DEFAULT_DECK_CONFIG.lapseMinInterval,
        },
        // Hierarchy fields (Bloco 2)
        parentDeckId: d.parent_deck_id || undefined,
        presetId: d.preset_id || undefined,
        configOverrides: (d.config_overrides as Record<string, unknown>) || {},
        fullName: d.full_name || d.title,
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
        // Anki fields with defaults for existing cards
        cardState: (c.card_state || (c.repetitions > 0 ? 'review' : 'new')) as CardState,
        currentStep: c.current_step ?? 0,
        stepsLeft: c.steps_left ?? 0,
        due: c.due || c.next_review,
        buriedUntil: c.buried_until || undefined,
        queuePosition: c.queue_position ?? 0,
        lapses: c.lapses ?? 0,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      // Auto-unbury cards from previous days
      const unburriedCards = checkAndUnburyCards(transformedCards);

      // Calculate card counts
      transformedDecks.forEach(deck => {
        deck.cardCount = unburriedCards.filter(c => c.deckId === deck.id).length;
      });

      // Transform daily stats
      const statsMap = new Map<string, DeckDailyStats>();
      (dbStats || []).forEach(s => {
        statsMap.set(s.deck_id, {
          id: s.id,
          deckId: s.deck_id,
          userId: s.user_id,
          statDate: s.stat_date,
          newCardsStudied: s.new_cards_studied ?? 0,
          reviewsDone: s.reviews_done ?? 0,
        });
      });

      setDecks(transformedDecks);
      setCards(unburriedCards);
      setDailyStats(statsMap);

      // Update localStorage cache
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(transformedDecks));
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(unburriedCards));
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

      const localDecks: any[] = savedDecks ? JSON.parse(savedDecks) : [];
      const localCards: any[] = savedCards ? JSON.parse(savedCards) : [];

      if (localDecks.length === 0 && localCards.length === 0) {
        localStorage.setItem(MIGRATION_KEY, 'true');
        return;
      }

      console.log('Migrating flashcards from localStorage...', { decks: localDecks.length, cards: localCards.length });

      // Migrate decks
      for (const deck of localDecks) {
        const { error } = await supabase.from('flashcard_decks').insert({
          id: deck.id,
          user_id: userId,
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

      // Migrate cards with Anki fields
      for (const card of localCards) {
        const cardState = card.repetitions > 0 ? 'review' : 'new';
        const { error } = await supabase.from('flashcards').insert({
          id: card.id,
          deck_id: card.deckId,
          user_id: userId,
          front: card.front,
          back: card.back,
          source_type: card.sourceType,
          source_notebook_id: card.sourceNotebookId || null,
          next_review: card.nextReview,
          interval_days: card.interval,
          ease_factor: card.easeFactor,
          repetitions: card.repetitions,
          card_state: cardState,
          current_step: 0,
          steps_left: 0,
          due: card.nextReview,
          lapses: 0,
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

  // Get or create daily stats for a deck
  const getOrCreateDailyStats = useCallback(async (deckId: string): Promise<DeckDailyStats> => {
    const today = getTodayDate();
    const existing = dailyStats.get(deckId);
    
    if (existing && existing.statDate === today) {
      return existing;
    }

    // Try to fetch or create
    const { data, error } = await supabase
      .from('deck_daily_stats')
      .upsert({
        deck_id: deckId,
        user_id: userId,
        stat_date: today,
        new_cards_studied: 0,
        reviews_done: 0,
      }, { onConflict: 'deck_id,user_id,stat_date' })
      .select()
      .single();

    if (error) {
      console.error('Error getting daily stats:', error);
      return {
        id: '',
        deckId,
        userId: userId || '',
        statDate: today,
        newCardsStudied: 0,
        reviewsDone: 0,
      };
    }

    const stats: DeckDailyStats = {
      id: data.id,
      deckId: data.deck_id,
      userId: data.user_id,
      statDate: data.stat_date,
      newCardsStudied: data.new_cards_studied ?? 0,
      reviewsDone: data.reviews_done ?? 0,
    };

    setDailyStats(prev => new Map(prev).set(deckId, stats));
    return stats;
  }, [userId, dailyStats]);

  // Update daily stats
  const incrementDailyStats = useCallback(async (
    deckId: string, 
    type: 'new' | 'review'
  ) => {
    const stats = await getOrCreateDailyStats(deckId);
    
    const updates = type === 'new' 
      ? { new_cards_studied: stats.newCardsStudied + 1 }
      : { reviews_done: stats.reviewsDone + 1 };

    const { error } = await supabase
      .from('deck_daily_stats')
      .update(updates)
      .eq('id', stats.id);

    if (error) {
      console.error('Error updating daily stats:', error);
      return;
    }

    setDailyStats(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(deckId);
      if (current) {
        newMap.set(deckId, {
          ...current,
          newCardsStudied: type === 'new' ? current.newCardsStudied + 1 : current.newCardsStudied,
          reviewsDone: type === 'review' ? current.reviewsDone + 1 : current.reviewsDone,
        });
      }
      return newMap;
    });
  }, [getOrCreateDailyStats]);

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
      config: { ...DEFAULT_DECK_CONFIG },
      // Hierarchy fields
      configOverrides: {},
      fullName: title,
    };

    // Save to database
    const { error } = await supabase.from('flashcard_decks').insert({
      id: newDeck.id,
      user_id: userId,
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
  }, [userId]);

  // Update deck
  const updateDeck = useCallback(async (id: string, updates: Partial<Deck>) => {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;
    if (updates.disciplineId !== undefined) dbUpdates.discipline_id = updates.disciplineId || null;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.emoji !== undefined) dbUpdates.emoji = updates.emoji;

    // Handle config updates
    if (updates.config) {
      const c = updates.config;
      if (c.learningSteps !== undefined) dbUpdates.learning_steps = c.learningSteps;
      if (c.relearnSteps !== undefined) dbUpdates.relearning_steps = c.relearnSteps;
      if (c.graduatingInterval !== undefined) dbUpdates.graduating_interval = c.graduatingInterval;
      if (c.easyInterval !== undefined) dbUpdates.easy_interval = c.easyInterval;
      if (c.maxInterval !== undefined) dbUpdates.max_interval = c.maxInterval;
      if (c.startingEase !== undefined) dbUpdates.starting_ease = c.startingEase;
      if (c.easyBonus !== undefined) dbUpdates.easy_bonus = c.easyBonus;
      if (c.hardMultiplier !== undefined) dbUpdates.hard_multiplier = c.hardMultiplier;
      if (c.intervalModifier !== undefined) dbUpdates.interval_modifier = c.intervalModifier;
      if (c.newCardsPerDay !== undefined) dbUpdates.new_cards_per_day = c.newCardsPerDay;
      if (c.reviewsPerDay !== undefined) dbUpdates.reviews_per_day = c.reviewsPerDay;
      if (c.lapseNewInterval !== undefined) dbUpdates.lapse_new_interval = c.lapseNewInterval;
      if (c.lapseMinInterval !== undefined) dbUpdates.lapse_min_interval = c.lapseMinInterval;
    }

    const { error } = await supabase
      .from('flashcard_decks')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating deck:', error);
      throw error;
    }

    setDecks(prev => {
      const updated = prev.map(deck =>
        deck.id === id
          ? { 
              ...deck, 
              ...updates,
              config: updates.config ? { ...deck.config, ...updates.config } : deck.config,
              updatedAt: new Date().toISOString() 
            }
          : deck
      );
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [userId]);

  // Delete deck
  const deleteDeck = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('flashcard_decks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

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
  }, [userId]);

  // Create flashcard
  const createFlashcard = useCallback(async (
    deckId: string,
    front: string,
    back: string,
    sourceType: Flashcard['sourceType'] = 'manual',
    sourceNotebookId?: string
  ): Promise<Flashcard> => {
    const now = new Date().toISOString();
    const deck = decks.find(d => d.id === deckId);
    const startingEase = deck?.config.startingEase ?? SM2_INITIAL_EASE_FACTOR;

    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      deckId,
      front,
      back,
      sourceType,
      sourceNotebookId,
      nextReview: now,
      interval: 0,
      easeFactor: startingEase,
      repetitions: 0,
      // Anki fields
      cardState: 'new',
      currentStep: 0,
      stepsLeft: 0,
      due: now,
      queuePosition: 0,
      lapses: 0,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase.from('flashcards').insert({
      id: newCard.id,
      deck_id: deckId,
      user_id: userId,
      front: newCard.front,
      back: newCard.back,
      source_type: sourceType,
      source_notebook_id: sourceNotebookId || null,
      next_review: now,
      interval_days: 0,
      ease_factor: startingEase,
      repetitions: 0,
      card_state: 'new',
      current_step: 0,
      steps_left: 0,
      due: now,
      lapses: 0,
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
  }, [userId, decks]);

  // Update flashcard
  const updateFlashcard = useCallback(async (id: string, updates: Partial<Flashcard>) => {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.front !== undefined) dbUpdates.front = updates.front;
    if (updates.back !== undefined) dbUpdates.back = updates.back;
    if (updates.nextReview !== undefined) dbUpdates.next_review = updates.nextReview;
    if (updates.interval !== undefined) dbUpdates.interval_days = updates.interval;
    if (updates.easeFactor !== undefined) dbUpdates.ease_factor = updates.easeFactor;
    if (updates.repetitions !== undefined) dbUpdates.repetitions = updates.repetitions;
    // Anki fields
    if (updates.cardState !== undefined) dbUpdates.card_state = updates.cardState;
    if (updates.currentStep !== undefined) dbUpdates.current_step = updates.currentStep;
    if (updates.stepsLeft !== undefined) dbUpdates.steps_left = updates.stepsLeft;
    if (updates.due !== undefined) dbUpdates.due = updates.due;
    if (updates.buriedUntil !== undefined) dbUpdates.buried_until = updates.buriedUntil;
    if (updates.queuePosition !== undefined) dbUpdates.queue_position = updates.queuePosition;
    if (updates.lapses !== undefined) dbUpdates.lapses = updates.lapses;

    const { error } = await supabase
      .from('flashcards')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId);

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
  }, [userId]);

  // Delete flashcard
  const deleteFlashcard = useCallback(async (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

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
  }, [cards, userId]);

  // Save individual review to database
  const saveFlashcardReview = useCallback(async (
    flashcardId: string,
    rating: FlashcardRating,
    responseTimeMs: number
  ) => {
    const { error } = await supabase.from('flashcard_reviews').insert({
      flashcard_id: flashcardId,
      user_id: userId,
      rating,
      response_time_ms: responseTimeMs,
    });

    if (error) {
      console.error('Error saving review:', error);
    }
  }, [userId]);

  // Start study session
  const startSession = useCallback(async (deckId?: string) => {
    const { data, error } = await supabase
      .from('flashcard_sessions')
      .insert({
        deck_id: deckId === 'all' ? null : deckId,
        user_id: userId,
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
  }, [userId]);

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

  // Review flashcard with Anki algorithm
  const reviewFlashcard = useCallback(async (id: string, rating: FlashcardRating) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    // Calculate response time
    const responseTimeMs = Date.now() - cardStartTime;
    setCardStartTime(Date.now());

    // Save review to database
    await saveFlashcardReview(id, rating, responseTimeMs);

    // Get deck config
    const deck = decks.find(d => d.id === card.deckId);
    const config = deck?.config ?? DEFAULT_DECK_CONFIG;

    // Use Anki algorithm
    const result = scheduleCard(card, rating, config);

    // Update daily stats
    if (card.cardState === 'new') {
      await incrementDailyStats(card.deckId, 'new');
    } else if (card.cardState === 'review') {
      await incrementDailyStats(card.deckId, 'review');
    }

    // Update card
    await updateFlashcard(id, {
      cardState: result.cardState,
      currentStep: result.currentStep,
      stepsLeft: result.stepsLeft,
      due: result.due,
      interval: result.interval,
      easeFactor: result.easeFactor,
      repetitions: result.repetitions,
      lapses: result.lapses,
      nextReview: result.nextReview,
    });
  }, [cards, cardStartTime, saveFlashcardReview, decks, updateFlashcard, incrementDailyStats]);

  // Suspend card
  const suspendFlashcard = useCallback(async (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const updates = suspendCard(card);
    await updateFlashcard(id, updates);
  }, [cards, updateFlashcard]);

  // Unsuspend card
  const unsuspendFlashcard = useCallback(async (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const updates = unsuspendCard(card);
    await updateFlashcard(id, updates);
  }, [cards, updateFlashcard]);

  // Bury card
  const buryFlashcard = useCallback(async (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const updates = buryCard(card);
    await updateFlashcard(id, updates);
  }, [cards, updateFlashcard]);

  // Unbury card
  const unburyFlashcard = useCallback(async (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const updates = unburyCard(card);
    await updateFlashcard(id, updates);
  }, [cards, updateFlashcard]);

  // ============================================================================
  // BULK OPERATIONS (Bloco 4)
  // ============================================================================

  // Suspend multiple cards
  const suspendMultipleCards = useCallback(async (cardIds: string[]) => {
    const updates = cardIds.map(id => {
      const card = cards.find(c => c.id === id);
      if (!card) return null;
      return { id, updates: suspendCard(card) };
    }).filter(Boolean) as { id: string; updates: Partial<Flashcard> }[];

    // Update in database
    for (const { id, updates: cardUpdates } of updates) {
      await supabase
        .from('flashcards')
        .update({
          card_state: cardUpdates.cardState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId);
    }

    // Update local state
    setCards(prev => {
      const updated = prev.map(card => {
        const update = updates.find(u => u.id === card.id);
        if (update) {
          return { ...card, ...update.updates, updatedAt: new Date().toISOString() };
        }
        return card;
      });
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [cards, userId]);

  // Unsuspend multiple cards
  const unsuspendMultipleCards = useCallback(async (cardIds: string[]) => {
    const updates = cardIds.map(id => {
      const card = cards.find(c => c.id === id);
      if (!card) return null;
      return { id, updates: unsuspendCard(card) };
    }).filter(Boolean) as { id: string; updates: Partial<Flashcard> }[];

    // Update in database
    for (const { id, updates: cardUpdates } of updates) {
      await supabase
        .from('flashcards')
        .update({
          card_state: cardUpdates.cardState,
          due: cardUpdates.due,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId);
    }

    // Update local state
    setCards(prev => {
      const updated = prev.map(card => {
        const update = updates.find(u => u.id === card.id);
        if (update) {
          return { ...card, ...update.updates, updatedAt: new Date().toISOString() };
        }
        return card;
      });
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [cards, userId]);

  // Bury multiple cards
  const buryMultipleCards = useCallback(async (cardIds: string[]) => {
    const updates = cardIds.map(id => {
      const card = cards.find(c => c.id === id);
      if (!card) return null;
      return { id, updates: buryCard(card) };
    }).filter(Boolean) as { id: string; updates: Partial<Flashcard> }[];

    // Update in database
    for (const { id, updates: cardUpdates } of updates) {
      await supabase
        .from('flashcards')
        .update({
          card_state: cardUpdates.cardState,
          buried_until: cardUpdates.buriedUntil,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId);
    }

    // Update local state
    setCards(prev => {
      const updated = prev.map(card => {
        const update = updates.find(u => u.id === card.id);
        if (update) {
          return { ...card, ...update.updates, updatedAt: new Date().toISOString() };
        }
        return card;
      });
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [cards, userId]);

  // Unbury multiple cards
  const unburyMultipleCards = useCallback(async (cardIds: string[]) => {
    const updates = cardIds.map(id => {
      const card = cards.find(c => c.id === id);
      if (!card) return null;
      return { id, updates: unburyCard(card) };
    }).filter(Boolean) as { id: string; updates: Partial<Flashcard> }[];

    // Update in database
    for (const { id, updates: cardUpdates } of updates) {
      await supabase
        .from('flashcards')
        .update({
          card_state: cardUpdates.cardState,
          buried_until: null,
          due: cardUpdates.due,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId);
    }

    // Update local state
    setCards(prev => {
      const updated = prev.map(card => {
        const update = updates.find(u => u.id === card.id);
        if (update) {
          return { ...card, ...update.updates, updatedAt: new Date().toISOString() };
        }
        return card;
      });
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [cards, userId]);

  // Delete multiple cards
  const deleteMultipleCards = useCallback(async (cardIds: string[]) => {
    // Delete from database
    const { error } = await supabase
      .from('flashcards')
      .delete()
      .in('id', cardIds)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting cards:', error);
      throw error;
    }

    // Update local state and deck counts
    const deletedCards = cards.filter(c => cardIds.includes(c.id));
    const deckCounts = new Map<string, number>();
    deletedCards.forEach(c => {
      deckCounts.set(c.deckId, (deckCounts.get(c.deckId) || 0) + 1);
    });

    setCards(prev => {
      const updated = prev.filter(c => !cardIds.includes(c.id));
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setDecks(prev => {
      const updated = prev.map(deck => {
        const count = deckCounts.get(deck.id) || 0;
        if (count > 0) {
          return { ...deck, cardCount: Math.max(0, deck.cardCount - count) };
        }
        return deck;
      });
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [cards, userId]);

  // Move multiple cards to a different deck
  const moveMultipleCards = useCallback(async (cardIds: string[], targetDeckId: string) => {
    // Update in database
    const { error } = await supabase
      .from('flashcards')
      .update({
        deck_id: targetDeckId,
        updated_at: new Date().toISOString(),
      })
      .in('id', cardIds)
      .eq('user_id', userId);

    if (error) {
      console.error('Error moving cards:', error);
      throw error;
    }

    // Calculate deck count changes
    const movedCards = cards.filter(c => cardIds.includes(c.id));
    const sourceCounts = new Map<string, number>();
    movedCards.forEach(c => {
      sourceCounts.set(c.deckId, (sourceCounts.get(c.deckId) || 0) + 1);
    });

    // Update local state
    setCards(prev => {
      const updated = prev.map(card => {
        if (cardIds.includes(card.id)) {
          return { ...card, deckId: targetDeckId, updatedAt: new Date().toISOString() };
        }
        return card;
      });
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setDecks(prev => {
      const updated = prev.map(deck => {
        if (deck.id === targetDeckId) {
          return { ...deck, cardCount: deck.cardCount + cardIds.length };
        }
        const removed = sourceCounts.get(deck.id) || 0;
        if (removed > 0) {
          return { ...deck, cardCount: Math.max(0, deck.cardCount - removed) };
        }
        return deck;
      });
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [cards, userId]);

  // Get cards due for review (respects daily limits and card states)
  const getDueCards = useCallback((deckId?: string): Flashcard[] => {
    const now = new Date();
    
    return cards.filter(card => {
      if (deckId && card.deckId !== deckId) return false;
      
      // Suspended cards never appear
      if (card.cardState === 'suspended') return false;
      
      // Buried cards don't appear today
      if (card.cardState === 'buried') {
        const today = getTodayDate();
        if (!card.buriedUntil || card.buriedUntil > today) return false;
      }
      
      // New cards always available (limit checked later)
      if (card.cardState === 'new') return true;
      
      // Learning/Relearning - check if due
      if (card.cardState === 'learning' || card.cardState === 'relearning') {
        return new Date(card.due) <= now;
      }
      
      // Review - check if due
      if (card.cardState === 'review') {
        return new Date(card.due) <= now;
      }
      
      return false;
    }).sort((a, b) => {
      // Learning/Relearning cards first (time-sensitive)
      if ((a.cardState === 'learning' || a.cardState === 'relearning') && 
          (b.cardState !== 'learning' && b.cardState !== 'relearning')) {
        return -1;
      }
      if ((b.cardState === 'learning' || b.cardState === 'relearning') && 
          (a.cardState !== 'learning' && a.cardState !== 'relearning')) {
        return 1;
      }
      
      // Then by due date
      return new Date(a.due).getTime() - new Date(b.due).getTime();
    });
  }, [cards]);

  // Get study queue for a deck with daily limits
  const getStudyQueue = useCallback(async (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return null;

    const deckCards = cards.filter(c => c.deckId === deckId);
    const stats = await getOrCreateDailyStats(deckId);

    return buildStudyQueue(deckCards, deck.config, {
      newCardsStudied: stats.newCardsStudied,
      reviewsDone: stats.reviewsDone,
    });
  }, [decks, cards, getOrCreateDailyStats]);

  // Get cards by deck
  const getCardsByDeck = useCallback((deckId: string): Flashcard[] => {
    return cards.filter(card => card.deckId === deckId);
  }, [cards]);

  // Get deck due count (for display)
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
    const deck = decks.find(d => d.id === deckId);
    const startingEase = deck?.config.startingEase ?? SM2_INITIAL_EASE_FACTOR;

    const newCards: Flashcard[] = cardsData.map(data => ({
      id: crypto.randomUUID(),
      deckId,
      front: data.front,
      back: data.back,
      sourceType: 'ai' as const,
      nextReview: now,
      interval: 0,
      easeFactor: startingEase,
      repetitions: 0,
      // Anki fields
      cardState: 'new' as CardState,
      currentStep: 0,
      stepsLeft: 0,
      due: now,
      queuePosition: 0,
      lapses: 0,
      createdAt: now,
      updatedAt: now,
    }));

    // Insert all cards to database
    const { error } = await supabase.from('flashcards').insert(
      newCards.map(card => ({
        id: card.id,
        deck_id: deckId,
        user_id: userId,
        front: card.front,
        back: card.back,
        source_type: 'ai',
        next_review: now,
        interval_days: 0,
        ease_factor: startingEase,
        repetitions: 0,
        card_state: 'new' as const,
        current_step: 0,
        steps_left: 0,
        due: now,
        lapses: 0,
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
  }, [userId, decks]);

  // Get estimated study time
  const getEstimatedStudyTime = useCallback((): number => {
    const dueCount = getTotalDueCount();
    return Math.ceil(dueCount / 5); // ~1 min per 5 cards
  }, [getTotalDueCount]);

  // Get card counts by state for a deck
  const getCardCountsByState = useCallback((deckId: string) => {
    const deckCards = cards.filter(c => c.deckId === deckId);
    const now = new Date();
    
    return {
      new: deckCards.filter(c => c.cardState === 'new').length,
      learning: deckCards.filter(c => 
        (c.cardState === 'learning' || c.cardState === 'relearning') &&
        new Date(c.due) <= now
      ).length,
      review: deckCards.filter(c => 
        c.cardState === 'review' && 
        new Date(c.due) <= now
      ).length,
      suspended: deckCards.filter(c => c.cardState === 'suspended').length,
      buried: deckCards.filter(c => c.cardState === 'buried').length,
      total: deckCards.length,
    };
  }, [cards]);

  // ============================================================================
  // HIERARCHY FUNCTIONS (Bloco 2)
  // ============================================================================

  // Get subdecks of a deck
  const getSubdecks = useCallback((parentId: string): Deck[] => {
    return decks.filter(d => d.parentDeckId === parentId);
  }, [decks]);

  // Get all descendant decks (recursive)
  const getAllDescendants = useCallback((parentId: string): Deck[] => {
    const direct = getSubdecks(parentId);
    const descendants: Deck[] = [...direct];
    
    for (const subdeck of direct) {
      descendants.push(...getAllDescendants(subdeck.id));
    }
    
    return descendants;
  }, [getSubdecks]);

  // Get aggregated counts including subdecks
  const getAggregatedCounts = useCallback((deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return null;

    const descendants = getAllDescendants(deckId);
    const allDeckIds = [deckId, ...descendants.map(d => d.id)];
    
    const now = new Date();
    const relevantCards = cards.filter(c => allDeckIds.includes(c.deckId));

    return {
      new: relevantCards.filter(c => c.cardState === 'new').length,
      learning: relevantCards.filter(c =>
        (c.cardState === 'learning' || c.cardState === 'relearning') &&
        new Date(c.due) <= now
      ).length,
      review: relevantCards.filter(c =>
        c.cardState === 'review' &&
        new Date(c.due) <= now
      ).length,
      total: relevantCards.length,
      subdecks: descendants.length,
    };
  }, [decks, cards, getAllDescendants]);

  // Get root decks (no parent)
  const getRootDecks = useCallback((): Deck[] => {
    return decks.filter(d => !d.parentDeckId);
  }, [decks]);

  // Get deck hierarchy tree
  const getDeckTree = useCallback(() => {
    const rootDecks = getRootDecks();
    
    const buildTree = (deck: Deck): Deck & { children: Deck[] } => {
      const children = getSubdecks(deck.id).map(buildTree);
      return { ...deck, children };
    };
    
    return rootDecks.map(buildTree);
  }, [getRootDecks, getSubdecks]);

  // Create subdeck
  const createSubdeck = useCallback(async (
    parentId: string,
    title: string,
    options?: { description?: string; color?: string; emoji?: string }
  ): Promise<Deck> => {
    const parentDeck = decks.find(d => d.id === parentId);
    if (!parentDeck) {
      throw new Error('Parent deck not found');
    }

    const fullName = `${parentDeck.fullName}::${title}`;

    const newDeck: Deck = {
      id: crypto.randomUUID(),
      title,
      description: options?.description,
      color: options?.color || parentDeck.color,
      emoji: options?.emoji || parentDeck.emoji,
      cardCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Inherit config from parent
      config: { ...parentDeck.config },
      parentDeckId: parentId,
      configOverrides: {},
      fullName,
    };

    const { error } = await supabase.from('flashcard_decks').insert({
      id: newDeck.id,
      user_id: userId,
      title: newDeck.title,
      description: newDeck.description || null,
      color: newDeck.color,
      emoji: newDeck.emoji,
      parent_deck_id: parentId,
      full_name: fullName,
      config_overrides: {},
    });

    if (error) {
      console.error('Error creating subdeck:', error);
      throw error;
    }

    setDecks(prev => {
      const updated = [...prev, newDeck];
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    return newDeck;
  }, [userId, decks]);

  // Move card to another deck
  const moveCardToDeck = useCallback(async (cardId: string, targetDeckId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const targetDeck = decks.find(d => d.id === targetDeckId);
    if (!targetDeck) return;

    const { error } = await supabase
      .from('flashcards')
      .update({ deck_id: targetDeckId })
      .eq('id', cardId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error moving card:', error);
      throw error;
    }

    // Update local state
    setCards(prev => {
      const updated = prev.map(c =>
        c.id === cardId ? { ...c, deckId: targetDeckId } : c
      );
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Update card counts
    setDecks(prev => {
      const updated = prev.map(d => {
        if (d.id === card.deckId) {
          return { ...d, cardCount: Math.max(0, d.cardCount - 1) };
        }
        if (d.id === targetDeckId) {
          return { ...d, cardCount: d.cardCount + 1 };
        }
        return d;
      });
      localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [cards, decks, userId]);

  // ============================================================================
  // PRESET FUNCTIONS (Bloco 2)
  // ============================================================================

  const [presets, setPresets] = useState<DeckOptionPreset[]>([]);

  // Load presets
  useEffect(() => {
    if (!userId) return;
    loadPresets();
  }, [userId]);

  const loadPresets = async () => {
    const { data, error } = await supabase
      .from('deck_option_presets')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      console.error('Error loading presets:', error);
      return;
    }

    const transformed: DeckOptionPreset[] = (data || []).map(p => ({
      id: p.id,
      userId: p.user_id,
      name: p.name,
      description: p.description || undefined,
      config: {
        learningSteps: p.learning_steps || DEFAULT_DECK_CONFIG.learningSteps,
        relearnSteps: p.relearning_steps || DEFAULT_DECK_CONFIG.relearnSteps,
        graduatingInterval: p.graduating_interval ?? DEFAULT_DECK_CONFIG.graduatingInterval,
        easyInterval: p.easy_interval ?? DEFAULT_DECK_CONFIG.easyInterval,
        maxInterval: p.max_interval ?? DEFAULT_DECK_CONFIG.maxInterval,
        startingEase: Number(p.starting_ease) || DEFAULT_DECK_CONFIG.startingEase,
        easyBonus: Number(p.easy_bonus) || DEFAULT_DECK_CONFIG.easyBonus,
        hardMultiplier: Number(p.hard_multiplier) || DEFAULT_DECK_CONFIG.hardMultiplier,
        intervalModifier: Number(p.interval_modifier) || DEFAULT_DECK_CONFIG.intervalModifier,
        newCardsPerDay: p.new_cards_per_day ?? DEFAULT_DECK_CONFIG.newCardsPerDay,
        reviewsPerDay: p.reviews_per_day ?? DEFAULT_DECK_CONFIG.reviewsPerDay,
        lapseNewInterval: Number(p.lapse_new_interval) ?? DEFAULT_DECK_CONFIG.lapseNewInterval,
        lapseMinInterval: p.lapse_min_interval ?? DEFAULT_DECK_CONFIG.lapseMinInterval,
      },
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    setPresets(transformed);
  };

  // Create preset
  const createPreset = useCallback(async (
    name: string,
    config: DeckConfig,
    description?: string
  ): Promise<DeckOptionPreset> => {
    const { data, error } = await supabase
      .from('deck_option_presets')
      .insert({
        user_id: userId,
        name,
        description: description || null,
        learning_steps: config.learningSteps,
        relearning_steps: config.relearnSteps,
        graduating_interval: config.graduatingInterval,
        easy_interval: config.easyInterval,
        max_interval: config.maxInterval,
        starting_ease: config.startingEase,
        easy_bonus: config.easyBonus,
        hard_multiplier: config.hardMultiplier,
        interval_modifier: config.intervalModifier,
        new_cards_per_day: config.newCardsPerDay,
        reviews_per_day: config.reviewsPerDay,
        lapse_new_interval: config.lapseNewInterval,
        lapse_min_interval: config.lapseMinInterval,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating preset:', error);
      throw error;
    }

    const newPreset: DeckOptionPreset = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description || undefined,
      config,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    setPresets(prev => [...prev, newPreset]);
    return newPreset;
  }, [userId]);

  // Delete preset
  const deletePreset = useCallback(async (presetId: string) => {
    const { error } = await supabase
      .from('deck_option_presets')
      .delete()
      .eq('id', presetId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting preset:', error);
      throw error;
    }

    setPresets(prev => prev.filter(p => p.id !== presetId));
  }, [userId]);

  // Apply preset to deck
  const applyPresetToDeck = useCallback(async (deckId: string, presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    await updateDeck(deckId, {
      config: { ...preset.config },
      presetId,
      configOverrides: {},
    });
  }, [presets, updateDeck]);

  // Update deck config with overrides
  const updateDeckConfig = useCallback(async (
    deckId: string,
    configUpdates: Partial<DeckConfig>,
    presetId?: string
  ) => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    const newConfig = { ...deck.config, ...configUpdates };
    
    // Calculate which fields are overriding parent/preset
    let parentConfig: DeckConfig;
    if (presetId) {
      const preset = presets.find(p => p.id === presetId);
      parentConfig = preset?.config || DEFAULT_DECK_CONFIG;
    } else if (deck.parentDeckId) {
      const parent = decks.find(d => d.id === deck.parentDeckId);
      parentConfig = parent?.config || DEFAULT_DECK_CONFIG;
    } else {
      parentConfig = DEFAULT_DECK_CONFIG;
    }

    const overrides: Partial<DeckConfig> = {};
    (Object.keys(newConfig) as (keyof DeckConfig)[]).forEach(key => {
      if (JSON.stringify(newConfig[key]) !== JSON.stringify(parentConfig[key])) {
        (overrides as any)[key] = newConfig[key];
      }
    });

    await updateDeck(deckId, {
      config: newConfig,
      presetId,
      configOverrides: overrides,
    });
  }, [decks, presets, updateDeck]);

  return {
    decks,
    cards,
    isLoading,
    currentSessionId,
    dailyStats,
    presets,
    // Deck operations
    createDeck,
    updateDeck,
    deleteDeck,
    getDeckById,
    getDecksByDiscipline,
    // Hierarchy operations (Bloco 2)
    createSubdeck,
    getSubdecks,
    getAllDescendants,
    getRootDecks,
    getDeckTree,
    getAggregatedCounts,
    moveCardToDeck,
    // Preset operations (Bloco 2)
    createPreset,
    deletePreset,
    applyPresetToDeck,
    updateDeckConfig,
    // Card operations
    createFlashcard,
    createMultipleFlashcards,
    updateFlashcard,
    deleteFlashcard,
    // Study operations
    reviewFlashcard,
    getDueCards,
    getCardsByDeck,
    getDeckDueCount,
    getTotalDueCount,
    getStudyQueue,
    getCardCountsByState,
    // Session operations
    startSession,
    endSession,
    // Card state operations
    suspendFlashcard,
    unsuspendFlashcard,
    buryFlashcard,
    unburyFlashcard,
    // Bulk operations (Bloco 4)
    suspendMultipleCards,
    unsuspendMultipleCards,
    buryMultipleCards,
    unburyMultipleCards,
    deleteMultipleCards,
    moveMultipleCards,
    // Utilities
    getEstimatedStudyTime,
  };
}
