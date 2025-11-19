export interface Notebook {
  id: string;
  title: string;
  subject?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  pages: NotebookPage[];
}

export interface NotebookPage {
  id: string;
  template: 'blank' | 'lined' | 'grid' | 'dotted';
  strokes: Stroke[];
  createdAt: string;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'eraser' | 'highlighter';
  color: string;
  width: number;
  points: Point[];
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}
