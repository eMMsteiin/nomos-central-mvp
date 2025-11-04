export interface Task {
  id: string;
  text: string;
  description?: string;
  createdAt: string;
  dueDate?: Date;
  course?: string;
  category?: 'hoje' | 'em-breve' | 'futuras';
  sourceType?: 'manual' | 'ava';
  completed?: boolean;
}
