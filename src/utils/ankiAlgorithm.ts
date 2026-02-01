/**
 * Anki Desktop Algorithm Implementation
 * 
 * This module implements the Anki spaced repetition algorithm with full parity
 * to Anki Desktop's behavior. Reference: https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html
 * 
 * Key concepts:
 * - Learning: New cards go through learning steps before graduating
 * - Relearning: Review cards that lapse go through relearning steps
 * - Review: Graduated cards with interval >= 1 day
 * - Suspended: Cards that never appear in study sessions
 * - Buried: Cards that don't appear until next day
 */

import {
  Flashcard,
  FlashcardRating,
  DeckConfig,
  CardState,
  SM2_MIN_EASE_FACTOR,
  SM2_EASE_BONUS,
  SM2_EASE_PENALTY,
  SM2_HARD_PENALTY,
  DEFAULT_DECK_CONFIG,
} from '@/types/flashcard';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse step string to milliseconds
 * Supports: '1' (1 minute), '10' (10 minutes), '1d' (1 day)
 */
export function parseStepToMs(step: string): number {
  const value = parseInt(step, 10);
  if (step.endsWith('d')) {
    return value * 24 * 60 * 60 * 1000; // days to ms
  }
  return value * 60 * 1000; // minutes to ms
}

/**
 * Parse step string to minutes (for display)
 */
export function parseStepToMinutes(step: string): number {
  const value = parseInt(step, 10);
  if (step.endsWith('d')) {
    return value * 24 * 60;
  }
  return value;
}

/**
 * Format milliseconds to human readable string
 */
export function formatInterval(ms: number): string {
  if (ms <= 0) {
    return '< 1m';
  }
  
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) {
    return '< 1m';
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.round(hours / 24);
  if (days < 30) {
    return `${days}d`;
  }
  const months = Math.round(days / 30);
  if (months < 12) {
    return `${months}mo`;
  }
  const years = (days / 365).toFixed(1);
  return `${years}y`;
}

/**
 * Format milliseconds with higher precision for button previews
 * Shows more detail for short intervals to differentiate between buttons
 */
export function formatIntervalForPreview(ms: number): string {
  if (ms <= 0) {
    return '< 1m';
  }
  
  const totalSeconds = Math.round(ms / 1000);
  
  // Less than 60 seconds
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  
  // Less than 60 minutes - show with precision for short intervals
  const totalMinutes = totalSeconds / 60;
  if (totalMinutes < 60) {
    // Show decimal precision for intervals < 10 minutes if not a whole number
    if (totalMinutes < 10 && totalMinutes % 1 !== 0) {
      const formatted = totalMinutes.toFixed(1);
      // Remove trailing .0
      return formatted.endsWith('.0') ? `${Math.round(totalMinutes)}m` : `${formatted}m`;
    }
    return `${Math.round(totalMinutes)}m`;
  }
  
  // Less than 24 hours
  const totalHours = totalMinutes / 60;
  if (totalHours < 24) {
    return `${Math.round(totalHours)}h`;
  }
  
  // Days
  const totalDays = totalHours / 24;
  if (totalDays < 30) {
    return `${Math.round(totalDays)}d`;
  }
  
  // Months
  const totalMonths = totalDays / 30;
  if (totalMonths < 12) {
    return `${Math.round(totalMonths)}mo`;
  }
  
  // Years
  return `${(totalDays / 365).toFixed(1)}y`;
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a date is today
 */
export function isToday(date: string): boolean {
  return date.startsWith(getTodayDate());
}

/**
 * Apply fuzz factor to interval (Anki adds random variation)
 * This prevents cards from clumping on the same day
 */
export function fuzzInterval(interval: number): number {
  if (interval < 2) return interval;
  if (interval <= 2) return interval + Math.random() * 1;
  if (interval <= 7) return interval + Math.random() * 2 - 1;
  
  // For longer intervals, fuzz by up to interval * 0.05
  const fuzz = Math.round(interval * 0.05);
  return interval + Math.floor(Math.random() * (fuzz * 2 + 1)) - fuzz;
}

// ============================================================================
// CARD STATE TRANSITIONS
// ============================================================================

export interface SchedulingResult {
  cardState: CardState;
  currentStep: number;
  stepsLeft: number;
  due: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  nextReview: string; // Legacy field
}

export interface SchedulingLog {
  timestamp: string;
  cardId: string;
  rating: FlashcardRating;
  previousState: CardState;
  newState: CardState;
  previousInterval: number;
  newInterval: number;
  previousEase: number;
  newEase: number;
  step: number;
}

/**
 * Main scheduling function - processes a card review and returns new state
 * This is the core of the Anki algorithm
 */
export function scheduleCard(
  card: Flashcard,
  rating: FlashcardRating,
  config: DeckConfig = DEFAULT_DECK_CONFIG,
  now: Date = new Date()
): SchedulingResult {
  const log: Partial<SchedulingLog> = {
    timestamp: now.toISOString(),
    cardId: card.id,
    rating,
    previousState: card.cardState,
    previousInterval: card.interval,
    previousEase: card.easeFactor,
    step: card.currentStep,
  };

  let result: SchedulingResult;

  switch (card.cardState) {
    case 'new':
      result = scheduleNewCard(card, rating, config, now);
      break;
    case 'learning':
      result = scheduleLearningCard(card, rating, config, now);
      break;
    case 'review':
      result = scheduleReviewCard(card, rating, config, now);
      break;
    case 'relearning':
      result = scheduleRelearningCard(card, rating, config, now);
      break;
    case 'suspended':
    case 'buried':
      // These states shouldn't be reviewed, return unchanged
      result = {
        cardState: card.cardState,
        currentStep: card.currentStep,
        stepsLeft: card.stepsLeft,
        due: card.due,
        interval: card.interval,
        easeFactor: card.easeFactor,
        repetitions: card.repetitions,
        lapses: card.lapses,
        nextReview: card.nextReview,
      };
      break;
    default:
      // Default to new card behavior
      result = scheduleNewCard(card, rating, config, now);
  }

  // Log for audit trail (can be captured by caller)
  console.log('[AnkiAlgorithm]', {
    ...log,
    newState: result.cardState,
    newInterval: result.interval,
    newEase: result.easeFactor,
  });

  return result;
}

/**
 * Schedule a NEW card
 * - Again: Start at step 0
 * - Hard: Start at step 0 (but with shorter delay)
 * - Good: Start at step 0, normal progression
 * - Easy: Graduate immediately with easy interval
 */
function scheduleNewCard(
  card: Flashcard,
  rating: FlashcardRating,
  config: DeckConfig,
  now: Date
): SchedulingResult {
  const steps = config.learningSteps;
  const startingEase = config.startingEase;

  if (rating === 'easy') {
    // Graduate immediately with easy interval
    const interval = config.easyInterval;
    const due = new Date(now);
    due.setDate(due.getDate() + interval);

    return {
      cardState: 'review',
      currentStep: 0,
      stepsLeft: 0,
      due: due.toISOString(),
      interval,
      easeFactor: startingEase + SM2_EASE_BONUS, // Bonus for easy on new
      repetitions: 1,
      lapses: 0,
      nextReview: due.toISOString(),
    };
  }

  // Start learning process
  const stepIndex = 0;
  const stepMs = steps.length > 0 ? parseStepToMs(steps[stepIndex]) : 60000; // Default 1 min
  
  let delay = stepMs;
  if (rating === 'again') {
    delay = stepMs; // Same as first step
  } else if (rating === 'hard') {
    delay = Math.round(stepMs * 1.2); // 20% longer
  }

  const due = new Date(now.getTime() + delay);

  return {
    cardState: 'learning',
    currentStep: 0,
    stepsLeft: steps.length,
    due: due.toISOString(),
    interval: 0,
    easeFactor: startingEase,
    repetitions: 0,
    lapses: 0,
    nextReview: due.toISOString(),
  };
}

/**
 * Schedule a LEARNING card
 * - Again: Reset to step 0
 * - Hard: Repeat current step with delay
 * - Good: Advance to next step, graduate if done
 * - Easy: Graduate immediately with easy interval
 */
function scheduleLearningCard(
  card: Flashcard,
  rating: FlashcardRating,
  config: DeckConfig,
  now: Date
): SchedulingResult {
  const steps = config.learningSteps;
  const currentStep = card.currentStep;

  if (rating === 'again') {
    // Reset to first step
    const stepMs = steps.length > 0 ? parseStepToMs(steps[0]) : 60000;
    const due = new Date(now.getTime() + stepMs);

    return {
      cardState: 'learning',
      currentStep: 0,
      stepsLeft: steps.length,
      due: due.toISOString(),
      interval: 0,
      easeFactor: card.easeFactor,
      repetitions: 0,
      lapses: 0,
      nextReview: due.toISOString(),
    };
  }

  if (rating === 'easy') {
    // Graduate immediately with easy interval
    const interval = config.easyInterval;
    const due = new Date(now);
    due.setDate(due.getDate() + interval);

    return {
      cardState: 'review',
      currentStep: 0,
      stepsLeft: 0,
      due: due.toISOString(),
      interval,
      easeFactor: card.easeFactor + SM2_EASE_BONUS,
      repetitions: 1,
      lapses: 0,
      nextReview: due.toISOString(),
    };
  }

  if (rating === 'hard') {
    // Repeat current step with 1.2x delay
    const stepMs = steps.length > currentStep ? parseStepToMs(steps[currentStep]) : 60000;
    const delay = Math.round(stepMs * 1.2);
    const due = new Date(now.getTime() + delay);

    return {
      cardState: 'learning',
      currentStep,
      stepsLeft: steps.length - currentStep,
      due: due.toISOString(),
      interval: 0,
      easeFactor: card.easeFactor,
      repetitions: 0,
      lapses: 0,
      nextReview: due.toISOString(),
    };
  }

  // Good: advance to next step
  const nextStep = currentStep + 1;

  if (nextStep >= steps.length) {
    // Graduate!
    const interval = fuzzInterval(config.graduatingInterval);
    const due = new Date(now);
    due.setDate(due.getDate() + interval);

    return {
      cardState: 'review',
      currentStep: 0,
      stepsLeft: 0,
      due: due.toISOString(),
      interval,
      easeFactor: card.easeFactor,
      repetitions: 1,
      lapses: 0,
      nextReview: due.toISOString(),
    };
  }

  // Continue learning
  const stepMs = parseStepToMs(steps[nextStep]);
  const due = new Date(now.getTime() + stepMs);

  return {
    cardState: 'learning',
    currentStep: nextStep,
    stepsLeft: steps.length - nextStep,
    due: due.toISOString(),
    interval: 0,
    easeFactor: card.easeFactor,
    repetitions: 0,
    lapses: 0,
    nextReview: due.toISOString(),
  };
}

/**
 * Schedule a REVIEW card
 * - Again: Enter relearning (lapse)
 * - Hard: Interval * hardMultiplier, decrease ease
 * - Good: Interval * ease, no ease change
 * - Easy: Interval * ease * easyBonus, increase ease
 */
function scheduleReviewCard(
  card: Flashcard,
  rating: FlashcardRating,
  config: DeckConfig,
  now: Date
): SchedulingResult {
  let newEase = card.easeFactor;
  let newInterval: number;
  let newLapses = card.lapses;
  let newReps = card.repetitions;

  if (rating === 'again') {
    // LAPSE: Enter relearning
    newLapses += 1;
    newEase = Math.max(SM2_MIN_EASE_FACTOR, newEase - SM2_EASE_PENALTY);

    const relearnSteps = config.relearnSteps;
    if (relearnSteps.length === 0) {
      // No relearn steps, go directly back to review with lapse interval
      const lapseInterval = Math.max(
        config.lapseMinInterval,
        Math.round(card.interval * config.lapseNewInterval)
      );
      const fuzzed = fuzzInterval(lapseInterval);
      const due = new Date(now);
      due.setDate(due.getDate() + fuzzed);

      return {
        cardState: 'review',
        currentStep: 0,
        stepsLeft: 0,
        due: due.toISOString(),
        interval: fuzzed,
        easeFactor: newEase,
        repetitions: newReps,
        lapses: newLapses,
        nextReview: due.toISOString(),
      };
    }

    // Enter relearning with first step
    const stepMs = parseStepToMs(relearnSteps[0]);
    const due = new Date(now.getTime() + stepMs);

    return {
      cardState: 'relearning',
      currentStep: 0,
      stepsLeft: relearnSteps.length,
      due: due.toISOString(),
      interval: Math.max(
        config.lapseMinInterval,
        Math.round(card.interval * config.lapseNewInterval)
      ),
      easeFactor: newEase,
      repetitions: newReps,
      lapses: newLapses,
      nextReview: due.toISOString(),
    };
  }

  if (rating === 'hard') {
    // Hard: interval * hardMultiplier, decrease ease
    newEase = Math.max(SM2_MIN_EASE_FACTOR, newEase - SM2_HARD_PENALTY);
    newInterval = Math.round(card.interval * config.hardMultiplier * config.intervalModifier);
    newInterval = Math.min(config.maxInterval, Math.max(card.interval + 1, newInterval));
    newReps += 1;
  } else if (rating === 'good') {
    // Good: interval * ease
    newInterval = Math.round(card.interval * newEase * config.intervalModifier);
    newInterval = Math.min(config.maxInterval, Math.max(card.interval + 1, newInterval));
    newReps += 1;
  } else {
    // Easy: interval * ease * easyBonus, increase ease
    newEase = newEase + SM2_EASE_BONUS;
    newInterval = Math.round(card.interval * newEase * config.easyBonus * config.intervalModifier);
    newInterval = Math.min(config.maxInterval, Math.max(card.interval + 1, newInterval));
    newReps += 1;
  }

  newInterval = fuzzInterval(newInterval);
  const due = new Date(now);
  due.setDate(due.getDate() + newInterval);

  return {
    cardState: 'review',
    currentStep: 0,
    stepsLeft: 0,
    due: due.toISOString(),
    interval: newInterval,
    easeFactor: newEase,
    repetitions: newReps,
    lapses: newLapses,
    nextReview: due.toISOString(),
  };
}

/**
 * Schedule a RELEARNING card
 * - Again: Reset to first relearn step
 * - Hard: Repeat current step
 * - Good: Advance step, graduate if done
 * - Easy: Graduate immediately
 */
function scheduleRelearningCard(
  card: Flashcard,
  rating: FlashcardRating,
  config: DeckConfig,
  now: Date
): SchedulingResult {
  const steps = config.relearnSteps;
  const currentStep = card.currentStep;

  // Calculate the new interval for when we graduate from relearning
  const lapseInterval = Math.max(
    config.lapseMinInterval,
    Math.round(card.interval * config.lapseNewInterval)
  );

  if (rating === 'again') {
    // Reset to first step
    const stepMs = steps.length > 0 ? parseStepToMs(steps[0]) : 600000; // Default 10 min
    const due = new Date(now.getTime() + stepMs);

    return {
      cardState: 'relearning',
      currentStep: 0,
      stepsLeft: steps.length,
      due: due.toISOString(),
      interval: lapseInterval,
      easeFactor: card.easeFactor,
      repetitions: card.repetitions,
      lapses: card.lapses,
      nextReview: due.toISOString(),
    };
  }

  if (rating === 'easy') {
    // Graduate immediately with current interval + 1 day bonus
    const interval = fuzzInterval(Math.max(lapseInterval, card.interval) + 1);
    const due = new Date(now);
    due.setDate(due.getDate() + interval);

    return {
      cardState: 'review',
      currentStep: 0,
      stepsLeft: 0,
      due: due.toISOString(),
      interval,
      easeFactor: card.easeFactor,
      repetitions: card.repetitions,
      lapses: card.lapses,
      nextReview: due.toISOString(),
    };
  }

  if (rating === 'hard') {
    // Repeat current step with 1.2x delay
    const stepMs = steps.length > currentStep ? parseStepToMs(steps[currentStep]) : 600000;
    const delay = Math.round(stepMs * 1.2);
    const due = new Date(now.getTime() + delay);

    return {
      cardState: 'relearning',
      currentStep,
      stepsLeft: steps.length - currentStep,
      due: due.toISOString(),
      interval: lapseInterval,
      easeFactor: card.easeFactor,
      repetitions: card.repetitions,
      lapses: card.lapses,
      nextReview: due.toISOString(),
    };
  }

  // Good: advance to next step
  const nextStep = currentStep + 1;

  if (nextStep >= steps.length) {
    // Graduate back to review!
    const interval = fuzzInterval(Math.max(lapseInterval, config.lapseMinInterval));
    const due = new Date(now);
    due.setDate(due.getDate() + interval);

    return {
      cardState: 'review',
      currentStep: 0,
      stepsLeft: 0,
      due: due.toISOString(),
      interval,
      easeFactor: card.easeFactor,
      repetitions: card.repetitions,
      lapses: card.lapses,
      nextReview: due.toISOString(),
    };
  }

  // Continue relearning
  const stepMs = parseStepToMs(steps[nextStep]);
  const due = new Date(now.getTime() + stepMs);

  return {
    cardState: 'relearning',
    currentStep: nextStep,
    stepsLeft: steps.length - nextStep,
    due: due.toISOString(),
    interval: lapseInterval,
    easeFactor: card.easeFactor,
    repetitions: card.repetitions,
    lapses: card.lapses,
    nextReview: due.toISOString(),
  };
}

// ============================================================================
// CARD STATE MANAGEMENT
// ============================================================================

/**
 * Suspend a card - it will never appear in study sessions
 */
export function suspendCard(card: Flashcard): Partial<Flashcard> {
  return {
    cardState: 'suspended',
  };
}

/**
 * Unsuspend a card - restore to previous state (or review if was graduated)
 */
export function unsuspendCard(card: Flashcard): Partial<Flashcard> {
  // If card was in learning/relearning, it's probably stale, make it review
  const newState: CardState = card.repetitions > 0 ? 'review' : 'new';
  return {
    cardState: newState,
    due: new Date().toISOString(), // Due immediately
  };
}

/**
 * Bury a card - it won't appear today but will tomorrow
 */
export function buryCard(card: Flashcard): Partial<Flashcard> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return {
    cardState: 'buried',
    buriedUntil: tomorrow.toISOString().split('T')[0],
  };
}

/**
 * Unbury a card - restore to previous state
 */
export function unburyCard(card: Flashcard): Partial<Flashcard> {
  const newState: CardState = card.repetitions > 0 ? 'review' : 'new';
  return {
    cardState: newState,
    buriedUntil: undefined,
    due: new Date().toISOString(),
  };
}

/**
 * Automatically unbury cards when a new day starts
 * Should be called when loading cards
 */
export function checkAndUnburyCards(cards: Flashcard[]): Flashcard[] {
  const today = getTodayDate();
  
  return cards.map(card => {
    if (card.cardState === 'buried' && card.buriedUntil) {
      if (card.buriedUntil <= today) {
        const newState: CardState = card.repetitions > 0 ? 'review' : 'new';
        return {
          ...card,
          cardState: newState,
          buriedUntil: undefined,
        };
      }
    }
    return card;
  });
}

// ============================================================================
// QUEUE BUILDING
// ============================================================================

export interface StudyQueue {
  newCards: Flashcard[];
  learningCards: Flashcard[]; // learning + relearning
  reviewCards: Flashcard[];
  totalDue: number;
  newRemaining: number;
  reviewsRemaining: number;
}

/**
 * Build the study queue for a deck, respecting daily limits
 * This determines which cards can be studied in the current session
 */
export function buildStudyQueue(
  cards: Flashcard[],
  config: DeckConfig,
  dailyStats: { newCardsStudied: number; reviewsDone: number },
  now: Date = new Date()
): StudyQueue {
  const today = getTodayDate();
  
  // Filter out suspended and buried cards
  const activeCards = cards.filter(card => {
    if (card.cardState === 'suspended') return false;
    if (card.cardState === 'buried') {
      // Check if should be unburied
      if (card.buriedUntil && card.buriedUntil <= today) {
        return true; // Will be treated as unburied
      }
      return false;
    }
    return true;
  });

  // Separate by state
  const newCards = activeCards.filter(c => c.cardState === 'new');
  const learningCards = activeCards.filter(c => 
    (c.cardState === 'learning' || c.cardState === 'relearning') &&
    new Date(c.due) <= now
  );
  const reviewCards = activeCards.filter(c => 
    c.cardState === 'review' && 
    new Date(c.due) <= now
  );

  // Apply daily limits
  const newRemaining = Math.max(0, config.newCardsPerDay - dailyStats.newCardsStudied);
  const reviewsRemaining = Math.max(0, config.reviewsPerDay - dailyStats.reviewsDone);

  // Sort cards
  // New cards: by creation date (oldest first)
  const sortedNew = [...newCards]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, newRemaining);

  // Learning cards: by due time (soonest first) - always shown, no limit
  const sortedLearning = [...learningCards]
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  // Review cards: by due time (most overdue first), limited by daily limit
  const sortedReview = [...reviewCards]
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
    .slice(0, reviewsRemaining);

  return {
    newCards: sortedNew,
    learningCards: sortedLearning,
    reviewCards: sortedReview,
    totalDue: sortedNew.length + sortedLearning.length + sortedReview.length,
    newRemaining,
    reviewsRemaining,
  };
}

/**
 * Get the next card to study from the queue
 * Order: Learning/Relearning first (time-sensitive), then interleave new and review
 */
export function getNextCard(queue: StudyQueue): Flashcard | null {
  // Learning cards are time-sensitive and take priority
  if (queue.learningCards.length > 0) {
    return queue.learningCards[0];
  }

  // Interleave new and review cards
  // Ratio: approximately 1 new per 10 reviews (adjustable)
  const totalNew = queue.newCards.length;
  const totalReview = queue.reviewCards.length;

  if (totalNew === 0 && totalReview === 0) {
    return null;
  }

  if (totalNew === 0) {
    return queue.reviewCards[0];
  }

  if (totalReview === 0) {
    return queue.newCards[0];
  }

  // Alternate based on ratio
  const newRatio = totalNew / (totalNew + totalReview);
  if (Math.random() < newRatio) {
    return queue.newCards[0];
  }
  return queue.reviewCards[0];
}

/**
 * Calculate the preview of next intervals for each rating
 * Used to show users what will happen with each button
 */
export function getNextIntervalPreview(
  card: Flashcard,
  config: DeckConfig
): Record<FlashcardRating, string> {
  const ratings: FlashcardRating[] = ['again', 'hard', 'good', 'easy'];
  const result: Record<FlashcardRating, string> = {} as any;

  for (const rating of ratings) {
    const scheduled = scheduleCard(card, rating, config);
    const dueDate = new Date(scheduled.due);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    result[rating] = formatIntervalForPreview(diffMs);
  }

  return result;
}
