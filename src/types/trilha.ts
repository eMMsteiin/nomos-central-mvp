export type CicloStatus = "pergunta" | "experimento" | "executando" | "reflexao" | "concluido";

/** Um ciclo da Trilha Propósito: pergunta → experimento → tarefa → reflexão. */
export interface Ciclo {
  id: string;
  question: string;
  experiment: string | null;
  taskId: string | null;
  status: CicloStatus;
  reflection: string | null;
  clarity: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CicloRow {
  id: string;
  question: string;
  experiment: string | null;
  task_id: string | null;
  status: CicloStatus;
  reflection: string | null;
  clarity: number | null;
  created_at: string;
  completed_at: string | null;
}

export const cicloFromRow = (row: CicloRow): Ciclo => ({
  id: row.id,
  question: row.question,
  experiment: row.experiment,
  taskId: row.task_id,
  status: row.status,
  reflection: row.reflection,
  clarity: row.clarity,
  createdAt: row.created_at,
  completedAt: row.completed_at,
});

/** Inspirações (não são recomendações): ajudam a começar, o usuário escreve o que quiser. */
export const PERGUNTAS_EXEMPLO = [
  "Por que preciso aprender isso?",
  "Como é, na prática, trabalhar nessa área?",
  "Onde esse conteúdo aparece fora da sala de aula?",
];

export const EXPERIMENTOS_EXEMPLO = [
  "Conversar 15 minutos com alguém que trabalha na área",
  "Ler um caso real e escrever um resumo de uma página",
  "Pesquisar como esse tema aparece em uma notícia recente",
  "Explicar o assunto para um colega e anotar as dúvidas",
];
