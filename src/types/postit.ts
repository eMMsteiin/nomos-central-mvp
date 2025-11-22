export interface PostIt {
  id: string;
  text: string;
  color: 'verde' | 'azul' | 'terracota' | 'areia' | 'lavanda';
  imageUrl?: string;
  position: { x: number; y: number }; // Posição relativa ao bloco
  blockId: string; // ID do bloco ao qual o post-it pertence (obrigatório)
  createdAt: string;
  width: number;
  height: number;
  rotation: number;
}

export const POST_IT_COLORS = {
  verde: 'hsl(150, 20%, 60%)',
  azul: 'hsl(210, 28%, 50%)',
  terracota: 'hsl(15, 45%, 59%)',
  areia: 'hsl(45, 67%, 80%)',
  lavanda: 'hsl(250, 25%, 85%)'
} as const;

export const POST_IT_COLOR_LABELS = {
  verde: 'Verde Oliveira',
  azul: 'Azul Egeu',
  terracota: 'Terracota Ática',
  areia: 'Areia Dourada',
  lavanda: 'Lavanda Cretense'
} as const;
