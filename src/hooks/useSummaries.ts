import { useState, useEffect } from 'react';
import { Summary, SummaryType } from '@/types/summary';

const STORAGE_KEY = 'nomos-summaries';

// Demo data for illustration
const demoSummaries: Summary[] = [
  {
    id: '1',
    title: 'Introdução ao Direito Civil',
    subject: 'Direito Civil',
    type: 'essential',
    content: '• **Conceito**: Ramo do direito que regula as relações entre particulares\n• **Fontes**: Lei, costume, jurisprudência, doutrina\n• **Princípios**: Autonomia da vontade, boa-fé, função social',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    sourceType: 'notebook',
    emoji: '⚖️',
    color: 'hsl(210, 28%, 50%)',
  },
  {
    id: '2',
    title: 'Contratos - Revisão para Prova',
    subject: 'Direito Civil',
    type: 'exam',
    content: '**Perguntas prováveis:**\n1. Quais são os requisitos de validade do contrato?\n2. Diferencie nulidade e anulabilidade\n3. Explique o princípio da função social do contrato',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    sourceType: 'study_block',
    emoji: '📝',
    color: 'hsl(210, 28%, 50%)',
  },
  {
    id: '3',
    title: 'Fundamentos de Economia',
    subject: 'Economia',
    type: 'essential',
    content: '• **Microeconomia**: Estudo do comportamento individual\n• **Macroeconomia**: Estudo da economia como um todo\n• **Lei da oferta e demanda**: Preço de equilíbrio',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    sourceType: 'manual',
    emoji: '📊',
    color: 'hsl(150, 20%, 60%)',
  },
];

export function useSummaries() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSummaries();
  }, []);

  const loadSummaries = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSummaries(JSON.parse(stored));
      } else {
        // Load demo data on first visit
        setSummaries(demoSummaries);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demoSummaries));
      }
    } catch (error) {
      console.error('Error loading summaries:', error);
      setSummaries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSummaries = (newSummaries: Summary[]) => {
    setSummaries(newSummaries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSummaries));
  };

  const createSummary = (summary: Omit<Summary, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSummary: Summary = {
      ...summary,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveSummaries([newSummary, ...summaries]);
    return newSummary;
  };

  const updateSummary = (id: string, updates: Partial<Summary>) => {
    const newSummaries = summaries.map(s => 
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    );
    saveSummaries(newSummaries);
  };

  const deleteSummary = (id: string) => {
    saveSummaries(summaries.filter(s => s.id !== id));
  };

  const getSummariesBySubject = () => {
    const grouped: Record<string, Summary[]> = {};
    summaries.forEach(summary => {
      if (!grouped[summary.subject]) {
        grouped[summary.subject] = [];
      }
      grouped[summary.subject].push(summary);
    });
    return grouped;
  };

  const getSummariesByType = (type: SummaryType) => {
    return summaries.filter(s => s.type === type);
  };

  const getSubjects = () => {
    const subjects = new Set(summaries.map(s => s.subject));
    return Array.from(subjects);
  };

  return {
    summaries,
    isLoading,
    createSummary,
    updateSummary,
    deleteSummary,
    getSummariesBySubject,
    getSummariesByType,
    getSubjects,
  };
}
