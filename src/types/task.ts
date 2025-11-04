export interface Task {
  id: string;
  text: string;
  description?: string;
  createdAt: string;
  dueDate?: Date;
  course?: string;
  category?: 'hoje' | 'entrada' | 'em-breve';
  sourceType?: 'manual' | 'ava';
  completed?: boolean;
}
