export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';
export type FlashcardSourceType = 'manual' | 'ai' | 'notebook';

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  sourceType: FlashcardSourceType;
  sourceNotebookId?: string;
  nextReview: string; // ISO date string
  interval: number; // days until next review
  easeFactor: number; // SM-2 ease factor (default 2.5)
  repetitions: number; // number of successful reviews
  createdAt: string;
  updatedAt: string;
}

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

// SM-2 Algorithm constants
export const SM2_INITIAL_EASE_FACTOR = 2.5;
export const SM2_MIN_EASE_FACTOR = 1.3;
export const SM2_EASE_BONUS = 0.1;
export const SM2_EASE_PENALTY = 0.2;

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
