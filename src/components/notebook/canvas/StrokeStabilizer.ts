import type { Point } from './types';

/**
 * String filter: imagina uma "corda" invisível entre o ponteiro e o ponto desenhado.
 * Reduz tremor preservando movimentos intencionais.
 */
export class StrokeStabilizer {
  private anchor: Point | null = null;
  private stringLength: number;

  constructor(level: number) {
    this.stringLength = Math.max(0, Math.min(50, level * 0.4));
  }

  process(input: Point): Point | null {
    if (!this.anchor) {
      this.anchor = input;
      return input;
    }

    const dx = input.x - this.anchor.x;
    const dy = input.y - this.anchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.stringLength) return null;

    const ratio = (dist - this.stringLength) / dist;
    this.anchor = {
      x: this.anchor.x + dx * ratio,
      y: this.anchor.y + dy * ratio,
      pressure: input.pressure,
      t: input.t,
    };
    return this.anchor;
  }

  reset() {
    this.anchor = null;
  }
}
