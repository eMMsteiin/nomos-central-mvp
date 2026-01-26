export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';
export type FlashcardSourceType = 'manual' | 'ai' | 'notebook';

// Anki-compatible card states
export type CardState = 'new' | 'learning' | 'review' | 'relearning' | 'suspended' | 'buried';

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  sourceType: FlashcardSourceType;
  sourceNotebookId?: string;
  
  // Scheduling fields
  nextReview: string; // ISO date string (legacy, kept for compatibility)
  interval: number; // days until next review
  easeFactor: number; // SM-2 ease factor (default 2.5)
  repetitions: number; // number of successful reviews
  
  // Anki-compatible fields
  cardState: CardState;
  currentStep: number; // current step in learning/relearning
  stepsLeft: number; // remaining steps
  due: string; // ISO timestamp for when card is due
  buriedUntil?: string; // date until card is buried
  queuePosition: number; // position in queue for tie-breaking
  lapses: number; // number of times card went from review to relearning
  
  createdAt: string;
  updatedAt: string;
}

// Deck configuration for Anki parity
export interface DeckConfig {
  // Learning steps (in minutes, e.g., ['1', '10'] = 1 min, 10 min)
  // Use 'd' suffix for days (e.g., '1d' = 1 day)
  learningSteps: string[];
  
  // Relearning steps (same format)
  relearnSteps: string[];
  
  // Interval after graduating from learning (days)
  graduatingInterval: number;
  
  // Interval for 'Easy' on new cards (days)
  easyInterval: number;
  
  // Maximum interval (days)
  maxInterval: number;
  
  // Starting ease (2.5 = 250%)
  startingEase: number;
  
  // Easy bonus multiplier (1.3 = 130%)
  easyBonus: number;
  
  // Hard multiplier (1.2 = 120%)
  hardMultiplier: number;
  
  // Interval modifier (1.0 = 100%)
  intervalModifier: number;
  
  // Daily limits
  newCardsPerDay: number;
  reviewsPerDay: number;
  
  // Lapse settings
  lapseNewInterval: number; // new interval after lapse (0 = 0%)
  lapseMinInterval: number; // minimum interval after lapse (days)
}

export const DEFAULT_DECK_CONFIG: DeckConfig = {
  learningSteps: ['1', '10'],
  relearnSteps: ['10'],
  graduatingInterval: 1,
  easyInterval: 4,
  maxInterval: 36500,
  startingEase: 2.5,
  easyBonus: 1.3,
  hardMultiplier: 1.2,
  intervalModifier: 1.0,
  newCardsPerDay: 20,
  reviewsPerDay: 200,
  lapseNewInterval: 0.0,
  lapseMinInterval: 1,
};

export interface Deck {
  id: string;
  title: string;
  description?: string;
  disciplineId?: string;
  color: string;
  emoji: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  
  // Anki config
  config: DeckConfig;
}

export interface DeckDailyStats {
  id: string;
  deckId: string;
  userId: string;
  statDate: string; // YYYY-MM-DD
  newCardsStudied: number;
  reviewsDone: number;
}

export interface Discipline {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface ReviewSession {
  id: string;
  deckId: string;
  startedAt: string;
  completedAt?: string;
  cardsReviewed: number;
  cardsCorrect: number;
}

export interface FlashcardReview {
  id: string;
  flashcardId: string;
  rating: FlashcardRating;
  reviewedAt: string;
  responseTimeMs: number;
}

// SM-2 Algorithm constants (Anki defaults)
export const SM2_INITIAL_EASE_FACTOR = 2.5;
export const SM2_MIN_EASE_FACTOR = 1.3;
export const SM2_EASE_BONUS = 0.15; // Anki uses 15% for easy
export const SM2_EASE_PENALTY = 0.20; // Anki uses 20% for again
export const SM2_HARD_PENALTY = 0.15; // Anki uses 15% for hard

// Default disciplines with colors
export const DEFAULT_DISCIPLINES: Discipline[] = [
  { id: 'math', name: 'Matemática', emoji: '📐', color: 'hsl(220, 70%, 50%)' },
  { id: 'physics', name: 'Física', emoji: '⚡', color: 'hsl(45, 90%, 50%)' },
  { id: 'chemistry', name: 'Química', emoji: '🧪', color: 'hsl(280, 70%, 50%)' },
  { id: 'biology', name: 'Biologia', emoji: '🧬', color: 'hsl(120, 60%, 45%)' },
  { id: 'history', name: 'História', emoji: '📜', color: 'hsl(30, 70%, 50%)' },
  { id: 'geography', name: 'Geografia', emoji: '🌍', color: 'hsl(200, 70%, 50%)' },
  { id: 'portuguese', name: 'Português', emoji: '📖', color: 'hsl(0, 70%, 50%)' },
  { id: 'english', name: 'Inglês', emoji: '🇬🇧', color: 'hsl(210, 80%, 50%)' },
  { id: 'literature', name: 'Literatura', emoji: '📚', color: 'hsl(320, 70%, 50%)' },
  { id: 'philosophy', name: 'Filosofia', emoji: '🤔', color: 'hsl(260, 50%, 55%)' },
  { id: 'sociology', name: 'Sociologia', emoji: '👥', color: 'hsl(180, 50%, 45%)' },
  { id: 'other', name: 'Outros', emoji: '📝', color: 'hsl(0, 0%, 50%)' },
];

// Deck color options
export const DECK_COLORS = [
  'hsl(0, 70%, 50%)',    // Red
  'hsl(25, 90%, 55%)',   // Orange
  'hsl(45, 90%, 50%)',   // Yellow
  'hsl(120, 60%, 45%)',  // Green
  'hsl(180, 60%, 45%)',  // Teal
  'hsl(200, 70%, 50%)',  // Blue
  'hsl(260, 60%, 55%)',  // Purple
  'hsl(320, 70%, 50%)',  // Pink
];

export const DECK_EMOJIS = [
  '📚', '📖', '📝', '✏️', '🎯', '💡', '🧠', '⭐',
  '🔥', '💪', '🎓', '📐', '🧪', '⚡', '🌍', '🧬',
];
