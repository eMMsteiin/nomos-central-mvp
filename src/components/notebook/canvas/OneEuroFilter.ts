/**
 * 1€ Filter — paper Casiez, Roussel, Vogel (CHI 2012).
 * Low-pass filter de 1ª ordem com cutoff adaptativo por velocidade.
 * Baixa velocidade → cutoff baixo (filtra forte, remove jitter).
 * Alta velocidade → cutoff alto (menos lag, preserva intenção).
 *
 * Adotado por Google Chrome, Unreal, VRPN, Mediapipe.
 * Para Apple Pencil em iPad: mincutoff=2.0 e beta=0.01 são bons defaults.
 */
class LowPassFilter {
  private hatXPrev: number | null = null;
  private xPrev: number | null = null;

  hasLastRawValue(): boolean {
    return this.xPrev !== null;
  }

  lastValue(): number {
    return this.xPrev ?? 0;
  }

  filter(x: number, alpha: number): number {
    const hatX =
      this.hatXPrev === null ? x : alpha * x + (1 - alpha) * this.hatXPrev;
    this.hatXPrev = hatX;
    this.xPrev = x;
    return hatX;
  }

  reset() {
    this.hatXPrev = null;
    this.xPrev = null;
  }
}

export class OneEuroFilter {
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private lastTime: number | null = null;

  constructor(
    private minCutoff: number = 2.0,
    private beta: number = 0.01,
    private dCutoff: number = 1.0
  ) {}

  private alpha(te: number, cutoff: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / te);
  }

  filter(x: number, t: number): number {
    if (this.lastTime !== null && t > this.lastTime) {
      const te = (t - this.lastTime) / 1000;
      const dValue = this.xFilter.hasLastRawValue()
        ? (x - this.xFilter.lastValue()) / Math.max(te, 1e-6)
        : 0;
      const edValue = this.dxFilter.filter(
        dValue,
        this.alpha(te, this.dCutoff)
      );
      const cutoff = this.minCutoff + this.beta * Math.abs(edValue);
      const result = this.xFilter.filter(x, this.alpha(te, cutoff));
      this.lastTime = t;
      return result;
    }
    this.lastTime = t;
    return this.xFilter.filter(x, this.alpha(1 / 60, this.minCutoff));
  }

  reset() {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

/**
 * Wrapper para filtrar pontos 2D (X e Y separados).
 */
export class OneEuroPointFilter {
  private xFilter: OneEuroFilter;
  private yFilter: OneEuroFilter;

  constructor(minCutoff = 2.0, beta = 0.01) {
    this.xFilter = new OneEuroFilter(minCutoff, beta);
    this.yFilter = new OneEuroFilter(minCutoff, beta);
  }

  filter(x: number, y: number, t: number): { x: number; y: number } {
    return {
      x: this.xFilter.filter(x, t),
      y: this.yFilter.filter(y, t),
    };
  }

  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
  }
}