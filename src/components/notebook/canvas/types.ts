export type ToolType = 'pen';

export interface PenConfig {
  color: string;
  width: number;
  pressureSensitivity: number;
  tipSharpness: number;
}

export interface Point {
  x: number;
  y: number;
  pressure: number;
  t: number;
}

export interface ViewportState {
  scale: number;
  tx: number;
  ty: number;
}

export const PAGE_WIDTH = 1240;
export const PAGE_HEIGHT = 1754;
