import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Flashcard, Deck, CardState } from '@/types/flashcard';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';

// Anki uses 21 days as the maturity threshold
const MATURE_THRESHOLD_DAYS = 21;

export interface CardStateStats {
  new: number;
  learning: number;
  review: number;
  relearning: number;
  suspended: number;
  buried: number;
  total: number;
}

export interface MaturityStats {
  young: number; // interval < 21 days
  mature: number; // interval >= 21 days
}

export interface DailyStudyData {
  date: string;
  cardsReviewed: number;
  cardsCorrect: number;
  newCardsStudied: number;
  reviewsDone: number;
  studyTimeMinutes: number;
}

export interface RetentionData {
  date: string;
  retentionRate: number;
  cardsReviewed: number;
}

export interface ReviewsByRating {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface IntervalDistribution {
  range: string;
  count: number;
}

export interface StudyStatistics {
  // Card counts by state
  cardsByState: CardStateStats;
  // Maturity breakdown
  maturity: MaturityStats;
  // Daily study history
  dailyData: DailyStudyData[];
  // Retention over time
  retentionData: RetentionData[];
  // Average response time
  avgResponseTimeMs: number;
  // Total study time today
  studyTimeToday: number;
  // Reviews by rating distribution
  reviewsByRating: ReviewsByRating;
  // Interval distribution
  intervalDistribution: IntervalDistribution[];
}

export function useStudyStatistics(
  cards: Flashcard[],
  decks: Deck[],
  selectedDeckId?: string
) {
  const { userId } = useAuthContext();
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [dailyStatsHistory, setDailyStatsHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter cards by deck if selected
  const filteredCards = useMemo(() => {
    if (!selectedDeckId || selectedDeckId === 'all') {
      return cards;
    }
    // Include subdeck cards
    const deck = decks.find(d => d.id === selectedDeckId);
    if (!deck) return [];
    
    const deckIds = new Set<string>([selectedDeckId]);
    // Add all descendant deck IDs
    const addDescendants = (parentId: string) => {
      decks.filter(d => d.parentDeckId === parentId).forEach(child => {
        deckIds.add(child.id);
        addDescendants(child.id);
      });
    };
    addDescendants(selectedDeckId);
    
    return cards.filter(c => deckIds.has(c.deckId));
  }, [cards, decks, selectedDeckId]);

  // Load review history
  useEffect(() => {
    if (!userId) return;
    loadHistory();
  }, [userId, selectedDeckId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Load review history
      let reviewQuery = supabase
        .from('flashcard_reviews')
        .select('*')
        .eq('user_id', userId)
        .gte('reviewed_at', thirtyDaysAgo)
        .order('reviewed_at', { ascending: false });

      const { data: reviews, error: reviewError } = await reviewQuery;
      if (reviewError) throw reviewError;
      setReviewHistory(reviews || []);

      // Load session history
      let sessionQuery = supabase
        .from('flashcard_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('started_at', thirtyDaysAgo)
        .order('started_at', { ascending: false });

      const { data: sessions, error: sessionError } = await sessionQuery;
      if (sessionError) throw sessionError;
      setSessionHistory(sessions || []);

      // Load daily stats history
      let statsQuery = supabase
        .from('deck_daily_stats')
        .select('*')
        .eq('user_id', userId)
        .gte('stat_date', format(subDays(new Date(), 30), 'yyyy-MM-dd'));

      const { data: stats, error: statsError } = await statsQuery;
      if (statsError) throw statsError;
      setDailyStatsHistory(stats || []);

    } catch (error) {
      console.error('Error loading study statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate card counts by state
  const cardsByState = useMemo((): CardStateStats => {
    const counts: CardStateStats = {
      new: 0,
      learning: 0,
      review: 0,
      relearning: 0,
      suspended: 0,
      buried: 0,
      total: filteredCards.length,
    };

    filteredCards.forEach(card => {
      const state = card.cardState || 'new';
      if (state in counts) {
        counts[state as keyof Omit<CardStateStats, 'total'>]++;
      }
    });

    return counts;
  }, [filteredCards]);

  // Calculate maturity (young vs mature)
  const maturity = useMemo((): MaturityStats => {
    let young = 0;
    let mature = 0;

    filteredCards.forEach(card => {
      if (card.cardState === 'review' || card.cardState === 'relearning') {
        if ((card.interval || 0) >= MATURE_THRESHOLD_DAYS) {
          mature++;
        } else {
          young++;
        }
      }
    });

    return { young, mature };
  }, [filteredCards]);

  // Calculate daily study data for last 30 days
  const dailyData = useMemo((): DailyStudyData[] => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      // Filter reviews for this day
      const dayReviews = reviewHistory.filter(r => {
        const reviewDate = parseISO(r.reviewed_at);
        return reviewDate >= dayStart && reviewDate <= dayEnd;
      });

      // Filter sessions for this day
      const daySessions = sessionHistory.filter(s => {
        const sessionDate = parseISO(s.started_at);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      // Get daily stats for this day
      const dayStats = dailyStatsHistory.filter(s => s.stat_date === dateStr);

      const cardsReviewed = dayReviews.length;
      const cardsCorrect = dayReviews.filter(r => 
        r.rating === 'good' || r.rating === 'easy'
      ).length;

      const newCardsStudied = dayStats.reduce((sum, s) => sum + (s.new_cards_studied || 0), 0);
      const reviewsDone = dayStats.reduce((sum, s) => sum + (s.reviews_done || 0), 0);

      // Estimate study time from sessions
      const studyTimeMinutes = daySessions.reduce((sum, s) => {
        if (s.completed_at && s.started_at) {
          const duration = (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000;
          return sum + Math.min(duration, 180); // Cap at 3 hours per session
        }
        return sum;
      }, 0);

      return {
        date: dateStr,
        cardsReviewed,
        cardsCorrect,
        newCardsStudied,
        reviewsDone,
        studyTimeMinutes: Math.round(studyTimeMinutes),
      };
    });
  }, [reviewHistory, sessionHistory, dailyStatsHistory]);

  // Calculate retention data
  const retentionData = useMemo((): RetentionData[] => {
    return dailyData.map(day => ({
      date: day.date,
      retentionRate: day.cardsReviewed > 0 
        ? Math.round((day.cardsCorrect / day.cardsReviewed) * 100) 
        : 0,
      cardsReviewed: day.cardsReviewed,
    }));
  }, [dailyData]);

  // Calculate average response time
  const avgResponseTimeMs = useMemo(() => {
    const validReviews = reviewHistory.filter(r => r.response_time_ms && r.response_time_ms > 0);
    if (validReviews.length === 0) return 0;
    const total = validReviews.reduce((sum, r) => sum + r.response_time_ms, 0);
    return Math.round(total / validReviews.length);
  }, [reviewHistory]);

  // Calculate study time today
  const studyTimeToday = useMemo(() => {
    const today = dailyData[dailyData.length - 1];
    return today?.studyTimeMinutes || 0;
  }, [dailyData]);

  // Calculate reviews by rating
  const reviewsByRating = useMemo((): ReviewsByRating => {
    const counts: ReviewsByRating = { again: 0, hard: 0, good: 0, easy: 0 };
    reviewHistory.forEach(r => {
      const rating = r.rating?.toLowerCase();
      if (rating in counts) {
        counts[rating as keyof ReviewsByRating]++;
      }
    });
    return counts;
  }, [reviewHistory]);

  // Calculate interval distribution
  const intervalDistribution = useMemo((): IntervalDistribution[] => {
    const ranges = [
      { label: '< 1 dia', min: 0, max: 1 },
      { label: '1-7 dias', min: 1, max: 7 },
      { label: '1-4 sem', min: 7, max: 28 },
      { label: '1-3 meses', min: 28, max: 90 },
      { label: '3-6 meses', min: 90, max: 180 },
      { label: '6-12 meses', min: 180, max: 365 },
      { label: '> 1 ano', min: 365, max: Infinity },
    ];

    return ranges.map(range => ({
      range: range.label,
      count: filteredCards.filter(c => {
        const interval = c.interval || 0;
        return interval >= range.min && interval < range.max;
      }).length,
    }));
  }, [filteredCards]);

  const statistics: StudyStatistics = {
    cardsByState,
    maturity,
    dailyData,
    retentionData,
    avgResponseTimeMs,
    studyTimeToday,
    reviewsByRating,
    intervalDistribution,
  };

  return {
    statistics,
    isLoading,
    refresh: loadHistory,
  };
}
