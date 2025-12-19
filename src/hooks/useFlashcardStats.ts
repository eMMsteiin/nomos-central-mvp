import { useMemo } from 'react';
import { useFlashcards } from './useFlashcards';

/**
 * Hook para integração mínima com a Central do Dia
 * Expõe apenas total de flashcards pendentes e estimativa de tempo
 */
export function useFlashcardStats() {
  const { getTotalDueCount, getEstimatedStudyTime, isLoading } = useFlashcards();

  const stats = useMemo(() => {
    if (isLoading) {
      return {
        totalDue: 0,
        estimatedMinutes: 0,
        isLoading: true,
      };
    }

    const totalDue = getTotalDueCount();
    const estimatedMinutes = getEstimatedStudyTime();

    return {
      totalDue,
      estimatedMinutes,
      isLoading: false,
    };
  }, [getTotalDueCount, getEstimatedStudyTime, isLoading]);

  return stats;
}
