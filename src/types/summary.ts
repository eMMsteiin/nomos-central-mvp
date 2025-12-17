import { DEFAULT_DISCIPLINES } from './flashcard';

export type SummaryTemplate = 'topics' | 'cornell' | 'conceptual';
export type SummaryDifficulty = 'basic' | 'intermediate' | 'advanced';
export type SummarySourceType = 'manual' | 'ai';

export interface Summary {
  id: string;
  title: string;
  content: string;
  sourceText?: string;
  topic?: string;
  template: SummaryTemplate;
  difficulty: SummaryDifficulty;
  disciplineId?: string;
  notebookId?: string;
  linkedFlashcardDeckId?: string;
  tags: string[];
  sourceType: SummarySourceType;
  createdAt: string;
  updatedAt: string;
}

export const SUMMARY_TEMPLATES: Record<SummaryTemplate, {
  name: string;
  description: string;
  emoji: string;
}> = {
  topics: {
    name: 'Tópicos Principais',
    description: 'Lista estruturada dos pontos-chave',
    emoji: '📋',
  },
  cornell: {
    name: 'Método Cornell',
    description: 'Notas, perguntas-chave e resumo',
    emoji: '📝',
  },
  conceptual: {
    name: 'Mapa Conceitual',
    description: 'Conceitos conectados e relações',
    emoji: '🗺️',
  },
};

export const SUMMARY_DIFFICULTIES: Record<SummaryDifficulty, {
  name: string;
  description: string;
}> = {
  basic: {
    name: 'Básico',
    description: 'Conceitos fundamentais',
  },
  intermediate: {
    name: 'Intermediário',
    description: 'Aprofundamento moderado',
  },
  advanced: {
    name: 'Avançado',
    description: 'Detalhes e nuances',
  },
};

export { DEFAULT_DISCIPLINES };
