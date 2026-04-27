export type ToolType = 'pen';

export interface PenConfig {
  color: string;
  width: number;
  pressureSensitivity: number;
  tipSharpness: number;
  pressureEnabled: boolean;
  // Pipeline de qualidade do traço (FASE 4.2-A)
  jitterFilterEnabled: boolean;     // 1€ filter on/off
  jitterStrength: number;            // 0-100, mapeia para mincutoff
  stabilizerStrength: number;        // 0-50, alimenta StrokeStabilizer
}

export const DEFAULT_PEN_CONFIG: PenConfig = {
  color: '#000000',
  width: 2,
  pressureSensitivity: 50,
  tipSharpness: 50,
  pressureEnabled: false,
  jitterFilterEnabled: true,
  jitterStrength: 50,
  stabilizerStrength: 10,
};

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
