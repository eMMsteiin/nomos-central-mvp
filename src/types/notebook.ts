export interface Notebook {
  id: string;
  title: string;
  subject?: string;
  discipline?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  pages: NotebookPage[];
  isPdf?: boolean;
  // Text notes searchable by AI
  textNotes?: string;
  // AI-generated summary
  summary?: string;
  // Tags for search
  tags?: string[];
}

export interface NotebookPage {
  id: string;
  template: 'blank' | 'lined' | 'grid' | 'dotted';
  strokes: Stroke[];
  textBoxes?: TextBox[];
  createdAt: string;
  backgroundImage?: string;
}

export type PenStyle = 'fountain' | 'ballpoint' | 'brush';
export type ToolType = 'select' | 'pen' | 'eraser' | 'highlighter' | 'text';

export interface Stroke {
  id: string;
  tool: ToolType;
  penStyle?: PenStyle;
  color: string;
  width: number;
  points: Point[];
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
}

// Color palette presets (GoodNotes inspired)
export const COLOR_PALETTE = {
  basics: [
    '#000000', // Black
    '#4A4A4A', // Dark Gray
    '#9B9B9B', // Gray
    '#FFFFFF', // White
  ],
  warm: [
    '#D0021B', // Red
    '#F5A623', // Orange
    '#F8E71C', // Yellow
    '#8B572A', // Brown
  ],
  cool: [
    '#7ED321', // Green
    '#4A90D9', // Light Blue
    '#0000FF', // Blue
    '#9013FE', // Purple
  ],
  accent: [
    '#BD10E0', // Magenta
    '#E91E63', // Pink
    '#00BCD4', // Cyan
    '#009688', // Teal
  ],
};

export const ALL_COLORS = [
  ...COLOR_PALETTE.basics,
  ...COLOR_PALETTE.warm,
  ...COLOR_PALETTE.cool,
  ...COLOR_PALETTE.accent,
];

// Pen style configurations
export const PEN_STYLES: Record<PenStyle, {
  name: string;
  description: string;
  minWidth: number;
  maxWidth: number;
  pressureSensitivity: number;
  opacity: number;
  smoothing: number;
}> = {
  fountain: {
    name: 'Caneta Tinteiro',
    description: 'Sensível à pressão, ponta variável',
    minWidth: 0.5,
    maxWidth: 1.0,
    pressureSensitivity: 1.5,
    opacity: 1,
    smoothing: 0.6,
  },
  ballpoint: {
    name: 'Esferográfica',
    description: 'Traço uniforme e consistente',
    minWidth: 0.8,
    maxWidth: 1.0,
    pressureSensitivity: 0.3,
    opacity: 1,
    smoothing: 0.4,
  },
  brush: {
    name: 'Pincel',
    description: 'Alta sensibilidade, efeito caligráfico',
    minWidth: 0.2,
    maxWidth: 1.8,
    pressureSensitivity: 2.0,
    opacity: 0.95,
    smoothing: 0.8,
  },
};

// Highlighter colors (semi-transparent)
export const HIGHLIGHTER_COLORS = [
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#FF69B4', // Pink
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#FF6347', // Tomato
];
