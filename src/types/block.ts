export interface Block {
  id: string;
  type: 'week' | 'day';
  title: string;
  weekId?: string; // Para blocos diários, referencia o bloco semanal pai
  position: { x: number; y: number };
  size: { width: number; height: number };
  isExpanded: boolean; // Se bloco semanal está expandido em dias
  createdAt: string;
}

export const DEFAULT_WEEK_BLOCK_SIZE = {
  width: 800,
  height: 400
};

export const DEFAULT_DAY_BLOCK_SIZE = {
  width: 110, // ~1/7 da largura do bloco semanal
  height: 400
};

export const DAYS_OF_WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;
