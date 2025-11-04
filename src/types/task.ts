export interface Task {
  id: string;
  text: string;
  description?: string;
  createdAt: string;
  dueDate?: Date;
  dueTime?: string;
  course?: string;
  category?: 'hoje' | 'entrada' | 'em-breve';
  priority?: 'alta' | 'media' | 'baixa';
  sourceType?: 'manual' | 'ava';
  completed?: boolean;
}
