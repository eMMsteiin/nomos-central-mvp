import { useState, useEffect, useCallback } from 'react';
import { Summary, SummaryTemplate, SummaryDifficulty } from '@/types/summary';

const STORAGE_KEY = 'nomos.summaries';

export const useSummaries = () => {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load summaries from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSummaries(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing summaries:', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Save summaries to localStorage
  const saveSummaries = useCallback((newSummaries: Summary[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSummaries));
    setSummaries(newSummaries);
  }, []);

  const createSummary = useCallback((data: {
    title: string;
    content: string;
    template: SummaryTemplate;
    difficulty: SummaryDifficulty;
    sourceType: 'manual' | 'ai';
    sourceText?: string;
    topic?: string;
    disciplineId?: string;
    notebookId?: string;
    tags?: string[];
  }): Summary => {
    const newSummary: Summary = {
      id: crypto.randomUUID(),
      title: data.title,
      content: data.content,
      template: data.template,
      difficulty: data.difficulty,
      sourceType: data.sourceType,
      sourceText: data.sourceText,
      topic: data.topic,
      disciplineId: data.disciplineId,
      notebookId: data.notebookId,
      tags: data.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newSummary, ...summaries];
    saveSummaries(updated);
    return newSummary;
  }, [summaries, saveSummaries]);

  const updateSummary = useCallback((id: string, data: Partial<Summary>) => {
    const updated = summaries.map(s => 
      s.id === id 
        ? { ...s, ...data, updatedAt: new Date().toISOString() }
        : s
    );
    saveSummaries(updated);
  }, [summaries, saveSummaries]);

  const deleteSummary = useCallback((id: string) => {
    const updated = summaries.filter(s => s.id !== id);
    saveSummaries(updated);
  }, [summaries, saveSummaries]);

  const getSummaryById = useCallback((id: string) => {
    return summaries.find(s => s.id === id);
  }, [summaries]);

  const getSummariesByDiscipline = useCallback((disciplineId: string) => {
    return summaries.filter(s => s.disciplineId === disciplineId);
  }, [summaries]);

  const searchSummaries = useCallback((query: string) => {
    const q = query.toLowerCase();
    return summaries.filter(s => 
      s.title.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [summaries]);

  const linkFlashcardDeck = useCallback((summaryId: string, deckId: string) => {
    updateSummary(summaryId, { linkedFlashcardDeckId: deckId });
  }, [updateSummary]);

  return {
    summaries,
    isLoading,
    createSummary,
    updateSummary,
    deleteSummary,
    getSummaryById,
    getSummariesByDiscipline,
    searchSummaries,
    linkFlashcardDeck,
  };
};
