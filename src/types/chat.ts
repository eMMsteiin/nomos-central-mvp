export interface Conversation {
  id: string;
  user_id: string;
  status: 'active' | 'archived';
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  proposal?: Proposal | null;
  created_at: string;
}

export interface Proposal {
  action_type: string;
  description: string;
  impact: string;
  payload: Record<string, unknown>;
}

export interface ChatAction {
  id: string;
  user_id: string;
  conversation_id: string | null;
  action_type: string;
  payload: Record<string, unknown>;
  status: 'proposed' | 'applied' | 'cancelled' | 'failed';
  created_at: string;
}

export type QuickAction = 
  | 'configurar_rotina'
  | 'ajuste_rapido'
  | 'hoje_desandou'
  | 'modo_provas'
  | 'estudar_agora';

export interface QuickActionConfig {
  id: QuickAction;
  label: string;
  emoji: string;
  message: string;
}

export const QUICK_ACTIONS: QuickActionConfig[] = [
  {
    id: 'configurar_rotina',
    label: 'Configurar rotina',
    emoji: '🗓️',
    message: 'Quero configurar minha rotina de estudos'
  },
  {
    id: 'ajuste_rapido',
    label: 'Ajuste rápido',
    emoji: '⚡',
    message: 'Preciso fazer um ajuste rápido no meu dia'
  },
  {
    id: 'hoje_desandou',
    label: 'Hoje desandou',
    emoji: '😓',
    message: 'Hoje desandou e não consegui seguir o planejado'
  },
  {
    id: 'modo_provas',
    label: 'Modo Provas',
    emoji: '📚',
    message: 'Tenho provas chegando e preciso entrar no modo provas'
  },
  {
    id: 'estudar_agora',
    label: 'Estudar agora',
    emoji: '▶️',
    message: 'Quero começar a estudar agora'
  }
];
